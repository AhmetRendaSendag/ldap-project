from fastapi import APIRouter, Depends

from models.schemas import LoginRequest, NewUser, UpdateUser
from services import auth_service, ldap_service

router = APIRouter()


@router.post("/login")
def login(credentials: LoginRequest):
    identity = auth_service.authenticate(credentials.username, credentials.password)
    token = auth_service.create_access_token(identity["bind_dn"], identity["is_admin"])
    return {"access_token": token, "token_type": "bearer"}


@router.get("/users")
def list_users(token: dict = Depends(auth_service.get_current_token)):
    conn = ldap_service.get_admin_connection()
    return {"users": ldap_service.list_users(conn)}


@router.post("/users")
def create_user(new_user: NewUser, token: dict = Depends(auth_service.require_admin_token)):
    conn = ldap_service.get_admin_connection()
    return ldap_service.create_user(conn, new_user)


@router.put("/users/{uid}")
def update_user(uid: str, updates: UpdateUser, token: dict = Depends(auth_service.require_admin_token)):
    conn = ldap_service.get_admin_connection()
    return ldap_service.update_user(conn, uid, updates)


@router.delete("/users/{uid}")
def delete_user(uid: str, token: dict = Depends(auth_service.require_admin_token)):
    conn = ldap_service.get_admin_connection()
    return ldap_service.delete_user(conn, uid)
