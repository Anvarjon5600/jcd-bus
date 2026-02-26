# backend/core/security.py
"""
Безопасность: JWT токены, хеширование паролей, валидация
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import re
import secrets

from core.config import settings


# Контекст для хеширования паролей (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============== ПАРОЛИ ==============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Хеширование пароля"""
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Проверка надёжности пароля
    - Минимум 8 символов
    - Хотя бы одна заглавная буква
    - Хотя бы одна строчная буква
    - Хотя бы одна цифра
    - Хотя бы один специальный символ
    """
    if len(password) < 8:
        return False, "Пароль должен содержать минимум 8 символов"
    
    if not re.search(r"[A-Z]", password):
        return False, "Пароль должен содержать хотя бы одну заглавную букву"
    
    if not re.search(r"[a-z]", password):
        return False, "Пароль должен содержать хотя бы одну строчную букву"
    
    if not re.search(r"\d", password):
        return False, "Пароль должен содержать хотя бы одну цифру"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Пароль должен содержать хотя бы один специальный символ"
    
    return True, "OK"


# ============== JWT ТОКЕНЫ ==============

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создание Access Token (короткоживущий)"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": secrets.token_urlsafe(16)  # Уникальный ID токена
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создание Refresh Token (долгоживущий)"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": secrets.token_urlsafe(16)
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.REFRESH_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> dict:
    """Проверка Access Token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный тип токена"
            )
        
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен"
        )


def verify_refresh_token(token: str) -> dict:
    """Проверка Refresh Token"""
    try:
        payload = jwt.decode(token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный тип токена"
            )
        
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh токен"
        )


def create_tokens(user_id: int, email: str, role: str) -> dict:
    """Создание пары токенов (access + refresh)"""
    token_data = {
        "sub": str(user_id),
        "email": email,
        "role": role
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


# ============== ВАЛИДАЦИЯ ВВОДА ==============

def sanitize_string(value: str) -> str:
    """Очистка строки от опасных символов (XSS protection)"""
    if not value:
        return value
    
    # Удаляем HTML теги
    value = re.sub(r'<[^>]*>', '', value)
    
    # Экранируем специальные символы
    value = value.replace('&', '&amp;')
    value = value.replace('<', '&lt;')
    value = value.replace('>', '&gt;')
    value = value.replace('"', '&quot;')
    value = value.replace("'", '&#x27;')
    
    return value.strip()


def validate_email(email: str) -> bool:
    """Валидация email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_coordinates(lat: float, lon: float) -> bool:
    """Валидация координат (для Ташкента)"""
    # Ташкент примерно: 41.2-41.4 lat, 69.1-69.4 lon
    return (40.5 <= lat <= 42.0) and (68.5 <= lon <= 70.5)
