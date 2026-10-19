"""
Unified Gateway LLM Client for Megan.
Connects to OpenAI-compatible API gateways (Kilocode, OpenCode, Nvidia NIM, Mistral, etc.)
Supports text generation, streaming, multimodal vision (screenshots), and model fallback.
"""

import os
import json
import base64
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional, Generator

from core import logger


class GatewayClient:
    """
    Client for OpenAI-compatible LLM gateways.
    Manages authentication, model routing, reasoning token handling,
    and multimodal screenshot payloads.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        vision_model: Optional[str] = None,
    ):
        self.base_url = (base_url or os.getenv("GATEWAY_BASE_URL") or "https://ai-gateway.kilo.ai/api/v1").rstrip("/")
        self.api_key = api_key or os.getenv("KILO_API_KEY") or os.getenv("GATEWAY_API_KEY") or ""
        self.default_model = default_model or os.getenv("DEFAULT_MODEL") or "kilo-auto/free"
        self.vision_model = vision_model or os.getenv("VISION_MODEL") or "nvidia/nemotron-3.5-super-vl:free"
        self.timeout = 45

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "MeganAI/1.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def chat(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        """
        Send a chat completion request and return the string response.
        Extracts content or reasoning tokens if content is empty.
        """
        target_model = model or self.default_model
        endpoint = f"{self.base_url}/chat/completions"

        payload = {
            "model": target_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(endpoint, data=data, headers=self._get_headers())

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
                choice = result.get("choices", [{}])[0]
                msg = choice.get("message", {})
                
                content = msg.get("content")
                if content:
                    return content.strip()

                # Fallback to reasoning text if model put output there
                reasoning = msg.get("reasoning")
                if reasoning:
                    return reasoning.strip()

                return ""
        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                pass
            logger.error(f"Gateway HTTP error {e.code}: {e.reason} | {err_body}")
            raise RuntimeError(f"Gateway API error ({e.code}): {e.reason}") from e
        except Exception as e:
            logger.error(f"Gateway connection error: {e}")
            raise RuntimeError(f"Failed to communicate with LLM gateway: {e}") from e

    def chat_with_vision(
        self,
        prompt: str,
        image_bytes: bytes,
        mime_type: str = "image/png",
        model: Optional[str] = None,
        max_tokens: int = 1500,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Send a multimodal prompt containing a base64 encoded screenshot.
        """
        target_model = model or self.vision_model
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{b64_image}"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        user_content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": image_url}},
        ]
        messages.append({"role": "user", "content": user_content})

        return self.chat(messages=messages, model=target_model, max_tokens=max_tokens)


# Global singleton instance
gateway_client = GatewayClient()
