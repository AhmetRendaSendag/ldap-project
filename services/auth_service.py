import os
from datetime import datetime, timedelta, timezone
from log import log_login

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services import ldap_service

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me-please-its-not-long-enough-otherwise")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "30"))

ADMIN_OU = "Admins"

_bearer_scheme = HTTPBearer()


def authenticate(username: str, password: str) -> dict:
 
    bind_dn = ldap_service.resolve_bind_dn(username)
    conn = ldap_service.bind_as(bind_dn, password)
    conn.unbind()
    user_ou = ldap_service.get_ou(bind_dn)
    who = {
        "uid": username,
        "bind_dn": bind_dn,
        "is_admin": (user_ou or "").lower() == ADMIN_OU.lower(),
    }
    log_login(who)
    return(who)
    


def create_access_token(bind_dn: str, uid: str, is_admin: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": bind_dn, "uid": uid, "is_admin": is_admin, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_token(credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme)) -> dict:
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def is_token_owner(token: dict, uid: str) -> bool:
    return token.get("uid", "").lower() == uid.lower()


def require_admin_token(token: dict = Depends(get_current_token)) -> dict:
    if not token.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admin can perform this action")
    return token
