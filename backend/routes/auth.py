"""
Маршруты аутентификации с JWT + Refresh Token
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import hashlib

from database import get_db
from models import User, RefreshToken
from schemas import LoginRequest, TokenResponse, RefreshTokenRequest, UserResponse, UserInToken
from core.security import verify_password, get_password_hash, create_tokens, verify_refresh_token
from core.config import settings
from core.dependencies import get_current_user
from middleware.security import brute_force_protection
from middleware.audit import AuditLogger


# Префикс "/api/auth" уже задаётся в main.py при include_router,
# поэтому здесь оставляем базовый роутер без дополнительного "/auth".
router = APIRouter(tags=["Авторизация"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)

    is_locked, remaining = brute_force_protection.is_locked(client_ip)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Слишком много попыток. Повторите через {remaining} секунд."
        )

    user = db.query(User).filter(User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        brute_force_protection.record_attempt(client_ip, success=False)
        remaining_attempts = brute_force_protection.get_remaining_attempts(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Неверный логин или пароль. Осталось попыток: {remaining_attempts}"
        )

    if user.locked_until and user.locked_until > datetime.utcnow():
        secs = int((user.locked_until - datetime.utcnow()).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Аккаунт заблокирован. Повторите через {secs} секунд."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован. Обратитесь к администратору."
        )

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()

    tokens = create_tokens(user.id, user.email, user.role.value)

    refresh_token_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(tokens["refresh_token"]),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ip_address=client_ip,
        user_agent=request.headers.get("User-Agent", "")[:500]
    )
    db.add(refresh_token_record)
    db.commit()

    brute_force_protection.record_attempt(client_ip, success=True)
    AuditLogger.log_login(db, user, client_ip, success=True)

    # FIX: Добавляем user объект в ответ — frontend его ожидает
    return {
        **tokens,
        "user": UserInToken(id=user.id, email=user.email, name=user.name, role=user.role)
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    try:
        payload = verify_refresh_token(refresh_data.refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh token. Войдите заново."
        )

    user_id = int(payload.get("sub"))

    token_hash = hash_token(refresh_data.refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.user_id == user_id
    ).first()

    if not token_record or not token_record.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token отозван или истёк. Войдите заново."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или заблокирован."
        )

    token_record.revoked_at = datetime.utcnow()

    tokens = create_tokens(user.id, user.email, user.role.value)

    new_token_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(tokens["refresh_token"]),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent", "")[:500]
    )
    db.add(new_token_record)
    db.commit()

    return {**tokens, "user": UserInToken(id=user.id, email=user.email, name=user.name, role=user.role)}


@router.post("/logout")
async def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    refresh_data: RefreshTokenRequest = None,   # FIX: сделан опциональным
):
    """
    FIX: refresh_token тело — опциональное.
    Frontend делает POST /auth/logout без тела — было 422.
    """
    if refresh_data:
        token_hash = hash_token(refresh_data.refresh_token)
        token_record = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == current_user.id
        ).first()
        if token_record:
            token_record.revoked_at = datetime.utcnow()
            db.commit()

    AuditLogger.log_logout(db, current_user, get_client_ip(request))
    return {"message": "Вы успешно вышли из системы"}


@router.post("/logout-all")
async def logout_all(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.utcnow()})
    db.commit()
    return {"message": "Вы вышли из всех сессий"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/sessions")
async def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked_at.is_(None),
        RefreshToken.expires_at > datetime.utcnow()
    ).all()

    return {
        "sessions": [
            {
                "id": s.id,
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "created_at": s.created_at,
                "expires_at": s.expires_at,
            }
            for s in sessions
        ]
    }
