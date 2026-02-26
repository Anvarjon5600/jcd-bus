# backend/routes/photos.py
"""
Маршруты для работы с фотографиями
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import shutil
from datetime import datetime

from database import get_db
from models import BusStop, Photo, User
from schemas import PhotoResponse
from core.config import settings
from core.dependencies import get_current_user, require_admin_or_inspector
from middleware.audit import AuditLogger


router = APIRouter(tags=["Фотографии"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def validate_file(file: UploadFile) -> None:
    """Валидация загружаемого файла"""
    # Проверяем расширение
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый формат файла. Разрешены: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Проверяем MIME тип
    allowed_mimes = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недопустимый тип файла"
        )


def save_file(file: UploadFile, stop_id: str) -> tuple:
    """Сохранение файла на диск"""
    # Создаём директорию если не существует
    upload_dir = os.path.join(settings.UPLOAD_DIR, stop_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Генерируем уникальное имя файла
    ext = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Получаем размер файла
    file_size = os.path.getsize(file_path)
    
    # Проверяем размер
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Файл слишком большой. Максимум: {settings.MAX_FILE_SIZE_MB} МБ"
        )
    
    return filename, file_path, file_size


@router.post("/upload/{stop_id}", response_model=PhotoResponse)
async def upload_photo(
    stop_id: str,
    request: Request,
    file: UploadFile = File(...),
    is_main: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    """
    Загрузка фото для остановки
    """
    # Проверяем остановку
    stop = db.query(BusStop).filter(BusStop.stop_id == stop_id).first()
    if not stop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Остановка не найдена"
        )
    
    # Валидируем файл
    validate_file(file)
    
    # Сохраняем файл
    filename, file_path, file_size = save_file(file, stop_id)
    
    # Если это главное фото, убираем флаг с других
    if is_main:
        db.query(Photo).filter(
            Photo.bus_stop_id == stop.id,
            Photo.is_main == True
        ).update({"is_main": False})
    
    # Создаём запись в БД
    photo = Photo(
        bus_stop_id=stop.id,
        filename=filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        is_main=is_main,
        uploaded_by=current_user.id,
        uploader_name=current_user.name
    )
    
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    # Логируем
    AuditLogger.log_create(
        db=db,
        user=current_user,
        resource_type="photo",
        resource_id=str(photo.id),
        data={
            "stop_id": stop_id,
            "filename": filename,
            "file_size": file_size
        },
        ip_address=get_client_ip(request)
    )
    
    return photo


@router.post("/upload/{stop_id}/multiple")
async def upload_multiple_photos(
    stop_id: str,
    request: Request,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    """
    Массовая загрузка фото
    """
    # Проверяем остановку
    stop = db.query(BusStop).filter(BusStop.stop_id == stop_id).first()
    if not stop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Остановка не найдена"
        )
    
    # Проверяем количество файлов
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Максимум 10 файлов за раз"
        )
    
    uploaded = []
    errors = []
    
    for file in files:
        try:
            validate_file(file)
            filename, file_path, file_size = save_file(file, stop_id)
            
            photo = Photo(
                bus_stop_id=stop.id,
                filename=filename,
                original_filename=file.filename,
                file_path=file_path,
                file_size=file_size,
                mime_type=file.content_type,
                is_main=False,
                uploaded_by=current_user.id,
                uploader_name=current_user.name
            )
            
            db.add(photo)
            uploaded.append(file.filename)
            
        except HTTPException as e:
            errors.append({"filename": file.filename, "error": e.detail})
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    db.commit()
    
    # Логируем
    AuditLogger.log_create(
        db=db,
        user=current_user,
        resource_type="photos",
        resource_id=stop_id,
        data={
            "uploaded": len(uploaded),
            "errors": len(errors)
        },
        ip_address=get_client_ip(request)
    )
    
    return {
        "uploaded": uploaded,
        "errors": errors,
        "total_uploaded": len(uploaded),
        "total_errors": len(errors)
    }


@router.put("/{photo_id}/set-main")
async def set_main_photo(
    photo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    """
    Установка главного фото
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Фото не найдено"
        )
    
    # Убираем флаг с других фото
    db.query(Photo).filter(
        Photo.bus_stop_id == photo.bus_stop_id,
        Photo.is_main == True
    ).update({"is_main": False})
    
    # Устанавливаем новое главное фото
    photo.is_main = True
    db.commit()
    
    return {"message": "Главное фото установлено"}


@router.delete("/{photo_id}")
async def delete_photo(
    photo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    """
    Удаление фото
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Фото не найдено"
        )
    
    # Удаляем файл
    if os.path.exists(photo.file_path):
        os.remove(photo.file_path)
    
    # Сохраняем данные для аудита
    photo_data = {
        "filename": photo.filename,
        "stop_id": photo.bus_stop_id
    }
    
    db.delete(photo)
    db.commit()
    
    # Логируем
    AuditLogger.log_delete(
        db=db,
        user=current_user,
        resource_type="photo",
        resource_id=str(photo_id),
        data=photo_data,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Фото удалено"}


@router.get("/stop/{stop_id}", response_model=List[PhotoResponse])
async def get_stop_photos(
    stop_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение фото остановки
    """
    stop = db.query(BusStop).filter(BusStop.stop_id == stop_id).first()
    
    if not stop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Остановка не найдена"
        )
    
    photos = db.query(Photo).filter(
        Photo.bus_stop_id == stop.id
    ).order_by(Photo.is_main.desc(), Photo.uploaded_at.desc()).all()
    
    return photos
