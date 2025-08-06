import os
import jinja2
import logging
import docker
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.apache import HtpasswdFile

from . import crud
from .models import Service, Pool

logger = logging.getLogger(__name__)

CONFIG_DIR = "/data/nginx_proxy_configs"
STREAM_CONFIG_DIR = "/data/nginx_stream_configs"
HTPASSWD_DIR = "/data/htpasswd"
LETSENCRYPT_DIR_BACKEND_CONTAINER = "/data/certs/letsencrypt/live"
CLOUDFLARE_CREDS_PATH_BACKEND_CONTAINER = "/data/certs/letsencrypt/credentials/cloudflare.ini"

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
    """
    Attempts to test and reload NGINX configuration.
    Raises HTTPException on failure.
    """
    logger.info("Running 'nginx -t' to test configuration...")
    try:
        client = docker.from_env()
        nginx_container = client.containers.get("nginx-proxy")
        test_result = nginx_container.exec_run("nginx -t")
        if test_result.exit_code != 0:
            error_message = test_result.output.decode('utf-8').strip()
            logger.error(f"NGINX configuration error: {error_message}")
            raise HTTPException(status_code=400, detail=f"NGINX configuration error: {error_message}")

        logger.info("NGINX configuration test successful. Reloading NGINX...")
        reload_result = nginx_container.exec_run("nginx -s reload")
        if reload_result.exit_code != 0:
            error_message = reload_result.output.decode('utf-8').strip()
            logger.error(f"NGINX reload command failed: {error_message}")
            raise HTTPException(status_code=500, detail=f"NGINX reload failed: {error_message}")
        
        logger.info("NGINX reloaded successfully.")
        return {"message": "NGINX reloaded successfully."}
    except docker.errors.NotFound:
        logger.error("NGINX container 'nginx-proxy' not found. Is it running?")
        raise HTTPException(status_code=500, detail="NGINX container not found. Is 'nginx-proxy' running?")
    except Exception as e:
        logger.error(f"Error during NGINX reload operation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reload NGINX: {e}")

async def regenerate_all_nginx_configs(db: AsyncSession):
    logger.info("Regenerating all NGINX configurations.")
    services = await crud.get_services(db)
    pools = await crud.get_pools(db)
    pools_by_id = {pool.id: pool for pool in pools}

    # Ensure config directories exist
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(STREAM_CONFIG_DIR, exist_ok=True)
    os.makedirs(HTPASSWD_DIR, exist_ok=True)

    # Clear old config files to prevent loading stale configurations
    for dir_path in [CONFIG_DIR, STREAM_CONFIG_DIR]:
        for f in os.listdir(dir_path):
            file_path = os.path.join(dir_path, f)
            if os.path.isfile(file_path):
                os.remove(file_path)
                logger.info(f"Removed old config file: {file_path}")

    for service in services:
        if not service.enabled:
            logger.info(f"Service {service.id} ('{service.domain_name}') is disabled. Skipping config generation.")
            continue

        pool = pools_by_id.get(service.pool_id)
        if not pool or not pool.backend_servers:
            logger.warning(f"Service {service.id} ('{service.domain_name}') enabled but its pool '{pool.name if pool else 'N/A'}' has no backend servers. Skipping config generation for this service.")
            continue

        # Generate config for HTTP services
        if service.service_type == "http":
            config_content = render_http_config(service, pool)
            config_filename = f"{service.id}-{service.domain_name}.conf"
            config_path = os.path.join(CONFIG_DIR, config_filename)
        # Generate config for stream services
        else: # tcp or udp
            config_content = render_stream_config(service, pool)
            config_filename = f"{service.id}-stream.conf"
            config_path = os.path.join(STREAM_CONFIG_DIR, config_filename)
        
        try:
            with open(config_path, "w") as f:
                f.write(config_content)
            logger.info(f"Generated NGINX config for service {service.id}: {config_filename}")

            # Handle Basic Auth htpasswd file
            if service.basic_auth_user and service.basic_auth_pass:
                htpasswd = HtpasswdFile(os.path.join(HTPASSWD_DIR, f"service_{service.id}"), new=True)
                htpasswd.set_password(service.basic_auth_user, service.basic_auth_pass)
                htpasswd.save()
                logger.info(f"Generated htpasswd file for service {service.id}")
            elif os.path.exists(os.path.join(HTPASSWD_DIR, f"service_{service.id}")):
                os.remove(os.path.join(HTPASSWD_DIR, f"service_{service.id}"))
        except Exception as e:
            logger.error(f"Failed to write NGINX config file {config_path}: {e}")
            
    reload_nginx()