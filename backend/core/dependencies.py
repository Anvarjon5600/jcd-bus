# backend/core/dependencies.py
"""
Зависимости FastAPI: аутентификация, права доступа, БД сессия
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from core.security import verify_access_token
from database import get_db
from models import User


# Схема авторизации через Bearer Token
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Получение текущего пользователя из JWT токена
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Проверяем токен
    payload = verify_access_token(credentials.credentials)
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен"
        )
    
    # Получаем пользователя из БД
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован"
        )
    
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Опциональное получение пользователя (для публичных эндпоинтов)
    """
    if not credentials:
        return None
    
    try:
        payload = verify_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id:
            return db.query(User).filter(User.id == int(user_id)).first()
    except:
        pass
    
    return None


def require_role(*allowed_roles: str):
    """
    Декоратор для проверки роли пользователя
    Использование: require_role("admin", "inspector")
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Требуется роль: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


# Готовые зависимости для ролей
require_admin = require_role("admin")
require_admin_or_inspector = require_role("admin", "inspector")
require_any_role = require_role("admin", "inspector", "viewer")
