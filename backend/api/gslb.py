import os
import httpx
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

# Dependency to check Datacenter creation limits for trial licenses
async def enforce_datacenter_creation_limit(db: AsyncSession = Depends(get_db)):
    license_details = read_license()
    if license_details.license_type == "full":
        return # Full license holders can create as many as they want
    
    if license_details.license_type == "trial":
        datacenters = await crud.get_datacenters(db)
        if len(datacenters) >= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trial license only allows the creation of 1 Datacenter."
            )
        return # Allowed to create the first one

    # For "none" or any other license type
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="This feature is not available for your license type."
    )

router = APIRouter(
    prefix="/api/gslb",
    tags=["GSLB"]
)

async def trigger_remote_nginx_sync(datacenter: models.Datacenter):
    """
    Triggers the NGINX config regeneration on a remote backend API.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{datacenter.api_url}/api/nginx/sync")
            response.raise_for_status()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger NGINX sync on datacenter '{datacenter.name}': {e}"
        )

# --- Datacenter Endpoints ---
# These are fundamental for GSLB and can be viewed by trial users

@router.post("/datacenters", response_model=models.DatacenterResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(enforce_datacenter_creation_limit)])
async def create_datacenter(
    datacenter_data: models.DatacenterCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Create a new datacenter record. Trial license allows 1."""
    try:
        new_datacenter = await crud.create_datacenter(db, datacenter_data)
        return new_datacenter
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Datacenter with this name already exists.")

@router.get("/datacenters", response_model=List[models.DatacenterResponse])
async def list_datacenters(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve all datacenters. Allowed for trial licenses."""
    return await crud.get_datacenters(db)

@router.delete("/datacenters/{datacenter_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_full_license)])
async def delete_datacenter(
    datacenter_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Delete a datacenter. Full license required."""
    db_datacenter = await crud.get_datacenter(db, datacenter_id)
    if not db_datacenter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datacenter not found")
    await crud.delete_datacenter(db, db_datacenter)
    return

# --- GSLB Service Endpoints ---

@router.post("/services", response_model=models.GSLBServiceResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_full_license)])
async def create_gslb_service(
    gslb_service_data: models.GSLBServiceCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Create a new GSLB service. Full license required."""
    if gslb_service_data.geoip_map:
        valid_dc_ids = {dc.id for dc in await crud.get_datacenters(db)}
        if not all(item.datacenter_id in valid_dc_ids for item in gslb_service_data.geoip_map.mappings) or \
           gslb_service_data.geoip_map.default_datacenter_id not in valid_dc_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more datacenter IDs in the GeoIP map are invalid.")
    try:
        new_gslb_service = await crud.create_gslb_service(db, gslb_service_data)
        return new_gslb_service
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="GSLB service with this domain name already exists.")
        
@router.put("/services/{gslb_service_id}", response_model=models.GSLBServiceResponse, dependencies=[Depends(check_full_license)])
async def update_gslb_service(
    gslb_service_id: int,
    gslb_service_data: models.GSLBServiceCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Update an existing GSLB service. Full license required."""
    db_gslb_service = await crud.get_gslb_service(db, gslb_service_id)
    if not db_gslb_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GSLB service not found")
    if gslb_service_data.geoip_map:
        valid_dc_ids = {dc.id for dc in await crud.get_datacenters(db)}
        if not all(item.datacenter_id in valid_dc_ids for item in gslb_service_data.geoip_map.mappings) or \
           gslb_service_data.geoip_map.default_datacenter_id not in valid_dc_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more datacenter IDs in the GeoIP map are invalid.")
    updated_service = await crud.update_gslb_service(db, db_gslb_service, gslb_service_data)
    return updated_service

@router.get("/services", response_model=List[models.GSLBServiceResponse])
async def list_gslb_services(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Changed to current_user
):
    """Retrieve all GSLB services. Allowed for trial licenses."""
    return await crud.get_gslb_services(db)

@router.delete("/services/{gslb_service_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_full_license)])
async def delete_gslb_service(
    gslb_service_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Delete a GSLB service. Full license required."""
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

@router.post("/sync-all", dependencies=[Depends(check_full_license)])
async def sync_all_datacenters(
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    """Triggers a full configuration regeneration and NGINX reload on all registered datacenters. Full license required."""
    datacenters = await crud.get_datacenters(db)
    for dc in datacenters:
        await trigger_remote_nginx_sync(dc)
    return {"message": "NGINX sync triggered on all datacenters."}