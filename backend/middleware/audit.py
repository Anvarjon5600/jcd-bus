# backend/middleware/audit.py
"""
Аудит: логирование всех действий пользователей
"""
from datetime import datetime, date
from typing import Optional
from enum import Enum
from sqlalchemy.orm import Session

from models import AuditLog, User


def _serialize(value):
    """Конвертирует неcериализуемые типы в строки для JSON"""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return value


class AuditLogger:
    """
    Логгер для записи всех действий пользователей в БД
    """
    
    @staticmethod
    def log(
        db: Session,
        user: Optional[User],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """
        Запись действия в журнал аудита
        
        :param db: Сессия БД
        :param user: Пользователь (или None для анонимных)
        :param action: Тип действия (login, create, update, delete, view, export)
        :param resource_type: Тип ресурса (user, stop, photo, report)
        :param resource_id: ID ресурса
        :param details: Дополнительные данные
        :param ip_address: IP адрес клиента
        :param user_agent: User-Agent браузера
        """
        audit_log = AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else "anonymous",
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.utcnow()
        )
        
        db.add(audit_log)
        db.commit()
    
    @staticmethod
    def log_login(db: Session, user: User, ip_address: str, success: bool):
        """Логирование входа в систему"""
        AuditLogger.log(
            db=db,
            user=user if success else None,
            action="login_success" if success else "login_failed",
            resource_type="auth",
            resource_id=user.email if user else None,
            details={"success": success},
            ip_address=ip_address
        )
    
    @staticmethod
    def log_logout(db: Session, user: User, ip_address: str):
        """Логирование выхода из системы"""
        AuditLogger.log(
            db=db,
            user=user,
            action="logout",
            resource_type="auth",
            ip_address=ip_address
        )
    
    @staticmethod
    def log_create(
        db: Session,
        user: User,
        resource_type: str,
        resource_id: str,
        data: dict,
        ip_address: str
    ):
        """Логирование создания ресурса"""
        AuditLogger.log(
            db=db,
            user=user,
            action="create",
            resource_type=resource_type,
            resource_id=resource_id,
            details={"data": data},
            ip_address=ip_address
        )
    
    @staticmethod
    def log_update(
        db: Session,
        user: User,
        resource_type: str,
        resource_id: str,
        old_data: dict,
        new_data: dict,
        ip_address: str
    ):
        """Логирование обновления ресурса"""
        # Находим изменённые поля
        changes = {}
        for key in new_data:
            if key in old_data and old_data[key] != new_data[key]:
                changes[key] = {
                    "old": _serialize(old_data[key]),
                    "new": _serialize(new_data[key])
                }
        
        if changes:
            AuditLogger.log(
                db=db,
                user=user,
                action="update",
                resource_type=resource_type,
                resource_id=resource_id,
                details={"changes": changes},
                ip_address=ip_address
            )
    
    @staticmethod
    def log_delete(
        db: Session,
        user: User,
        resource_type: str,
        resource_id: str,
        data: dict,
        ip_address: str
    ):
        """Логирование удаления ресурса"""
        AuditLogger.log(
            db=db,
            user=user,
            action="delete",
            resource_type=resource_type,
            resource_id=resource_id,
            details={"deleted_data": data},
            ip_address=ip_address
        )
    
    @staticmethod
    def log_export(
        db: Session,
        user: User,
        export_type: str,
        filters: dict,
        ip_address: str
    ):
        """Логирование экспорта данных"""
        AuditLogger.log(
            db=db,
            user=user,
            action="export",
            resource_type="report",
            details={
                "export_type": export_type,
                "filters": filters
            },
            ip_address=ip_address
        )
