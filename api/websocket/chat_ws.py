"""
WebSocket handler for real-time chat streaming.
The frontend connects here for live token-by-token responses.
"""

import json
import asyncio
from typing import Any, Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core import logger

router = APIRouter()

_engine = None
_steering_engine = None
_context_manager = None


def init(engine, steering_engine, context_manager):
    """Wire up runtime dependencies."""
    global _engine, _steering_engine, _context_manager
    _engine = engine
    _steering_engine = steering_engine
    _context_manager = context_manager


async def _stream_response(ws: WebSocket, messages: List[Dict[str, Any]]) -> str:
    """
    Bridge the blocking gateway stream to the async WebSocket.

    Generation runs in a worker thread; each delta is handed back to the event
    loop through a queue and forwarded to the client immediately.
    """
    engine = _engine
    if engine is None:
        from llm import engine as default_engine
        engine = default_engine

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    sentinel = object()

    def _put(item):
        try:
            loop.call_soon_threadsafe(queue.put_nowait, item)
        except RuntimeError:
            # Event loop already closed (client disconnected mid-stream).
            pass

    def _worker():
        try:
            for chunk in engine.generate_stream(messages):
                if chunk:
                    _put(chunk)
        except Exception as exc:  # surfaced to the async side
            _put(exc)
        finally:
            _put(sentinel)

    worker = loop.run_in_executor(None, _worker)
    parts: List[str] = []

    try:
        while True:
            item = await queue.get()
            if item is sentinel:
                break
            if isinstance(item, Exception):
                raise item
            parts.append(item)
            await ws.send_json({"type": "token", "content": item})
    finally:
        # Let the worker finish so the gateway connection is released cleanly.
        try:
            await worker
        except Exception:
            pass

    return "".join(parts)


@router.websocket("/ws/chat")
async def chat_websocket(ws: WebSocket):
    """
    WebSocket endpoint for streaming chat.

    Client sends JSON:
        {"message": "...", "session_id": "...", "language": "en"}

    Server streams back JSON frames:
        {"type": "token", "content": "word"}
        {"type": "done", "session_id": "...", "content": "...", "message_count": 4}
        {"type": "error", "detail": "..."}
    """
    await ws.accept()
    logger.info("WebSocket chat client connected.")

    from chatbot import new_session, resume_session, load_system_prompt

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)

            message = data.get("message", "")
            session_id = data.get("session_id")
            language = data.get("language", "en")

            if not message:
                await ws.send_json({"type": "error", "detail": "Empty message."})
                continue

            # Session management
            if session_id:
                history = resume_session(session_id)
                if history is None:
                    history = new_session()
            else:
                history = new_session()

            if len(history) == 0:
                history.add_system(load_system_prompt(language))

            history.add("user", message)

            # Trim context
            messages = history.to_llm_format()
            if _context_manager:
                messages = _context_manager.trim(messages)

            # Stream the response token by token
            try:
                response = await _stream_response(ws, messages)

                if not response.strip():
                    await ws.send_json({
                        "type": "error",
                        "detail": "The model returned an empty response.",
                    })
                    continue

                from llm.gateway_client import GatewayClient
                response = GatewayClient._sanitize_response(response)

                history.add("assistant", response)

                await ws.send_json({
                    "type": "done",
                    "session_id": history.session_id,
                    "content": response,
                    "message_count": len(history),
                })

            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"WebSocket generation error: {e}")
                try:
                    await ws.send_json({"type": "error", "detail": str(e)})
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info("WebSocket chat client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
