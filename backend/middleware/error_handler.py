"""
Global Error Handler
Централизованная обработка ошибок
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError
import traceback
import logging
from datetime import datetime
from typing import Union

logger = logging.getLogger("api")


# Маппинг кодов ошибок на сообщения
ERROR_MESSAGES = {
    400: "Некорректный запрос",
    401: "Требуется авторизация",
    403: "Доступ запрещён",
    404: "Ресурс не найден",
    405: "Метод не разрешён",
    408: "Время ожидания истекло",
    409: "Конфликт данных",
    413: "Слишком большой запрос",
    415: "Неподдерживаемый тип содержимого",
    422: "Ошибка валидации данных",
    429: "Слишком много запросов",
    500: "Внутренняя ошибка сервера",
    502: "Ошибка шлюза",
    503: "Сервис временно недоступен",
    504: "Время ожидания шлюза истекло",
}


class AppException(Exception):
    """
    Базовое исключение приложения
    
    Использование:
    raise AppException(
        status_code=400,
        code="INVALID_DATA",
        message="Некорректные данные",
        details={"field": "email", "error": "Неверный формат"}
    )
    """
    
    def __init__(
        self,
        status_code: int = 400,
        code: str = "ERROR",
        message: str = None,
        details: dict = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message or ERROR_MESSAGES.get(status_code, "Ошибка")
        self.details = details
        super().__init__(self.message)


class DatabaseException(AppException):
    """Ошибки базы данных"""
    def __init__(self, message: str = "Ошибка базы данных", details: dict = None):
        super().__init__(
            status_code=500,
            code="DATABASE_ERROR",
            message=message,
            details=details
        )


class AuthException(AppException):
    """Ошибки авторизации"""
    def __init__(self, message: str = "Ошибка авторизации", code: str = "AUTH_ERROR"):
        super().__init__(
            status_code=401,
            code=code,
            message=message
        )


class PermissionException(AppException):
    """Ошибки прав доступа"""
    def __init__(self, message: str = "Недостаточно прав доступа"):
        super().__init__(
            status_code=403,
            code="FORBIDDEN",
            message=message
        )


class NotFoundException(AppException):
    """Ресурс не найден"""
    def __init__(self, resource: str = "Ресурс", resource_id: str = None):
        message = f"{resource} не найден"
        if resource_id:
            message = f"{resource} с ID {resource_id} не найден"
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=message
        )


class ValidationException(AppException):
    """Ошибки валидации"""
    def __init__(self, message: str = "Ошибка валидации", errors: list = None):
        super().__init__(
            status_code=422,
            code="VALIDATION_ERROR",
            message=message,
            details={"errors": errors or []}
        )


def create_error_response(
    status_code: int,
    code: str,
    message: str,
    details: dict = None,
    request_id: str = None,
) -> JSONResponse:
    """Создаёт стандартизированный ответ об ошибке"""
    
    content = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "status_code": status_code,
            "timestamp": datetime.utcnow().isoformat(),
        }
    }
    
    if details:
        content["error"]["details"] = details
    
    if request_id:
        content["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )


async def app_exception_handler(request: Request, exc: AppException):
    """Обработчик AppException"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    logger.warning(
        f"AppException: {exc.code} - {exc.message}",
        extra={
            "extra_data": {
                "request_id": request_id,
                "code": exc.code,
                "status_code": exc.status_code,
                "path": request.url.path,
            }
        }
    )
    
    return create_error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
        request_id=request_id,
    )


async def http_exception_handler(
    request: Request, 
    exc: Union[HTTPException, StarletteHTTPException]
):
    """Обработчик HTTP исключений"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    message = str(exc.detail) if exc.detail else ERROR_MESSAGES.get(exc.status_code, "Ошибка")
    
    return create_error_response(
        status_code=exc.status_code,
        code=f"HTTP_{exc.status_code}",
        message=message,
        request_id=request_id,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Обработчик ошибок валидации Pydantic"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
        })
    
    return create_error_response(
        status_code=422,
        code="VALIDATION_ERROR",
        message="Ошибка валидации данных",
        details={"errors": errors},
        request_id=request_id,
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Обработчик всех остальных исключений"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    # Логируем полный traceback
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "extra_data": {
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }
        }
    )
    
    # В production не показываем детали ошибки
    return create_error_response(
        status_code=500,
        code="INTERNAL_ERROR",
        message="Внутренняя ошибка сервера",
        request_id=request_id,
    )


def error_handler(app):
    """
    Регистрирует все обработчики ошибок
    
    Использование:
    from middleware import error_handler
    error_handler(app)
    """
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
