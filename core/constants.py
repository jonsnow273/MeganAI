"""
Application-wide constants, file path resolutions, and default values for Megan.
"""

import os
from pathlib import Path

# Base Directory Resolution
CORE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CORE_DIR.parent

# Standard Directory Layout
CONFIGS_DIR = PROJECT_ROOT / "configs"
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
DOCS_DIR = PROJECT_ROOT / "docs"

# Data Subdirectories
LOGS_DIR = DATA_DIR / "logs"
CONVERSATION_HISTORY_DIR = DATA_DIR / "conversation_history"
CONVERSATIONS_DIR = CONVERSATION_HISTORY_DIR  # alias used by chatbot module
ORGANIZER_DIR = DATA_DIR / "organizer"
USERS_DIR = DATA_DIR / "users"
MEMORY_DIR = DATA_DIR / "memory"

# Default Configuration Filepaths
SETTINGS_CONFIG_PATH = CONFIGS_DIR / "megan_settings.yaml"
MODEL_CONFIG_PATH = CONFIGS_DIR / "model_config.yaml"
WHITELIST_CONFIG_PATH = CONFIGS_DIR / "automation_whitelist.yaml"
LANGUAGES_CONFIG_PATH = CONFIGS_DIR / "languages.yaml"

# Intent Categories
INTENT_CHAT = "chat"
INTENT_AUTOMATION = "automation"

# Ensure runtime directories exist
for directory in (LOGS_DIR, CONVERSATION_HISTORY_DIR, MODELS_DIR, ORGANIZER_DIR, USERS_DIR, MEMORY_DIR):
    os.makedirs(directory, exist_ok=True)
