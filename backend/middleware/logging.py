"""Request/Response logging middleware"""
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import logging
import time
import uuid

logger = logging.getLogger("api.requests")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.time()
        response = await call_next(request)
        duration = round((time.time() - start) * 1000, 2)
        logger.info(f"[{request_id}] {request.method} {request.url.path} -> {response.status_code} ({duration}ms)")
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(duration)
        return response
