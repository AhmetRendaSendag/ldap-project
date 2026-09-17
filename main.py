from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.users import router as users_router
from middleware.request_logging import RequestLoggingMiddleware

app = FastAPI()

app.add_middleware(RequestLoggingMiddleware)


@app.get("/")
def read_root():
    return {"message": "LDAP API IS RUNNING"}


app.include_router(users_router)

app.mount("/gui", StaticFiles(directory="static", html=True), name="static")
