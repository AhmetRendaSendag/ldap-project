import os

from services.llm.base import LLMProvider


def get_provider() -> LLMProvider:
    name = os.environ.get("LLM_PROVIDER", "gemini")
    model = os.environ.get("LLM_MODEL") or None
    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("LLM_API_KEY") or None

    if name == "gemini":
        from services.llm.gemini import GeminiProvider
        return GeminiProvider(model or "gemini-3.5-flash-lite", api_key)

    if name == "openai":
        from services.llm.openai_compat import OpenAICompatProvider
        return OpenAICompatProvider(model, base_url, api_key)

    raise ValueError(f"Unknown LLM_PROVIDER: {name}")
