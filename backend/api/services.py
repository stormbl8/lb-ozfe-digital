from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core import crud, models
from core.database import get_db
from core.nginx_manager import regenerate_configs_for_datacenter
from core.security import (
    get_current_admin_user, get_current_user, 
    enforce_trial_or_full_license, check_service_limit
)

router = APIRouter(
    prefix="/api/services",
    tags=["Services"]
)

@router.get("", response_model=List[models.ServiceResponse])
async def list_services(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    datacenter_id: Optional[int] = None,
    license_check: None = Depends(enforce_trial_or_full_license)
):
    """
    Retrieve all services. Accessible by any authenticated user.
    """
    return await crud.get_services_by_datacenter(db, datacenter_id)

@router.get("/{service_id}", response_model=models.ServiceResponse)
async def get_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    license_check: None = Depends(enforce_trial_or_full_license)
):
    """
    Retrieve a single service by its ID.
    """
    db_service = await crud.get_service(db, service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return db_service

@router.post("", response_model=models.ServiceResponse, status_code=status.HTTP_201_CREATED)
async def add_new_service(
    service_data: models.ServiceCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user),
    license_check: None = Depends(enforce_trial_or_full_license),
    limit_check: None = Depends(check_service_limit)
):
    """
    Add a new service. Admin only.
    """
    try:
        db.begin() # Start a new transaction
        new_service = await crud.create_service(db, service_data)
        if new_service.datacenter_id:
            await regenerate_configs_for_datacenter(db, new_service.datacenter_id)

        await db.commit() # Commit the transaction
        await db.refresh(new_service)
        return new_service
    except Exception as e:
        await db.rollback() # Rollback on error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add new service: {e}")

@router.put("/{service_id}", response_model=models.ServiceResponse)
async def update_service(
    service_id: int,
    service_data: models.ServiceCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user),
    license_check: None = Depends(enforce_trial_or_full_license)
):
    """
    Update an existing service. Admin only.
    """
    db_service = await crud.get_service(db, service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    updated_service = await crud.update_service(db, db_service, service_data)
    if updated_service.datacenter_id:
        await regenerate_configs_for_datacenter(db, updated_service.datacenter_id)
    
    await db.commit()
    await db.refresh(updated_service)
    return updated_service

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user),
    license_check: None = Depends(enforce_trial_or_full_license)
):
    """
    Delete a service. Admin only.
    """
    db_service = await crud.get_service(db, service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    await crud.delete_service(db, db_service)
    if db_service.datacenter_id:
        await regenerate_configs_for_datacenter(db, db_service.datacenter_id)
    return

@router.put("/{service_id}", response_model=models.ServiceResponse)
async def update_service(
    service_id: int,
    service_data: models.ServiceCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user),
    license_check: None = Depends(enforce_trial_or_full_license)
):
    """
    Update an existing service. Admin only.
    """
    db_service = await crud.get_service(db, service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    updated_service = await crud.update_service(db, db_service, service_data)
    if updated_service.datacenter_id:
        await regenerate_configs_for_datacenter(db, updated_service.datacenter_id)
    
    await db.commit()
    await db.refresh(updated_service)
    return updated_service

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user),
    license_check: None = Depends(enforce_trial_or_full_license)
):
    """
    Delete a service. Admin only.
    """
    db_service = await crud.get_service(db, service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    await crud.delete_service(db, db_service)
    if db_service.datacenter_id:
        await regenerate_configs_for_datacenter(db, db_service.datacenter_id)
    return