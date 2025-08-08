import os
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from core import crud, models
from core.database import get_db
from core.security import get_current_admin_user

router = APIRouter(
    prefix="/api/waf",
    tags=["WAF"]
)

@router.post("/rulesets", response_model=models.WAFRuleSetResponse, status_code=status.HTTP_201_CREATED)
async def create_waf_ruleset(
    ruleset_data: models.WAFRuleSetCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Create a new WAF ruleset."""
    try:
        new_ruleset = await crud.create_waf_ruleset(db, ruleset_data)
        return new_ruleset
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A WAF ruleset with this name already exists.")

@router.get("/rulesets", response_model=List[models.WAFRuleSetResponse])
async def list_waf_rulesets(
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Retrieve all WAF rulesets."""
    return await crud.get_waf_rulesets(db)

@router.delete("/rulesets/{ruleset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_waf_ruleset(
    ruleset_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Delete a WAF ruleset."""
    db_ruleset = await crud.get_waf_ruleset(db, ruleset_id)
    if not db_ruleset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WAF ruleset not found.")

    await crud.delete_waf_ruleset(db, db_ruleset)
    return