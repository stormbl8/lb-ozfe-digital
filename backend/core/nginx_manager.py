import os
import jinja2
import logging
import docker
from fastapi import HTTPException
from passlib.apache import HtpasswdFile
from typing import List

from .models import Service, Pool
from .db_manager import read_services_db, read_pools_db

logger = logging.getLogger(__name__)

CONFIG_DIR = "/data/nginx_proxy_configs"
STREAM_CONFIG_DIR = "/data/nginx_stream_configs"
HTPASSWD_DIR = "/data/htpasswd"

def render_http_config(service: Service, pool: Pool) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx.conf.j2")
    return template.render(service=service, pool=pool)

def render_stream_config(service: Service, pool: Pool) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx_stream.conf.j2")
    return template.render(service=service, pool=pool)

def reload_nginx():
    try:
        client = docker.from_env()
        nginx_container = client.containers.get("nginx-proxy")
        test_result = nginx_container.exec_run("nginx -t")
        if test_result.exit_code != 0:
            error_message = test_result.output.decode('utf-8')
            raise HTTPException(status_code=400, detail=f"NGINX configuration error: {error_message}")
        nginx_container.exec_run("nginx -s reload")
        return {"message": "NGINX reloaded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def regenerate_all_nginx_configs():
    logger.info("Regenerating all NGINX configurations.")
    services = await read_services_db()
    pools = await read_pools_db()
    pools_by_id = {pool.id: pool for pool in pools}

    # Clear all config directories
    for dir_path in [CONFIG_DIR, STREAM_CONFIG_DIR, HTPASSWD_DIR]:
        for f in os.listdir(dir_path):
            os.remove(os.path.join(dir_path, f))
    
    for service in services:
        if service.enabled and service.pool_id in pools_by_id:
            pool = pools_by_id[service.pool_id]
            
            if service.service_type == "http":
                config_content = render_http_config(service, pool)
                config_path = os.path.join(CONFIG_DIR, f"{service.id}-{service.domain_name}.conf")
            else:
                config_content = render_stream_config(service, pool)
                config_path = os.path.join(STREAM_CONFIG_DIR, f"{service.id}-stream.conf")
            
            with open(config_path, "w") as f:
                f.write(config_content)
            
            if service.service_type == "http" and service.basic_auth_user and service.basic_auth_pass:
                htpasswd_path = os.path.join(HTPASSWD_DIR, f"service_{service.id}")
                ht = HtpasswdFile()
                ht.set_password(service.basic_auth_user, service.basic_auth_pass)
                ht.save(htpasswd_path)
    
    reload_nginx()