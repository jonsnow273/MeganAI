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
    query: str
    dimensions: str
    preview_thumbnail: str


@router.post("/analyze", response_model=ScreenAnalysisResponse)
async def analyze_screen(req: ScreenAnalysisRequest):
    """
    Take a live snapshot of the user's primary monitor and run multimodal vision diagnosis.
    """
    try:
        result = copilot_service.analyze_screen(
            user_query=req.query,
            target_model=req.model,
        )
        return ScreenAnalysisResponse(**result)
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
