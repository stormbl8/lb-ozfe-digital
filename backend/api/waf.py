import os
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from core import crud, models
from core.database import get_db
from core.security import get_current_admin_user, get_current_user
from core.license_manager import read_license

# Dependency to check for features that require a "full" license
async def check_full_license():
    license_details = read_license()
    if license_details.license_type != "full":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a full license.",
        )

router = APIRouter(
    prefix="/api/waf",
    tags=["WAF"]
)

@router.post("/rulesets", response_model=models.WAFRuleSetResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_full_license)])
async def create_waf_ruleset(
    ruleset_data: models.WAFRuleSetCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Create a new WAF ruleset. Full license required."""
    try:
        new_ruleset = await crud.create_waf_ruleset(db, ruleset_data)
        return new_ruleset
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A WAF ruleset with this name already exists.")

@router.get("/rulesets", response_model=List[models.WAFRuleSetResponse])
async def list_waf_rulesets(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Changed to get_current_user
):
    """Retrieve all WAF rulesets. Allowed for all authenticated users."""
    return await crud.get_waf_rulesets(db)

@router.delete("/rulesets/{ruleset_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_full_license)])
async def delete_waf_ruleset(
    ruleset_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Delete a WAF ruleset. Full license required."""
    db_ruleset = await crud.get_waf_ruleset(db, ruleset_id)
    if not db_ruleset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WAF ruleset not found.")

    await crud.delete_waf_ruleset(db, db_ruleset)
    return