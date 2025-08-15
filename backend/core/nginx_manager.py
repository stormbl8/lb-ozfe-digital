import os
import jinja2
import logging
import docker
import shutil
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.apache import HtpasswdFile
from typing import Optional # NEW IMPORT

from . import crud
from .models import Service, Pool, WAFRuleSet

logger = logging.getLogger(__name__)

CONFIG_DIR = "/data/nginx_proxy_configs"
STREAM_CONFIG_DIR = "/data/nginx_stream_configs"
HTPASSWD_DIR = "/data/htpasswd"
WAF_CONFIG_DIR = "/data/waf"
WAF_EXCLUSION_FILE = "modsecurity_exclude.conf"

def render_http_config(service: Service, pool: Pool, waf_ruleset: Optional[WAFRuleSet]) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx.conf.j2")
    return template.render(service=service, pool=pool, waf_ruleset=waf_ruleset)

def render_stream_config(service: Service, pool: Pool) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx_stream.conf.j2")
    return template.render(service=service, pool=pool)

def reload_nginx():
    """Attempts to test and reload NGINX configuration for the local container."""
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
    except docker.errors.NotFound:
        logger.error("NGINX container 'nginx-proxy' not found.")
        raise HTTPException(status_code=500, detail="NGINX container not found.")
    except Exception as e:
        logger.error(f"Error during NGINX reload operation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reload NGINX: {e}")

async def regenerate_configs_for_datacenter(db: AsyncSession, datacenter_id: int):
    """
    Regenerates NGINX configurations for a specific datacenter and reloads NGINX.
    """
    logger.info(f"Regenerating NGINX configurations for datacenter ID: {datacenter_id}.")
    
    services = await crud.get_services_by_datacenter(db, datacenter_id)
    pools = await crud.get_pools(db)
    waf_rulesets = await crud.get_waf_rulesets(db)
    pools_by_id = {pool.id: pool for pool in pools}
    waf_rulesets_by_id = {ws.id: ws for ws in waf_rulesets}

    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(STREAM_CONFIG_DIR, exist_ok=True)
    os.makedirs(HTPASSWD_DIR, exist_ok=True)
    os.makedirs(WAF_CONFIG_DIR, exist_ok=True)

    for dir_path in [CONFIG_DIR, STREAM_CONFIG_DIR]:
        for f in os.listdir(dir_path):
            os.remove(os.path.join(dir_path, f))
    
    waf_exclusion_path = os.path.join(WAF_CONFIG_DIR, WAF_EXCLUSION_FILE)
    if os.path.exists(waf_exclusion_path):
        os.remove(waf_exclusion_path)

    for service in services:
        if not service.enabled:
            continue
        pool = pools_by_id.get(service.pool_id)
        if not pool or not pool.backend_servers:
            logger.warning(
                f"Service '{service.domain_name or service.id}' is enabled but its pool "
                f"'{pool.name if pool else 'N/A'}' has no backend servers. Skipping config generation."
            )
            continue
        
        waf_ruleset = waf_rulesets_by_id.get(service.waf_ruleset_id)

        try:
            if service.service_type == "http":
                config_content = render_http_config(service, pool, waf_ruleset)
                config_path = os.path.join(CONFIG_DIR, f"{service.id}-{service.domain_name}.conf")
                with open(config_path, "w") as f:
                    f.write(config_content)
                
                htpasswd_path = os.path.join(HTPASSWD_DIR, f"service_{service.id}")
                if service.basic_auth_user and service.basic_auth_pass:
                    htpasswd = HtpasswdFile(htpasswd_path, new=True)
                    htpasswd.set_password(service.basic_auth_user, service.basic_auth_pass)
                    htpasswd.save()
                elif os.path.exists(htpasswd_path):
                    os.remove(htpasswd_path)

            else:
                config_content = render_stream_config(service, pool)
                config_path = os.path.join(STREAM_CONFIG_DIR, f"{service.id}-stream.conf")
                with open(config_path, "w") as f:
                    f.write(config_content)
                    
        except Exception as e:
            logger.error(f"Failed to write config for service {service.id}: {e}")

    with open(waf_exclusion_path, "w") as f:
        f.write("# This file is generated by the Load Balancer UI.\n")
        f.write("# It contains rules to exclude for all services.\n")
        for service in services:
            if service.waf_enabled and service.waf_ruleset_id:
                waf_ruleset = waf_rulesets_by_id.get(service.waf_ruleset_id)
                if waf_ruleset and waf_ruleset.excluded_rule_ids:
                    for rule_id in waf_ruleset.excluded_rule_ids:
                        f.write(f"SecRuleRemoveById {rule_id}\n")

    reload_nginx()