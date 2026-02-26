# backend/core/config.py
"""
Конфигурация приложения
"""
from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    # Название приложения
    APP_NAME: str = "Bus Stops Inventory API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # База данных
    DATABASE_URL: str = "postgresql://bus_admin:password@localhost:5432/bus_stops_db"
    
    # JWT настройки
    SECRET_KEY: str = secrets.token_urlsafe(32)
    REFRESH_SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Короткий срок для access token
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # Refresh token на 7 дней
    
    # Безопасность
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    RATE_LIMIT_PER_MINUTE: int = 60
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 30
    
    # Загрузка файлов
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "webp"]
    
    # Логирование
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
