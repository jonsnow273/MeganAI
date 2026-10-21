"""
Gateway-backed Inference Engine for Megan.
Replaces the local PyTorch loader with fast, zero-RAM cloud gateway execution.
"""

from typing import List, Dict, Any, Optional, Generator
from core import config, logger
from llm.gateway_client import gateway_client, GatewayClient


class GatewayInferenceEngine:
    """
    Drop-in replacement for InferenceEngine.
    Provides identical .generate() and .quick_chat() interfaces
    backed by the LLM Gateway.
    """

    def __init__(self, client: Optional[GatewayClient] = None):
        self.client = client or gateway_client

    def generate(
        self,
        messages: List[Dict[str, Any]],
        max_new_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        do_sample: Optional[bool] = None,
    ) -> str:
        """Generate response for multi-turn conversation."""
        tokens = max_new_tokens or 1024
        temp = temperature if temperature is not None else 0.7
        return self.client.chat(messages=messages, max_tokens=tokens, temperature=temp)

    def generate_stream(
        self,
        messages: List[Dict[str, Any]],
        max_new_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Generator[str, None, None]:
        """Stream response tokens from the gateway as they arrive."""
        tokens = max_new_tokens or 1024
        temp = temperature if temperature is not None else 0.7
        yield from self.client.chat_stream(
            messages=messages,
            max_tokens=tokens,
            temperature=temp,
        )

    def quick_chat(self, user_message: str, system_prompt: Optional[str] = None) -> str:
        """Single-turn generation convenience method."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_message})
        return self.generate(messages)


class MockLoader:
    """Mock ModelLoader to satisfy legacy references and health check."""
    def __init__(self):
        self.model = None
        self.tokenizer_wrapper = None
        self.model_name = "kilo-gateway"
        self._is_loaded = True

    def load(self, *args, **kwargs):
        self._is_loaded = True

    def unload(self):
        pass

    @property
    def is_loaded(self) -> bool:
        return True


loader = MockLoader()
engine = GatewayInferenceEngine(gateway_client)

__all__ = ["GatewayInferenceEngine", "GatewayClient", "gateway_client", "loader", "engine"]
