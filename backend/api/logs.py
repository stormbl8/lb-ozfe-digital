import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.log_streamer import tail_file

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Logs"]
)

@router.websocket("/ws/logs/{log_type}")
async def websocket_log_endpoint(websocket: WebSocket, log_type: str):
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for {log_type} logs.")
    log_file = f"/var/log/nginx/{log_type}.log"
    try:
        await tail_file(websocket, log_file)
    finally:
        logger.info(f"Closing WebSocket for {log_type}.")