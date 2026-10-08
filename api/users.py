from typing import Literal

from fastapi import APIRouter, Depends
from log import log_action

from models.schemas import LoginRequest, NewUser, UpdateUser
from services import auth_service, ldap_service, profile_service, storage_service

router = APIRouter()


@router.post("/login")
def login(credentials: LoginRequest):
    identity = auth_service.authenticate(credentials.username, credentials.password)
    token = auth_service.create_access_token(identity["bind_dn"], identity["uid"], identity["is_admin"])
    return {"access_token": token, "token_type": "bearer"}


@router.get("/users")
def list_users(search: str | None = None, field: Literal["cn", "sn", "uid"] | None = None, token: dict = Depends(auth_service.get_current_token)):
    conn = ldap_service.get_admin_connection()
    job = {
              "who" : token["sub"],
              "what" : "List_Users",
        } 
    log_action(job)

    full_list = ldap_service.list_users(conn, search, field)

    filtered = []
    for entry in full_list:
        data = {"cn": entry["cn"], "sn": entry["sn"], "uid": entry["uid"]}
        if auth_service.is_token_owner(token, entry["uid"]) or token.get("is_admin"):
            data["ou"] = entry["ou"]
        filtered.append(data)

    return {"users": filtered}

@router.get("/users/{uid}")
def one_user(uid: str, token: dict = Depends(auth_service.get_current_token)):
    conn = ldap_service.get_admin_connection()
    full = ldap_service.one_user(conn, uid)

    data = {"cn": full["cn"], "sn": full["sn"], "uid": full["uid"]}

    if auth_service.is_token_owner(token, uid) or token.get("is_admin"):
        data["ou"] = full["ou"]

    return data

@router.post("/users")
def create_user(new_user: NewUser, token: dict = Depends(auth_service.require_admin_token)):
    conn = ldap_service.get_admin_connection()
    job = {
          "who" : token["sub"],
          "what" : "Create_User",
          "whom" : (new_user.uid),
    } 
    log_action(job)
    return ldap_service.create_user(conn, new_user)


@router.put("/users/{uid}")
def update_user(uid: str, updates: UpdateUser, token: dict = Depends(auth_service.require_admin_token)):
    conn = ldap_service.get_admin_connection()
    job = {
                  "who" : token["sub"],
                  "what" : "Update_User",
                  "whom" : (uid),
                  "which" : {"sn": updates.sn, "ou": updates.ou}
            } 
    log_action(job)
    return ldap_service.update_user(conn, uid, updates)


@router.delete("/users/{uid}")
def delete_user(uid: str, token: dict = Depends(auth_service.require_admin_token)):
    conn = ldap_service.get_admin_connection()
    job = {
              "who" : token["sub"],
              "what" : "Delete_User",
              "whom" : (uid),
        } 
    log_action(job)
    result = ldap_service.delete_user(conn, uid)
    profile_service.delete_profile(uid)
    storage_service.delete_avatar(uid)
    return result
