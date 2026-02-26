"""
Security Middleware
Заголовки безопасности и защита от атак
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Set, Dict, Tuple
from datetime import datetime, timedelta
import re
import hashlib


# ============== BRUTE FORCE PROTECTION ==============
# Импортируется в routes/auth.py как: from middleware.security import brute_force_protection

class BruteForceProtection:
    """Защита от перебора паролей на уровне IP"""

    def __init__(self, max_attempts: int = 10, window: int = 300, block_duration: int = 600):
        self.max_attempts = max_attempts
        self.window = window  # секунд
        self.block_duration = block_duration  # секунд
        # {ip: [(timestamp, success), ...]}
        self._attempts: Dict[str, list] = {}
        # {ip: blocked_until}
        self._blocked: Dict[str, datetime] = {}

    def _clean_old(self, ip: str):
        cutoff = datetime.utcnow() - timedelta(seconds=self.window)
        self._attempts[ip] = [
            (ts, ok) for ts, ok in self._attempts.get(ip, [])
            if ts > cutoff
        ]

    def is_locked(self, ip: str) -> Tuple[bool, int]:
        if ip in self._blocked:
            blocked_until = self._blocked[ip]
            if datetime.utcnow() < blocked_until:
                remaining = int((blocked_until - datetime.utcnow()).total_seconds())
                return True, remaining
            else:
                del self._blocked[ip]
        return False, 0

    def record_attempt(self, ip: str, success: bool):
        if ip not in self._attempts:
            self._attempts[ip] = []
        self._attempts[ip].append((datetime.utcnow(), success))
        self._clean_old(ip)

        if not success:
            failed = sum(1 for _, ok in self._attempts.get(ip, []) if not ok)
            if failed >= self.max_attempts:
                self._blocked[ip] = datetime.utcnow() + timedelta(seconds=self.block_duration)
                self._attempts[ip] = []

    def get_remaining_attempts(self, ip: str) -> int:
        self._clean_old(ip)
        failed = sum(1 for _, ok in self._attempts.get(ip, []) if not ok)
        return max(0, self.max_attempts - failed)


# Глобальный экземпляр (импортируется в routes/auth.py)
brute_force_protection = BruteForceProtection()


# ============== SUSPICIOUS PATTERNS ==============

SUSPICIOUS_PATTERNS = [
    r"(\%27)|(\')|(\-\-)|(\%23)|(#)",
    r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))",
    r"<script[^>]*>.*?</script>",
    r"javascript:",
    r"on\w+\s*=",
    r"<iframe",
    r"\.\./",
    r"etc/passwd",
    r"cmd\.exe",
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in SUSPICIOUS_PATTERNS]


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware для защиты от XSS, SQL-injection, clickjacking
    """

    def __init__(
        self,
        app,
        enable_xss_protection: bool = True,
        enable_sql_injection_protection: bool = True,
        allowed_hosts: Set[str] = None,
    ):
        super().__init__(app)
        self.enable_xss_protection = enable_xss_protection
        self.enable_sql_injection_protection = enable_sql_injection_protection
        self.allowed_hosts = allowed_hosts or {"*"}

    async def dispatch(self, request: Request, call_next):
        if not self._check_host(request):
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid host header", "code": "INVALID_HOST"}
            )

        if self.enable_sql_injection_protection:
            if self._check_suspicious_patterns(request):
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Suspicious request detected", "code": "SUSPICIOUS_REQUEST"}
                )

        response = await call_next(request)

        # Заголовки безопасности
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"

        return response

    def _check_host(self, request: Request) -> bool:
        if "*" in self.allowed_hosts:
            return True
        host = request.headers.get("host", "").split(":")[0]
        return host in self.allowed_hosts

    def _check_suspicious_patterns(self, request: Request) -> bool:
        url_str = str(request.url)
        for pattern in COMPILED_PATTERNS:
            if pattern.search(url_str):
                return True
        return False
