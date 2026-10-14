"""
Replay engine for Megan Autonomous Workflow Macros.
Executes sequence steps with whitelist enforcement and rate limiting.
"""

import time
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable

from core import logger
from automation.action_handler import ActionHandler
from automation.macro.models import Macro, MacroStep
from automation.macro.input_simulator import InputSimulator

# Safe shell command prefixes allowed in workflow automation
SAFE_COMMAND_PREFIXES = [
    "python",
    "git",
    "npm",
    "pytest",
    "node",
    "dir",
    "echo",
    "curl",
]


class MacroRunner:
    """Executes a workflow macro step-by-step with safety enforcement."""

    def __init__(self, action_handler: Optional[ActionHandler] = None):
        self.action_handler = action_handler or ActionHandler()
        self.input_sim = InputSimulator()

    def run(
        self,
        macro: Macro,
        dry_run: bool = False,
        on_step_callback: Optional[Callable[[int, MacroStep, Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        """
        Execute a macro.

        Args:
            macro: The Macro model to execute.
            dry_run: If True, simulates steps without actual desktop execution.
            on_step_callback: Optional callback func(step_index, step, step_result).

        Returns:
            Dict containing execution summary and per-step logs.
        """
        start_time = time.time()
        step_results: List[Dict[str, Any]] = []
        overall_success = True

        logger.info(f"Starting execution of macro '{macro.name}' ({len(macro.steps)} steps, dry_run={dry_run})")

        for idx, step in enumerate(macro.steps):
            # 1. Apply pre-step delay
            if not dry_run and step.delay_before > 0:
                time.sleep(step.delay_before)

            step_res = self._execute_step(step, dry_run=dry_run)
            step_results.append(step_res)

            if on_step_callback:
                try:
                    on_step_callback(idx, step, step_res)
                except Exception:
                    pass

            if not step_res.get("success", False):
                overall_success = False
                logger.warning(f"Step {idx + 1} failed: {step_res.get('message')}. Aborting macro.")
                break

        duration = round(time.time() - start_time, 2)

        # Update macro telemetry if actual run succeeded
        if not dry_run and overall_success:
            macro.last_run = datetime.now().isoformat()
            macro.run_count += 1

        return {
            "success": overall_success,
            "macro_id": macro.id,
            "macro_name": macro.name,
            "steps_total": len(macro.steps),
            "steps_executed": len(step_results),
            "duration_seconds": duration,
            "dry_run": dry_run,
            "step_results": step_results,
        }

    def _execute_step(self, step: MacroStep, dry_run: bool = False) -> Dict[str, Any]:
        """Route and execute a single macro step."""
        action_type = step.action_type.lower().strip()
        params = step.params or {}

        if dry_run:
            return {
                "step_id": step.step_id,
                "action_type": action_type,
                "success": True,
                "message": f"Simulated {action_type} ({step.description or 'No desc'})",
                "simulated": True,
            }

        try:
            if action_type == "app_launch":
                app_name = params.get("app_name") or params.get("app")
                if not app_name:
                    return {"success": False, "message": "Missing 'app_name' parameter"}
                res = self.action_handler.execute("app_launch", "launch", app_name=app_name)
                return {"step_id": step.step_id, "action_type": action_type, **res}

            elif action_type == "open_url":
                url = params.get("url")
                if not url:
                    return {"success": False, "message": "Missing 'url' parameter"}
                res = self.action_handler.execute("web_actions", "open_url", url=url)
                return {"step_id": step.step_id, "action_type": action_type, **res}

            elif action_type == "file_op":
                sub_action = params.get("action", "open")
                path = params.get("path")
                res = self.action_handler.execute("file_operations", sub_action, path=path)
                return {"step_id": step.step_id, "action_type": action_type, **res}

            elif action_type == "hotkey":
                combo = params.get("combo") or params.get("keys")
                if not combo:
                    return {"success": False, "message": "Missing 'combo' parameter"}
                success = self.input_sim.send_hotkey(str(combo))
                return {
                    "step_id": step.step_id,
                    "action_type": action_type,
                    "success": success,
                    "message": f"Sent hotkey '{combo}'" if success else f"Failed to send hotkey '{combo}'"
                }

            elif action_type == "type_text":
                text = params.get("text", "")
                success = self.input_sim.type_text(str(text))
                return {
                    "step_id": step.step_id,
                    "action_type": action_type,
                    "success": success,
                    "message": f"Typed text ({len(text)} chars)" if success else "Failed to type text"
                }

            elif action_type == "click":
                x = params.get("x")
                y = params.get("y")
                btn = params.get("button", "left")
                success = self.input_sim.click(x=x, y=y, button=btn)
                return {
                    "step_id": step.step_id,
                    "action_type": action_type,
                    "success": success,
                    "message": f"Clicked {btn} at ({x}, {y})" if success else "Failed to click"
                }

            elif action_type == "delay":
                seconds = float(params.get("seconds", 1.0))
                time.sleep(seconds)
                return {
                    "step_id": step.step_id,
                    "action_type": action_type,
                    "success": True,
                    "message": f"Waited {seconds}s"
                }

            elif action_type == "shell_command":
                cmd = params.get("command", "")
                if not self._is_safe_command(cmd):
                    return {
                        "step_id": step.step_id,
                        "action_type": action_type,
                        "success": False,
                        "message": f"Command '{cmd}' not allowed by safe command whitelist"
                    }
                try:
                    proc = subprocess.run(
                        cmd,
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    return {
                        "step_id": step.step_id,
                        "action_type": action_type,
                        "success": proc.returncode == 0,
                        "message": proc.stdout[:200] if proc.returncode == 0 else proc.stderr[:200],
                        "returncode": proc.returncode,
                    }
                except Exception as e:
                    return {
                        "step_id": step.step_id,
                        "action_type": action_type,
                        "success": False,
                        "message": f"Command execution error: {e}"
                    }

            else:
                return {
                    "step_id": step.step_id,
                    "action_type": action_type,
                    "success": False,
                    "message": f"Unknown action type: {action_type}"
                }

        except Exception as e:
            logger.error(f"Error executing step {step.step_id}: {e}")
            return {
                "step_id": step.step_id,
                "action_type": action_type,
                "success": False,
                "message": str(e)
            }

    def _is_safe_command(self, cmd: str) -> bool:
        """Check if shell command starts with an allowed safe prefix."""
        cmd_clean = cmd.strip().lower()
        if not cmd_clean:
            return False
        # Disallow dangerous patterns
        for bad in [";", "&&", "||", "rmdir /s", "del /f", "format", "shutdown"]:
            if bad in cmd_clean:
                return False
        first_token = cmd_clean.split()[0] if cmd_clean.split() else ""
        return any(first_token.startswith(p) for p in SAFE_COMMAND_PREFIXES)
