import os
from fastapi import APIRouter, Depends, HTTPException, status
from core.license_manager import read_license
from core.models import User
from core.security import get_current_user

router = APIRouter(
    prefix="/api/license",
    tags=["License"]
)

@router.get("")
async def get_license_status(current_user: User = Depends(get_current_user)):
    """
    Returns the current license status of the system.
    """
    return read_license()