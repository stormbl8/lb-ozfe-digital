import os
import json
import logging
from fastapi import APIRouter, HTTPException, status
from typing import List

from core.models import Service
from core.nginx_manager import render_nginx_config, reload_nginx

CONFIG_DIR = "/data/nginx_proxy_configs"
SERVICES_DB_FILE = "/app/data/config/services.json"
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/services",
    tags=["Services"]
)

# --- Database Helper Functions ---

def read_services_db() -> List[Service]:
    if not os.path.exists(SERVICES_DB_FILE):
        return []
    try:
        with open(SERVICES_DB_FILE, 'r') as f:
            data = json.load(f)
            return [Service(**item) for item in data]
    except (json.JSONDecodeError, IndexError):
        return []

def write_services_db(services: List[Service]):
    with open(SERVICES_DB_FILE, 'w') as f:
        json.dump([service.dict() for service in services], f, indent=2)

def regenerate_all_nginx_configs(service_list: List[Service]):
    """Wipes and regenerates all NGINX configs from a GIVEN list of services."""
    logger.info("Regenerating all NGINX configurations.")
    # 1. Clear existing configs
    for f in os.listdir(CONFIG_DIR):
        if f.endswith('.conf'):
            os.remove(os.path.join(CONFIG_DIR, f))
    
    # 2. Regenerate from the provided service list
    for service in service_list:
        if service.enabled:
            config_content = render_nginx_config(service)
            config_path = os.path.join(CONFIG_DIR, f"{service.domain_name}.conf")
            with open(config_path, "w") as f:
                f.write(config_content)
    
    # 3. Reload NGINX (which includes a syntax test)
    reload_nginx()

# --- API Endpoints ---

@router.get("", response_model=List[Service])
async def list_services():
    return read_services_db()

@router.get("/{service_id}", response_model=Service)
async def get_service(service_id: int):
    services = read_services_db()
    for service in services:
        if service.id == service_id:
            return service
    raise HTTPException(status_code=404, detail="Service not found")

@router.post("", response_model=Service)
async def add_new_service(service_data: Service):
    services = read_services_db()
    
    if any(s.domain_name == service_data.domain_name for s in services):
        raise HTTPException(status_code=409, detail="A service with this domain name already exists.")

    new_id = max([s.id for s in services if s.id is not None] + [0]) + 1
    service_data.id = new_id
    
    updated_services = services + [service_data]
    
    try:
        # We attempt to write the new configs BEFORE saving to the DB
        regenerate_all_nginx_configs(updated_services)
        # If successful, save the new state to the DB
        write_services_db(updated_services)
    except Exception as e:
        logger.error("NGINX config regeneration failed. Rolling back config files.")
        # Roll back: regenerate the configs using the OLD service list
        regenerate_all_nginx_configs(services)
        raise e
        
    return service_data

@router.put("/{service_id}", response_model=Service)
async def update_service(service_id: int, service_data: Service):
    services = read_services_db()
    original_services = [s.copy(deep=True) for s in services]
    
    service_index = -1
    for i, service in enumerate(services):
        if service.id == service_id:
            service_index = i
            break
            
    if service_index == -1:
        raise HTTPException(status_code=404, detail="Service not found")

    service_data.id = service_id
    services[service_index] = service_data
    
    try:
        regenerate_all_nginx_configs(services)
        write_services_db(services)
    except Exception as e:
        logger.error("NGINX config regeneration failed. Rolling back config files.")
        regenerate_all_nginx_configs(original_services)
        # We don't need to roll back the DB write, as it hasn't happened yet.
        raise e

    return service_data

@router.delete("/{service_id}")
async def delete_service(service_id: int):
    services = read_services_db()
    original_services = [s.copy(deep=True) for s in services]
    
    updated_services = [s for s in services if s.id != service_id]
    
    if len(updated_services) == len(original_services):
        raise HTTPException(status_code=404, detail="Service not found")

    try:
        regenerate_all_nginx_configs(updated_services)
        write_services_db(updated_services)
    except Exception as e:
        logger.error("NGINX config regeneration failed. Rolling back config files.")
        regenerate_all_nginx_configs(original_services)
        raise e
        
    return {"message": "Service deleted successfully."}