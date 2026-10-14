"""
Persistent store for Megan Autonomous Workflow Macros.
Saves and loads macros from JSON files in data/macros/.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from core import logger
from core.constants import DATA_DIR
from automation.macro.models import Macro, MacroStep

DEFAULT_MACROS_DIR = DATA_DIR / "macros"


class MacroStore:
    """Manages loading, saving, and querying of saved workflow macros."""

    def __init__(self, macros_dir: Optional[Path] = None):
        self.macros_dir = macros_dir or DEFAULT_MACROS_DIR
        self.macros_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_default_templates()

    def list_macros(self) -> List[Macro]:
        """List all saved macros."""
        macros = []
        for file in sorted(self.macros_dir.glob("*.json")):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                macros.append(Macro(**data))
            except Exception as e:
                logger.error(f"Failed to load macro from {file}: {e}")
        return macros

    def get_macro(self, macro_id: str) -> Optional[Macro]:
        """Retrieve a specific macro by ID or name slug."""
        for m in self.list_macros():
            if m.id == macro_id or m.name.lower() == macro_id.lower():
                return m
        return None

    def save_macro(self, macro: Macro) -> bool:
        """Save a macro to disk as JSON."""
        file_path = self.macros_dir / f"{macro.id}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(macro.to_dict(), f, indent=2)
            logger.info(f"Saved workflow macro: '{macro.name}' ({macro.id})")
            return True
        except Exception as e:
            logger.error(f"Error saving macro {macro.id}: {e}")
            return False

    def delete_macro(self, macro_id: str) -> bool:
        """Delete a macro by ID."""
        file_path = self.macros_dir / f"{macro_id}.json"
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Deleted workflow macro: {macro_id}")
                return True
            except Exception as e:
                logger.error(f"Error deleting macro {macro_id}: {e}")
                return False
        return False

    def _ensure_default_templates(self):
        """Seed starter templates if the directory is empty."""
        existing = list(self.macros_dir.glob("*.json"))
        if existing:
            return

        templates = [
            Macro(
                id="macro_morning_dev",
                name="Morning Dev Setup",
                description="Launches VS Code, opens GitHub repository, and prepares developer terminal",
                safe_mode=True,
                steps=[
                    MacroStep(
                        action_type="app_launch",
                        params={"app_name": "code"},
                        delay_before=0.5,
                        description="Launch Visual Studio Code"
                    ),
                    MacroStep(
                        action_type="open_url",
                        params={"url": "https://github.com/jonsnow273/MeganAI"},
                        delay_before=1.0,
                        description="Open project repository on GitHub"
                    ),
                    MacroStep(
                        action_type="delay",
                        params={"seconds": 1.5},
                        delay_before=0.0,
                        description="Wait 1.5s for applications to load"
                    ),
                    MacroStep(
                        action_type="app_launch",
                        params={"app_name": "powershell"},
                        delay_before=0.5,
                        description="Open PowerShell terminal"
                    ),
                ]
            ),
            Macro(
                id="macro_build_and_verify",
                name="Project Build & Test",
                description="Executes project build check and runs test suite",
                safe_mode=True,
                steps=[
                    MacroStep(
                        action_type="shell_command",
                        params={"command": "python test_memory.py"},
                        delay_before=0.5,
                        description="Run Digital Memory test suite"
                    ),
                    MacroStep(
                        action_type="shell_command",
                        params={"command": "python test_focus.py"},
                        delay_before=1.0,
                        description="Run Focus Coach test suite"
                    ),
                ]
            ),
            Macro(
                id="macro_quick_docs",
                name="Quick Python Documentation",
                description="Opens official documentation for FastAPI and PyTorch",
                safe_mode=True,
                steps=[
                    MacroStep(
                        action_type="open_url",
                        params={"url": "https://fastapi.tiangolo.com/"},
                        delay_before=0.5,
                        description="Open FastAPI documentation"
                    ),
                    MacroStep(
                        action_type="open_url",
                        params={"url": "https://pytorch.org/docs/stable/index.html"},
                        delay_before=1.0,
                        description="Open PyTorch documentation"
                    ),
                ]
            ),
        ]

        for tmpl in templates:
            self.save_macro(tmpl)
