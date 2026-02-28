# backend/routes/directories.py
"""
Маршруты для редактируемых справочников (ТЗ 2.2.4):
- Районы (District)
- Маршруты (Route)

Доступ: только admin.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.dependencies import require_admin, require_any_role
from database import get_db
from middleware.audit import AuditLogger
from models import District, Route, User, CustomField


# Префикс "/api/directories" задаётся в main.py, поэтому здесь без "/directories"
router = APIRouter(tags=["Справочники"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ============== SCHEMAS ==============


class DistrictBase(BaseModel):
    name: str
    is_active: bool = True


class DistrictCreate(DistrictBase):
    pass


class DistrictUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class DistrictResponse(DistrictBase):
    id: int

    class Config:
        from_attributes = True


class RouteBase(BaseModel):
    number: str
    name: Optional[str] = None
    is_active: bool = True


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    number: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None


class RouteResponse(RouteBase):
    id: int

    class Config:
        from_attributes = True


# ============== DISTRICTS ==============


@router.get("/districts/public", response_model=List[DistrictResponse])
async def list_districts_public(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    """Публичный список активных районов (доступен всем авторизованным пользователям)"""
    return (
        db.query(District)
        .filter(District.is_active == True)
        .order_by(District.name.asc())
        .all()
    )


@router.get("/districts", response_model=List[DistrictResponse])
async def list_districts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return (
        db.query(District)
        .order_by(District.is_active.desc(), District.name.asc())
        .all()
    )


@router.post("/districts", response_model=DistrictResponse, status_code=status.HTTP_201_CREATED)
async def create_district(
    payload: DistrictCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(District).filter(District.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Район с таким названием уже существует",
        )

    district = District(name=payload.name, is_active=payload.is_active)
    db.add(district)
    db.commit()
    db.refresh(district)

    AuditLogger.log_create(
        db=db,
        user=current_user,
        resource_type="district",
        resource_id=str(district.id),
        data={"name": district.name, "is_active": district.is_active},
        ip_address=get_client_ip(request),
    )

    return district


@router.put("/districts/{district_id}", response_model=DistrictResponse)
async def update_district(
    district_id: int,
    payload: DistrictUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Район не найден")

    old_data = {"name": district.name, "is_active": district.is_active}

    if payload.name is not None:
        existing = (
            db.query(District)
            .filter(District.name == payload.name, District.id != district_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Район с таким названием уже существует",
            )
        district.name = payload.name
    if payload.is_active is not None:
        district.is_active = payload.is_active

    db.commit()
    db.refresh(district)

    new_data = {"name": district.name, "is_active": district.is_active}

    AuditLogger.log_update(
        db=db,
        user=current_user,
        resource_type="district",
        resource_id=str(district.id),
        old_data=old_data,
        new_data=new_data,
        ip_address=get_client_ip(request),
    )

    return district


@router.delete("/districts/{district_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_district(
    district_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Район не найден")

    data = {"name": district.name, "is_active": district.is_active}
    db.delete(district)
    db.commit()

    AuditLogger.log_delete(
        db=db,
        user=current_user,
        resource_type="district",
        resource_id=str(district_id),
        data=data,
        ip_address=get_client_ip(request),
    )

    return None


# ============== ROUTES ==============


@router.get("/routes", response_model=List[RouteResponse])
async def list_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return (
        db.query(Route)
        .order_by(Route.is_active.desc(), Route.number.asc())
        .all()
    )


@router.post("/routes", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def create_route(
    payload: RouteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Route).filter(Route.number == payload.number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Маршрут с таким номером уже существует",
        )

    route = Route(
        number=payload.number,
        name=payload.name,
        is_active=payload.is_active,
    )
    db.add(route)
    db.commit()
    db.refresh(route)

    AuditLogger.log_create(
        db=db,
        user=current_user,
        resource_type="route",
        resource_id=str(route.id),
        data={"number": route.number, "name": route.name, "is_active": route.is_active},
        ip_address=get_client_ip(request),
    )

    return route


@router.put("/routes/{route_id}", response_model=RouteResponse)
async def update_route(
    route_id: int,
    payload: RouteUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")

    old_data = {"number": route.number, "name": route.name, "is_active": route.is_active}

    if payload.number is not None:
        existing = (
            db.query(Route)
            .filter(Route.number == payload.number, Route.id != route_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Маршрут с таким номером уже существует",
            )
        route.number = payload.number
    if payload.name is not None:
        route.name = payload.name
    if payload.is_active is not None:
        route.is_active = payload.is_active

    db.commit()
    db.refresh(route)

    new_data = {
        "number": route.number,
        "name": route.name,
        "is_active": route.is_active,
    }

    AuditLogger.log_update(
        db=db,
        user=current_user,
        resource_type="route",
        resource_id=str(route.id),
        old_data=old_data,
        new_data=new_data,
        ip_address=get_client_ip(request),
    )

    return route


@router.delete("/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    route_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")

    data = {"number": route.number, "name": route.name, "is_active": route.is_active}
    db.delete(route)
    db.commit()

    AuditLogger.log_delete(
        db=db,
        user=current_user,
        resource_type="route",
        resource_id=str(route_id),
        data=data,
        ip_address=get_client_ip(request),
    )

    return None


# ============== CUSTOM FIELDS (Характеристики) ==============


class CustomFieldBase(BaseModel):
    name: str
    field_type: str = "text"  # text, number, boolean, select
    options: Optional[List[str]] = None
    is_required: bool = False
    is_active: bool = True
    sort_order: int = 0


class CustomFieldCreate(CustomFieldBase):
    pass


class CustomFieldUpdate(BaseModel):
    name: Optional[str] = None
    field_type: Optional[str] = None
    options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class CustomFieldResponse(CustomFieldBase):
    id: int

    class Config:
        from_attributes = True


@router.get("/custom-fields/public", response_model=List[CustomFieldResponse])
async def list_custom_fields_public(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    """Список активных характеристик (для всех авторизованных)"""
    return (
        db.query(CustomField)
        .filter(CustomField.is_active == True)
        .order_by(CustomField.sort_order.asc(), CustomField.name.asc())
        .all()
    )


@router.get("/custom-fields", response_model=List[CustomFieldResponse])
async def list_custom_fields(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return (
        db.query(CustomField)
        .order_by(CustomField.sort_order.asc(), CustomField.name.asc())
        .all()
    )


@router.post("/custom-fields", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_field(
    payload: CustomFieldCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(CustomField).filter(CustomField.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Характеристика с таким названием уже существует")

    field = CustomField(**payload.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)

    AuditLogger.log_create(
        db=db, user=current_user, resource_type="custom_field",
        resource_id=str(field.id), data={"name": field.name, "field_type": field.field_type},
        ip_address=get_client_ip(request),
    )
    return field


@router.put("/custom-fields/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(
    field_id: int,
    payload: CustomFieldUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Характеристика не найдена")

    old_data = {"name": field.name, "field_type": field.field_type, "is_active": field.is_active}

    for attr, val in payload.model_dump(exclude_unset=True).items():
        setattr(field, attr, val)

    db.commit()
    db.refresh(field)

    AuditLogger.log_update(
        db=db, user=current_user, resource_type="custom_field",
        resource_id=str(field.id), old_data=old_data,
        new_data={"name": field.name, "field_type": field.field_type, "is_active": field.is_active},
        ip_address=get_client_ip(request),
    )
    return field


@router.delete("/custom-fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_field(
    field_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Характеристика не найдена")

    data = {"name": field.name, "field_type": field.field_type}
    db.delete(field)
    db.commit()

    AuditLogger.log_delete(
        db=db, user=current_user, resource_type="custom_field",
        resource_id=str(field_id), data=data, ip_address=get_client_ip(request),
    )
    return None

