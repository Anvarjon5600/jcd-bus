"""
Database Configuration
PostgreSQL + SQLAlchemy
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from passlib.context import CryptContext
import logging

from core.config import settings

logger = logging.getLogger(__name__)

# Используем тот же DATABASE_URL, что и все приложение (из .env через Settings)
DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_initial_data():
    """Создаёт начальные данные (admin + тестовые пользователи)"""
    # Импорт здесь, чтобы избежать circular import
    from models import User, UserRole

    db = SessionLocal()
    try:
        users_data = [
            {"email": "admin", "name": "Администратор", "role": UserRole.ADMIN, "password": "admin123"},
            {"email": "inspector@jcdecaux.uz", "name": "Дилшод Рахимов", "role": UserRole.INSPECTOR, "password": "inspector123"},
            {"email": "viewer@jcdecaux.uz", "name": "Нодира Султанова", "role": UserRole.VIEWER, "password": "viewer123"},
        ]
        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    name=u["name"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    is_active=True,
                )
                db.add(user)
                logger.info(f"✅ Created user: {u['email']}")
        db.commit()
    except Exception as e:
        logger.error(f"❌ Error creating initial data: {e}")
        db.rollback()
    finally:
        db.close()
