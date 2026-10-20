from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict
    meta: dict = field(default_factory=dict)


@dataclass
class LLMResponse:
    text: str | None
    tool_calls: list[ToolCall] = field(default_factory=list)

    def to_message(self) -> dict:
        return {
            "role": "assistant",
            "text": self.text,
            "tool_calls": [asdict(call) for call in self.tool_calls],
        }


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, messages: list[dict], tools: list[dict]) -> LLMResponse:
        pass
