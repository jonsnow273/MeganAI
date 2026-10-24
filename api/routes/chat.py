"""
Chat REST API routes for Megan.
Handles streaming message responses, multimodal image inputs,
session management, and per-user conversation storage isolation.
"""

import json
import base64
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from api.schemas.chat import ChatMessageRequest, ChatMessageResponse, SessionInfo
from auth.models import User
from auth.middleware import get_current_user
from core import logger
from core.constants import DATA_DIR, CONVERSATIONS_DIR
from llm.gateway_client import GatewayClient

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Runtime dependencies set at startup
_engine = None
_sessions: Dict[str, Any] = {}  # session_id -> ConversationHistory


def init(engine, steering_engine=None, context_manager=None):
    """Wire up runtime dependencies from server startup."""
    global _engine
    _engine = engine


def _get_user_storage(user: Optional[User]) -> Optional[Path]:
    """Resolve isolated storage directory for authenticated user."""
    if user and user.username:
        user_dir = DATA_DIR / "users" / user.username / "conversations"
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir
    return CONVERSATIONS_DIR


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(req: ChatMessageRequest, user: Optional[User] = Depends(get_current_user)):
    """Send a message and get a full response (supports text and base64 images)."""
    from chatbot import new_session, resume_session, load_system_prompt
    from core.copilot_service import copilot_service

    storage_dir = _get_user_storage(user)
    session_id = req.session_id

    if session_id and session_id in _sessions:
        history = _sessions[session_id]
    elif session_id:
        history = resume_session(session_id, storage_dir=storage_dir)
        if history is None:
            history = new_session(storage_dir=storage_dir)
        _sessions[history.session_id] = history
    else:
        history = new_session(storage_dir=storage_dir)
        _sessions[history.session_id] = history

    # Inject system prompt if empty session
    if len(history) == 0:
        lang = req.language or "en"
        try:
            history.add_system(load_system_prompt(lang))
        except Exception:
            history.add_system(
                "Your name is Megan. You are Megan, an intelligent desktop AI assistant. "
                "Never refer to yourself as Glyph Cluster, Glyph, or any other entity."
            )

    # Handle image attachment if provided
    if req.image_base64:
        clean_b64 = req.image_base64
        if clean_b64.startswith("data:"):
            clean_b64 = clean_b64.split(",", 1)[-1]
        try:
            raw_bytes = base64.b64decode(clean_b64)
            history.add("user", f"[Attached Media] {req.message}")
            response_text = copilot_service.client.chat_with_vision(
                prompt=req.message or "Analyze this image and provide instructions or insights.",
                image_bytes=raw_bytes,
                mime_type=req.media_type or "image/png"
            )
        except Exception as e:
            logger.error(f"Multimodal vision generation error: {e}")
            response_text = f"An error occurred while analyzing the attached media: {e}"
    else:
        history.add("user", req.message)
        messages = history.to_llm_format()

        if _engine is not None:
            try:
                response_text = _engine.generate(messages)
            except Exception as e:
                logger.error(f"Engine generation error: {e}")
                response_text = f"An error occurred while generating a response: {e}"
        else:
            from llm import engine as default_engine
            response_text = default_engine.generate(messages)

    response_text = GatewayClient._sanitize_response(response_text)
    history.add("assistant", response_text)
    logger.info(f"[{history.session_id}] User: {req.message[:50]}... -> {len(response_text)} chars")

    return ChatMessageResponse(
        response=response_text,
        session_id=history.session_id,
        steering_active=None,
    )


@router.post("/stream")
async def stream_chat(req: ChatMessageRequest, user: Optional[User] = Depends(get_current_user)):
    """
    Stream message response token-by-token using Server-Sent Events (SSE).
    Provides instant Time-To-First-Token and zero latency delay.
    """
    from chatbot import new_session, resume_session, load_system_prompt
    from core.copilot_service import copilot_service

    storage_dir = _get_user_storage(user)
    session_id = req.session_id

    if session_id and session_id in _sessions:
        history = _sessions[session_id]
    elif session_id:
        history = resume_session(session_id, storage_dir=storage_dir)
        if history is None:
            history = new_session(storage_dir=storage_dir)
        _sessions[history.session_id] = history
    else:
        history = new_session(storage_dir=storage_dir)
        _sessions[history.session_id] = history

    if len(history) == 0:
        lang = req.language or "en"
        try:
            history.add_system(load_system_prompt(lang))
        except Exception:
            history.add_system(
                "Your name is Megan. You are Megan, an intelligent desktop AI assistant. "
                "Never refer to yourself as Glyph Cluster, Glyph, or any other entity."
            )

    # Handle image attachment with direct vision completion
    if req.image_base64:
        clean_b64 = req.image_base64
        if clean_b64.startswith("data:"):
            clean_b64 = clean_b64.split(",", 1)[-1]
        try:
            raw_bytes = base64.b64decode(clean_b64)
            history.add("user", f"[Attached Media] {req.message}")
            response_text = copilot_service.client.chat_with_vision(
                prompt=req.message or "Analyze this image and provide instructions or insights.",
                image_bytes=raw_bytes,
                mime_type=req.media_type or "image/png"
            )
        except Exception as e:
            logger.error(f"Multimodal vision generation error: {e}")
            response_text = f"An error occurred while analyzing the attached media: {e}"

        response_text = GatewayClient._sanitize_response(response_text)
        history.add("assistant", response_text)

        def single_event():
            yield f"data: {json.dumps({'type': 'token', 'content': response_text})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'session_id': history.session_id, 'content': response_text})}\n\n"

        return StreamingResponse(single_event(), media_type="text/event-stream")

    history.add("user", req.message)
    messages = history.to_llm_format()

    engine = _engine
    if engine is None:
        from llm import engine as default_engine
        engine = default_engine

    def event_stream():
        collected = []
        try:
            for chunk in engine.generate_stream(messages):
                if chunk:
                    collected.append(chunk)
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            return

        full_response = "".join(collected)
        sanitized = GatewayClient._sanitize_response(full_response)
        history.add("assistant", sanitized)
        yield f"data: {json.dumps({'type': 'done', 'session_id': history.session_id, 'content': sanitized})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/sessions")
async def list_sessions(user: Optional[User] = Depends(get_current_user)):
    """List all saved conversation sessions for the active user."""
    from chatbot import list_sessions as ls
    storage_dir = _get_user_storage(user)
    return ls(storage_dir=storage_dir)


@router.get("/history/{session_id}")
async def get_history(session_id: str, user: Optional[User] = Depends(get_current_user)):
    """Get the full message history for a session."""
    from chatbot import resume_session
    storage_dir = _get_user_storage(user)
    history = resume_session(session_id, storage_dir=storage_dir)
    if history is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return {"session_id": session_id, "messages": history.messages}


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, user: Optional[User] = Depends(get_current_user)):
    """Compatibility endpoint matching frontend App.tsx fetch."""
    return await get_history(session_id, user=user)


@router.delete("/history/{session_id}")
async def delete_history(session_id: str, user: Optional[User] = Depends(get_current_user)):
    """Delete a saved session."""
    from chatbot import delete_session
    storage_dir = _get_user_storage(user)
    if delete_session(session_id, storage_dir=storage_dir):
        _sessions.pop(session_id, None)
        return {"message": f"Session {session_id} deleted."}
    raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
