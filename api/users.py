from fastapi import APIRouter, Depends
from ldap3 import Connection

from models.schemas import NewUser, UpdateUser
from services import ldap_service

router = APIRouter()


@router.get("/users")
def list_users(conn: Connection = Depends(ldap_service.get_ldap_connection)):
    return {"users": ldap_service.list_users(conn)}


@router.post("/users")
def create_user(new_user: NewUser, conn: Connection = Depends(ldap_service.require_admin)):
    return ldap_service.create_user(conn, new_user)


@router.put("/users/{uid}")
def update_user(uid: str, updates: UpdateUser, conn: Connection = Depends(ldap_service.require_admin)):
    return ldap_service.update_user(conn, uid, updates)


@router.delete("/users/{uid}")
def delete_user(uid: str, conn: Connection = Depends(ldap_service.require_admin)):
    return ldap_service.delete_user(conn, uid)
