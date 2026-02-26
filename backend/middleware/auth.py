"""
Auth Middleware

Этот middleware НЕ заменяет Depends-проверки в endpoints.
Его задача — мягко распарсить JWT (если он есть) и положить данные в request.state
для логирования/аудита/удобства.

Если токен отсутствует или невалиден — запрос НЕ блокируется (доступ контролируют Depends).
"""

from typing import Optional

from fastapi import Request
from jose import jwt, JWTError
from starlette.middleware.base import BaseHTTPMiddleware


class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, secret_key: str, algorithm: str = "HS256"):
        super().__init__(app)
        self.secret_key = secret_key
        self.algorithm = algorithm

    @staticmethod
    def _get_bearer_token(request: Request) -> Optional[str]:
        auth = request.headers.get("Authorization") or request.headers.get("authorization")
        if not auth:
            return None
        parts = auth.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        return parts[1].strip()

    async def dispatch(self, request: Request, call_next):
        # defaults
        request.state.jwt = None
        request.state.user_id = None
        request.state.user_email = None
        request.state.user_role = None

        token = self._get_bearer_token(request)
        if token:
            try:
                payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
                # Только access токены
                if payload.get("type") == "access":
                    request.state.jwt = payload
                    request.state.user_id = payload.get("sub")
                    request.state.user_email = payload.get("email")
                    request.state.user_role = payload.get("role")
            except JWTError:
                # Не блокируем запрос — доступ проверяется в Depends
                pass
            except Exception:
                pass

        return await call_next(request)

