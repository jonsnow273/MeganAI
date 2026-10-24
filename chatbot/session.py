"""
Session management for Megan.
Creates, lists, and resumes conversation sessions.
Supports per-user sandbox storage.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from core import logger
from core.constants import CONVERSATIONS_DIR
from chatbot.history import ConversationHistory


def new_session(storage_dir: Optional[Path] = None) -> ConversationHistory:
    """
    Create a brand-new session with a unique ID.

    Returns:
        An empty ConversationHistory ready to use.
    """
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
    logger.info(f"New session created: {session_id}")
    return ConversationHistory(session_id, storage_dir=storage_dir)


def resume_session(session_id: str, storage_dir: Optional[Path] = None) -> Optional[ConversationHistory]:
    """
    Load an existing session from disk.

    Args:
        session_id: The ID of the session to resume.
        storage_dir: Optional user storage directory override.

    Returns:
        A ConversationHistory loaded with past messages,
        or None if the session does not exist.
    """
    history = ConversationHistory(session_id, storage_dir=storage_dir)
    if history.load():
        return history
    # Fallback to default directory if not found in custom storage
    if storage_dir is not None and storage_dir != CONVERSATIONS_DIR:
        default_history = ConversationHistory(session_id, storage_dir=CONVERSATIONS_DIR)
        if default_history.load():
            return default_history
    logger.warning(f"Session not found: '{session_id}'")
    return None


def list_sessions(storage_dir: Optional[Path] = None) -> list[dict]:
    """
    List all saved sessions ordered by most recent first.

    Returns:
        List of dicts with session_id, updated_at, message_count, and preview.
    """
    target_dir = Path(storage_dir) if storage_dir else CONVERSATIONS_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    sessions = []
    for path in sorted(target_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            msgs = data.get("messages", [])
            preview = ""
            for m in msgs:
                if m.get("role") == "user":
                    preview = m.get("content", "")[:60]
                    break
            sessions.append({
                "session_id": data.get("session_id", path.stem),
                "created_at": data.get("updated_at", datetime.fromtimestamp(path.stat().st_mtime).isoformat()),
                "updated_at": data.get("updated_at", datetime.fromtimestamp(path.stat().st_mtime).isoformat()),
                "message_count": len(msgs),
                "preview": preview,
            })
        except Exception:
            continue
    return sessions


def delete_session(session_id: str, storage_dir: Optional[Path] = None) -> bool:
    """
    Delete a saved session file.

    Returns:
        True if deleted, False if not found.
    """
    target_dir = Path(storage_dir) if storage_dir else CONVERSATIONS_DIR
    path = target_dir / f"{session_id}.json"
    if path.exists():
        path.unlink()
        logger.info(f"Deleted session: {session_id}")
        return True
    # Try global fallback
    fallback = CONVERSATIONS_DIR / f"{session_id}.json"
    if fallback.exists():
        fallback.unlink()
        logger.info(f"Deleted session from default store: {session_id}")
        return True
    return False


def print_sessions() -> None:
    """Pretty-print all saved sessions to the terminal."""
    sessions = list_sessions()
    if not sessions:
        print("No saved sessions found.")
        return

    print(f"\nSaved Sessions ({len(sessions)} total):")
    print(f"{'Session ID':<30} {'Updated At':<22} {'Messages'}")
    print("-" * 62)
    for s in sessions:
        print(f"{s['session_id']:<30} {s['updated_at']:<22} {s['message_count']}")
    print()
