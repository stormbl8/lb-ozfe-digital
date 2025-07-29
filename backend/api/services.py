import os
import jinja2
import logging
from fastapi import APIRouter, HTTPException, status
from typing import List
from passlib.apache import HtpasswdFile

from core.models import Service
from core.nginx_manager import reload_nginx
from core.db_manager import read_services_db, write_services_db

CONFIG_DIR = "/data/nginx_proxy_configs"
STREAM_CONFIG_DIR = "/data/nginx_stream_configs"
HTPASSWD_DIR = "/data/htpasswd"
os.makedirs(HTPASSWD_DIR, exist_ok=True)
os.makedirs(STREAM_CONFIG_DIR, exist_ok=True)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/services", tags=["Services"])

def render_http_config(service: Service) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx.conf.j2")
    return template.render(service=service)

def render_stream_config(service: Service) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx_stream.conf.j2")
    return template.render(service=service)

def regenerate_all_nginx_configs(service_list: List[Service]):
    logger.info("Regenerating all NGINX configurations.")
    # Clear both HTTP and Stream configs
    for dir_path in [CONFIG_DIR, STREAM_CONFIG_DIR]:
        for f in os.listdir(dir_path):
            if f.endswith('.conf'):
                os.remove(os.path.join(dir_path, f))
    
    for service in service_list:
        if service.enabled:
            # Logic to decide which template to use
            if service.service_type == "http":
                config_content = render_http_config(service)
                config_path = os.path.join(CONFIG_DIR, f"{service.id}-{service.domain_name}.conf")
            else: # TCP or UDP
                config_content = render_stream_config(service)
                config_path = os.path.join(STREAM_CONFIG_DIR, f"{service.id}-stream.conf")
            
            with open(config_path, "w") as f:
                f.write(config_content)
            
            htpasswd_path = os.path.join(HTPASSWD_DIR, f"service_{service.id}")
            if service.service_type == "http" and service.basic_auth_user and service.basic_auth_pass:
                ht = HtpasswdFile()
                ht.set_password(service.basic_auth_user, service.basic_auth_pass)
                ht.save(htpasswd_path)
            elif os.path.exists(htpasswd_path):
                os.remove(htpasswd_path)
    
    reload_nginx()

@router.get("", response_model=List[Service])
async def list_services():
    services = await read_services_db() # <-- ADD await
    for s in services:
        s.basic_auth_pass = None
    return services

@router.get("/{service_id}", response_model=Service)
async def get_service(service_id: int):
    services = await read_services_db() # <-- ADD await
    for service in services:
        if service.id == service_id:
            service.basic_auth_pass = None
            return service
    raise HTTPException(status_code=404, detail="Service not found")

@router.post("", response_model=Service)
async def add_new_service(service_data: Service):
    services = await read_services_db() # <-- ADD await
    
    if service_data.service_type == 'http' and any(s.domain_name == service_data.domain_name for s in services):
        raise HTTPException(status_code=409, detail="A service with this domain name already exists.")

    new_id = max([s.id for s in services if s.id is not None] + [0]) + 1
    service_data.id = new_id
    
    updated_services = services + [service_data]
    
    try:
        regenerate_all_nginx_configs(updated_services)
        service_data.basic_auth_pass = None
        await write_services_db(updated_services) # <-- ADD await
    except Exception as e:
        regenerate_all_nginx_configs(services)
        raise e
        
    return service_data

@router.put("/{service_id}", response_model=Service)
async def update_service(service_id: int, service_data: Service):
    services = await read_services_db() # <-- ADD await
    original_services = [s.copy(deep=True) for s in services]
    
    service_index = -1
    for i, service in enumerate(services):
        if service.id == service_id:
            service_index = i
            break
            
    if service_index == -1:
        raise HTTPException(status_code=404, detail="Service not found")

    if service_data.basic_auth_user and not service_data.basic_auth_pass:
        pass
    
    service_data.id = service_id
    services[service_index] = service_data
    
    try:
        regenerate_all_nginx_configs(services)
        service_data.basic_auth_pass = None
        await write_services_db(services) # <-- ADD await
    except Exception as e:
        regenerate_all_nginx_configs(original_services)
        raise e

    return service_data

@router.delete("/{service_id}")
async def delete_service(service_id: int):
    services = await read_services_db() # <-- ADD await
    original_services = [s.copy(deep=True) for s in services]
    
    updated_services = [s for s in services if s.id != service_id]
    
    if len(updated_services) == len(original_services):
        raise HTTPException(status_code=404, detail="Service not found")

    try:
        regenerate_all_nginx_configs(updated_services)
        await write_services_db(updated_services) # <-- ADD await
        htpasswd_path = os.path.join(HTPASSWD_DIR, f"service_{service_id}")
        if os.path.exists(htpasswd_path):
            os.remove(htpasswd_path)

    except Exception as e:
        regenerate_all_nginx_configs(original_services)
        raise e
        
    return {"message": "Service deleted successfully."}