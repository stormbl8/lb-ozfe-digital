import os
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Add this import statement
from core import crud, models
from core.database import get_db
from core.nginx_manager import regenerate_configs_for_datacenter
from core.security import get_current_admin_user

router = APIRouter(
    prefix="/api/nginx",
    tags=["NGINX Management"]
)

@router.post("/sync")
async def sync_nginx_configs(
    db: AsyncSession = Depends(get_db),
    # The 'models' module is now available
    admin_user: models.User = Depends(get_current_admin_user)
):
    """
    Triggers a configuration regeneration and NGINX reload for the local datacenter.
    This endpoint is called by the central GSLB API.
    """
    # In a real-world scenario, you would determine the local datacenter ID from an environment variable.
    # For now, we'll assume there is only one datacenter and its ID is 1.
    local_datacenter_id = 1
    
    await regenerate_configs_for_datacenter(db, local_datacenter_id)
    return {"message": "NGINX configurations regenerated and reloaded for this datacenter."}

@router.post("/sync/{datacenter_id}")
async def sync_nginx_configs_for_datacenter(
    datacenter_id: int,
    db: AsyncSession = Depends(get_db),
    # The 'models' module is now available
    admin_user: models.User = Depends(get_current_admin_user)
):
    """
    An administrative endpoint to regenerate and reload NGINX configs for a specific datacenter.
    This would be used by a master control instance in a distributed setup.
    """
    await regenerate_configs_for_datacenter(db, datacenter_id)
    return {"message": f"NGINX configurations regenerated and reloaded for datacenter {datacenter_id}."}