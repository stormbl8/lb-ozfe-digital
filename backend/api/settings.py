import os
from fastapi import APIRouter, HTTPException, Depends
from dotenv import load_dotenv

from core.models import AppSettings
from core.settings_manager import load_settings, save_settings
from core.security import get_current_user
# FIX: Import the models module to resolve the NameError
from core import models

load_dotenv()

router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"]
)

@router.get("")
async def get_settings(current_user: models.User = Depends(get_current_user)):
    """Returns a combination of read-only env vars and editable settings."""
    editable_settings = load_settings()
    return {
        "editable": editable_settings.dict()
    }

@router.post("")
async def update_settings(settings: AppSettings, current_user: models.User = Depends(get_current_user)):
    """Updates the editable settings."""
    try:
        save_settings(settings)
        return {"message": "Settings updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {e}")