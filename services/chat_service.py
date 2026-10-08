import json

from fastapi import HTTPException
from google import genai

from log import log_action
from models.schemas import NewUser, UpdateUser
from services import ldap_service, profile_service, storage_service

MODEL = "gemini-3.5-flash-lite"

client = genai.Client()

get_user_declaration = {
    "type": "function",
    "name": "get_user",
    "description": "Looks up one LDAP user by their uid and returns their cn, sn, uid and ou.",
    "parameters": {
        "type": "object",
        "properties": {
            "uid": {
                "type": "string",
                "description": "The user's login name, for example ahmet.yilmaz",
            },
        },
        "required": ["uid"],
    },
}

list_users_declaration = {
    "type": "function",
    "name": "list_users",
    "description": (
        "Lists LDAP users with their cn, sn, uid and ou. "
        "Can be filtered by a search text. With no search text, it lists all users."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "search": {
                "type": "string",
                "description": "Part of a name, surname or uid to search for, for example ali",
            },
            "field": {
                "type": "string",
                "enum": ["cn", "sn", "uid"],
                "description": "Which field to search in. If left out, all three fields are searched.",
            },
        },
        "required": [],
    },
}

create_user_declaration = {
    "type": "function",
    "name": "create_user",
    "description": (
        "Creates a new LDAP user. All fields are required. "
        "Ask the admin for any missing value instead of inventing one."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "uid": {
                "type": "string",
                "description": "The new user's login name, for example ali.veli",
            },
            "cn": {
                "type": "string",
                "description": "The user's common name, usually the same as the uid, for example ali.veli",
            },
            "sn": {
                "type": "string",
                "description": "The user's surname, for example Veli",
            },
            "ou": {
                "type": "string",
                "description": "The department (organizational unit), for example IT, DEV or Admins",
            },
            "password": {
                "type": "string",
                "description": "The user's initial password, as given by the admin",
            },
        },
        "required": ["uid", "cn", "sn", "ou", "password"],
    },
}

update_user_declaration = {
    "type": "function",
    "name": "update_user",
    "description": (
        "Updates an existing LDAP user's surname and/or department. "
        "Only sn and ou can be changed; cn and password cannot."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "uid": {
                "type": "string",
                "description": "The login name of the user to update, for example mehmet.gur",
            },
            "sn": {
                "type": "string",
                "description": "The new surname. Leave out to keep the current one.",
            },
            "ou": {
                "type": "string",
                "description": "The new department, for example IT or DEV. Leave out to keep the current one.",
            },
        },
        "required": ["uid"],
    },
}

delete_user_declaration = {
    "type": "function",
    "name": "delete_user",
    "description": (
        "Permanently deletes an LDAP user, including their profile and avatar. "
        "This cannot be undone. Only call this after the admin has clearly confirmed the deletion."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "uid": {
                "type": "string",
                "description": "The login name of the user to delete, for example ali.veli",
            },
        },
        "required": ["uid"],
    },
}

TOOLS = [
    get_user_declaration,
    list_users_declaration,
    create_user_declaration,
    update_user_declaration,
    delete_user_declaration,
]


def _run_tool(name: str, arguments: dict, actor: str) -> dict:
    try:
        if name == "get_user":
            conn = ldap_service.get_admin_connection()
            return ldap_service.one_user(conn, arguments["uid"])

        elif name == "list_users":
            conn = ldap_service.get_admin_connection()
            users = ldap_service.list_users(conn, arguments.get("search"), arguments.get("field"))
            return {"users": users}

        elif name == "create_user":
            conn = ldap_service.get_admin_connection()
            new_user = NewUser(**arguments)
            result = ldap_service.create_user(conn, new_user)
            log_action({"who": actor, "what": "Create_User", "whom": new_user.uid, "via": "chatbot"})
            return result

        elif name == "update_user":
            conn = ldap_service.get_admin_connection()
            updates = UpdateUser(sn=arguments.get("sn"), ou=arguments.get("ou"))
            result = ldap_service.update_user(conn, arguments["uid"], updates)
            log_action({
                "who": actor,
                "what": "Update_User",
                "whom": arguments["uid"],
                "which": {"sn": updates.sn, "ou": updates.ou},
                "via": "chatbot",
            })
            return result

        elif name == "delete_user":
            uid = arguments["uid"]
            conn = ldap_service.get_admin_connection()
            result = ldap_service.delete_user(conn, uid)
            profile_service.delete_profile(uid)
            storage_service.delete_avatar(uid)
            log_action({"who": actor, "what": "Delete_User", "whom": uid, "via": "chatbot"})
            return result

    except HTTPException as e:
        return {"error": e.detail}
    return {"error": "Unknown tool"}


MAX_ROUNDS = 5


def handle_message(text: str, actor: str) -> str:
    response = client.interactions.create(
        model=MODEL,
        input=text,
        tools=TOOLS,
    )

    for _ in range(MAX_ROUNDS):
        calls = []
        for step in response.steps:
            if step.type == "function_call":
                calls.append(step)

        if not calls:
            return response.output_text

        results = []
        for call in calls:
            result = _run_tool(call.name, call.arguments, actor)
            results.append({
                "type": "function_result",
                "name": call.name,
                "call_id": call.id,
                "result": [{"type": "text", "text": json.dumps(result)}],
            })

        response = client.interactions.create(
            model=MODEL,
            input=results,
            tools=TOOLS,
            previous_interaction_id=response.id,
        )

    return "Bu isteği tamamlayamadım, çok fazla adım gerekti. Lütfen daha basit bir şekilde tekrar deneyin."