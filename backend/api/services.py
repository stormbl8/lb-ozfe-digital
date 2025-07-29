import os
from fastapi import APIRouter, HTTPException, status
from typing import List

from core.models import Service
from core.db_manager import read_services_db, write_services_db
from core.nginx_manager import regenerate_all_nginx_configs

router = APIRouter(
    prefix="/api/services",
    tags=["Services"]
)

@router.get("", response_model=List[Service])
async def list_services():
    services = await read_services_db()
    for s in services:
        s.basic_auth_pass = None
    return services

@router.get("/{service_id}", response_model=Service)
async def get_service(service_id: int):
    services = await read_services_db()
    for service in services:
        if service.id == service_id:
            service.basic_auth_pass = None
            return service
    raise HTTPException(status_code=404, detail="Service not found")

@router.post("", response_model=Service)
async def add_new_service(service_data: Service):
    services = await read_services_db()
    
    if service_data.service_type == 'http' and any(s.domain_name == service_data.domain_name for s in services):
        raise HTTPException(status_code=409, detail="A service with this domain name already exists.")

    new_id = max([s.id for s in services if s.id is not None] + [0]) + 1
    service_data.id = new_id
    
    original_services = [s.copy(deep=True) for s in services]
    services.append(service_data)
    
    try:
        await write_services_db(services)
        await regenerate_all_nginx_configs()
    except Exception as e:
        await write_services_db(original_services) # Rollback DB
        await regenerate_all_nginx_configs() # Rollback configs
        raise e
        
    service_data.basic_auth_pass = None
    return service_data

@router.put("/{service_id}", response_model=Service)
async def update_service(service_id: int, service_data: Service):
    services = await read_services_db()
    original_services = [s.copy(deep=True) for s in services]
    
    service_index = next((i for i, s in enumerate(services) if s.id == service_id), -1)
            
    if service_index == -1:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Don't allow password to be blanked out on edit unless username is also blank
    if service_data.basic_auth_user and not service_data.basic_auth_pass:
        # Keep the old password by not generating a new htpasswd file
        # This requires fetching old user/pass, which we don't store.
        # Forcing re-entry is the simplest secure pattern.
        raise HTTPException(status_code=422, detail="Password must be re-entered when changing a service with Basic Auth.")

    service_data.id = service_id
    services[service_index] = service_data
    
    try:
        await write_services_db(services)
        await regenerate_all_nginx_configs()
    except Exception as e:
        await write_services_db(original_services) # Rollback DB
        await regenerate_all_nginx_configs() # Rollback configs
        raise e

    service_data.basic_auth_pass = None
    return service_data

@router.delete("/{service_id}")
async def delete_service(service_id: int):
    services = await read_services_db()
    original_services = [s.copy(deep=True) for s in services]
    
    updated_services = [s for s in services if s.id != service_id]
    
    if len(services) == len(updated_services):
        raise HTTPException(status_code=404, detail="Service not found")

    await write_services_db(updated_services)
    
    try:
        await regenerate_all_nginx_configs()
        # Clean up the htpasswd file for the deleted service
        htpasswd_path = os.path.join("/data/htpasswd", f"service_{service_id}")
        if os.path.exists(htpasswd_path):
            os.remove(htpasswd_path)
    except Exception as e:
        await write_services_db(original_services) # Rollback DB
        await regenerate_all_nginx_configs() # Rollback configs
        raise e
        
    return {"message": "Service deleted successfully."}