"""
Chat REST API routes for Megan.
Handles message sending, session management, and conversation history.
Powered by the Gateway client for fast, intelligent reasoning.
"""

from fastapi import APIRouter, HTTPException

from api.schemas.chat import ChatMessageRequest, ChatMessageResponse, SessionInfo
from core import logger

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Runtime dependencies set at startup
_engine = None
_sessions = {}  # session_id -> ConversationHistory


def init(engine, steering_engine=None, context_manager=None):
    """Wire up runtime dependencies from server startup."""
    global _engine
    _engine = engine


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(req: ChatMessageRequest):
    """Send a message and get a response."""
    from chatbot import new_session, resume_session, load_system_prompt

    # Get or create session
    session_id = req.session_id
    if session_id and session_id in _sessions:
        history = _sessions[session_id]
    elif session_id:
        history = resume_session(session_id)
        if history is None:
            history = new_session()
        _sessions[history.session_id] = history
    else:
        history = new_session()
        _sessions[history.session_id] = history

    # Inject system prompt if empty session
    if len(history) == 0:
        lang = req.language or "en"
        try:
            history.add_system(load_system_prompt(lang))
        except Exception:
            history.add_system("You are Megan, a helpful, intelligent desktop AI assistant. Do not use emojis.")

    # Add user message
    history.add("user", req.message)

    # Format messages for gateway
    messages = history.to_llm_format()

    # Generate response via Gateway engine
    if _engine is not None:
        try:
            response_text = _engine.generate(messages)
        except Exception as e:
            logger.error(f"Engine generation error: {e}")
            response_text = f"An error occurred while generating a response: {e}"
    else:
        from llm import engine as default_engine
        response_text = default_engine.generate(messages)

    history.add("assistant", response_text)
    logger.info(f"[{history.session_id}] User: {req.message[:50]}... -> {len(response_text)} chars")

    return ChatMessageResponse(
        response=response_text,
        session_id=history.session_id,
        steering_active=None,
    )


@router.get("/sessions")
async def list_sessions():
    """List all saved conversation sessions."""
    from chatbot import list_sessions as ls
    return ls()


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Get the full message history for a session."""
    from chatbot import resume_session
    history = resume_session(session_id)
    if history is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return {"session_id": session_id, "messages": history.to_llm_format()}


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Compatibility endpoint matching frontend App.tsx fetch."""
    return await get_history(session_id)


@router.delete("/history/{session_id}")
async def delete_history(session_id: str):
    """Delete a saved session."""
    from chatbot import delete_session
    if delete_session(session_id):
        _sessions.pop(session_id, None)
        return {"message": f"Session {session_id} deleted."}
    raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
