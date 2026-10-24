"""
FastAPI REST routes for Megan Autonomous Workflow Macro Recorder.
Provides endpoints to list, create, update, delete, record, and replay macros.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

from core import logger
from automation.macro import Macro, MacroStep, MacroStore, MacroRunner, MacroRecorder

router = APIRouter(prefix="/api/macros", tags=["Macro Automation"])

# Singleton instances
_store: Optional[MacroStore] = None
_runner: Optional[MacroRunner] = None
_recorder: Optional[MacroRecorder] = None


def _get_store() -> MacroStore:
    global _store
    if _store is None:
        _store = MacroStore()
    return _store


def _get_runner() -> MacroRunner:
    global _runner
    if _runner is None:
        _runner = MacroRunner()
    return _runner


def _get_recorder() -> MacroRecorder:
    global _recorder
    if _recorder is None:
        _recorder = MacroRecorder(store=_get_store())
    return _recorder


# ── Request / Response Schemas ────────────────────────────────

class MacroCreateRequest(BaseModel):
    name: str = Field(..., description="Name of the workflow sequence")
    description: str = Field(default="", description="Description of the macro")
    safe_mode: bool = Field(default=True)
    steps: List[Dict[str, Any]] = Field(default_factory=list)


class MacroUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    safe_mode: Optional[bool] = None
    steps: Optional[List[Dict[str, Any]]] = None


class RecordStartRequest(BaseModel):
    name: str = Field(..., description="Name for the newly recorded macro")
    description: str = Field(default="")


class RecordStepRequest(BaseModel):
    action_type: str
    params: Dict[str, Any] = Field(default_factory=dict)
    description: str = Field(default="")
    delay_before: Optional[float] = None


class RunResponse(BaseModel):
    success: bool
    macro_id: str
    macro_name: str
    steps_total: int
    steps_executed: int
    duration_seconds: float
    dry_run: bool
    step_results: List[Dict[str, Any]]


# ── REST Endpoints ────────────────────────────────────────────

@router.get("", response_model=List[Dict[str, Any]])
async def list_macros():
    """List all available workflow macros."""
    store = _get_store()
    return [m.to_dict() for m in store.list_macros()]


@router.get("/{macro_id}", response_model=Dict[str, Any])
async def get_macro(macro_id: str):
    """Retrieve details and sequence steps for a specific macro."""
    store = _get_store()
    macro = store.get_macro(macro_id)
    if not macro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Macro '{macro_id}' not found"
        )
    return macro.to_dict()


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_macro(req: MacroCreateRequest):
    """Create and persist a new workflow macro."""
    store = _get_store()
    steps = [MacroStep(**s) for s in req.steps]
    macro = Macro(
        name=req.name,
        description=req.description,
        safe_mode=req.safe_mode,
        steps=steps,
    )
    success = store.save_macro(macro)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save macro to persistent storage"
        )
    return macro.to_dict()


@router.put("/{macro_id}", response_model=Dict[str, Any])
async def update_macro(macro_id: str, req: MacroUpdateRequest):
    """Update an existing macro."""
    store = _get_store()
    macro = store.get_macro(macro_id)
    if not macro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Macro '{macro_id}' not found"
        )

    if req.name is not None:
        macro.name = req.name
    if req.description is not None:
        macro.description = req.description
    if req.safe_mode is not None:
        macro.safe_mode = req.safe_mode
    if req.steps is not None:
        macro.steps = [MacroStep(**s) for s in req.steps]

    store.save_macro(macro)
    return macro.to_dict()


@router.delete("/{macro_id}")
async def delete_macro(macro_id: str):
    """Delete a macro from storage."""
    store = _get_store()
    success = store.delete_macro(macro_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Macro '{macro_id}' not found or could not be deleted"
        )
    return {"message": f"Macro '{macro_id}' deleted successfully", "id": macro_id}


@router.post("/{macro_id}/run", response_model=RunResponse)
async def run_macro(
    macro_id: str,
    dry_run: bool = Query(default=False, description="Simulate execution without modifying OS")
):
    """Execute / replay a workflow macro sequence."""
    store = _get_store()
    runner = _get_runner()
    macro = store.get_macro(macro_id)
    if not macro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Macro '{macro_id}' not found"
        )

    result = runner.run(macro=macro, dry_run=dry_run)
    # Save updated execution count & last_run
    if not dry_run:
        store.save_macro(macro)

    return result


@router.post("/record/start")
async def start_recording(req: RecordStartRequest):
    """Start an interactive macro recording session."""
    recorder = _get_recorder()
    recorder.start_recording(name=req.name, description=req.description)
    return {
        "recording": True,
        "name": req.name,
        "message": f"Recording session started for '{req.name}'"
    }


@router.post("/record/step")
async def record_step(req: RecordStepRequest):
    """Append a step to the currently active recording session."""
    recorder = _get_recorder()
    if not recorder.is_recording:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active recording session. Call /record/start first."
        )

    step = recorder.record_step(
        action_type=req.action_type,
        params=req.params,
        description=req.description,
        explicit_delay=req.delay_before,
    )
    return {"recorded": True, "step": step.to_dict(), "total_steps": len(recorder.active_steps)}


@router.post("/record/stop")
async def stop_recording(save: bool = Query(default=True)):
    """Stop active recording session and save the assembled macro."""
    recorder = _get_recorder()
    if not recorder.is_recording:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active recording session to stop."
        )

    macro = recorder.stop_recording(save=save)
    return {
        "recording": False,
        "macro": macro.to_dict() if macro else None,
        "message": f"Saved macro '{macro.name}' with {len(macro.steps)} steps" if macro else "Recording stopped"
    }
