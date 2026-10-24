"""
Unified Gateway LLM Client for Megan.
Connects to OpenAI-compatible API gateways (Kilocode, OpenCode, Nvidia NIM, Mistral, etc.)
Supports text generation, streaming, multimodal vision (screenshots), and model fallback.
"""

import os
import re
import json
import time
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

    FALLBACK_MODELS = [
        "nvidia/nemotron-3.5-lightning:free",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "openrouter/free",
    ]

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
        self.timeout = 35

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "MeganAI/1.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    @staticmethod
    def _sanitize_response(text: str) -> str:
        """
        Sanitize model output to remove any internal model identity leaks or pre-training artifacts.
        """
        if not text:
            return ""
        cleaned = re.sub(
            r"I'?m Glyph Cluster,?\s*(and\s+)?(those\s+details\s+have\s+not\s+been\s+announced\s+yet\.?)?\s*",
            "I'm Megan, your desktop AI assistant. ",
            text,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(
            r"I am Glyph Cluster,?\s*(and\s+)?(those\s+details\s+have\s+not\s+been\s+announced\s+yet\.?)?\s*",
            "I am Megan, your desktop AI assistant. ",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"\bGlyph Cluster\b", "Megan", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bGlyph\b", "Megan", cleaned)
        cleaned = re.sub(r"(and\s+)?those details have not been announced yet\.?\s*", "", cleaned, flags=re.IGNORECASE)
        # Strip thinking trace leaks if returned in raw text
        cleaned = re.sub(r"^Here's a thinking process:.*?\n\n", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        return cleaned.strip()

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
        Includes automatic retry and fallback to secondary models on 503/429 errors.
        """
        primary_model = model or self.default_model
        candidate_models = [primary_model] + [m for m in self.FALLBACK_MODELS if m != primary_model]

        last_error = None
        for target_model in candidate_models:
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

            for attempt in range(2):
                try:
                    with urllib.request.urlopen(req, timeout=self.timeout) as response:
                        result = json.loads(response.read().decode("utf-8"))
                        choice = result.get("choices", [{}])[0]
                        msg = choice.get("message", {})

                        content = msg.get("content")
                        if content:
                            return self._sanitize_response(content.strip())

                        reasoning = msg.get("reasoning")
                        if reasoning:
                            return self._sanitize_response(reasoning.strip())

                        return ""
                except urllib.error.HTTPError as e:
                    err_body = ""
                    try:
                        err_body = e.read().decode("utf-8")
                    except Exception:
                        pass
                    last_error = f"Gateway HTTP error {e.code}: {e.reason} ({target_model})"
                    logger.warning(f"{last_error} | {err_body}")

                    # Retry on temporary server errors (503, 502, 504, 429)
                    if e.code in (503, 502, 504, 429) and attempt == 0:
                        time.sleep(1.2)
                        continue
                    break  # Try next candidate model
                except Exception as e:
                    last_error = f"Gateway connection error: {e} ({target_model})"
                    logger.warning(last_error)
                    if attempt == 0:
                        time.sleep(1.0)
                        continue
                    break

        raise RuntimeError(last_error or "All gateway models failed.")

    def chat_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> Generator[str, None, None]:
        """
        Stream a chat completion, yielding content deltas as they arrive.
        Falls back to alternative models or non-streaming if interrupted.
        """
        primary_model = model or self.default_model
        candidate_models = [primary_model] + [m for m in self.FALLBACK_MODELS if m != primary_model]

        for target_model in candidate_models:
            endpoint = f"{self.base_url}/chat/completions"
            payload = {
                "model": target_model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "stream": True,
            }

            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(endpoint, data=data, headers=self._get_headers())

            yielded_any = False
            reasoning_parts: List[str] = []

            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    for raw_line in response:
                        line = raw_line.decode("utf-8", errors="replace").strip()
                        if not line or not line.startswith("data:"):
                            continue

                        event_data = line[len("data:"):].strip()
                        if not event_data or event_data == "[DONE]":
                            break

                        try:
                            event = json.loads(event_data)
                        except json.JSONDecodeError:
                            continue

                        if event.get("error"):
                            raise RuntimeError(str(event["error"]))

                        choices = event.get("choices") or []
                        if not choices:
                            continue

                        delta = choices[0].get("delta") or {}
                        content = delta.get("content")
                        if content:
                            yielded_any = True
                            # Clean known identity leaks from token streams
                            yield content.replace("Glyph Cluster", "Megan").replace("Glyph", "Megan")
                            continue

                        reasoning = delta.get("reasoning") or delta.get("reasoning_content")
                        if reasoning:
                            reasoning_parts.append(reasoning)

                if yielded_any:
                    return

                if reasoning_parts:
                    cleaned_reasoning = self._sanitize_response("".join(reasoning_parts))
                    yield cleaned_reasoning
                    return

            except Exception as e:
                logger.warning(f"Streaming failed for model '{target_model}': {e}")
                if yielded_any:
                    return
                # Continue loop to next candidate model

        # Final fallback: synchronous chat call
        yield from self._fallback_stream(messages, self.default_model, max_tokens, temperature)

    def _fallback_stream(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> Generator[str, None, None]:
        """Yield a non-streaming completion as a single chunk."""
        try:
            text = self.chat(
                messages=messages,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            if text:
                yield text
        except Exception as e:
            logger.error(f"Fallback generation error: {e}")
            yield f"I was unable to complete the request right now: {e}"

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
