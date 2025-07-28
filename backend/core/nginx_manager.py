import docker
import jinja2
from fastapi import HTTPException

# Note the relative import for the Service model
from .models import Service

def render_nginx_config(service: Service) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx.conf.j2")
    return template.render(service=service)

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