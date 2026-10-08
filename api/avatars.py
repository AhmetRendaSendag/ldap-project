from fastapi import APIRouter, Depends, HTTPException, Request, Response
from log import log_action

from services import auth_service, ldap_service, storage_service

router = APIRouter()

MAX_AVATAR_BYTES = 5 * 1024 * 1024


def _detect_image_type(data: bytes) -> str | None:
    """Identify the image format from its magic bytes instead of trusting the client's Content-Type."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.get("/users/{uid}/avatar")
def get_avatar(uid: str, token: dict = Depends(auth_service.get_current_token)):
    avatar = storage_service.get_avatar(uid)
    if avatar is None:
        raise HTTPException(status_code=404, detail="No avatar")
    data, content_type = avatar
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.put("/users/{uid}/avatar")
async def upload_avatar(uid: str, request: Request, token: dict = Depends(auth_service.get_current_token)):
    ldap_service.find_user_dn(uid)
    if not auth_service.is_token_owner(token, uid):
        raise HTTPException(status_code=403, detail="You can only change your own picture")

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 5 MB")
    data = await request.body()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 5 MB")

    content_type = _detect_image_type(data)
    if content_type is None:
        raise HTTPException(status_code=415, detail="Only PNG, JPEG, GIF or WEBP images are allowed")

    storage_service.put_avatar(uid, data, content_type)
    log_action({"who": token["sub"], "what": "Update_Avatar", "whom": uid})
    return {"message": "Avatar updated"}
