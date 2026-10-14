"""
Megan Daily Standup Report Generator.

Synthesizes data from three sources:
  1. Git commits (via GitCollector)
  2. Focus Coach sessions (via FocusAggregator)
  3. Digital Memory screen topics (via MemoryTopicExtractor)

Produces a structured Markdown report and optionally a plain-text version.
Saves reports to data/reports/ directory.
"""

import re
from datetime import datetime, date
from pathlib import Path
from typing import Optional, Dict, Any, List

from core import logger
from core.constants import DATA_DIR
from standup.git_collector import GitCollector
from standup.focus_aggregator import FocusAggregator
from standup.memory_extractor import MemoryTopicExtractor

REPORTS_DIR = DATA_DIR / "reports"


def _fmt_date(d: date) -> str:
    # Use standard format without %-d (which raises ValueError on Windows)
    day = str(d.day)
    return d.strftime(f"%A, %B {day}, %Y")


def _fmt_score(score: Optional[float]) -> str:
    if score is None:
        return "N/A"
    return f"{score}%"


class StandupGenerator:
    """
    Orchestrates the generation of the Daily Standup Markdown report.
    All three data sources are optional — each section degrades gracefully.
    """

    def __init__(
        self,
        repo_dir: Optional[Path] = None,
        memory_dir: Optional[Path] = None,
        focus_sessions_file: Optional[Path] = None,
        reports_dir: Optional[Path] = None,
        git_author: Optional[str] = None,
    ):
        self.reports_dir = reports_dir or REPORTS_DIR
        self.reports_dir.mkdir(parents=True, exist_ok=True)

        self.git = GitCollector(repo_dir=repo_dir)
        self.focus = FocusAggregator(sessions_file=focus_sessions_file)
        self.memory = MemoryTopicExtractor(memory_dir=memory_dir)
        self.git_author = git_author  # None = all authors

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def generate(
        self,
        target_date: Optional[date] = None,
        include_git: bool = True,
        include_focus: bool = True,
        include_memory: bool = True,
        blockers: Optional[str] = None,
        tomorrow_plan: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate the full standup report for a given date.

        Args:
            target_date:    Date to generate report for. Defaults to today.
            include_git:    Whether to include Git commit section.
            include_focus:  Whether to include Focus Coach section.
            include_memory: Whether to include Digital Memory topics.
            blockers:       Optional freeform "blockers" text from user.
            tomorrow_plan:  Optional freeform "tomorrow's plan" text from user.

        Returns:
            Dict with keys: markdown, plain_text, metadata, report_path
        """
        target = target_date or date.today()
        generated_at = datetime.now()

        # ── Collect data ──────────────────────────────────────────
        git_commits: List[Dict[str, Any]] = []
        git_stats: Dict[str, Any] = {}
        focus_data: Dict[str, Any] = {}
        memory_data: Dict[str, Any] = {}

        if include_git:
            try:
                git_commits = self.git.get_commits(since_date=target, until_date=target, author=self.git_author)
                git_stats = self.git.get_stats(since_date=target, until_date=target)
            except Exception as e:
                logger.error(f"Git collection error: {e}")

        if include_focus:
            try:
                focus_data = self.focus.get_day_summary(target_date=target)
            except Exception as e:
                logger.error(f"Focus aggregation error: {e}")

        if include_memory:
            try:
                memory_data = self.memory.get_day_topics(target_date=target)
            except Exception as e:
                logger.error(f"Memory extraction error: {e}")

        # ── Build Markdown ────────────────────────────────────────
        md = self._build_markdown(
            target=target,
            generated_at=generated_at,
            git_commits=git_commits,
            git_stats=git_stats,
            focus_data=focus_data,
            memory_data=memory_data,
            blockers=blockers,
            tomorrow_plan=tomorrow_plan,
        )

        # ── Save report ───────────────────────────────────────────
        filename = f"standup_{target.isoformat()}.md"
        report_path = self.reports_dir / filename
        try:
            with open(report_path, "w", encoding="utf-8") as f:
                f.write(md)
            logger.info(f"Standup report saved: {report_path}")
        except Exception as e:
            logger.error(f"Failed to save report: {e}")
            report_path = None

        # ── Metadata ──────────────────────────────────────────────
        metadata = {
            "report_date": target.isoformat(),
            "generated_at": generated_at.isoformat(),
            "commit_count": len(git_commits),
            "branch": git_stats.get("branch", "unknown"),
            "productivity_score": focus_data.get("productivity_score"),
            "focus_sessions": focus_data.get("sessions_count", 0),
            "memory_snapshots": memory_data.get("snapshot_count", 0),
            "top_apps": memory_data.get("top_apps", []),
            "report_path": str(report_path) if report_path else None,
        }

        return {
            "markdown": md,
            "plain_text": self._strip_markdown(md),
            "metadata": metadata,
            "report_path": str(report_path) if report_path else None,
        }

    # ─────────────────────────────────────────────────────────────
    # Markdown builder
    # ─────────────────────────────────────────────────────────────

    def _build_markdown(
        self,
        target: date,
        generated_at: datetime,
        git_commits: List[Dict[str, Any]],
        git_stats: Dict[str, Any],
        focus_data: Dict[str, Any],
        memory_data: Dict[str, Any],
        blockers: Optional[str],
        tomorrow_plan: Optional[str],
    ) -> str:
        sections: List[str] = []

        # ── Header ────────────────────────────────────────────────
        sections.append(
            f"# Daily Standup Report\n"
            f"**Date:** {_fmt_date(target)}  \n"
            f"**Generated by:** Megan AI  \n"
            f"**Time:** {generated_at.strftime('%H:%M')}  \n"
        )

        # ── What I Did Today (Git) ────────────────────────────────
        sections.append("## What I Did Today\n")

        if git_commits:
            branch = git_stats.get("branch", "unknown")
            inserted = git_stats.get("lines_inserted", 0)
            deleted = git_stats.get("lines_deleted", 0)

            sections.append(
                f"**Branch:** `{branch}`  \n"
                f"**Commits:** {len(git_commits)}  \n"
                f"**Lines:** +{inserted} / -{deleted}\n\n"
            )
            sections.append("### Git Commits\n")
            for c in git_commits:
                short_hash = c["hash"][:8] if c["hash"] else "?"
                subject = c.get("subject", "(no message)")
                ts = c.get("timestamp", "")
                time_str = ""
                try:
                    time_str = datetime.fromisoformat(ts).strftime("%H:%M") if ts else ""
                except Exception:
                    pass

                sections.append(f"- `{short_hash}` **{subject}**{' · ' + time_str if time_str else ''}\n")

                # List files changed (max 5)
                files = c.get("files_changed", [])
                if files:
                    preview = files[:5]
                    extra = len(files) - 5
                    file_list = ", ".join(f"`{f}`" for f in preview)
                    if extra > 0:
                        file_list += f" *(+{extra} more)*"
                    sections.append(f"  - *Files:* {file_list}\n")
        else:
            sections.append("*No git commits found for this date.*\n")

        # ── Focus Coach Stats ─────────────────────────────────────
        sections.append("\n## Focus and Productivity\n")

        if focus_data.get("has_data"):
            fmt = focus_data.get("formatted", {})
            score = focus_data.get("productivity_score")
            goals = focus_data.get("session_goals", [])

            sections.append(
                f"| Metric | Value |\n"
                f"|--------|-------|\n"
                f"| Focus Sessions | {focus_data.get('sessions_count', 0)} |\n"
                f"| Productive Time | {fmt.get('productive', '0m')} |\n"
                f"| Distracted Time | {fmt.get('distracted', '0m')} |\n"
                f"| Neutral Time | {fmt.get('neutral', '0m')} |\n"
                f"| Productivity Score | {_fmt_score(score)} |\n"
            )
            if goals:
                goals_str = ", ".join(f'"{g}"' for g in goals)
                sections.append(f"\n**Session Goals:** {goals_str}\n")
        else:
            sections.append(
                "*No Focus Coach sessions recorded for this date.*  \n"
                "*Start a focus session with `--focus \"Your Goal\"` to track time.*\n"
            )

        # ── Digital Memory Topics ─────────────────────────────────
        sections.append("\n## Screen Activity (Digital Memory)\n")

        if memory_data.get("has_data"):
            snapshots = memory_data.get("snapshot_count", 0)
            active_hrs = memory_data.get("active_hours", 0.0)
            top_apps = memory_data.get("top_apps", [])
            top_windows = memory_data.get("top_windows", [])
            top_words = memory_data.get("top_words", [])

            sections.append(
                f"**Snapshots captured:** {snapshots}  \n"
                f"**Active screen span:** ~{active_hrs}h\n\n"
            )

            if top_apps:
                apps_str = " · ".join(f"`{a}`" for a in top_apps)
                sections.append(f"**Top Apps:** {apps_str}\n\n")

            if top_windows:
                sections.append("**Active Projects / Contexts:**\n")
                for w in top_windows:
                    sections.append(f"- {w}\n")

            if top_words:
                words_str = " · ".join(f"`{w}`" for w in top_words)
                sections.append(f"\n**Key Topics (from screen text):** {words_str}\n")
        else:
            sections.append(
                "*No Digital Memory snapshots found for this date.*  \n"
                "*Start memory capture with `--memory-start` to enable screen intelligence.*\n"
            )

        # ── Blockers ──────────────────────────────────────────────
        sections.append("\n## Blockers\n")
        if blockers and blockers.strip():
            sections.append(f"{blockers.strip()}\n")
        else:
            sections.append("*None reported.*\n")

        # ── Tomorrow's Plan ───────────────────────────────────────
        sections.append("\n## Tomorrow's Plan\n")
        if tomorrow_plan and tomorrow_plan.strip():
            sections.append(f"{tomorrow_plan.strip()}\n")
        else:
            sections.append("*Not specified.*\n")

        # ── Footer ────────────────────────────────────────────────
        sections.append(
            f"\n---\n"
            f"*Generated automatically by [Megan AI](https://github.com/jonsnow273/MeganAI) "
            f"on {generated_at.strftime('%Y-%m-%d at %H:%M')}*\n"
        )

        return "\n".join(sections)

    def _strip_markdown(self, md: str) -> str:
        """Convert markdown to plain text for copy-paste sharing."""
        text = re.sub(r"#{1,6}\s+", "", md)          # headings
        text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)  # bold
        text = re.sub(r"\*(.*?)\*", r"\1", text)       # italic
        text = re.sub(r"`([^`]+)`", r"\1", text)       # inline code
        text = re.sub(r"\|.*?\|", "", text)             # table separators
        text = re.sub(r"---+", "---", text)             # hr
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # links
        text = re.sub(r"\n{3,}", "\n\n", text)          # excess blank lines
        return text.strip()

    def list_reports(self) -> List[Dict[str, Any]]:
        """List all saved standup report files."""
        reports = []
        for f in sorted(self.reports_dir.glob("standup_*.md"), reverse=True):
            try:
                stat = f.stat()
                reports.append({
                    "filename": f.name,
                    "date": f.name.replace("standup_", "").replace(".md", ""),
                    "size_bytes": stat.st_size,
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "path": str(f),
                })
            except Exception:
                continue
        return reports

    def get_report(self, report_date: date) -> Optional[str]:
        """Read and return the markdown content of a saved report."""
        path = self.reports_dir / f"standup_{report_date.isoformat()}.md"
        if not path.exists():
            return None
        try:
            return path.read_text(encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to read report {path}: {e}")
            return None


def _commit_tag(subject: str) -> str:
    """Return conventional commit tag."""
    for tag in ["feat", "fix", "docs", "refactor", "test", "chore", "ci", "perf", "build"]:
        if subject.lower().startswith(tag):
            return f"[{tag}]"
    return ""


def _commit_emoji(subject: str) -> str:
    """No emoji mode — returns empty string."""
    return ""
