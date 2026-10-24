"""
Native Windows desktop input simulation using ctypes.user32.
Simulates keystrokes, hotkeys, and mouse clicks with rate limiting.
Falls back gracefully on non-Windows platforms.
"""

import sys
import time
import platform
from typing import List, Optional

from core import logger

# Virtual Key Codes map
VK_MAP = {
    "enter": 0x0D,
    "return": 0x0D,
    "tab": 0x09,
    "space": 0x20,
    "backspace": 0x08,
    "esc": 0x1B,
    "escape": 0x1B,
    "ctrl": 0x11,
    "control": 0x11,
    "alt": 0x12,
    "shift": 0x10,
    "win": 0x5B,
    "windows": 0x5B,
    "up": 0x26,
    "down": 0x28,
    "left": 0x25,
    "right": 0x27,
    "f1": 0x70,
    "f2": 0x71,
    "f3": 0x72,
    "f4": 0x73,
    "f5": 0x74,
    "f6": 0x75,
    "f7": 0x76,
    "f8": 0x77,
    "f9": 0x78,
    "f10": 0x79,
    "f11": 0x7A,
    "f12": 0x7B,
}

KEYEVENTF_KEYUP = 0x0002
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010


class InputSimulator:
    """Simulates keyboard and mouse actions with safety bounds."""

    def __init__(self):
        self.is_windows = platform.system() == "Windows"
        self._user32 = None
        if self.is_windows:
            try:
                import ctypes
                self._user32 = ctypes.windll.user32
            except Exception as e:
                logger.warning(f"Failed to load user32.dll: {e}")

    def send_key(self, key_name: str, duration: float = 0.05) -> bool:
        """Press and release a single key."""
        if not self._user32:
            logger.debug(f"[Simulated Key]: {key_name}")
            return True

        vk = self._get_vk_code(key_name)
        if vk is None:
            logger.warning(f"Unknown key code for: {key_name}")
            return False

        try:
            self._user32.keybd_event(vk, 0, 0, 0)
            time.sleep(duration)
            self._user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
            return True
        except Exception as e:
            logger.error(f"Error sending key {key_name}: {e}")
            return False

    def send_hotkey(self, combo: str) -> bool:
        """
        Send a hotkey combination (e.g. 'ctrl+s', 'ctrl+shift+p', 'alt+f4').
        """
        parts = [p.strip().lower() for p in combo.split("+")]
        vks = [self._get_vk_code(p) for p in parts]
        if any(vk is None for vk in vks):
            logger.warning(f"Invalid key in hotkey combo: {combo}")
            return False

        if not self._user32:
            logger.debug(f"[Simulated Hotkey]: {combo}")
            return True

        try:
            # Press all in order
            for vk in vks:
                self._user32.keybd_event(vk, 0, 0, 0)
                time.sleep(0.02)
            time.sleep(0.05)
            # Release all in reverse order
            for vk in reversed(vks):
                self._user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
                time.sleep(0.02)
            return True
        except Exception as e:
            logger.error(f"Error sending hotkey {combo}: {e}")
            return False

    def type_text(self, text: str, delay_per_char: float = 0.02) -> bool:
        """Type out a string of characters."""
        if not self._user32:
            logger.debug(f"[Simulated Typing]: {text}")
            return True

        try:
            for ch in text:
                vk = self._get_char_vk(ch)
                if vk:
                    needs_shift = ch.isupper() or ch in "~!@#$%^&*()_+{}|:\"<>?"
                    if needs_shift:
                        self._user32.keybd_event(VK_MAP["shift"], 0, 0, 0)
                    self._user32.keybd_event(vk, 0, 0, 0)
                    time.sleep(0.01)
                    self._user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
                    if needs_shift:
                        self._user32.keybd_event(VK_MAP["shift"], 0, KEYEVENTF_KEYUP, 0)
                time.sleep(delay_per_char)
            return True
        except Exception as e:
            logger.error(f"Error typing text: {e}")
            return False

    def click(self, x: Optional[int] = None, y: Optional[int] = None, button: str = "left") -> bool:
        """Click the mouse at (x, y) coordinates or current position."""
        if not self._user32:
            logger.debug(f"[Simulated Click]: button={button} at ({x}, {y})")
            return True

        try:
            if x is not None and y is not None:
                self._user32.SetCursorPos(int(x), int(y))
                time.sleep(0.05)

            if button.lower() == "right":
                down_flag = MOUSEEVENTF_RIGHTDOWN
                up_flag = MOUSEEVENTF_RIGHTUP
            else:
                down_flag = MOUSEEVENTF_LEFTDOWN
                up_flag = MOUSEEVENTF_LEFTUP

            self._user32.mouse_event(down_flag, 0, 0, 0, 0)
            time.sleep(0.03)
            self._user32.mouse_event(up_flag, 0, 0, 0, 0)
            return True
        except Exception as e:
            logger.error(f"Error performing click: {e}")
            return False

    def _get_vk_code(self, key_name: str) -> Optional[int]:
        """Convert a key name to Windows virtual key code."""
        key = key_name.lower().strip()
        if key in VK_MAP:
            return VK_MAP[key]
        if len(key) == 1:
            # Letters and numbers
            char_code = ord(key.upper())
            if (0x41 <= char_code <= 0x5A) or (0x30 <= char_code <= 0x39):
                return char_code
        return None

    def _get_char_vk(self, ch: str) -> Optional[int]:
        """Convert character to standard key code."""
        if ch == " ":
            return VK_MAP["space"]
        if ch == "\n":
            return VK_MAP["enter"]
        if ch == "\t":
            return VK_MAP["tab"]
        code = ord(ch.upper())
        if (0x41 <= code <= 0x5A) or (0x30 <= code <= 0x39):
            return code
        return None
