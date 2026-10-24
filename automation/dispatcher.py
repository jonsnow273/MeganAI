"""
Automation Dispatcher for Megan.
Interprets user desktop automation commands (launching apps, creating files/folders,
opening URLs, and managing files) and executes them safely via Windows OS commands.
"""

import os
import re
import platform
import subprocess
import webbrowser
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

from core import logger


class AutomationDispatcher:
    """
    Intelligent dispatcher matching natural language commands to verified
    PC automation handlers on Windows and cross-platform.
    """

    # Common Windows application aliases
    APP_ALIASES = {
        "vs code": "code",
        "vscode": "code",
        "visual studio code": "code",
        "code": "code",
        "notepad": "notepad",
        "calculator": "calc",
        "calc": "calc",
        "chrome": "chrome",
        "google chrome": "chrome",
        "edge": "msedge",
        "microsoft edge": "msedge",
        "browser": "msedge",
        "cmd": "cmd",
        "terminal": "cmd",
        "command prompt": "cmd",
        "powershell": "powershell",
        "explorer": "explorer",
        "file explorer": "explorer",
        "files": "explorer",
        "paint": "mspaint",
        "mspaint": "mspaint",
        "task manager": "taskmgr",
        "taskmgr": "taskmgr",
    }

    @staticmethod
    def get_desktop_dir() -> Path:
        """Resolve the active user's desktop path reliably on Windows."""
        desktop = Path(os.path.expanduser("~/Desktop"))
        if not desktop.exists():
            desktop = Path(os.environ.get("USERPROFILE", ".")) / "Desktop"
        desktop.mkdir(parents=True, exist_ok=True)
        return desktop

    @classmethod
    def try_dispatch(cls, message: str) -> Optional[Dict[str, Any]]:
        """
        Attempt to parse and execute an automation command from natural language.
        Returns result dict if matched and executed, or None if casual chat.
        """
        text = message.strip()
        lower = text.lower()

        # 1. Application Launch: "open vs code", "launch notepad", "can you please open chrome"
        app_match = re.search(
            r"(?:can\s+you\s+(?:please\s+)?)?(?:open|launch|start|run)\s+(?:the\s+)?([a-z0-9\s_\-\.]+?)(?:\s+for\s+me|\s+now|\s+app)?$",
            lower,
            re.IGNORECASE,
        )
        if app_match:
            candidate = app_match.group(1).strip()
            # Clean punctuation
            candidate = re.sub(r"[?!.,]", "", candidate).strip()
            if candidate in cls.APP_ALIASES or candidate in ["spotify", "discord", "slack", "vlc", "word", "excel"]:
                return cls.launch_app(candidate)

        # 2. File Creation: "create a bruh.txt file with no content in it on the desktop screen"
        create_file_match = re.search(
            r"(?:create|make|touch|generate)\s+(?:a\s+|an\s+)?(?:file\s+named\s+|file\s+called\s+|new\s+file\s+)?([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)(?:\s+file)?(?:\s+(?:with|containing)\s+(?:no\s+content|empty|[^\.]+))?(?:\s+on\s+(?:the\s+)?(?:desktop|screen))?",
            lower,
            re.IGNORECASE,
        )
        if create_file_match or ("create" in lower and ".txt" in lower) or ("create" in lower and "file" in lower and ("desktop" in lower or "screen" in lower)):
            filename = None
            if create_file_match:
                filename = create_file_match.group(1).strip()
            else:
                # Find any word with an extension like bruh.txt
                ext_match = re.search(r"([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)", text)
                if ext_match:
                    filename = ext_match.group(1).strip()

            if filename:
                content = ""
                # Check for explicit content
                content_match = re.search(r'with content ["\'](.*?)["\']', text, re.IGNORECASE)
                if content_match:
                    content = content_match.group(1)

                target_dir = cls.get_desktop_dir() if ("desktop" in lower or "screen" in lower) else cls.get_desktop_dir()
                return cls.create_file(target_dir / filename, content=content)

        # 3. Folder Creation: "create a folder called test on desktop"
        create_folder_match = re.search(
            r"(?:create|make|mkdir)\s+(?:a\s+|an\s+)?(?:folder|directory)\s+(?:called\s+|named\s+)?['\"]?([a-zA-Z0-9_\-\s]+?)['\"]?(?:\s+on\s+(?:the\s+)?(?:desktop|screen))?$",
            lower,
            re.IGNORECASE,
        )
        if create_folder_match and "folder" in lower:
            folder_name = create_folder_match.group(1).strip()
            folder_name = re.sub(r"[?!.,]", "", folder_name).strip()
            if folder_name:
                target_dir = cls.get_desktop_dir() if ("desktop" in lower or "screen" in lower) else cls.get_desktop_dir()
                return cls.create_folder(target_dir / folder_name)

        # 4. Open URL / Website
        url_match = re.search(r"(?:open|navigate\s+to|browse\s+to)\s+(https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9\-]+\.(?:com|org|io|dev|net|edu))", lower)
        if url_match:
            raw_url = url_match.group(1).strip()
            if not raw_url.startswith("http"):
                raw_url = "https://" + raw_url
            return cls.open_url(raw_url)

        return None

    @classmethod
    def launch_app(cls, app_query: str) -> Dict[str, Any]:
        """Launch application using system process executor."""
        target_exe = cls.APP_ALIASES.get(app_query.lower(), app_query)
        logger.info(f"AutomationDispatcher: Launching app '{target_exe}' for query '{app_query}'")

        try:
            if platform.system() == "Windows":
                # Special handling for VS Code
                if target_exe == "code":
                    try:
                        subprocess.Popen(["cmd.exe", "/c", "code"], shell=False)
                        return {
                            "success": True,
                            "action": "open_app",
                            "message": "Visual Studio Code has been launched on your computer.",
                        }
                    except Exception:
                        pass

                # Generic start command on Windows
                subprocess.Popen(["cmd.exe", "/c", "start", "", target_exe], shell=False)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", "-a", target_exe])
            else:
                subprocess.Popen([target_exe])

            display_name = app_query.title()
            return {
                "success": True,
                "action": "open_app",
                "message": f"{display_name} has been launched on your computer.",
            }
        except Exception as e:
            logger.error(f"Failed to launch app '{app_query}': {e}")
            return {
                "success": False,
                "action": "open_app",
                "message": f"Failed to launch '{app_query}': {e}",
            }

    @classmethod
    def create_file(cls, target_path: Path, content: str = "") -> Dict[str, Any]:
        """Safely create a file at the specified location."""
        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(content)

            logger.info(f"AutomationDispatcher: Created file at '{target_path}'")
            return {
                "success": True,
                "action": "create_file",
                "path": str(target_path),
                "message": f"Created '{target_path.name}' on your {target_path.parent.name}.",
            }
        except Exception as e:
            logger.error(f"Failed to create file '{target_path}': {e}")
            return {
                "success": False,
                "action": "create_file",
                "message": f"Could not create file: {e}",
            }

    @classmethod
    def create_folder(cls, target_path: Path) -> Dict[str, Any]:
        """Safely create a folder at the specified location."""
        try:
            target_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"AutomationDispatcher: Created folder at '{target_path}'")
            return {
                "success": True,
                "action": "create_folder",
                "path": str(target_path),
                "message": f"Created folder '{target_path.name}' on your {target_path.parent.name}.",
            }
        except Exception as e:
            logger.error(f"Failed to create folder '{target_path}': {e}")
            return {
                "success": False,
                "action": "create_folder",
                "message": f"Could not create folder: {e}",
            }

    @classmethod
    def open_url(cls, url: str) -> Dict[str, Any]:
        """Open web URL in default browser."""
        try:
            webbrowser.open(url)
            logger.info(f"AutomationDispatcher: Opened URL '{url}'")
            return {
                "success": True,
                "action": "open_url",
                "message": f"Opened {url} in your default browser.",
            }
        except Exception as e:
            return {
                "success": False,
                "action": "open_url",
                "message": f"Failed to open URL: {e}",
            }
