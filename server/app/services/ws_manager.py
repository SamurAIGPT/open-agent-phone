import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("ws_manager")

class WebSocketManager:
    def __init__(self):
        self.broadcast_connections: Set[WebSocket] = set()

    async def connect_broadcast(self, websocket: WebSocket):
        await websocket.accept()
        self.broadcast_connections.add(websocket)
        logger.info(f"Dashboard client connected. Total clients: {len(self.broadcast_connections)}")

    def disconnect_broadcast(self, websocket: WebSocket):
        self.broadcast_connections.discard(websocket)
        logger.info(f"Dashboard client disconnected. Remaining clients: {len(self.broadcast_connections)}")

    async def broadcast_event(self, event_type: str, data: dict):
        payload = json.dumps({"event": event_type, "data": data})
        stale = set()
        for conn in self.broadcast_connections:
            try:
                await conn.send_text(payload)
            except Exception:
                stale.add(conn)
        for dead in stale:
            self.broadcast_connections.discard(dead)

ws_manager = WebSocketManager()
