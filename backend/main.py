import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import services, logs, settings, dashboard, certificates, health, pools
from core.health_checker import health_check_task

app = FastAPI(
    title="Load Balancer UI Backend",
    description="API for managing an NGINX-based load balancer.",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(health_check_task())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(services.router)
app.include_router(logs.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(certificates.router)
app.include_router(health.router)
app.include_router(pools.router)

@app.get("/")
def read_root():
    return {"status": "Load Balancer API is running."}