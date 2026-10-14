"""
Unit tests for Megan Daily Standup Report Generator.
Tests git collection, focus aggregation, markdown generation, and report persistence.
"""

import sys
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from datetime import date, datetime

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from standup.git_collector import GitCollector
from standup.focus_aggregator import FocusAggregator, _format_duration
from standup.memory_extractor import MemoryTopicExtractor
from standup.generator import StandupGenerator, _commit_emoji


class TestStandupGenerator(unittest.TestCase):

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp(prefix="test_standup_"))
        self.reports_dir = self.temp_dir / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    # ─────────────────────────────────────────────────────────────
    # Git Collector
    # ─────────────────────────────────────────────────────────────

    def test_01_git_collector_branch(self):
        """Test that GitCollector can read the current branch."""
        collector = GitCollector()
        branch = collector.get_current_branch()
        # Just ensure it returns a non-empty string on a git repo
        self.assertIsInstance(branch, str)
        self.assertGreater(len(branch), 0)

    def test_02_git_collector_recent_commits(self):
        """Test that GitCollector returns commit dicts with expected fields."""
        collector = GitCollector()
        # Use last 30 days to ensure we get at least some commits
        from datetime import timedelta
        since = date.today() - timedelta(days=30)
        commits = collector.get_commits(since_date=since, until_date=date.today(), max_count=5)

        self.assertIsInstance(commits, list)
        if commits:  # might be empty on brand new CI
            c = commits[0]
            self.assertIn("hash", c)
            self.assertIn("subject", c)
            self.assertIn("author_name", c)
            self.assertIn("timestamp", c)
            self.assertIn("files_changed", c)
            self.assertIsInstance(c["files_changed"], list)

    def test_03_git_stats_returns_dict(self):
        """Test that git stats returns a valid dict."""
        collector = GitCollector()
        from datetime import timedelta
        since = date.today() - timedelta(days=30)
        stats = collector.get_stats(since_date=since, until_date=date.today())
        self.assertIn("branch", stats)
        self.assertIn("total_commits", stats)
        self.assertIn("lines_inserted", stats)
        self.assertIn("lines_deleted", stats)

    # ─────────────────────────────────────────────────────────────
    # Focus Aggregator
    # ─────────────────────────────────────────────────────────────

    def test_04_format_duration_helper(self):
        """Test the _format_duration helper for human-readable output."""
        self.assertEqual(_format_duration(0), "0m")
        self.assertEqual(_format_duration(60), "1m")
        self.assertEqual(_format_duration(3600), "1h 0m")
        self.assertEqual(_format_duration(5400), "1h 30m")
        self.assertEqual(_format_duration(7320), "2h 2m")

    def test_05_focus_aggregator_no_data(self):
        """Test FocusAggregator returns empty summary when no sessions file exists."""
        fake_file = self.temp_dir / "nonexistent_sessions.json"
        agg = FocusAggregator(sessions_file=fake_file)
        result = agg.get_day_summary(target_date=date.today())

        self.assertFalse(result["has_data"])
        self.assertEqual(result["sessions_count"], 0)
        self.assertIsNone(result["productivity_score"])

    def test_06_focus_aggregator_with_sessions(self):
        """Test FocusAggregator correctly aggregates matching day sessions."""
        sessions_file = self.temp_dir / "sessions.json"
        today_str = date.today().isoformat()

        sessions_data = [
            {
                "started_at": f"{today_str}T09:00:00",
                "session_goal": "Deep ML Research",
                "time_productive_seconds": 3600.0,
                "time_distracted_seconds": 600.0,
                "time_neutral_seconds": 300.0,
                "productivity_score": 80.0,
            },
            {
                "started_at": f"{today_str}T14:00:00",
                "session_goal": "Code Review",
                "time_productive_seconds": 1800.0,
                "time_distracted_seconds": 300.0,
                "time_neutral_seconds": 0.0,
                "productivity_score": 85.0,
            },
            {
                # Yesterday — should NOT appear
                "started_at": "2020-01-01T10:00:00",
                "session_goal": "Old Session",
                "time_productive_seconds": 999.0,
                "time_distracted_seconds": 0.0,
                "time_neutral_seconds": 0.0,
                "productivity_score": 100.0,
            },
        ]
        sessions_file.write_text(json.dumps(sessions_data), encoding="utf-8")

        agg = FocusAggregator(sessions_file=sessions_file)
        result = agg.get_day_summary(target_date=date.today())

        self.assertTrue(result["has_data"])
        self.assertEqual(result["sessions_count"], 2)
        self.assertAlmostEqual(result["total_productive_seconds"], 5400.0)
        self.assertAlmostEqual(result["total_distracted_seconds"], 900.0)
        self.assertAlmostEqual(result["productivity_score"], 82.5)
        self.assertIn("Deep ML Research", result["session_goals"])
        self.assertIn("Code Review", result["session_goals"])
        self.assertEqual(result["formatted"]["productive"], "1h 30m")

    # ─────────────────────────────────────────────────────────────
    # Memory Extractor
    # ─────────────────────────────────────────────────────────────

    def test_07_memory_extractor_no_data(self):
        """Test MemoryTopicExtractor returns empty results when no snapshots exist."""
        empty_memory_dir = self.temp_dir / "empty_memory"
        extractor = MemoryTopicExtractor(memory_dir=empty_memory_dir)
        result = extractor.get_day_topics(target_date=date.today())

        self.assertFalse(result["has_data"])
        self.assertEqual(result["snapshot_count"], 0)
        self.assertEqual(result["top_apps"], [])

    def test_08_memory_extractor_with_store(self):
        """Test MemoryTopicExtractor processes mock store entries for today."""
        from memory.store import VectorMemoryStore

        memory_dir = self.temp_dir / "memory_test"
        vector_dir = memory_dir / "vector"
        store = VectorMemoryStore(persist_dir=vector_dir)

        today_str = date.today().isoformat()
        store.add_memory(
            memory_id="snap_001",
            text="Python FastAPI activation steering transformer model inference",
            metadata={
                "timestamp": f"{today_str}T10:00:00",
                "process_name": "code.exe",
                "window_title": "steering.py - VS Code",
            },
        )
        store.add_memory(
            memory_id="snap_002",
            text="GitHub pull request review merge branch deploy",
            metadata={
                "timestamp": f"{today_str}T11:00:00",
                "process_name": "chrome.exe",
                "window_title": "MeganAI - GitHub",
            },
        )

        extractor = MemoryTopicExtractor(memory_dir=memory_dir)
        result = extractor.get_day_topics(target_date=date.today())

        self.assertTrue(result["has_data"])
        self.assertEqual(result["snapshot_count"], 2)
        self.assertIn("code", result["top_apps"])
        self.assertGreater(len(result["top_words"]), 0)

    # ─────────────────────────────────────────────────────────────
    # Report Generator
    # ─────────────────────────────────────────────────────────────

    def test_09_commit_tag_mapping(self):
        """Test conventional commit tag mapping."""
        from standup.generator import _commit_tag
        self.assertEqual(_commit_tag("feat: add new feature"), "[feat]")
        self.assertEqual(_commit_tag("fix: correct bug"), "[fix]")
        self.assertEqual(_commit_tag("docs: update README"), "[docs]")
        self.assertEqual(_commit_tag("refactor: clean up code"), "[refactor]")
        self.assertEqual(_commit_tag("test: add unit tests"), "[test]")
        self.assertEqual(_commit_tag("Some random commit"), "")

    def test_10_generator_produces_markdown(self):
        """Test full report generation produces valid Markdown content."""
        gen = StandupGenerator(reports_dir=self.reports_dir)
        result = gen.generate(
            target_date=date.today(),
            include_git=True,
            include_focus=False,
            include_memory=False,
            blockers="Waiting on dependency upgrade",
            tomorrow_plan="Implement standup frontend component",
        )

        self.assertIn("markdown", result)
        self.assertIn("plain_text", result)
        self.assertIn("metadata", result)
        md = result["markdown"]

        # Check required sections present
        self.assertIn("Daily Standup Report", md)
        self.assertIn("What I Did Today", md)
        self.assertIn("Focus and Productivity", md)
        self.assertIn("Blockers", md)
        self.assertIn("Tomorrow's Plan", md)
        self.assertIn("Waiting on dependency upgrade", md)
        self.assertIn("standup frontend component", md)

    def test_11_generator_saves_and_retrieves_report(self):
        """Test that report is saved and can be retrieved."""
        gen = StandupGenerator(reports_dir=self.reports_dir)
        target = date.today()
        gen.generate(target_date=target, include_git=False, include_focus=False, include_memory=False)

        # File should exist
        report_file = self.reports_dir / f"standup_{target.isoformat()}.md"
        self.assertTrue(report_file.exists())

        # list_reports should find it
        reports = gen.list_reports()
        self.assertGreater(len(reports), 0)
        self.assertEqual(reports[0]["date"], target.isoformat())

        # get_report should return the content
        content = gen.get_report(target)
        self.assertIsNotNone(content)
        self.assertIn("Daily Standup Report", content)

    def test_12_generator_plain_text_strip(self):
        """Test that plain_text output has no markdown symbols."""
        gen = StandupGenerator(reports_dir=self.reports_dir)
        result = gen.generate(target_date=date.today(), include_git=False, include_focus=False, include_memory=False)
        plain = result["plain_text"]

        self.assertNotIn("##", plain)
        self.assertNotIn("**", plain)
        self.assertNotIn("```", plain)


if __name__ == "__main__":
    print("\nRunning Megan Daily Standup Report Unit Tests...\n")
    unittest.main(verbosity=2)
