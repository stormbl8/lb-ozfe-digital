import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import services, logs, settings, dashboard, certificates, health, pools, auth
from core.health_checker import health_check_task
from core.init_db import create_first_user

app = FastAPI(
    title="Load Balancer UI Backend",
    description="API for managing an NGINX-based load balancer.",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    # Run the health checker in the background
    asyncio.create_task(health_check_task())
    
    # Securely create the first admin user if it doesn't exist
    admin_user = os.getenv("ADMIN_USER", "admin")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_pass = os.getenv("ADMIN_PASS")
    if admin_pass:
        await create_first_user(admin_user, admin_email, admin_pass)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure all routers are included
app.include_router(services.router)
app.include_router(logs.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(certificates.router)
app.include_router(health.router)
app.include_router(pools.router)
# This line is essential for the login to work
app.include_router(auth.router) 

@app.get("/")
def read_root():
    return {"status": "Load Balancer API is running."}