import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("ldap_project.log")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.FileHandler("log")
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.propagate = False

def log_request(entry: dict):
    Tentry = entry.copy()
    Tentry["time"] = datetime.now(timezone.utc).isoformat()
    logger.info(json.dumps(Tentry))

def log_login(who: dict):
    Twho = who.copy()
    Twho["time"] = datetime.now(timezone.utc).isoformat()
    logger.info(json.dumps(Twho))

def log_action(what: dict):
    Twhat = what.copy()
    Twhat["time"] = datetime.now(timezone.utc).isoformat()
    logger.info(json.dumps(Twhat))