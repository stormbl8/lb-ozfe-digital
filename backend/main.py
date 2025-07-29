import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import services, logs, settings, dashboard, certificates, health # <-- IMPORT HEALTH
from core.health_checker import health_check_task # <-- IMPORT THE TASK

app = FastAPI(
    title="Load Balancer UI Backend",
    description="API for managing an NGINX-based load balancer.",
    version="1.0.0"
)

# --- Add a startup event ---
@app.on_event("startup")
async def startup_event():
    # Start the health check task in the background
    asyncio.create_task(health_check_task())

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    # ... (rest of the middleware config is unchanged)
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include all API routers ---
app.include_router(services.router)
app.include_router(logs.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(certificates.router)
app.include_router(health.router) # <-- INCLUDE THE NEW ROUTER


@app.get("/")
def read_root():
    return {"status": "Load Balancer API is running."}