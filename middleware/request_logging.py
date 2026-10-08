import json
import logging
import time
from log import log_request

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        log_entry = {
            "method": request.method,
            "path": request.url.path,
            "query": request.url.query or None,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client": request.client.host if request.client else None,
        }
        log_request(log_entry)
        return response
