from fastapi import APIRouter, Depends, HTTPException

from models.schemas import ChatRequest
from services import auth_service, chat_service, conversation_service

router = APIRouter()


@router.post("/chat")
def chat(request: ChatRequest, token: dict = Depends(auth_service.require_admin_token)):
    reply, conv_id = chat_service.handle_message(request.message, token["sub"], request.conversation_id)
    return {"reply": reply, "conversation_id": conv_id}


@router.get("/chat/conversations")
def list_conversations(token: dict = Depends(auth_service.require_admin_token)):
    return {"conversations": conversation_service.list_for(token["sub"])}


@router.get("/chat/conversations/{conv_id}")
def get_conversation(conv_id: str, token: dict = Depends(auth_service.require_admin_token)):
    conv = conversation_service.get(token["sub"], conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"title": conv["title"], "messages": conv["messages"]}