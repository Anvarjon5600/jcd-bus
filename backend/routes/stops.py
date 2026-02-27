"""
Маршруты для работы с остановками
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import Optional, List
from datetime import datetime
import qrcode
import io
import base64

from database import get_db
from models import BusStop, ChangeLog, User
from schemas import (
    BusStopCreate, BusStopUpdate, BusStopResponse,
    BusStopListResponse, StatsResponse, ChangeLogResponse
)
from core.dependencies import (
    get_current_user,
    require_admin_or_inspector,
    require_any_role
)
from middleware.audit import AuditLogger


# Префикс "/api/stops" уже задаётся в main.py при include_router,
# поэтому здесь оставляем базовый роутер без дополнительного "/stops".
router = APIRouter(tags=["Остановки"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def generate_stop_id(db: Session) -> str:
    existing = {
        s.stop_id for s in db.query(BusStop.stop_id).all()
    }
    num = 1
    while True:
        candidate = f"BS-{str(num).zfill(3)}"
        if candidate not in existing:
            return candidate
        num += 1


def generate_passport_number(db: Session) -> str:
    year = datetime.now().year
    existing = {
        s.passport_number for s in
        db.query(BusStop.passport_number)
        .filter(BusStop.passport_number.like(f"TP-{year}-%"))
        .all()
    }
    num = 1
    while True:
        candidate = f"TP-{year}-{str(num).zfill(4)}"
        if candidate not in existing:
            return candidate
        num += 1


def generate_qr_code(passport_number: str) -> str:
    """Генерирует QR-код для цифрового паспорта (ТЗ 2.2.3)"""
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(f"passport:{passport_number}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64}"
    except Exception:
        return ""


# ============== ENDPOINTS ==============

@router.get("", response_model=BusStopListResponse)
async def get_stops(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    condition: Optional[str] = None,
    has_electricity: Optional[bool] = None,
    has_bin: Optional[bool] = None,
    meets_standards: Optional[bool] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    query = db.query(BusStop).options(joinedload(BusStop.photos))

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                BusStop.stop_id.ilike(term),
                BusStop.address.ilike(term),
                BusStop.landmark.ilike(term),
                BusStop.routes.ilike(term),
                BusStop.district.ilike(term),
            )
        )
    if district:
        query = query.filter(BusStop.district == district)
    if status:
        query = query.filter(BusStop.status == status)
    if condition:
        query = query.filter(BusStop.condition == condition)
    if has_electricity is not None:
        query = query.filter(BusStop.has_electricity == has_electricity)
    if has_bin is not None:
        query = query.filter(BusStop.has_bin == has_bin)
    if meets_standards is not None:
        query = query.filter(BusStop.meets_standards == meets_standards)

    total = query.count()

    sort_column = getattr(BusStop, sort_by, BusStop.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    offset = (page - 1) * per_page
    stops = query.offset(offset).limit(per_page).all()
    pages = (total + per_page - 1) // per_page

    return {"stops": stops, "total": total, "page": page, "per_page": per_page, "pages": pages}


@router.get("/all", response_model=List[BusStopResponse])
async def get_all_stops(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """
    FIX: Добавлен endpoint /stops/all — используется фронтендом для карты.
    Возвращает все остановки без пагинации.
    """
    stops = db.query(BusStop).options(joinedload(BusStop.photos)).all()
    return stops


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    total = db.query(BusStop).count()
    active = db.query(BusStop).filter(BusStop.status == "active").count()
    repair = db.query(BusStop).filter(BusStop.status == "repair").count()
    dismantled = db.query(BusStop).filter(BusStop.status == "dismantled").count()
    inactive = db.query(BusStop).filter(BusStop.status == "inactive").count()

    excellent = db.query(BusStop).filter(BusStop.condition == "excellent").count()
    satisfactory = db.query(BusStop).filter(BusStop.condition == "satisfactory").count()
    needs_repair = db.query(BusStop).filter(BusStop.condition == "needs_repair").count()
    critical = db.query(BusStop).filter(BusStop.condition == "critical").count()

    first_day = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    inspected = db.query(BusStop).filter(
        BusStop.last_inspection_date >= first_day
    ).count()

    districts = db.query(BusStop.district, func.count(BusStop.id)).group_by(BusStop.district).all()
    by_district = {d[0]: d[1] for d in districts}

    return {
        "total_stops": total,
        "active_stops": active,
        "repair_stops": repair,
        "dismantled_stops": dismantled,
        "inactive_stops": inactive,
        "excellent_condition": excellent,
        "satisfactory_condition": satisfactory,
        "needs_repair_condition": needs_repair,
        "critical_condition": critical,
        "inspected_this_month": inspected,
        "by_district": by_district,
    }


@router.get("/districts")
async def get_districts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    districts = db.query(BusStop.district).distinct().all()
    return {"districts": [d[0] for d in districts if d[0]]}


@router.get("/{stop_id}", response_model=BusStopResponse)
async def get_stop(
    stop_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    stop = db.query(BusStop).options(
        joinedload(BusStop.photos),
        joinedload(BusStop.change_logs)
    ).filter(
        or_(
            BusStop.stop_id == stop_id,
            BusStop.id == int(stop_id) if stop_id.isdigit() else False
        )
    ).first()

    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Остановка не найдена")

    return stop


@router.get("/{stop_id}/history", response_model=List[ChangeLogResponse])
async def get_stop_history(
    stop_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """
    FIX: Добавлен endpoint /{stop_id}/history — используется фронтендом.
    Возвращает историю изменений остановки (ТЗ 2.2.6).
    """
    stop = db.query(BusStop).filter(
        or_(
            BusStop.stop_id == stop_id,
            BusStop.id == int(stop_id) if stop_id.isdigit() else False
        )
    ).first()

    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Остановка не найдена")

    logs = db.query(ChangeLog).filter(
        ChangeLog.bus_stop_id == stop.id
    ).order_by(ChangeLog.changed_at.desc()).all()

    return logs


@router.post("", response_model=BusStopResponse, status_code=status.HTTP_201_CREATED)
async def create_stop(
    request: Request,
    stop_data: BusStopCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    stop_id = generate_stop_id(db)
    passport_number = generate_passport_number(db)
    qr = generate_qr_code(passport_number)

    stop = BusStop(
        stop_id=stop_id,
        passport_number=passport_number,
        qr_code=qr,
        created_by=current_user.id,
        **stop_data.model_dump()
    )

    db.add(stop)
    db.commit()
    db.refresh(stop)

    AuditLogger.log_create(
        db=db,
        user=current_user,
        resource_type="stop",
        resource_id=stop.stop_id,
        data={"address": stop.address, "district": stop.district},
        ip_address=get_client_ip(request)
    )

    return stop


@router.put("/{stop_id}", response_model=BusStopResponse)
async def update_stop(
    stop_id: str,
    request: Request,
    stop_data: BusStopUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    stop = db.query(BusStop).filter(
        or_(
            BusStop.stop_id == stop_id,
            BusStop.id == int(stop_id) if stop_id.isdigit() else False
        )
    ).first()

    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Остановка не найдена")

    old_data = {c.name: getattr(stop, c.name) for c in BusStop.__table__.columns}

    update_dict = stop_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if hasattr(stop, field):
            old_value = getattr(stop, field)
            if old_value != value:
                setattr(stop, field, value)
                change_log = ChangeLog(
                    bus_stop_id=stop.id,
                    user_id=current_user.id,
                    user_name=current_user.name,
                    field_name=field,
                    old_value=(old_value.value if hasattr(old_value, 'value') else str(old_value)) if old_value is not None else None,
                    new_value=(value.value if hasattr(value, 'value') else str(value)) if value is not None else None,
                    ip_address=get_client_ip(request)
                )
                db.add(change_log)

    db.commit()
    db.refresh(stop)

    new_data = {c.name: getattr(stop, c.name) for c in BusStop.__table__.columns}
    AuditLogger.log_update(
        db=db, user=current_user, resource_type="stop",
        resource_id=stop.stop_id, old_data=old_data, new_data=new_data,
        ip_address=get_client_ip(request)
    )

    return stop


@router.delete("/{stop_id}")
async def delete_stop(
    stop_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может удалять остановки")

    stop = db.query(BusStop).filter(
        or_(
            BusStop.stop_id == stop_id,
            BusStop.id == int(stop_id) if stop_id.isdigit() else False
        )
    ).first()

    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Остановка не найдена")

    stop_data_log = {"stop_id": stop.stop_id, "address": stop.address}
    db.delete(stop)
    db.commit()

    AuditLogger.log_delete(
        db=db, user=current_user, resource_type="stop",
        resource_id=stop_id, data=stop_data_log, ip_address=get_client_ip(request)
    )

    return {"message": "Остановка удалена"}


@router.post("/{stop_id}/inspection")
async def record_inspection(
    stop_id: str,
    request: Request,
    next_inspection_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_inspector)
):
    stop = db.query(BusStop).filter(
        or_(
            BusStop.stop_id == stop_id,
            BusStop.id == int(stop_id) if stop_id.isdigit() else False
        )
    ).first()

    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Остановка не найдена")

    stop.last_inspection_date = datetime.utcnow()
    stop.inspector_name = current_user.name
    if next_inspection_date:
        stop.next_inspection_date = next_inspection_date

    db.commit()
    db.refresh(stop)

    return {"message": "Инспекция зафиксирована", "stop_id": stop.stop_id}
