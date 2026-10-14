"""
Memory topic extractor for Megan Standup Generator.

Queries Digital Memory's timeline to extract the top apps, window titles,
and OCR text topics active during the day — giving an automated "what was I
working on?" summary from screen data.
"""

import re
from datetime import datetime, date
from pathlib import Path
from typing import List, Dict, Any, Optional, Counter as CounterType
from collections import Counter

from core import logger
from memory.store import VectorMemoryStore
from core.constants import DATA_DIR


# Default per-user memory directory
DEFAULT_MEMORY_DIR = DATA_DIR / "memory" / "default"


class MemoryTopicExtractor:
    """
    Reads today's Digital Memory snapshots and extracts:
    - Top active applications
    - Top window titles (project/task context)
    - Key OCR text themes (most frequent meaningful words)
    """

    # Common words to exclude from topic extraction
    STOPWORDS = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "has", "have", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "this", "that", "these",
        "those", "it", "its", "you", "your", "we", "our", "i", "my", "he",
        "she", "they", "their", "not", "no", "so", "if", "as", "up", "out",
        "about", "then", "than", "when", "which", "who", "how", "what",
    }

    def __init__(self, memory_dir: Optional[Path] = None):
        self.memory_dir = memory_dir or DEFAULT_MEMORY_DIR
        vector_dir = self.memory_dir / "vector"
        self.store = VectorMemoryStore(persist_dir=vector_dir)

    def get_day_topics(self, target_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Extract topic summary from memory snapshots for a given date.

        Returns:
            - top_apps: List[str] — top 5 process names used
            - top_windows: List[str] — top 5 window title contexts
            - top_words: List[str] — top 10 meaningful OCR terms
            - snapshot_count: int — number of memory frames for the day
            - active_hours: float — estimated hours screen was active
        """
        target = target_date or date.today()
        target_str = target.isoformat()  # e.g. "2026-10-13"

        # Get full timeline from memory store (all frames)
        timeline = self.store.get_timeline(limit=500, order="asc")

        # Filter to target date
        day_items = []
        for item in timeline:
            ts = item.get("timestamp", "")
            if ts.startswith(target_str):
                day_items.append(item)

        if not day_items:
            return {
                "top_apps": [],
                "top_windows": [],
                "top_words": [],
                "snapshot_count": 0,
                "active_hours": 0.0,
                "has_data": False,
            }

        # Count top apps
        app_counter: CounterType[str] = Counter()
        window_counter: CounterType[str] = Counter()
        word_counter: CounterType[str] = Counter()

        for item in day_items:
            proc = item.get("process_name", "").replace(".exe", "").strip()
            if proc and proc.lower() not in {"unknown", "explorer", ""}:
                app_counter[proc] += 1

            title = item.get("window_title", "").strip()
            # Shorten titles: take first meaningful segment
            short_title = self._shorten_title(title)
            if short_title:
                window_counter[short_title] += 1

            # Extract meaningful words from OCR text
            text = item.get("text", "")
            if text:
                words = re.findall(r"\b[a-zA-Z]{4,20}\b", text.lower())
                for w in words:
                    if w not in self.STOPWORDS:
                        word_counter[w] += 1

        # Estimate active hours from timestamp span
        try:
            first_ts = datetime.fromisoformat(day_items[0]["timestamp"])
            last_ts = datetime.fromisoformat(day_items[-1]["timestamp"])
            active_hours = round((last_ts - first_ts).total_seconds() / 3600, 1)
        except Exception:
            active_hours = 0.0

        return {
            "top_apps": [app for app, _ in app_counter.most_common(5)],
            "top_windows": [w for w, _ in window_counter.most_common(5)],
            "top_words": [w for w, _ in word_counter.most_common(10)],
            "snapshot_count": len(day_items),
            "active_hours": active_hours,
            "has_data": True,
        }

    def _shorten_title(self, title: str) -> str:
        """Shorten a window title to a clean, meaningful segment."""
        if not title:
            return ""
        # Split by common separators and take the most descriptive part
        for sep in [" - ", " | ", " — ", " · ", " – "]:
            if sep in title:
                parts = title.split(sep)
                # Return the longest part (usually most descriptive)
                return max(parts, key=len).strip()[:60]
        return title.strip()[:60]
