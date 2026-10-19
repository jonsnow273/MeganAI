"""
Live Screen Copilot service for Megan.
Captures the active desktop screen, optimizes the image,
and sends it to a Multimodal Vision LLM to diagnose errors, inspect code,
or provide actionable step-by-step solutions in real-time.
"""

import io
import os
import ctypes
from ctypes import wintypes
from typing import Optional, Dict, Any
from PIL import Image

from core import logger
from llm.gateway_client import gateway_client, GatewayClient


class ScreenCaptureUtil:
    """Robust cross-environment Windows screen capture using Win32 GDI & PIL."""

    @staticmethod
    def capture_primary_screen() -> Optional[Image.Image]:
        """Captures primary monitor reliably using Win32 GDI via ctypes."""
        try:
            user32 = ctypes.windll.user32
            gdi32 = ctypes.windll.gdi32

            width = user32.GetSystemMetrics(0)
            height = user32.GetSystemMetrics(1)
            if width <= 0 or height <= 0:
                width, height = 1280, 720

            hwnd = user32.GetDesktopWindow()
            hdc_screen = user32.GetDC(hwnd)
            hdc_mem = gdi32.CreateCompatibleDC(hdc_screen)
            hbitmap = gdi32.CreateCompatibleBitmap(hdc_screen, width, height)
            gdi32.SelectObject(hdc_mem, hbitmap)

            SRCCOPY = 0x00CC0020
            gdi32.BitBlt(hdc_mem, 0, 0, width, height, hdc_screen, 0, 0, SRCCOPY)

            class BITMAPINFOHEADER(ctypes.Structure):
                _fields_ = [
                    ('biSize', wintypes.DWORD),
                    ('biWidth', wintypes.LONG),
                    ('biHeight', wintypes.LONG),
                    ('biPlanes', wintypes.WORD),
                    ('biBitCount', wintypes.WORD),
                    ('biCompression', wintypes.DWORD),
                    ('biSizeImage', wintypes.DWORD),
                    ('biXPelsPerMeter', wintypes.LONG),
                    ('biYPelsPerMeter', wintypes.LONG),
                    ('biClrUsed', wintypes.DWORD),
                    ('biClrImportant', wintypes.DWORD),
                ]

            bmi = BITMAPINFOHEADER()
            bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
            bmi.biWidth = width
            bmi.biHeight = -height  # top-down DIB
            bmi.biPlanes = 1
            bmi.biBitCount = 32
            bmi.biCompression = 0

            buffer = ctypes.create_string_buffer(width * height * 4)
            gdi32.GetDIBits(hdc_mem, hbitmap, 0, height, buffer, ctypes.byref(bmi), 0)

            # Free GDI resources
            gdi32.DeleteObject(hbitmap)
            gdi32.DeleteDC(hdc_mem)
            user32.ReleaseDC(hwnd, hdc_screen)

            img = Image.frombuffer('RGBA', (width, height), buffer, 'raw', 'BGRA', 0, 1).convert('RGB')
            return img
        except Exception as e:
            logger.warning(f"Win32 GDI grab failed, falling back to PIL ImageGrab: {e}")
            try:
                from PIL import ImageGrab
                return ImageGrab.grab().convert("RGB")
            except Exception as e2:
                logger.error(f"All screen capture methods failed: {e2}")
                return None


class ScreenCopilotService:
    """
    Multimodal desktop assistant that inspects screen state and diagnoses problems.
    """

    SYSTEM_PROMPT = (
        "You are Megan Screen Copilot, a high-level multimodal desktop AI assistant.\n"
        "You are inspecting a live screenshot of the user's computer screen.\n"
        "Your mission is to look directly at the user's active window (IDE, terminal, browser, error dialog, settings, or application) "
        "and provide a direct, highly accurate, actionable diagnosis and solution.\n"
        "Rules:\n"
        "1. Identify the exact application, terminal command, or code file visible.\n"
        "2. If an error, stack trace, or warning is visible, explain the root cause concisely.\n"
        "3. Provide the exact fix (e.g. corrected code snippet or exact shell command to run).\n"
        "4. Do NOT use emojis.\n"
        "5. Be direct, authoritative, and helpful."
    )

    def __init__(self, client: Optional[GatewayClient] = None):
        self.client = client or gateway_client

    def analyze_screen(
        self,
        user_query: Optional[str] = None,
        custom_system_prompt: Optional[str] = None,
        target_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Grabs active screen, compresses to JPEG, and sends to Multimodal Vision model.
        Returns:
            dict with 'diagnosis', 'query', 'screen_dimensions', 'image_base64_preview'
        """
        img = ScreenCaptureUtil.capture_primary_screen()
        if img is None:
            raise RuntimeError("Failed to capture screen image.")

        # Downscale if wider than 1920 to save tokens and latency while keeping full legibility
        width, height = img.size
        if width > 1920:
            new_height = int(height * (1920 / width))
            img = img.resize((1920, new_height), Image.Resampling.LANCZOS)

        # Compress to JPEG
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82, optimize=True)
        image_bytes = buf.getvalue()

        query = user_query.strip() if user_query and user_query.strip() else (
            "Analyze my current screen. What is happening, are there any errors or issues, "
            "and what should I do next?"
        )

        system_prompt = custom_system_prompt or self.SYSTEM_PROMPT
        logger.info(f"Screen Copilot analyzing screen ({img.width}x{img.height}) with query: '{query[:60]}'")

        diagnosis = self.client.chat_with_vision(
            prompt=query,
            image_bytes=image_bytes,
            mime_type="image/jpeg",
            model=target_model,
            system_prompt=system_prompt,
            max_tokens=1500,
        )

        import base64
        thumb = img.resize((320, int(img.height * (320 / img.width))), Image.Resampling.BILINEAR)
        t_buf = io.BytesIO()
        thumb.save(t_buf, format="JPEG", quality=60)
        thumb_b64 = base64.b64encode(t_buf.getvalue()).decode("utf-8")

        return {
            "diagnosis": diagnosis,
            "query": query,
            "dimensions": f"{img.width}x{img.height}",
            "preview_thumbnail": f"data:image/jpeg;base64,{thumb_b64}",
        }


copilot_service = ScreenCopilotService()
