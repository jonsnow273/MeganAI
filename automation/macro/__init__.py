"""
Megan Autonomous Workflow Macro Recorder subsystem.
Records, manages, and executes multi-step desktop automation sequences.
"""

from automation.macro.models import Macro, MacroStep
from automation.macro.input_simulator import InputSimulator
from automation.macro.store import MacroStore
from automation.macro.runner import MacroRunner
from automation.macro.recorder import MacroRecorder

__all__ = [
    "Macro",
    "MacroStep",
    "InputSimulator",
    "MacroStore",
    "MacroRunner",
    "MacroRecorder",
]
