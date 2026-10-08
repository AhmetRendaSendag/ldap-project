from fastapi import APIRouter, Depends, HTTPException
from log import log_action
from models.schemas import UserProfile

from services import auth_service, ldap_service, profile_service

router = APIRouter()

PUBLIC_PROFILE_FIELDS: set[str] = set()


@router.get("/users/{uid}/profile")
def get_profile(uid: str, token: dict = Depends(auth_service.get_current_token)):
    ldap_service.find_user_dn(uid)
    profile = profile_service.get_profile(uid) or UserProfile().model_dump(mode="json")

    if auth_service.is_token_owner(token, uid) or token.get("is_admin"):
        return profile
    return {field: (value if field in PUBLIC_PROFILE_FIELDS else None) for field, value in profile.items()}


@router.put("/users/{uid}/profile")
def update_profile(uid: str, profile: UserProfile, token: dict = Depends(auth_service.get_current_token)):
    ldap_service.find_user_dn(uid)
    if not (auth_service.is_token_owner(token, uid) or token.get("is_admin")):
        raise HTTPException(status_code=403, detail="You can only change your own profile")

    profile_service.put_profile(uid, profile.model_dump(mode="json"))
    log_action({"who": token["sub"], "what": "Update_Profile", "whom": uid})
    return {"message": "Profile updated"}
