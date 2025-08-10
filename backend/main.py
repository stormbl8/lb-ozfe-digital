import asyncio
import os
import subprocess
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import services, logs, settings, dashboard, certificates, health, pools, auth, monitors, gslb, nginx, waf, license
from core.health_checker import health_check_task
from core.database import engine, Base, AsyncSessionLocal
from core import crud
from core.cert_manager import cert_renewal_task, cert_sync_task  # NEW

def get_git_commit():
    """Get the current Git commit hash (short) if available."""
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return commit
    except Exception:
        return None

app = FastAPI(
    title="Load Balancer UI Backend",
    description="API for managing an NGINX-based load balancer.",
    version="1.0.0"
)

BUILD_DATE = datetime.utcnow().isoformat() + "Z"
GIT_COMMIT = get_git_commit()

@app.on_event("startup")
async def startup_event():
    # Ensure DB tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start background tasks
    asyncio.create_task(health_check_task())
    asyncio.create_task(cert_renewal_task())
    asyncio.create_task(cert_sync_task())

    # Securely create the first admin user
    admin_user = os.getenv("ADMIN_USER", "admin")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_pass = os.getenv("ADMIN_PASS")
    if admin_pass:
        db = AsyncSessionLocal()
        try:
            await crud.create_first_user(db, admin_user, admin_email, admin_pass)
        finally:
            await db.close()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(services.router)
app.include_router(logs.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(certificates.router)
app.include_router(health.router)
app.include_router(pools.router)
app.include_router(auth.router)
app.include_router(monitors.router)
app.include_router(gslb.router)
app.include_router(nginx.router)
app.include_router(waf.router)
app.include_router(license.router)

@app.get("/api/version")
def get_version():
    """Return API version, build date, and Git commit hash."""
    return {
        "version": app.version,
        "build_date": BUILD_DATE,
        "commit": GIT_COMMIT or "N/A"
    }

@app.get("/")
def read_root():
    return {"status": "Load Balancer API is running."}
