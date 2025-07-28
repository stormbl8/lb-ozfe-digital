import os
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

from core.models import AppSettings
from core.settings_manager import load_settings, save_settings

load_dotenv()

router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"]
)

@router.get("")
async def get_settings():
    """Returns a combination of read-only env vars and editable settings."""
    editable_settings = load_settings()
    return {
        "read_only": {
            "cloudflare_email": os.getenv("CLOUDFLARE_EMAIL", "Not Set")
        },
        "editable": editable_settings.dict()
    }

@router.post("")
async def update_settings(settings: AppSettings):
    """Updates the editable settings."""
    try:
        save_settings(settings)
        return {"message": "Settings updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {e}")