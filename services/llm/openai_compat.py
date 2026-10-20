import json

from openai import OpenAI

from services.llm.base import LLMProvider, LLMResponse, ToolCall


class OpenAICompatProvider(LLMProvider):
    def __init__(self, model: str, base_url: str | None, api_key: str | None):
        self.model = model
        self.client = OpenAI(base_url=base_url, api_key=api_key)

    def generate(self, messages: list[dict], tools: list[dict]) -> LLMResponse:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self._messages(messages),
            tools=[{"type": "function", "function": tool} for tool in tools],
        )
        message = response.choices[0].message
        calls = [
            ToolCall(
                id=call.id,
                name=call.function.name,
                arguments=json.loads(call.function.arguments or "{}"),
            )
            for call in message.tool_calls or []
        ]
        return LLMResponse(text=message.content, tool_calls=calls)

    def _messages(self, messages: list[dict]) -> list[dict]:
        result = []
        for message in messages:
            if message["role"] == "user":
                result.append({"role": "user", "content": message["text"]})

            elif message["role"] == "assistant":
                entry = {"role": "assistant", "content": message.get("text")}
                if message.get("tool_calls"):
                    entry["tool_calls"] = [
                        {
                            "id": call["id"],
                            "type": "function",
                            "function": {"name": call["name"], "arguments": json.dumps(call["arguments"])},
                        }
                        for call in message["tool_calls"]
                    ]
                result.append(entry)

            elif message["role"] == "tool":
                result.append({
                    "role": "tool",
                    "tool_call_id": message["call_id"],
                    "content": json.dumps(message["result"]),
                })

        return result
