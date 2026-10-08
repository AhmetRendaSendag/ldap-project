import json
from fastapi import APIRouter, Depends
from ldap3.utils.conv import escape_filter_chars
from ldap3.utils.dn import parse_dn

from services import auth_service, ldap_service


router = APIRouter()


def _infer_type(entry: dict) -> str:
    if "method" in entry:
        return "request"
    if "bind_dn" in entry:
        return "login"
    if "who" in entry:
        return "action"
    return "unknown"


def _normalize_dn(dn: str) -> tuple | None:
    try:
        return tuple((attribute.lower(), value.lower()) for attribute, value, separator in parse_dn(dn))
    except Exception:
        return None


def _find_user_dn(uid: str) -> str | None:
    conn = ldap_service.get_admin_connection()
    conn.search(ldap_service.LDAP_BASE_DN, f"(uid={escape_filter_chars(uid)})", attributes=[])
    user_dn = conn.entries[0].entry_dn if conn.entries else None
    conn.unbind()
    return user_dn


@router.get("/Print_Log")
def printer(
    type: str | None = None,
    method: str | None = None,
    path: str | None = None,
    ip: str | None = None,
    user: str | None = None,
    what: str | None = None,
    whom: str | None = None,
    token: dict = Depends(auth_service.require_admin_token),
):
    results = []
    with open("log") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if type and _infer_type(entry) != type:
                continue
            if method and entry.get("method", "").upper() != method.upper():
                continue
            if path and entry.get("path", "") != path:
                continue
            if ip and ip.lower() not in entry.get("client", "").lower():
                continue
            if user:
                user_field = entry.get("bind_dn", "") + entry.get("who", "")
                if user.lower() not in user_field.lower():
                    continue
            if what and entry.get("what", "") != what:
                continue
            if whom and entry.get("whom", "") != whom:
                continue

            results.append(entry)

    results.sort(key=lambda e: e.get("time", ""), reverse=True)
    return results

@router.get("/users/{uid}/last-login")
def last_login(uid: str, token: dict = Depends(auth_service.get_current_token)):
    user_dn = _find_user_dn(uid)
    if user_dn is None:
        return {"uid": uid, "last_login": None}
    target = _normalize_dn(user_dn)

    latest = None
    with open("log") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if _infer_type(entry) != "login":
                continue
            if "uid" in entry:
                if entry["uid"].lower() != uid.lower():
                    continue
            elif _normalize_dn(entry.get("bind_dn", "")) != target:
                continue

            if latest is None or entry.get("time", "") > latest.get("time", ""):
                latest = entry

    if latest is None:
        return {"uid": uid, "last_login": None}

    return {"uid": uid, "last_login": latest.get("time")}