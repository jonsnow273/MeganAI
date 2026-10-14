"""
Focus data aggregator for Megan Standup Generator.

Reads persisted Focus Coach session data from the JSON store and
returns daily productivity summaries. Works even when the Focus daemon
is not running.
"""

import json
from datetime import datetime, date
from pathlib import Path
from typing import List, Dict, Any, Optional

from core import logger
from core.constants import DATA_DIR


# Focus sessions are persisted to data/focus/sessions.json by the coach
FOCUS_SESSIONS_FILE = DATA_DIR / "focus" / "sessions.json"


def _format_duration(seconds: float) -> str:
    """Format seconds into human-readable string: Xh Ym."""
    seconds = max(0.0, seconds)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


class FocusAggregator:
    """
    Aggregates Focus Coach session data from the persistent sessions store.
    Falls back gracefully when the sessions file doesn't exist yet.
    """

    def __init__(self, sessions_file: Optional[Path] = None):
        self.sessions_file = sessions_file or FOCUS_SESSIONS_FILE

    def _load_sessions(self) -> List[Dict[str, Any]]:
        """Load all recorded sessions from disk."""
        if not self.sessions_file.exists():
            logger.debug(f"Focus sessions file not found at {self.sessions_file}. No data yet.")
            return []
        try:
            with open(self.sessions_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            logger.error(f"Error loading focus sessions: {e}")
            return []

    def get_day_summary(self, target_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Return aggregated focus stats for a given date.

        Returns dict with:
            - sessions_count: number of focus sessions started
            - total_productive_seconds: total time in productive apps
            - total_distracted_seconds: total time in distracting apps
            - total_neutral_seconds: total time in neutral apps
            - productivity_score: weighted average score (0-100)
            - session_goals: list of session goal strings
            - formatted: human-readable time strings
        """
        target = target_date or date.today()
        sessions = self._load_sessions()

        day_sessions = []
        for s in sessions:
            ts = s.get("started_at") or s.get("timestamp") or ""
            try:
                session_date = datetime.fromisoformat(ts).date()
                if session_date == target:
                    day_sessions.append(s)
            except Exception:
                continue

        if not day_sessions:
            return {
                "sessions_count": 0,
                "total_productive_seconds": 0.0,
                "total_distracted_seconds": 0.0,
                "total_neutral_seconds": 0.0,
                "productivity_score": None,
                "session_goals": [],
                "formatted": {
                    "productive": "0m",
                    "distracted": "0m",
                    "neutral": "0m",
                    "total": "0m",
                },
                "has_data": False,
            }

        total_prod = sum(s.get("time_productive_seconds", 0.0) for s in day_sessions)
        total_dist = sum(s.get("time_distracted_seconds", 0.0) for s in day_sessions)
        total_neut = sum(s.get("time_neutral_seconds", 0.0) for s in day_sessions)
        total_all = total_prod + total_dist + total_neut

        # Weighted productivity score
        scores = [s.get("productivity_score", 0.0) for s in day_sessions if s.get("productivity_score") is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        goals = [s.get("session_goal", "General Work") for s in day_sessions if s.get("session_goal")]

        return {
            "sessions_count": len(day_sessions),
            "total_productive_seconds": round(total_prod, 1),
            "total_distracted_seconds": round(total_dist, 1),
            "total_neutral_seconds": round(total_neut, 1),
            "productivity_score": avg_score,
            "session_goals": goals,
            "formatted": {
                "productive": _format_duration(total_prod),
                "distracted": _format_duration(total_dist),
                "neutral": _format_duration(total_neut),
                "total": _format_duration(total_all),
            },
            "has_data": True,
        }
