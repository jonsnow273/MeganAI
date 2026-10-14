"""
FastAPI REST routes for Megan Daily Standup Report Generator.
Provides endpoints to generate, retrieve, and list standup reports.
"""

from pathlib import Path
from datetime import date
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from core import logger
from standup.generator import StandupGenerator

router = APIRouter(prefix="/api/standup", tags=["Standup Report"])

# Singleton generator instance
_generator: Optional[StandupGenerator] = None


def _get_generator() -> StandupGenerator:
    global _generator
    if _generator is None:
        _generator = StandupGenerator()
    return _generator


# ── Request / Response Models ─────────────────────────────────

class GenerateRequest(BaseModel):
    target_date: Optional[str] = Field(
        default=None,
        description="Date to generate report for (ISO format: YYYY-MM-DD). Defaults to today."
    )
    include_git: bool = Field(default=True, description="Include git commit section")
    include_focus: bool = Field(default=True, description="Include focus coach section")
    include_memory: bool = Field(default=True, description="Include screen memory topics")
    blockers: Optional[str] = Field(default=None, description="Optional blockers text")
    tomorrow_plan: Optional[str] = Field(default=None, description="Optional tomorrow's plan text")
    git_author: Optional[str] = Field(default=None, description="Git author filter (name or email)")


class ReportMetadata(BaseModel):
    report_date: str
    generated_at: str
    commit_count: int
    branch: str
    productivity_score: Optional[float]
    focus_sessions: int
    memory_snapshots: int
    top_apps: List[str]
    report_path: Optional[str]


class GenerateResponse(BaseModel):
    markdown: str
    plain_text: str
    metadata: Dict[str, Any]
    report_path: Optional[str]


class ReportListItem(BaseModel):
    filename: str
    date: str
    size_bytes: int
    modified_at: str
    path: str


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_standup(req: GenerateRequest):
    """
    Generate the daily standup report synthesizing Git commits,
    Focus Coach session data, and Digital Memory screen topics.
    """
    target = None
    if req.target_date:
        try:
            target = date.fromisoformat(req.target_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid date format: '{req.target_date}'. Use YYYY-MM-DD."
            )

    gen = _get_generator()
    if req.git_author is not None:
        gen.git_author = req.git_author

    try:
        result = gen.generate(
            target_date=target,
            include_git=req.include_git,
            include_focus=req.include_focus,
            include_memory=req.include_memory,
            blockers=req.blockers,
            tomorrow_plan=req.tomorrow_plan,
        )
        return result
    except Exception as e:
        logger.error(f"Standup generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate standup report: {str(e)}"
        )


@router.get("/reports", response_model=List[ReportListItem])
async def list_reports():
    """List all saved standup report files, newest first."""
    gen = _get_generator()
    return gen.list_reports()


@router.get("/reports/{report_date}", response_class=PlainTextResponse)
async def get_report(report_date: str):
    """
    Retrieve the raw Markdown content of a saved standup report.
    report_date format: YYYY-MM-DD
    """
    try:
        d = date.fromisoformat(report_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date: '{report_date}'. Use YYYY-MM-DD."
        )

    gen = _get_generator()
    content = gen.get_report(d)

    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No standup report found for {report_date}."
        )

    return PlainTextResponse(content=content, media_type="text/markdown")


@router.get("/today/preview")
async def preview_today():
    """
    Quick preview of today's available data without saving a report.
    Returns metadata about what would appear in the standup.
    """
    gen = _get_generator()
    try:
        today = date.today()
        commits = gen.git.get_commits(since_date=today, until_date=today)
        git_stats = gen.git.get_stats(since_date=today, until_date=today)
        focus = gen.focus.get_day_summary(target_date=today)
        memory = gen.memory.get_day_topics(target_date=today)

        return {
            "date": today.isoformat(),
            "git": {
                "commit_count": len(commits),
                "branch": git_stats.get("branch", "unknown"),
                "lines_inserted": git_stats.get("lines_inserted", 0),
                "lines_deleted": git_stats.get("lines_deleted", 0),
            },
            "focus": {
                "has_data": focus.get("has_data", False),
                "sessions_count": focus.get("sessions_count", 0),
                "productivity_score": focus.get("productivity_score"),
                "formatted": focus.get("formatted", {}),
            },
            "memory": {
                "has_data": memory.get("has_data", False),
                "snapshot_count": memory.get("snapshot_count", 0),
                "active_hours": memory.get("active_hours", 0.0),
                "top_apps": memory.get("top_apps", []),
                "top_words": memory.get("top_words", [])[:5],
            },
        }
    except Exception as e:
        logger.error(f"Standup preview error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
