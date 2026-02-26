"""
SQLAlchemy модели для PostgreSQL
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Enum,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from database import Base  # Прямой импорт (не относительный)


# ============== ENUMS ==============


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    INSPECTOR = "inspector"
    VIEWER = "viewer"


class StopStatus(str, enum.Enum):
    ACTIVE = "active"
    REPAIR = "repair"
    DISMANTLED = "dismantled"
    INACTIVE = "inactive"
    OTHER = "other"


class Condition(str, enum.Enum):
    EXCELLENT = "excellent"
    SATISFACTORY = "satisfactory"
    NEEDS_REPAIR = "needs_repair"
    CRITICAL = "critical"


class StopType(str, enum.Enum):
    FOUR_M = "4m"
    SEVEN_M = "7m"


class RoofType(str, enum.Enum):
    FLAT = "flat"
    ARCHED = "arched"
    PEAKED = "peaked"


# ============== ПОЛЬЗОВАТЕЛИ ==============


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True)

    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, default=func.now())

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())
    revoked_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    user = relationship("User", back_populates="refresh_tokens")

    @property
    def is_valid(self) -> bool:
        return self.revoked_at is None and self.expires_at > datetime.utcnow()


# ============== ОСТАНОВКИ ==============


class BusStop(Base):
    __tablename__ = "bus_stops"

    id = Column(Integer, primary_key=True, index=True)
    stop_id = Column(String(20), unique=True, index=True, nullable=False)
    passport_number = Column(String(50), unique=True, nullable=True)

    address = Column(String(500), nullable=False)
    landmark = Column(String(255), nullable=True)
    district = Column(String(100), index=True, nullable=False)
    routes = Column(String(255), nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    status = Column(Enum(StopStatus), default=StopStatus.ACTIVE, index=True)
    condition = Column(Enum(Condition), default=Condition.SATISFACTORY, index=True)
    meets_standards = Column(Boolean, default=True)

    stop_type = Column(Enum(StopType), default=StopType.FOUR_M)
    legs_count = Column(Integer, default=2)
    year_built = Column(Integer, nullable=True)
    last_repair_date = Column(DateTime, nullable=True)
    paint_color = Column(String(50), nullable=True)

    seats_condition = Column(Enum(Condition), default=Condition.SATISFACTORY)

    roof_type = Column(Enum(RoofType), default=RoofType.FLAT)
    roof_color = Column(String(50), nullable=True)
    roof_condition = Column(Enum(Condition), default=Condition.SATISFACTORY)
    has_roof_slif = Column(Boolean, default=False)

    glass_condition = Column(Enum(Condition), default=Condition.SATISFACTORY)
    glass_mount_condition = Column(Enum(Condition), default=Condition.SATISFACTORY)
    glass_replacement_count = Column(Integer, default=0)

    has_electricity = Column(Boolean, default=False)
    has_bin = Column(Boolean, default=False)
    bin_condition = Column(Enum(Condition), nullable=True)
    hanging_elements = Column(String(255), nullable=True)
    fasteners = Column(String(255), nullable=True)

    last_inspection_date = Column(DateTime, nullable=True)
    inspector_name = Column(String(255), nullable=True)
    next_inspection_date = Column(DateTime, nullable=True)

    # QR-код (ТЗ 2.2.3) — base64 PNG, поэтому Text вместо String(255)
    qr_code = Column(Text, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    photos = relationship(
        "Photo", back_populates="bus_stop", cascade="all, delete-orphan"
    )
    change_logs = relationship(
        "ChangeLog", back_populates="bus_stop", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_bus_stops_location", "latitude", "longitude"),
        Index("idx_bus_stops_status_condition", "status", "condition"),
    )


# ============== ФОТОГРАФИИ ==============


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    bus_stop_id = Column(
        Integer, ForeignKey("bus_stops.id", ondelete="CASCADE"), nullable=False
    )

    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=True)

    is_main = Column(Boolean, default=False)

    uploaded_at = Column(DateTime, default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploader_name = Column(String(255), nullable=True)

    bus_stop = relationship("BusStop", back_populates="photos")


# ============== ЖУРНАЛ ИЗМЕНЕНИЙ ==============


class ChangeLog(Base):
    __tablename__ = "change_logs"

    id = Column(Integer, primary_key=True, index=True)
    bus_stop_id = Column(
        Integer, ForeignKey("bus_stops.id", ondelete="CASCADE"), nullable=False
    )

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String(255), nullable=False)

    field_name = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)

    changed_at = Column(DateTime, default=func.now())
    ip_address = Column(String(45), nullable=True)

    bus_stop = relationship("BusStop", back_populates="change_logs")

    __table_args__ = (Index("idx_change_logs_stop_date", "bus_stop_id", "changed_at"),)


# ============== АУДИТ ==============


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=func.now(), index=True)

    __table_args__ = (
        Index("idx_audit_logs_user_date", "user_id", "timestamp"),
        Index("idx_audit_logs_action", "action", "timestamp"),
    )


# ============== СПРАВОЧНИКИ ==============


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(20), unique=True, nullable=False)
    name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
