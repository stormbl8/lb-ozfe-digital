from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from core import crud, models
from core.database import get_db
from core.nginx_manager import regenerate_configs_for_datacenter
from core.security import get_current_admin_user, get_current_user

router = APIRouter(
    prefix="/api/monitors",
    tags=["Monitors"]
)

@router.get("", response_model=List[models.MonitorResponse])
async def list_monitors(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve all health monitors."""
    return await crud.get_monitors(db)

@router.post("", response_model=models.MonitorResponse, status_code=status.HTTP_201_CREATED)
async def add_new_monitor(
    monitor_data: models.MonitorCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Add a new health monitor."""
    new_monitor = await crud.create_monitor(db, monitor_data)
    # Assume a single datacenter for now
    await regenerate_configs_for_datacenter(db, datacenter_id=1)
    return new_monitor

@router.put("/{monitor_id}", response_model=models.MonitorResponse)
async def update_monitor(
    monitor_id: int,
    monitor_data: models.MonitorCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Update an existing health monitor."""
    db_monitor = await crud.get_monitor(db, monitor_id)
    if not db_monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")
    
    updated_monitor = await crud.update_monitor(db, db_monitor, monitor_data)
    # Assume a single datacenter for now
    await regenerate_configs_for_datacenter(db, datacenter_id=1)
    return updated_monitor

@router.delete("/{monitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_monitor(
    monitor_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Delete a health monitor."""
    db_monitor = await crud.get_monitor(db, monitor_id)
    if not db_monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")
    
    # Optional: Add a check here to prevent deleting monitors that are in use by pools
    
    await crud.delete_monitor(db, db_monitor)
    # Assume a single datacenter for now
    await regenerate_configs_for_datacenter(db, datacenter_id=1)
    return