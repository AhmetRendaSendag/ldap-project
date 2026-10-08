import io

import qrcode
from fastapi import APIRouter, Depends, Request, Response

from services import auth_service, ldap_service, tunnel_service

router = APIRouter()


@router.get("/users/{uid}/qr")
def get_qr(uid: str, request: Request, token: dict = Depends(auth_service.get_current_token)):
    """Generate a QR code linking to the user's profile page; built per request, never stored."""
    ldap_service.find_user_dn(uid)
    if tunnel_service.get_public_url() is not None:
        url = str(tunnel_service.get_public_url()) + f"/profile/{uid}"
    else:
        url = str(request.base_url) + f"profile/{uid}"
   
    img = qrcode.make(url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return Response(content=buffer.getvalue(), media_type="image/png", headers={"X-QR-Target": url})
