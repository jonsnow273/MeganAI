"""
Screen Copilot REST API routes for Megan.
Handles instant screen analysis, visual problem diagnosis, and actionable fix suggestions.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core import logger
from core.copilot_service import copilot_service

router = APIRouter(prefix="/api/copilot", tags=["Screen Copilot"])


class ScreenAnalysisRequest(BaseModel):
    query: Optional[str] = "Analyze what is on my screen right now, identify any errors, and tell me the fix."
    model: Optional[str] = None


class ScreenAnalysisResponse(BaseModel):
    diagnosis: str
    analysis: str
    query: str
    dimensions: str
    preview_thumbnail: str
    screenshot_url: str


@router.post("/analyze", response_model=ScreenAnalysisResponse)
async def analyze_screen(req: Optional[ScreenAnalysisRequest] = None):
    """
    Take a live snapshot of the user's primary monitor and run multimodal vision diagnosis.
    Supports empty payload for one-click inspection.
    """
    try:
        user_query = req.query if req and req.query else "Analyze my current screen. What is happening, identify any errors or issues, and provide the exact fix."
        target_model = req.model if req else None

        result = copilot_service.analyze_screen(
            user_query=user_query,
            target_model=target_model,
        )

        diagnosis_text = result.get("diagnosis", "")
        thumbnail = result.get("preview_thumbnail", "")

        return ScreenAnalysisResponse(
            diagnosis=diagnosis_text,
            analysis=diagnosis_text,
            query=result.get("query", user_query),
            dimensions=result.get("dimensions", "1280x720"),
            preview_thumbnail=thumbnail,
            screenshot_url=thumbnail,
        )
    except Exception as e:
        logger.error(f"Screen Copilot analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def copilot_status():
    """Telemetry and health check for Screen Copilot."""
    return {
        "status": "ready",
        "vision_model": copilot_service.client.vision_model,
        "gateway_url": copilot_service.client.base_url,
    }
