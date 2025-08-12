from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select # NEW
from typing import List, Dict, Any

from core.database import get_db
from core import models, crud
from core.security import get_current_admin_user
from core.models import User
from core.models import AISettings, AISettingsCreate, AISettingsResponse

router = APIRouter(
    prefix="/api/ai_config",
    tags=["AI Config"]
)

@router.get("/", response_model=AISettingsResponse)
async def get_ai_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Ensure only admin users can access/modify AI settings
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    # Try to get the single AI settings row
    ai_settings = (await db.execute(select(AISettings))).scalars().first()
    if not ai_settings:
        # If no settings exist, create a default one
        default_settings = AISettings(
            alert_enabled=False,
            alert_channels=[],
            slack_webhook_url=None,
            email_recipients=[],
            alert_threshold_zscore=2.0,
            alert_cooldown_minutes=5,
            action_enabled=False,
            action_rules=[]
        )
        db.add(default_settings)
        await db.commit()
        await db.refresh(default_settings)
        return default_settings
    return ai_settings

@router.put("/", response_model=AISettingsResponse)
async def update_ai_settings(
    settings_in: AISettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Ensure only admin users can access/modify AI settings
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    ai_settings = (await db.execute(select(AISettings))).scalars().first()
    if not ai_settings:
        # This case should ideally not happen if GET creates a default, but for robustness
        ai_settings = AISettings()
        db.add(ai_settings)

    # Update fields from the input model
    for field, value in settings_in.dict(exclude_unset=True).items():
        setattr(ai_settings, field, value)

    await db.commit()
    await db.refresh(ai_settings)
    return ai_settings
