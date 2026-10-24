"""
Voice REST API routes for Megan.
Provides voice pipeline status, configuration, and audio transcription.
"""

import tempfile
import base64
import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request

from core import logger

router = APIRouter(prefix="/api/voice", tags=["Voice"])

_voice_pipeline = None


def init(voice_pipeline=None):
    """Wire up voice pipeline."""
    global _voice_pipeline
    _voice_pipeline = voice_pipeline


@router.get("/status")
async def voice_status():
    """Check voice pipeline readiness."""
    if _voice_pipeline is None:
        return {"available": True, "message": "Browser Web Speech and Whisper transcription enabled."}
    return {
        "available": True,
        "ready": _voice_pipeline.is_ready,
        "model_size": getattr(_voice_pipeline.transcriber, "model_size", "medium"),
        "model_loaded": getattr(_voice_pipeline.transcriber, "is_loaded", False),
    }


@router.post("/transcribe")
async def transcribe_audio(request: Request):
    """
    Transcribe audio to text. Accepts JSON with base64 audio or raw binary stream.
    Falls back gracefully if Whisper is not loaded locally.
    """
    try:
        body = await request.body()
        audio_bytes = b""

        # Check if JSON
        try:
            payload = json.loads(body.decode("utf-8"))
            clean_b64 = payload.get("audio_base64", "")
            if clean_b64.startswith("data:"):
                clean_b64 = clean_b64.split(",", 1)[-1]
            if clean_b64:
                audio_bytes = base64.b64decode(clean_b64)
        except Exception:
            # Not JSON, treat as raw audio bytes
            audio_bytes = body

        if not audio_bytes:
            return {"transcript": "", "text": "", "message": "No audio data received."}

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        text = None
        if _voice_pipeline and hasattr(_voice_pipeline, "transcriber"):
            try:
                text = _voice_pipeline.transcriber.transcribe(tmp_path)
            except Exception as e:
                logger.warning(f"Voice pipeline transcribe failed: {e}")

        # Direct whisper fallback if installed
        if not text:
            try:
                import whisper
                model = whisper.load_model("base")
                result = model.transcribe(tmp_path)
                text = result.get("text", "")
            except Exception as e:
                logger.warning(f"Whisper fallback unavailable: {e}")

        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass

        if text and text.strip():
            return {"transcript": text.strip(), "text": text.strip()}
        return {"transcript": "", "text": "", "message": "No speech detected."}
    except Exception as e:
        logger.error(f"Voice transcribe endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
