import base64
import uuid

from google import genai
from google.genai import types

from services.llm.base import LLMProvider, LLMResponse, ToolCall


class GeminiProvider(LLMProvider):
    def __init__(self, model: str, api_key: str | None = None):
        self.model = model
        self.client = genai.Client(api_key=api_key) if api_key else genai.Client()

    def generate(self, messages: list[dict], tools: list[dict]) -> LLMResponse:
        declarations = [
            types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters_json_schema=tool["parameters"],
            )
            for tool in tools
        ]
        response = self.client.models.generate_content(
            model=self.model,
            contents=self._contents(messages),
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=declarations)],
            ),
        )

        content = response.candidates[0].content if response.candidates else None
        parts = content.parts if content and content.parts else []

        texts = []
        calls = []
        for part in parts:
            if part.function_call:
                meta = {}
                if part.thought_signature:
                    meta["thought_signature"] = base64.b64encode(part.thought_signature).decode()
                calls.append(ToolCall(
                    id=part.function_call.id or str(uuid.uuid4()),
                    name=part.function_call.name,
                    arguments=dict(part.function_call.args or {}),
                    meta=meta,
                ))
            elif part.text and not part.thought:
                texts.append(part.text)

        return LLMResponse(text="".join(texts) or None, tool_calls=calls)

    def _contents(self, messages: list[dict]) -> list[types.Content]:
        contents = []
        for message in messages:
            if message["role"] == "user":
                contents.append(types.Content(role="user", parts=[types.Part(text=message["text"])]))

            elif message["role"] == "assistant":
                parts = []
                if message.get("text"):
                    parts.append(types.Part(text=message["text"]))
                for call in message.get("tool_calls", []):
                    signature = call.get("meta", {}).get("thought_signature")
                    parts.append(types.Part(
                        function_call=types.FunctionCall(id=call["id"], name=call["name"], args=call["arguments"]),
                        thought_signature=base64.b64decode(signature) if signature else None,
                    ))
                if parts:
                    contents.append(types.Content(role="model", parts=parts))

            elif message["role"] == "tool":
                part = types.Part(function_response=types.FunctionResponse(
                    id=message["call_id"],
                    name=message["name"],
                    response=message["result"],
                ))
                last = contents[-1] if contents else None
                if last and last.role == "user" and last.parts[0].function_response:
                    last.parts.append(part)
                else:
                    contents.append(types.Content(role="user", parts=[part]))

        return contents
