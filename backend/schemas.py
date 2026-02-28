"""
Pydantic схемы для валидации данных
"""

from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============== ENUMS ==============


class UserRole(str, Enum):
    admin = "admin"
    inspector = "inspector"
    viewer = "viewer"


class StopStatus(str, Enum):
    active = "active"
    repair = "repair"
    dismantled = "dismantled"
    inactive = "inactive"  # FIX: было 'unavailable' во frontend — исправлено на inactive
    other = "other"


class Condition(str, Enum):
    excellent = "excellent"
    satisfactory = "satisfactory"
    needs_repair = "needs_repair"
    critical = "critical"


class StopType(str, Enum):
    four_m = "4m"
    seven_m = "7m"


class RoofType(str, Enum):
    flat = "flat"
    arched = "arched"
    peaked = "peaked"


# ============== AUTH ==============


class LoginRequest(BaseModel):
    email: str
    password: str


class UserInToken(BaseModel):
    """Информация о пользователе в ответе login"""

    id: int
    email: str
    name: str
    role: UserRole

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """FIX: Добавлен user объект — frontend его ожидает"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Optional[UserInToken] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ============== USERS ==============


class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole = UserRole.viewer


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Пароль должен содержать минимум 6 символов")
        return v


class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int


# ============== BUS STOPS ==============


class BusStopBase(BaseModel):
    address: str
    landmark: Optional[str] = None
    district: str
    routes: Optional[str] = None

    # FIX: latitude/longitude (не lat/lon как во frontend — исправлено в frontend types.ts)
    latitude: float
    longitude: float

    status: StopStatus = StopStatus.active
    condition: Condition = Condition.satisfactory
    meets_standards: bool = True

    stop_type: StopType = StopType.four_m
    legs_count: int = 2
    year_built: Optional[int] = None
    paint_color: Optional[str] = None

    seats_condition: Condition = Condition.satisfactory

    roof_type: RoofType = RoofType.flat
    roof_color: Optional[str] = None
    roof_condition: Condition = Condition.satisfactory
    has_roof_slif: bool = False

    glass_condition: Condition = Condition.satisfactory
    glass_mount_condition: Condition = Condition.satisfactory
    glass_replacement_count: int = 0

    has_electricity: bool = False
    has_bin: bool = False
    bin_condition: Optional[Condition] = None
    hanging_elements: Optional[str] = None
    fasteners: Optional[str] = None


class BusStopCreate(BusStopBase):
    pass


class BusStopUpdate(BaseModel):
    address: Optional[str] = None
    landmark: Optional[str] = None
    district: Optional[str] = None
    routes: Optional[str] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    status: Optional[StopStatus] = None
    condition: Optional[Condition] = None
    meets_standards: Optional[bool] = None

    stop_type: Optional[StopType] = None
    legs_count: Optional[int] = None
    year_built: Optional[int] = None
    paint_color: Optional[str] = None

    seats_condition: Optional[Condition] = None

    roof_type: Optional[RoofType] = None
    roof_color: Optional[str] = None
    roof_condition: Optional[Condition] = None
    has_roof_slif: Optional[bool] = None

    glass_condition: Optional[Condition] = None
    glass_mount_condition: Optional[Condition] = None
    glass_replacement_count: Optional[int] = None

    has_electricity: Optional[bool] = None
    has_bin: Optional[bool] = None
    bin_condition: Optional[Condition] = None
    hanging_elements: Optional[str] = None
    fasteners: Optional[str] = None

    last_inspection_date: Optional[datetime] = None
    inspector_name: Optional[str] = None
    next_inspection_date: Optional[datetime] = None


class PhotoResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    is_main: bool
    uploaded_at: datetime
    uploader_name: Optional[str] = None

    class Config:
        from_attributes = True


class ChangeLogResponse(BaseModel):
    id: int
    user_name: str
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


class CustomFieldValueResponse(BaseModel):
    field_id: int
    field_name: str
    field_type: str
    value: Optional[str] = None


class BusStopResponse(BaseModel):
    id: int
    stop_id: str
    passport_number: Optional[str] = None
    qr_code: Optional[str] = None

    address: str
    landmark: Optional[str] = None
    district: str
    routes: Optional[str] = None

    latitude: float
    longitude: float

    status: StopStatus
    condition: Condition
    meets_standards: bool

    stop_type: StopType
    legs_count: int
    year_built: Optional[int] = None
    paint_color: Optional[str] = None

    seats_condition: Condition

    roof_type: RoofType
    roof_color: Optional[str] = None
    roof_condition: Condition
    has_roof_slif: bool

    glass_condition: Condition
    glass_mount_condition: Condition
    glass_replacement_count: int

    has_electricity: bool
    has_bin: bool
    bin_condition: Optional[Condition] = None
    hanging_elements: Optional[str] = None
    fasteners: Optional[str] = None

    last_inspection_date: Optional[datetime] = None
    inspector_name: Optional[str] = None
    next_inspection_date: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    photos: List[PhotoResponse] = []
    change_logs: List[ChangeLogResponse] = []
    custom_field_values: List[CustomFieldValueResponse] = []

    class Config:
        from_attributes = True

    @classmethod
    def from_stop(cls, stop):
        """Build response with custom field values properly mapped"""
        data = {c.name: getattr(stop, c.name) for c in stop.__table__.columns}
        data["photos"] = stop.photos
        data["change_logs"] = stop.change_logs
        data["custom_field_values"] = [
            CustomFieldValueResponse(
                field_id=cfv.field_id,
                field_name=cfv.field.name,
                field_type=cfv.field.field_type,
                value=cfv.value,
            )
            for cfv in (stop.custom_field_values or [])
            if cfv.field and cfv.field.is_active
        ]
        return cls.model_validate(data)


class BusStopListResponse(BaseModel):
    # FIX: frontend ожидал 'items', теперь 'stops' и в frontend исправлено тоже
    stops: List[BusStopResponse]
    total: int
    page: int
    per_page: int
    pages: int


class StatsResponse(BaseModel):
    total_stops: int
    active_stops: int
    repair_stops: int
    dismantled_stops: int
    inactive_stops: int  # FIX: было unavailable в frontend

    excellent_condition: int
    satisfactory_condition: int
    needs_repair_condition: int
    critical_condition: int

    inspected_this_month: int
    by_district: dict


class ReportFilter(BaseModel):
    district: Optional[str] = None
    status: Optional[StopStatus] = None
    condition: Optional[Condition] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
