"""
Voice REST API routes for Megan.
Provides high-fidelity Neural Text-to-Speech (TTS), audio transcription, and voice configuration.
Powered by Microsoft Edge Neural Speech with zero API key requirement.
"""

import re
import json
import tempfile
import base64
from pathlib import Path
from typing import Optional, AsyncGenerator
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse

import edge_tts
from core import logger

router = APIRouter(prefix="/api/voice", tags=["Voice"])

_voice_pipeline = None

# Curated list of high-fidelity neural voices
AVAILABLE_VOICES = [
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny (US Natural)",
        "gender": "Female",
        "locale": "en-US",
        "description": "Warm, crystal-clear, default assistant voice",
    },
    {
        "id": "en-US-AriaNeural",
        "name": "Aria (US Expressive)",
        "gender": "Female",
        "locale": "en-US",
        "description": "Expressive, dynamic conversational tone",
    },
    {
        "id": "en-US-GuyNeural",
        "name": "Guy (US Confident)",
        "gender": "Male",
        "locale": "en-US",
        "description": "Confident, smooth masculine voice",
    },
    {
        "id": "en-IN-NeerjaNeural",
        "name": "Neerja (India Fluent)",
        "gender": "Female",
        "locale": "en-IN",
        "description": "Natural Indian English accent",
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia (UK Crisp)",
        "gender": "Female",
        "locale": "en-GB",
        "description": "Crisp British English accent",
    },
]

DEFAULT_VOICE = "en-US-JennyNeural"


class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = DEFAULT_VOICE
    rate: Optional[str] = "+0%"
    pitch: Optional[str] = "+0Hz"


def init(voice_pipeline=None):
    """Wire up voice pipeline."""
    global _voice_pipeline
    _voice_pipeline = voice_pipeline


def clean_text_for_speech(text: str) -> str:
    """
    Sanitize markdown and code blocks into natural conversational speech.
    Removes syntax artifacts so Megan speaks naturally.
    """
    if not text:
        return ""

    # Replace multiline code blocks with brief spoken notice
    cleaned = re.sub(r"```[\s\S]*?```", " [Here is the code.] ", text)

    # Replace inline code backticks with plain inner text
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)

    # Remove markdown links: [label](url) -> label
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", cleaned)

    # Remove markdown images: ![alt](url) -> ""
    cleaned = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", "", cleaned)

    # Remove headers (# Title -> Title)
    cleaned = re.sub(r"^#{1,6}\s*", "", cleaned, flags=re.MULTILINE)

    # Remove bold and italic markers
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*([^*]+)\*", r"\1", cleaned)
    cleaned = re.sub(r"__([^_]+)__", r"\1", cleaned)
    cleaned = re.sub(r"_([^_]+)_", r"\1", cleaned)

    # Remove bullet markers (- item -> item)
    cleaned = re.sub(r"^\s*[-*+]\s+", "", cleaned, flags=re.MULTILINE)

    # Remove numbered lists (1. item -> item)
    cleaned = re.sub(r"^\s*\d+\.\s+", "", cleaned, flags=re.MULTILINE)

    # Remove blockquotes (> quote -> quote)
    cleaned = re.sub(r"^\s*>\s+", "", cleaned, flags=re.MULTILINE)

    # Remove emoji characters (enforcing zero emojis policy)
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+",
        flags=re.UNICODE,
    )
    cleaned = emoji_pattern.sub("", cleaned)

    # Normalize whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or text.strip()


async def stream_edge_tts(text: str, voice: str, rate: str = "+0%", pitch: str = "+0Hz") -> AsyncGenerator[bytes, None]:
    """Generate and stream MP3 audio bytes using edge-tts."""
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]


@router.get("/voices")
async def get_available_voices():
    """Return available neural voices for Megan."""
    return {
        "voices": AVAILABLE_VOICES,
        "default": DEFAULT_VOICE,
    }


@router.get("/status")
async def voice_status():
    """Check voice pipeline readiness."""
    return {
        "available": True,
        "tts_engine": "edge-tts",
        "tts_ready": True,
        "default_voice": DEFAULT_VOICE,
        "voices_count": len(AVAILABLE_VOICES),
    }


@router.post("/speak")
async def speak_text_post(req: SpeakRequest):
    """
    Stream high-quality neural speech audio for the requested text.
    Returns audio/mpeg stream directly playable by browser Audio element.
    """
    speech_text = clean_text_for_speech(req.text)
    if not speech_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    selected_voice = req.voice or DEFAULT_VOICE
    logger.info(f"Generating TTS for: '{speech_text[:60]}...' with voice {selected_voice}")

    try:
        return StreamingResponse(
            stream_edge_tts(speech_text, selected_voice, rate=req.rate or "+0%", pitch=req.pitch or "+0Hz"),
            media_type="audio/mpeg",
            headers={
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache",
                "Accept-Ranges": "bytes",
            },
        )
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")


@router.get("/speak")
async def speak_text_get(
    text: str = Query(..., description="Text to speak"),
    voice: Optional[str] = Query(DEFAULT_VOICE, description="Voice ID"),
    rate: Optional[str] = Query("+0%", description="Speech rate adjustment"),
    pitch: Optional[str] = Query("+0Hz", description="Pitch adjustment"),
):
    """
    GET endpoint for direct audio streaming in <audio src="..."> tags.
    """
    speech_text = clean_text_for_speech(text)
    if not speech_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    selected_voice = voice or DEFAULT_VOICE
    try:
        return StreamingResponse(
            stream_edge_tts(speech_text, selected_voice, rate=rate, pitch=pitch),
            media_type="audio/mpeg",
            headers={
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache",
                "Accept-Ranges": "bytes",
            },
        )
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")


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
