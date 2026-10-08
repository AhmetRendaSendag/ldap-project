import os

from fastapi import HTTPException
from ldap3 import Server, Connection, ALL, MODIFY_REPLACE
from ldap3.core.exceptions import LDAPBindError
from ldap3.utils.dn import parse_dn
from ldap3.utils.conv import escape_filter_chars

from models.schemas import NewUser, UpdateUser

LDAP_SERVER = os.environ.get("LDAP_SERVER", "localhost")
LDAP_BASE_DN = "dc=lab,dc=deneme"
LDAP_ADMIN_DN = f"cn=admin,{LDAP_BASE_DN}"
LDAP_ADMIN_PASSWORD = os.environ.get("LDAP_ADMIN_PASSWORD", "admin")

_DN_ESCAPE_MAP = {
    "\\": "\\\\",
    ",": "\\,",
    "+": "\\+",
    '"': '\\"',
    "<": "\\<",
    ">": "\\>",
    ";": "\\;",
    "=": "\\=",
}


def escape_dn_value(value: str) -> str:
    escaped = "".join(_DN_ESCAPE_MAP.get(char, char) for char in value)
    if escaped.startswith(" ") or escaped.startswith("#"):
        escaped = "\\" + escaped
    if escaped.endswith(" ") and not escaped.endswith("\\ "):
        escaped = escaped[:-1] + "\\ "
    return escaped


def resolve_bind_dn(username: str) -> str:
    """Look up a user's actual DN by uid, falling back to a guessed uid=... DN."""
    bind_dn = f"uid={escape_dn_value(username)},{LDAP_BASE_DN}"
    try:
        admin_conn = get_admin_connection()
        admin_conn.search(
            LDAP_BASE_DN,
            f"(uid={escape_filter_chars(username)})",
            attributes=[],
        )
        if admin_conn.entries:
            bind_dn = str(admin_conn.entries[0].entry_dn)
        admin_conn.unbind()
    except LDAPBindError:
        pass
    return bind_dn


def bind_as(bind_dn: str, password: str) -> Connection:
    server = Server(LDAP_SERVER, get_info=ALL)
    try:
        return Connection(server, bind_dn, password, auto_bind=True)
    except LDAPBindError:
        raise HTTPException(status_code=401, detail="Invalid LDAP credentials")


def get_admin_connection() -> Connection:
    return bind_as(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD)


def get_ou(dn: str) -> str | None:
    for attribute, value, separator in parse_dn(dn):
        if attribute.lower() == "ou":
            return value
    return None


def normalize_dn(dn: str) -> tuple:
    return tuple((attribute.lower(), value.lower()) for attribute, value, separator in parse_dn(dn))


def find_user_dn(uid: str) -> str:
    conn = get_admin_connection()
    conn.search(LDAP_BASE_DN, f"(uid={escape_filter_chars(uid)})", attributes=[])
    user_dn = conn.entries[0].entry_dn if conn.entries else None
    conn.unbind()
    if user_dn is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user_dn


def list_users(conn: Connection, term: str | None = None, field: str | None = None) -> list[dict]:
    if term is not None:
        filter_string = search_users(term, field)
    else:
        filter_string = "(objectClass=inetOrgPerson)"

    conn.search(LDAP_BASE_DN, filter_string, attributes=["cn", "sn", "uid"])
    results = []
    for entry in conn.entries:
        results.append({
            "cn": str(entry.cn),
            "sn": str(entry.sn),
            "uid": str(entry.uid),
            "ou": get_ou(str(entry.entry_dn))
        })
    conn.unbind()
    return results

def search_users(term: str, field: str | None = None) -> str:
    useStr = escape_filter_chars(term)

    if field is None:
        arama = f"(&(objectClass=inetOrgPerson)(|(sn=*{useStr}*)(cn=*{useStr}*)(uid=*{useStr}*)))"
    else:
        arama = f"(&(objectClass=inetOrgPerson)({field}=*{useStr}*))"
   
    return arama

def one_user(conn: Connection, uid: str) -> dict:
    conn.search(LDAP_BASE_DN, f"(uid={escape_filter_chars(uid)})", attributes=["cn", "sn", "uid", "ou"])
    if not conn.entries:
        conn.unbind()
        raise HTTPException(status_code=404, detail=f"User with uid '{uid}' not found")
    data = {
                "cn": str(conn.entries[0].cn),
                "sn": str(conn.entries[0].sn),
                "uid": str(conn.entries[0].uid),
                "ou": get_ou(str(conn.entries[0].entry_dn))
            }
    conn.unbind()
    return data


def create_user(conn: Connection, new_user: NewUser) -> dict:
    conn.search(LDAP_BASE_DN, f"(uid={escape_filter_chars(new_user.uid)})", attributes=[])
    if conn.entries:
        conn.unbind()
        raise HTTPException(status_code=409, detail=f"User with uid '{new_user.uid}' already exists")

    user_dn = f"uid={escape_dn_value(new_user.uid)},ou={escape_dn_value(new_user.ou)},{LDAP_BASE_DN}"
    success = conn.add(
        user_dn,
        object_class=["inetOrgPerson"],
        attributes={
            "cn": new_user.cn,
            "sn": new_user.sn,
            "uid": new_user.uid,
            "userPassword": new_user.password
        }
    )
    if not success:
        conn.unbind()
        print(f"LDAP add failed for {user_dn}: {conn.result}")
        raise HTTPException(status_code=400, detail="Could not create user")
    conn.unbind()
    return {"message": f"User {new_user.cn} created successfully", "dn": user_dn}


def update_user(conn: Connection, uid: str, updates: UpdateUser) -> dict:
    conn.search(LDAP_BASE_DN, f"(uid={escape_filter_chars(uid)})", attributes=["uid"])
    if not conn.entries:
        conn.unbind()
        raise HTTPException(status_code=404, detail=f"User with uid '{uid}' not found")

    user_dn = str(conn.entries[0].entry_dn)
    changes = {}
    if updates.sn:
        changes["sn"] = [(MODIFY_REPLACE, [updates.sn])]

    if updates.ou:
        uid_value = escape_dn_value(str(conn.entries[0].uid))
        new_ou = escape_dn_value(updates.ou)
        new_dn = f"uid={uid_value},ou={new_ou},{LDAP_BASE_DN}"
        if normalize_dn(new_dn) != normalize_dn(user_dn):
            moved = conn.modify_dn(
                user_dn,
                f"uid={uid_value}",
                delete_old_dn=False,
                new_superior=f"ou={new_ou},{LDAP_BASE_DN}",
            )
            if not moved:
                conn.unbind()
                print(f"LDAP modify_dn failed for {user_dn}: {conn.result}")
                raise HTTPException(status_code=400, detail="Could not move user")
            user_dn = new_dn

    if changes:
        conn.modify(user_dn, changes)

    conn.unbind()
    return {"message": f"User {uid} updated", "dn": user_dn}


def delete_user(conn: Connection, uid: str) -> dict:
    conn.search(LDAP_BASE_DN, f"(uid={escape_filter_chars(uid)})", attributes=["cn"])
    if not conn.entries:
        conn.unbind()
        raise HTTPException(status_code=404, detail=f"User with uid '{uid}' not found")

    user_dn = str(conn.entries[0].entry_dn)
    success = conn.delete(user_dn)
    conn.unbind()

    if not success:
        print(f"LDAP delete failed for {user_dn}: {conn.result}")
        raise HTTPException(status_code=400, detail="Could not delete user")
    return {"message": f"User {uid} deleted", "dn": user_dn}
