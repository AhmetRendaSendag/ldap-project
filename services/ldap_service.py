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
    """Look up a user's actual DN by uid, falling back to a guessed cn=... DN."""
    bind_dn = f"cn={escape_dn_value(username)},{LDAP_BASE_DN}"
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


def list_users(conn: Connection) -> list[dict]:
    conn.search(LDAP_BASE_DN, "(objectClass=inetOrgPerson)", attributes=["cn", "sn", "uid"])
    results = []
    for entry in conn.entries:
        dn_components = parse_dn(str(entry.entry_dn))
        ou_value = None
        for attribute, value, separator in dn_components:
            if attribute.lower() == "ou":
                ou_value = value
                break
        results.append({
            "cn": str(entry.cn),
            "sn": str(entry.sn),
            "uid": str(entry.uid),
            "ou": ou_value
        })
    conn.unbind()
    return results


def create_user(conn: Connection, new_user: NewUser) -> dict:
    user_dn = f"cn={escape_dn_value(new_user.cn)},ou={escape_dn_value(new_user.ou)},{LDAP_BASE_DN}"
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
    conn.search(LDAP_BASE_DN, f"(uid={escape_filter_chars(uid)})", attributes=["cn"])
    if not conn.entries:
        conn.unbind()
        raise HTTPException(status_code=404, detail=f"User with uid '{uid}' not found")

    user_dn = str(conn.entries[0].entry_dn)
    changes = {}
    if updates.sn:
        changes["sn"] = [(MODIFY_REPLACE, [updates.sn])]

    if updates.ou:
        cn_value = escape_dn_value(str(conn.entries[0].cn))
        new_ou = escape_dn_value(updates.ou)
        new_dn = f"cn={cn_value},ou={new_ou},{LDAP_BASE_DN}"
        conn.modify_dn(user_dn, f"cn={cn_value}", new_superior=f"ou={new_ou},{LDAP_BASE_DN}")
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
