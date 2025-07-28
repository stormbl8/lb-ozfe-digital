import os
import re
from fastapi import APIRouter, HTTPException, status
from typing import List

# Import models and managers from our new core modules
from core.models import Service
from core.nginx_manager import render_nginx_config, reload_nginx

# Define constants here or in a central config file
CONFIG_DIR = "/data/nginx_proxy_configs"

# Create a router
router = APIRouter(
    prefix="/api/services",
    tags=["Services"]
)

@router.get("", response_model=List[Service])
async def list_services():
    services = []
    if not os.path.exists(CONFIG_DIR):
        return services
    for filename in os.listdir(CONFIG_DIR):
        if filename.endswith(".conf"):
            # A simplified representation for the list view
            services.append(Service(domain_name=filename[:-5], backend_host="", backend_port=0))
    return services

@router.post("")
async def add_new_service(service: Service):
    config_path = os.path.join(CONFIG_DIR, f"{service.domain_name}.conf")
    if os.path.exists(config_path):
        raise HTTPException(status_code=409, detail="A service with this domain name already exists.")

    config_content = render_nginx_config(service)

    with open(config_path, "w") as f:
        f.write(config_content)

    try:
        reload_nginx()
    except HTTPException as e:
        os.remove(config_path)
        raise e

    return {"message": f"Service {service.domain_name} added successfully."}


@router.delete("/{domain_name}")
async def delete_service(domain_name: str):
    config_path = os.path.join(CONFIG_DIR, f"{domain_name}.conf")
    if not os.path.exists(config_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    os.remove(config_path)
    reload_nginx()
    return {"message": f"Service {domain_name} deleted successfully."}