import os
import json
from .models import AppSettings

# Define constants related to settings here
SETTINGS_FILE = "/app/data/config/settings.json"

def load_settings() -> AppSettings:
    """Loads editable settings from the JSON file."""
    if not os.path.exists(SETTINGS_FILE):
        return AppSettings()
    try:
        with open(SETTINGS_FILE, 'r') as f:
            data = json.load(f)
            return AppSettings(**data)
    except (json.JSONDecodeError, TypeError):
        return AppSettings()

def save_settings(settings: AppSettings):
    """Saves editable settings to the JSON file."""
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings.dict(), f, indent=2)