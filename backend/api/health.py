from fastapi import APIRouter
from core.health_checker import HEALTH_STATUS_CACHE

router = APIRouter(
    prefix="/api/health",
    tags=["Health"]
)

@router.get("")
async def get_health_status():
    """Returns the cached health status of all monitored backend servers."""
    return HEALTH_STATUS_CACHE