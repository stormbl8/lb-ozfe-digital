from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import services, logs, settings, dashboard, certificates

app = FastAPI(
    title="Load Balancer UI Backend",
    description="API for managing an NGINX-based load balancer.",
    version="1.0.0"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
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


@app.get("/")
def read_root():
    return {"status": "Load Balancer API is running."}