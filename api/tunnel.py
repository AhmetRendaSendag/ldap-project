from fastapi import APIRouter, Depends, HTTPException
from services import auth_service, tunnel_service

router = APIRouter()


@router.get("/tunnel")
def tunnel_status(token: dict = Depends(auth_service.require_admin_token)):
    running = tunnel_service.is_running()
    url = tunnel_service.get_public_url()
    return {"running" : running,"url" : url}

@router.post("/tunnel/start")
def tunnel_start(token: dict = Depends(auth_service.require_admin_token)):
    try:
        url = tunnel_service.start()
    except RuntimeError:
        raise HTTPException(status_code=504, detail="Tunnel did not start in time")
    return {"running": True, "url": url}

@router.post("/tunnel/stop")
def tunnel_stop(token: dict = Depends(auth_service.require_admin_token)):
    tunnel_service.stop()
    return {"running" : False,"url" : None}