"""
Conversation history manager for Megan.
Saves and loads message lists as JSON per session.
Supports per-user storage isolation.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from core import logger
from core.constants import CONVERSATIONS_DIR


class ConversationHistory:
    """
    Manages the in-memory message list and persists it to disk
    as a JSON file keyed by session ID.
    """

    def __init__(self, session_id: str, storage_dir: Optional[Path] = None):
        self.session_id = session_id
        self.messages: list[dict] = []
        self._dir = Path(storage_dir) if storage_dir else CONVERSATIONS_DIR
        self._dir.mkdir(parents=True, exist_ok=True)
        self._path = self._dir / f"{session_id}.json"

    def add(self, role: str, content: str) -> None:
        """Append a message and auto-save to disk."""
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })
        self._save()

    def add_system(self, content: str) -> None:
        """Prepend a system prompt. Replaces any existing system message."""
        self.messages = [m for m in self.messages if m["role"] != "system"]
        self.messages.insert(0, {
            "role": "system",
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })
        self._save()

    def to_llm_format(self) -> list[dict]:
        """Return messages in the role/content format the LLM expects."""
        return [{"role": m["role"], "content": m["content"]} for m in self.messages]

    def clear(self) -> None:
        """Clear in-memory history (does not delete the file)."""
        self.messages = []

    def _save(self) -> None:
        """Persist current messages to disk."""
        try:
            with open(self._path, "w", encoding="utf-8") as f:
                json.dump({
                    "session_id": self.session_id,
                    "updated_at": datetime.now().isoformat(),
                    "messages": self.messages,
                }, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed to save conversation history: {e}")

    def load(self) -> bool:
        """Load history from disk. Returns True if found."""
        if not self._path.exists():
            return False
        try:
            with open(self._path, encoding="utf-8") as f:
                data = json.load(f)
            self.messages = data.get("messages", [])
            logger.info(f"Loaded session '{self.session_id}' ({len(self.messages)} messages)")
            return True
        except Exception as e:
            logger.error(f"Failed to load session '{self.session_id}': {e}")
            return False

    def delete(self) -> bool:
        """Delete this session's file from disk."""
        try:
            if self._path.exists():
                self._path.unlink()
                logger.info(f"Deleted session file: {self._path.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete session file: {e}")
            return False

    def __len__(self) -> int:
        return len(self.messages)
