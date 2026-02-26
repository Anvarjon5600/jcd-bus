"""
Rate Limiting Middleware
Защита от DDoS и brute-force атак
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Tuple
from datetime import datetime, timedelta
import asyncio
from collections import defaultdict
import hashlib


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware для ограничения количества запросов
    
    Правила:
    - Общий лимит: 100 запросов в минуту
    - Login: 5 попыток в минуту (защита от brute-force)
    - API endpoints: 60 запросов в минуту
    - Upload: 10 запросов в минуту
    """
    
    def __init__(
        self, 
        app,
        default_limit: int = 100,
        default_window: int = 60,
        login_limit: int = 5,
        login_window: int = 60,
        upload_limit: int = 10,
        upload_window: int = 60,
    ):
        super().__init__(app)
        self.default_limit = default_limit
        self.default_window = default_window
        self.login_limit = login_limit
        self.login_window = login_window
        self.upload_limit = upload_limit
        self.upload_window = upload_window
        
        # Хранилище запросов: {client_key: [(timestamp, count)]}
        self.requests: Dict[str, list] = defaultdict(list)
        
        # Заблокированные IP
        self.blocked_ips: Dict[str, datetime] = {}
        
        # Запускаем очистку старых записей
        self._cleanup_task = None
    
    async def dispatch(self, request: Request, call_next):
        # Получаем идентификатор клиента
        client_key = self._get_client_key(request)
        path = request.url.path
        
        # Проверяем не заблокирован ли IP
        if self._is_blocked(client_key):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Слишком много запросов. IP временно заблокирован.",
                    "code": "IP_BLOCKED",
                    "retry_after": 300
                },
                headers={"Retry-After": "300"}
            )
        
        # Определяем лимиты для данного endpoint
        limit, window = self._get_limits(path)
        
        # Проверяем лимит
        if not self._check_rate_limit(client_key, path, limit, window):
            # При превышении лимита login - блокируем IP
            if "/auth/login" in path:
                self._block_ip(client_key)
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Превышен лимит запросов. Попробуйте через {window} секунд.",
                    "code": "RATE_LIMIT_EXCEEDED",
                    "retry_after": window
                },
                headers={"Retry-After": str(window)}
            )
        
        # Записываем запрос
        self._record_request(client_key, path)
        
        # Добавляем заголовки о лимитах в ответ
        response = await call_next(request)
        
        remaining = self._get_remaining(client_key, path, limit, window)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(window)
        
        return response
    
    def _get_client_key(self, request: Request) -> str:
        """Получает уникальный ключ клиента (IP + User-Agent)"""
        # Получаем реальный IP (учитываем прокси)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        user_agent = request.headers.get("User-Agent", "")
        
        # Создаём хеш для уникальности
        key = f"{ip}:{user_agent}"
        return hashlib.md5(key.encode()).hexdigest()
    
    def _get_limits(self, path: str) -> Tuple[int, int]:
        """Возвращает лимиты для конкретного endpoint"""
        if "/auth/login" in path:
            return self.login_limit, self.login_window
        elif "/upload" in path or "/photos" in path:
            return self.upload_limit, self.upload_window
        else:
            return self.default_limit, self.default_window
    
    def _check_rate_limit(
        self, 
        client_key: str, 
        path: str, 
        limit: int, 
        window: int
    ) -> bool:
        """Проверяет не превышен ли лимит"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window)
        
        # Ключ для конкретного endpoint
        endpoint_key = f"{client_key}:{self._normalize_path(path)}"
        
        # Фильтруем старые запросы
        self.requests[endpoint_key] = [
            ts for ts in self.requests[endpoint_key]
            if ts > window_start
        ]
        
        return len(self.requests[endpoint_key]) < limit
    
    def _record_request(self, client_key: str, path: str):
        """Записывает запрос"""
        endpoint_key = f"{client_key}:{self._normalize_path(path)}"
        self.requests[endpoint_key].append(datetime.utcnow())
    
    def _get_remaining(
        self, 
        client_key: str, 
        path: str, 
        limit: int, 
        window: int
    ) -> int:
        """Возвращает оставшееся количество запросов"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window)
        
        endpoint_key = f"{client_key}:{self._normalize_path(path)}"
        
        count = len([
            ts for ts in self.requests.get(endpoint_key, [])
            if ts > window_start
        ])
        
        return max(0, limit - count)
    
    def _normalize_path(self, path: str) -> str:
        """Нормализует путь для группировки лимитов"""
        # Убираем ID из путей
        parts = path.split("/")
        normalized = []
        for part in parts:
            # Если часть похожа на ID - заменяем на placeholder
            if part.isdigit() or (len(part) > 20 and "-" in part):
                normalized.append("{id}")
            else:
                normalized.append(part)
        return "/".join(normalized)
    
    def _is_blocked(self, client_key: str) -> bool:
        """Проверяет заблокирован ли клиент"""
        if client_key not in self.blocked_ips:
            return False
        
        blocked_until = self.blocked_ips[client_key]
        if datetime.utcnow() > blocked_until:
            del self.blocked_ips[client_key]
            return False
        
        return True
    
    def _block_ip(self, client_key: str, duration: int = 300):
        """Блокирует IP на указанное время (по умолчанию 5 минут)"""
        self.blocked_ips[client_key] = datetime.utcnow() + timedelta(seconds=duration)
    
    async def cleanup_old_records(self):
        """Периодическая очистка старых записей"""
        while True:
            await asyncio.sleep(60)  # Каждую минуту
            
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=5)
            
            # Очищаем старые запросы
            for key in list(self.requests.keys()):
                self.requests[key] = [
                    ts for ts in self.requests[key]
                    if ts > cutoff
                ]
                if not self.requests[key]:
                    del self.requests[key]
            
            # Очищаем истёкшие блокировки
            for key in list(self.blocked_ips.keys()):
                if now > self.blocked_ips[key]:
                    del self.blocked_ips[key]
