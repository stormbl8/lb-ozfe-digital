import asyncio
import logging
import aiofiles
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

async def tail_file(websocket: WebSocket, file_path: str):
    """Tails a file asynchronously and sends new lines to the websocket client."""
    logger.info(f"Starting to tail file asynchronously: {file_path}")
    try:
        async with aiofiles.open(file_path, mode='r') as f:
            logger.info(f"Successfully opened {file_path}. Entering tail loop.")
            while True:
                line = await f.readline()
                if not line:
                    await asyncio.sleep(0.5)
                    continue
                
                try:
                    await websocket.send_text(line.strip())
                except WebSocketDisconnect:
                    logger.info(f"Client disconnected while sending. Stopping tail for {file_path}.")
                    break
                    
    except FileNotFoundError:
        error_msg = f"ERROR: Log file not found at {file_path}"
        if websocket.client_state.name == 'CONNECTED':
            await websocket.send_text(error_msg)
    except Exception as e:
        error_msg = f"ERROR: An unexpected error occurred while tailing file: {e}"
        if websocket.client_state.name == 'CONNECTED':
            await websocket.send_text(error_msg)