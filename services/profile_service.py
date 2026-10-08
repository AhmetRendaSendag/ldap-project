import os

from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB = os.environ.get("MONGO_DB", "ldap_project")

client = MongoClient(MONGO_URL)
profiles = client[MONGO_DB]["profiles"]


def put_profile(uid: str, data: dict):
    profiles.replace_one({"_id": uid}, data, upsert=True)


def get_profile(uid: str) -> dict | None:
    """Return the user's stored profile fields, or None if they haven't saved any."""
    return profiles.find_one({"_id": uid}, projection={"_id": False})


def delete_profile(uid: str):
    profiles.delete_one({"_id": uid})
