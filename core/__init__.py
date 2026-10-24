"""
Core foundation module for Megan.
Provides centralized constants, logger, and configuration instances.
"""

from core.constants import (
    PROJECT_ROOT,
    CONFIGS_DIR,
    DATA_DIR,
    LOGS_DIR,
)
from core.logger import logger
from core.config import config

__all__ = [
    "PROJECT_ROOT",
    "CONFIGS_DIR",
    "DATA_DIR",
    "LOGS_DIR",
    "logger",
    "config",
]
