"""
Unit tests for Megan Autonomous Workflow Macro Recorder subsystem.
Tests data models, macro persistence, recorder session lifecycle,
and runner replay engine with safety verification.
"""

import sys
import shutil
import tempfile
import unittest
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from automation.macro.models import Macro, MacroStep
from automation.macro.store import MacroStore
from automation.macro.recorder import MacroRecorder
from automation.macro.runner import MacroRunner
from automation.macro.input_simulator import InputSimulator


class TestMacroSubsystem(unittest.TestCase):

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp(prefix="test_macro_"))

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_01_macro_step_model(self):
        """Test MacroStep serialization and default values."""
        step = MacroStep(
            action_type="app_launch",
            params={"app_name": "notepad"},
            delay_before=1.2,
            description="Launch Notepad text editor",
        )
        data = step.to_dict()
        self.assertEqual(data["action_type"], "app_launch")
        self.assertEqual(data["params"]["app_name"], "notepad")
        self.assertEqual(data["delay_before"], 1.2)
        self.assertEqual(data["description"], "Launch Notepad text editor")
        self.assertGreater(len(step.step_id), 0)

    def test_02_macro_model(self):
        """Test Macro serialization and step aggregation."""
        macro = Macro(
            name="Daily Review",
            description="Opens browser and reviews pull requests",
            steps=[
                MacroStep(action_type="open_url", params={"url": "https://github.com"}),
                MacroStep(action_type="delay", params={"seconds": 2.0}),
            ]
        )
        data = macro.to_dict()
        self.assertEqual(data["name"], "Daily Review")
        self.assertEqual(len(data["steps"]), 2)
        self.assertEqual(data["steps"][0]["action_type"], "open_url")
        self.assertEqual(data["run_count"], 0)

    def test_03_macro_store_crud(self):
        """Test store listing, saving, querying, and deleting macros."""
        store = MacroStore(macros_dir=self.temp_dir)

        # Pre-seeded templates
        macros = store.list_macros()
        self.assertGreaterEqual(len(macros), 3)

        # Create new macro
        custom = Macro(
            id="test_custom_001",
            name="Custom Build Macro",
            steps=[MacroStep(action_type="delay", params={"seconds": 0.1})],
        )
        self.assertTrue(store.save_macro(custom))

        # Query
        retrieved = store.get_macro("test_custom_001")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.name, "Custom Build Macro")

        # Delete
        self.assertTrue(store.delete_macro("test_custom_001"))
        self.assertIsNone(store.get_macro("test_custom_001"))

    def test_04_macro_recorder_lifecycle(self):
        """Test active recording session, adding steps, and stopping."""
        store = MacroStore(macros_dir=self.temp_dir)
        recorder = MacroRecorder(store=store)

        self.assertFalse(recorder.is_recording)
        recorder.start_recording(name="Recorded Workflow", description="Interactive session")
        self.assertTrue(recorder.is_recording)

        step1 = recorder.record_step(
            action_type="app_launch",
            params={"app_name": "calc"},
            description="Open calculator",
            explicit_delay=0.5,
        )
        self.assertEqual(step1.action_type, "app_launch")
        self.assertEqual(step1.delay_before, 0.5)

        step2 = recorder.record_step(
            action_type="hotkey",
            params={"combo": "ctrl+c"},
            description="Copy selection",
            explicit_delay=0.2,
        )
        self.assertEqual(len(recorder.active_steps), 2)

        # Stop and save
        saved_macro = recorder.stop_recording(save=True)
        self.assertFalse(recorder.is_recording)
        self.assertIsNotNone(saved_macro)
        self.assertEqual(saved_macro.name, "Recorded Workflow")
        self.assertEqual(len(saved_macro.steps), 2)

        # Check it is in store
        found = store.get_macro(saved_macro.id)
        self.assertIsNotNone(found)

    def test_05_macro_runner_dry_run(self):
        """Test that MacroRunner simulates all steps in dry_run mode without executing."""
        runner = MacroRunner()
        macro = Macro(
            name="Simulation Test",
            steps=[
                MacroStep(action_type="app_launch", params={"app_name": "code"}),
                MacroStep(action_type="open_url", params={"url": "https://fastapi.tiangolo.com"}),
                MacroStep(action_type="hotkey", params={"combo": "ctrl+s"}),
                MacroStep(action_type="delay", params={"seconds": 0.05}),
            ]
        )

        steps_called = []
        def on_step(idx, step, res):
            steps_called.append(idx)
            self.assertTrue(res["success"])
            self.assertTrue(res.get("simulated", False))

        result = runner.run(macro=macro, dry_run=True, on_step_callback=on_step)
        self.assertTrue(result["success"])
        self.assertEqual(result["steps_total"], 4)
        self.assertEqual(result["steps_executed"], 4)
        self.assertEqual(len(steps_called), 4)

    def test_06_safe_command_validation(self):
        """Test that dangerous shell commands are blocked by whitelist."""
        runner = MacroRunner()
        # Allowed safe commands
        self.assertTrue(runner._is_safe_command("python --version"))
        self.assertTrue(runner._is_safe_command("git status"))
        self.assertTrue(runner._is_safe_command("npm test"))

        # Dangerous blocked commands
        self.assertFalse(runner._is_safe_command("rmdir /s /q C:\\"))
        self.assertFalse(runner._is_safe_command("format C:"))
        self.assertFalse(runner._is_safe_command("shutdown /s"))
        self.assertFalse(runner._is_safe_command("echo hello && del file.txt"))
        self.assertFalse(runner._is_safe_command(""))

    def test_07_input_simulator_graceful_calls(self):
        """Test InputSimulator handles key, hotkey, typing, and click calls without crashing."""
        sim = InputSimulator()
        # Should not raise exception
        self.assertTrue(isinstance(sim.send_key("enter"), bool))
        self.assertTrue(isinstance(sim.send_hotkey("ctrl+c"), bool))
        self.assertTrue(isinstance(sim.type_text("hello"), bool))
        self.assertTrue(isinstance(sim.click(100, 100), bool))


if __name__ == "__main__":
    print("\nRunning Megan Macro Recorder Unit Tests...\n")
    unittest.main(verbosity=2)
