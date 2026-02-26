# backend/routes/users.py
"""
Маршруты управления пользователями (только для админа)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User
from schemas import (
    UserCreate, UserUpdate, UserResponse, UserListResponse
)
from core.security import get_password_hash, validate_password_strength
from core.dependencies import get_current_user, require_admin
from middleware.audit import AuditLogger


# Префикс "/api/users" задаётся в main.py, поэтому здесь без "/users"
router = APIRouter(tags=["Пользователи"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("", response_model=UserListResponse)
async def get_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получение списка пользователей (только для админа)
    """
    query = db.query(User)
    
    # Фильтры
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.name.ilike(f"%{search}%"))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "users": users,
        "total": total
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получение пользователя по ID
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Создание нового пользователя (только для админа)
    """
    # Проверяем уникальность email
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Валидация пароля (опционально строгая проверка)
    # is_valid, message = validate_password_strength(user_data.password)
    # if not is_valid:
    #     raise HTTPException(status_code=400, detail=message)
    
    # Создаём пользователя
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        created_by=current_user.id
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Логируем
    AuditLogger.log_create(
        db=db,
        user=current_user,
        resource_type="user",
        resource_id=str(user.id),
        data={"email": user.email, "name": user.name, "role": user.role.value},
        ip_address=get_client_ip(request)
    )
    
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: Request,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Обновление пользователя (только для админа)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Нельзя изменить роль самому себе
    if user.id == current_user.id and user_data.role and user_data.role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя изменить свою собственную роль"
        )
    
    # Нельзя деактивировать самого себя
    if user.id == current_user.id and user_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя деактивировать свой собственный аккаунт"
        )
    
    # Сохраняем старые данные для аудита
    old_data = {
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "is_active": user.is_active
    }
    
    # Проверяем уникальность email
    if user_data.email and user_data.email != user.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )
        user.email = user_data.email
    
    # Обновляем поля
    if user_data.name is not None:
        user.name = user_data.name
    
    if user_data.role is not None:
        user.role = user_data.role
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.password:
        user.password_hash = get_password_hash(user_data.password)
    
    db.commit()
    db.refresh(user)
    
    # Логируем
    new_data = {
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "is_active": user.is_active
    }
    
    AuditLogger.log_update(
        db=db,
        user=current_user,
        resource_type="user",
        resource_id=str(user.id),
        old_data=old_data,
        new_data=new_data,
        ip_address=get_client_ip(request)
    )
    
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Удаление пользователя (только для админа)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Нельзя удалить самого себя
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить свой собственный аккаунт"
        )
    
    # Сохраняем данные для аудита
    user_data = {
        "email": user.email,
        "name": user.name,
        "role": user.role.value
    }
    
    db.delete(user)
    db.commit()
    
    # Логируем
    AuditLogger.log_delete(
        db=db,
        user=current_user,
        resource_type="user",
        resource_id=str(user_id),
        data=user_data,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Пользователь удалён"}


@router.post("/{user_id}/unlock")
async def unlock_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Разблокировка пользователя (сброс блокировки)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    AuditLogger.log(
        db=db,
        user=current_user,
        action="unlock",
        resource_type="user",
        resource_id=str(user_id),
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Пользователь разблокирован"}


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    request: Request,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Сброс пароля пользователя (только для админа)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль должен содержать минимум 6 символов"
        )
    
    user.password_hash = get_password_hash(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    # Отзываем все сессии пользователя
    from models import RefreshToken
    from datetime import datetime
    
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.utcnow()})
    db.commit()
    
    AuditLogger.log(
        db=db,
        user=current_user,
        action="reset_password",
        resource_type="user",
        resource_id=str(user_id),
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Пароль сброшен. Все сессии пользователя завершены."}
