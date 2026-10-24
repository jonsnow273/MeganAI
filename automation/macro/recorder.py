"""
Session recorder for Megan Autonomous Workflow Macros.
Allows assembling and recording action sequences dynamically.
"""

import time
from typing import List, Dict, Any, Optional
from core import logger
from automation.macro.models import Macro, MacroStep
from automation.macro.store import MacroStore


class MacroRecorder:
    """Manages active macro recording sessions."""

    def __init__(self, store: Optional[MacroStore] = None):
        self.store = store or MacroStore()
        self.is_recording = False
        self.active_macro_name = ""
        self.active_description = ""
        self.active_steps: List[MacroStep] = []
        self._last_event_time: Optional[float] = None

    def start_recording(self, name: str, description: str = "") -> bool:
        """Start a new macro recording session."""
        self.is_recording = True
        self.active_macro_name = name
        self.active_description = description
        self.active_steps = []
        self._last_event_time = time.time()
        logger.info(f"Started macro recording session: '{name}'")
        return True

    def record_step(
        self,
        action_type: str,
        params: Dict[str, Any],
        description: str = "",
        explicit_delay: Optional[float] = None,
    ) -> MacroStep:
        """Record an action step into the current session."""
        now = time.time()
        if explicit_delay is not None:
            delay = max(0.0, float(explicit_delay))
        elif self._last_event_time is not None:
            delay = round(max(0.1, min(5.0, now - self._last_event_time)), 2)
        else:
            delay = 0.5

        self._last_event_time = now

        step = MacroStep(
            action_type=action_type,
            params=params,
            delay_before=delay,
            description=description,
        )
        self.active_steps.append(step)
        logger.debug(f"Recorded step: {action_type} - {description}")
        return step

    def stop_recording(self, save: bool = True) -> Optional[Macro]:
        """Finalize and save the recorded macro."""
        if not self.is_recording:
            return None

        self.is_recording = False
        macro = Macro(
            name=self.active_macro_name,
            description=self.active_description,
            steps=self.active_steps,
        )

        if save:
            self.store.save_macro(macro)

        logger.info(f"Stopped macro recording: '{macro.name}' with {len(macro.steps)} steps")
        return macro

    def cancel_recording(self):
        """Cancel current session and discard recorded steps."""
        self.is_recording = False
        self.active_steps = []
        logger.info("Cancelled macro recording session")
