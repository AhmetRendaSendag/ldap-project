from fastapi import APIRouter, Depends

from models.schemas import ChatRequest
from services import auth_service, chat_service

router = APIRouter()


@router.post("/chat")
def chat(request: ChatRequest, token: dict = Depends(auth_service.require_admin_token)):
    reply = chat_service.handle_message(request.message, token["sub"])
    return {"reply": reply}