import os
import uuid
from datetime import datetime, timezone

from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB = os.environ.get("MONGO_DB", "ldap_project")

client = MongoClient(MONGO_URL)
conversations = client[MONGO_DB]["conversations"]


def create(owner: str, title: str) -> str:
    conv_id = str(uuid.uuid4())
    conversations.insert_one({
        "_id": conv_id,
        "owner": owner,
        "title": title,
        "messages": [],
        "history": [],
        "updated_at": datetime.now(timezone.utc),
    })
    return conv_id


def list_for(owner: str) -> list:
    return list(
        conversations.find({"owner": owner}, projection={"title": True})
        .sort("updated_at", -1)
    )


def get(owner: str, conv_id: str) -> dict | None:
    return conversations.find_one({"_id": conv_id, "owner": owner})


def history(conv: dict) -> list[dict]:
    if "history" in conv:
        return conv["history"]
    return [
        {"role": "user" if m["role"] == "user" else "assistant", "text": m["text"]}
        for m in conv.get("messages", [])
    ]


def add_turn(owner: str, conv_id: str, user_text: str, bot_text: str, turn_history: list[dict]):
    conv = get(owner, conv_id)
    previous = history(conv) if conv else []
    conversations.update_one(
        {"_id": conv_id, "owner": owner},
        {
            "$push": {"messages": {"$each": [
                {"role": "user", "text": user_text},
                {"role": "bot", "text": bot_text},
            ]}},
            "$set": {
                "history": previous + turn_history,
                "updated_at": datetime.now(timezone.utc),
            },
        },
    )
