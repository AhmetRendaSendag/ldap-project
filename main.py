from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


from api.avatars import router as avatars_router
from api.profiles import router as profiles_router
from api.qr import router as qr_router
from api.users import router as users_router
from middleware.request_logging import RequestLoggingMiddleware
from reader import router as reader_router
from api.tunnel import router as tunnel_router
from api.chat import router as chat_router

app = FastAPI()

app.add_middleware(RequestLoggingMiddleware)

app.include_router(users_router)

app.include_router(avatars_router)

app.include_router(profiles_router)

app.include_router(qr_router)

app.include_router(reader_router)

app.include_router(tunnel_router)

app.include_router(chat_router)

app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    """Serve the React app for any non-API path so client-side routes (e.g. /login) work on refresh."""
    return FileResponse("static/index.html")
