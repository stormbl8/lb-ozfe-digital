import os
import httpx
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from core import crud, models
from core.database import get_db
from core.security import get_current_admin_user

router = APIRouter(
    prefix="/api/gslb",
    tags=["GSLB"]
)

async def trigger_remote_nginx_sync(datacenter: models.Datacenter):
    """
    Triggers the NGINX config regeneration on a remote backend API.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{datacenter.api_url}/api/nginx/sync",
                timeout=30.0,
            )
            response.raise_for_status()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger NGINX sync on datacenter '{datacenter.name}': {e}"
        )

# --- Datacenter Endpoints ---

@router.post("/datacenters", response_model=models.DatacenterResponse, status_code=status.HTTP_201_CREATED)
async def create_datacenter(
    datacenter_data: models.DatacenterCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Create a new datacenter record."""
    try:
        new_datacenter = await crud.create_datacenter(db, datacenter_data)
        return new_datacenter
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Datacenter with this name already exists.")

@router.get("/datacenters", response_model=List[models.DatacenterResponse])
async def list_datacenters(
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Retrieve all datacenters."""
    return await crud.get_datacenters(db)

@router.delete("/datacenters/{datacenter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_datacenter(
    datacenter_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Delete a datacenter."""
    db_datacenter = await crud.get_datacenter(db, datacenter_id)
    if not db_datacenter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datacenter not found")

    await crud.delete_datacenter(db, db_datacenter)
    return

# --- GSLB Service Endpoints ---

@router.post("/services", response_model=models.GSLBServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_gslb_service(
    gslb_service_data: models.GSLBServiceCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Create a new GSLB service."""
    try:
        new_gslb_service = await crud.create_gslb_service(db, gslb_service_data)
        return new_gslb_service
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="GSLB service with this domain name already exists.")

@router.get("/services", response_model=List[models.GSLBServiceResponse])
async def list_gslb_services(
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Retrieve all GSLB services."""
    return await crud.get_gslb_services(db)

@router.delete("/services/{gslb_service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gslb_service(
    gslb_service_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Delete a GSLB service."""
    db_gslb_service = await crud.get_gslb_service(db, gslb_service_id)
    if not db_gslb_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GSLB service not found")

    if db_gslb_service.services:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete GSLB service. It is currently assigned to one or more proxy hosts."
        )

    await crud.delete_gslb_service(db, db_gslb_service)
    return

@router.post("/sync-all")
async def sync_all_datacenters(
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """
    Triggers a full configuration regeneration and NGINX reload on all registered datacenters.
    This is an administrative function to ensure consistency.
    """
    datacenters = await crud.get_datacenters(db)
    for dc in datacenters:
        await trigger_remote_nginx_sync(dc)
    
    return {"message": "NGINX sync triggered on all datacenters."}