import os
import re
import docker
import jinja2
import asyncio # <-- ADD THIS LINE
from fastapi import FastAPI, HTTPException, status, WebSocket, WebSocketDisconnect # <-- UPDATE THIS LINE
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
CONFIG_DIR = "/data/nginx_proxy_configs"
os.makedirs(CONFIG_DIR, exist_ok=True)


# --- Pydantic Models ---
class Service(BaseModel):
    domain_name: str
    backend_host: str
    backend_port: int
    use_ssl: bool = False

# --- Helper Functions ---
def render_nginx_config(service: Service) -> str:
    template_loader = jinja2.FileSystemLoader(searchpath="./templates")
    template_env = jinja2.Environment(loader=template_loader)
    template = template_env.get_template("nginx.conf.j2")
    return template.render(service=service)

def reload_nginx():
    """Finds the NGINX container and tells it to reload its configuration."""
    try:
        client = docker.from_env()
        nginx_container = client.containers.get("nginx-proxy")
        
        test_result = nginx_container.exec_run("nginx -t")
        if test_result.exit_code != 0:
            error_message = test_result.output.decode('utf-8')
            logger.error(f"NGINX config test failed: {error_message}")
            raise HTTPException(status_code=400, detail=f"NGINX configuration error: {error_message}")

        reload_result = nginx_container.exec_run("nginx -s reload")
        if reload_result.exit_code != 0:
            error_message = reload_result.output.decode('utf-8')
            logger.error(f"NGINX reload failed: {error_message}")
            raise HTTPException(status_code=500, detail=f"NGINX reload failed: {error_message}")
            
        logger.info("NGINX reloaded successfully.")
        return {"message": "NGINX reloaded successfully."}
    except docker.errors.NotFound:
        logger.error("NGINX container 'nginx-proxy' not found.")
        raise HTTPException(status_code=500, detail="NGINX container not found.")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def tail_file(websocket: WebSocket, file_path: str):
    """Tails a file and sends new lines to the websocket client."""
    try:
        with open(file_path, 'r') as f:
            # Go to the end of the file
            f.seek(0, 2)
            while True:
                line = f.readline()
                if not line:
                    # No new line, wait a bit
                    await asyncio.sleep(0.5)
                    continue
                await websocket.send_text(line.strip())
    except FileNotFoundError:
        await websocket.send_text(f"ERROR: Log file not found at {file_path}")
        logger.error(f"Log file not found at {file_path}")
    except Exception as e:
        logger.error(f"Error while tailing file: {e}")
        await websocket.send_text(f"ERROR: An error occurred: {e}")


# --- WebSocket Endpoint for Logs ---
@app.websocket("/ws/logs/{log_type}")
async def websocket_log_endpoint(websocket: WebSocket, log_type: str):
    await websocket.accept()
    
    if log_type == "access":
        log_file = "/var/log/nginx/access.log"
    elif log_type == "error":
        log_file = "/var/log/nginx/error.log"
    else:
        await websocket.send_text("ERROR: Invalid log type specified. Use 'access' or 'error'.")
        await websocket.close(code=1008)
        return

    try:
        await tail_file(websocket, log_file)
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from {log_type} log stream.")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        # It's good practice to ensure the socket is closed.
        await websocket.close()

# --- API Endpoints ---
@app.get("/api/services")
async def list_services():
    """Lists all configured services by parsing .conf files."""
    services = []
    if not os.path.exists(CONFIG_DIR):
        return services
        
    for filename in os.listdir(CONFIG_DIR):
        if filename.endswith(".conf"):
            domain = filename[:-5]
            try:
                with open(os.path.join(CONFIG_DIR, filename), 'r') as f:
                    content = f.read()
                    match = re.search(r"proxy_pass\s+http://([\w.-]+):(\d+);", content)
                    if match:
                        services.append({
                            "domain_name": domain,
                            "backend_host": match.group(1),
                            "backend_port": int(match.group(2))
                        })
            except Exception as e:
                logger.error(f"Error parsing {filename}: {e}")
    return services

@app.post("/api/services")
async def add_new_service(service: Service):
    config_path = os.path.join(CONFIG_DIR, f"{service.domain_name}.conf")
    
    if os.path.exists(config_path):
        raise HTTPException(status_code=409, detail="A service with this domain name already exists.")

    config_content = render_nginx_config(service)
    
    try:
        with open(config_path, "w") as f:
            f.write(config_content)
        logger.info(f"Config file created for {service.domain_name}")
    except IOError as e:
        logger.error(f"Failed to write config file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to write config file: {e}")

    reload_status = reload_nginx()
    return {"message": f"Service {service.domain_name} added successfully.", "details": reload_status}

@app.delete("/api/services/{domain_name}")
async def delete_service(domain_name: str):
    config_path = os.path.join(CONFIG_DIR, f"{domain_name}.conf")

    if not os.path.exists(config_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    try:
        os.remove(config_path)
        logger.info(f"Config file for {domain_name} deleted.")
    except OSError as e:
        logger.error(f"Failed to delete config file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete config file: {e}")

    reload_status = reload_nginx()
    return {"message": f"Service {domain_name} deleted successfully.", "details": reload_status}

@app.get("/")
def read_root():
    return {"status": "Load Balancer API is running."}