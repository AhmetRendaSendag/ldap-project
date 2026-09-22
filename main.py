from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.users import router as users_router
from middleware.request_logging import RequestLoggingMiddleware

app = FastAPI()

app.add_middleware(RequestLoggingMiddleware)

app.include_router(users_router)

app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    """Serve the React app for any non-API path so client-side routes (e.g. /login) work on refresh."""
    return FileResponse("static/index.html")
