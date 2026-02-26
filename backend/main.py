"""
Bus Stop Inventory System - Backend API
JCDecaux Uzbekistan
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from middleware import (
    AuthMiddleware,
    RateLimitMiddleware,
    LoggingMiddleware,
    SecurityMiddleware,
    error_handler,
)
from routes import auth, users, stops, photos, reports, directories
from database import engine, Base, create_initial_data
from core.config import settings


os.makedirs("logs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/photos", exist_ok=True)
os.makedirs("exports", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Bus Stop Inventory API...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")
    create_initial_data()
    logger.info("✅ Initial data created")
    yield
    logger.info("👋 Shutting down...")


app = FastAPI(
    title="Bus Stop Inventory API",
    description="API для системы инвентаризации автобусных остановок г. Ташкент — JCDecaux Uzbekistan",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ============== MIDDLEWARE ==============

ALLOWED_ORIGINS = settings.ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID",
        "X-Process-Time",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
    ],
)

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")
app.add_middleware(
    SecurityMiddleware,
    enable_xss_protection=True,
    enable_sql_injection_protection=True,
    allowed_hosts=set(ALLOWED_HOSTS),
)

app.add_middleware(
    RateLimitMiddleware,
    default_limit=100,
    default_window=60,
    login_limit=5,
    login_window=60,
    upload_limit=10,
    upload_window=60,
)

app.add_middleware(LoggingMiddleware)

app.add_middleware(
    AuthMiddleware,
    secret_key=settings.SECRET_KEY,
    algorithm=settings.ALGORITHM,
)

# ============== ERROR HANDLERS ==============
error_handler(app)

# ============== ROUTES ==============
app.include_router(auth.router, prefix="/api/auth", tags=["Авторизация"])
app.include_router(users.router, prefix="/api/users", tags=["Пользователи"])
app.include_router(stops.router, prefix="/api/stops", tags=["Остановки"])
app.include_router(photos.router, prefix="/api/photos", tags=["Фотографии"])
app.include_router(reports.router, prefix="/api/reports", tags=["Отчёты"])
app.include_router(directories.router, prefix="/api/directories", tags=["Справочники"])

# ============== STATIC FILES ==============
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/exports", StaticFiles(directory="exports"), name="exports")


# ============== HEALTH CHECK ==============
@app.get("/api/health", tags=["Система"])
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Bus Stop Inventory API",
    }


@app.get("/", tags=["Система"])
async def root():
    return {
        "message": "Bus Stop Inventory API",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
