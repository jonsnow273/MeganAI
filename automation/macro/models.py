"""
Data models for Megan Autonomous Workflow Macro Recorder.
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class MacroStep(BaseModel):
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    action_type: str = Field(
        ...,
        description="Type of action: 'app_launch', 'open_url', 'file_op', 'hotkey', 'type_text', 'click', 'delay', 'shell_command'"
    )
    params: Dict[str, Any] = Field(default_factory=dict)
    delay_before: float = Field(default=0.5, description="Seconds to wait before executing this step")
    description: str = Field(default="", description="User-friendly summary of the step")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "action_type": self.action_type,
            "params": self.params,
            "delay_before": self.delay_before,
            "description": self.description,
        }


class Macro(BaseModel):
    id: str = Field(default_factory=lambda: f"macro_{uuid.uuid4().hex[:8]}")
    name: str = Field(..., description="User-friendly name of the workflow macro")
    description: str = Field(default="", description="Description of what this sequence does")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    last_run: Optional[str] = None
    run_count: int = 0
    safe_mode: bool = Field(default=True, description="Enforce strict whitelist checking")
    steps: List[MacroStep] = Field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "last_run": self.last_run,
            "run_count": self.run_count,
            "safe_mode": self.safe_mode,
            "steps": [s.to_dict() if hasattr(s, "to_dict") else s for s in self.steps],
        }
