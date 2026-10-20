from fastapi import HTTPException

from services import conversation_service
from services.llm import get_provider
from services.tools import TOOLS, run_tool

provider = get_provider()

MAX_ROUNDS = 5


def handle_message(text: str, actor: str, conv_id: str | None = None) -> tuple[str, str | None]:
    history = []
    if conv_id is not None:
        conv = conversation_service.get(actor, conv_id)
        if conv is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        history = conversation_service.history(conv)

    turn = [{"role": "user", "text": text}]

    for _ in range(MAX_ROUNDS):
        response = provider.generate(history + turn, TOOLS)
        turn.append(response.to_message())

        if not response.tool_calls:
            reply = response.text

            if conv_id is None:
                conv_id = conversation_service.create(actor, text[:40])
            conversation_service.add_turn(actor, conv_id, text, reply, turn)

            return reply, conv_id

        for call in response.tool_calls:
            result = run_tool(call.name, call.arguments, actor)
            turn.append({"role": "tool", "call_id": call.id, "name": call.name, "result": result})

    return "Bu isteği tamamlayamadım, çok fazla adım gerekti. Lütfen daha basit bir şekilde tekrar deneyin.", conv_id
