"""WebSocket connection manager for real-time notifications."""

import logging
from fastapi import WebSocket

logger = logging.getLogger("megabanx.ws")


class ConnectionManager:
    """Manages WebSocket connections per profile_id."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, profile_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if profile_id not in self.active_connections:
            self.active_connections[profile_id] = []
        self.active_connections[profile_id].append(websocket)
        logger.info(
            "[WS] Profile %s connected. Total: %d",
            profile_id,
            len(self.active_connections[profile_id]),
        )

    def disconnect(self, profile_id: str, websocket: WebSocket) -> None:
        if profile_id in self.active_connections:
            self.active_connections[profile_id] = [
                ws for ws in self.active_connections[profile_id] if ws is not websocket
            ]
            if not self.active_connections[profile_id]:
                del self.active_connections[profile_id]
        logger.info("[WS] Profile %s disconnected.", profile_id)

    async def notify_profile(self, profile_id: str, event: dict) -> None:
        """Send an event to all connections for a given profile."""
        if profile_id not in self.active_connections:
            logger.info(
                "[WS] No active connections for profile %s, notification skipped: %s",
                profile_id,
                event,
            )
            return
        conns = len(self.active_connections[profile_id])
        logger.info(
            "[WS] Sending notification to profile %s (%d connections): %s",
            profile_id,
            conns,
            event,
        )
        dead: list[WebSocket] = []
        sent = 0
        for ws in self.active_connections[profile_id]:
            try:
                await ws.send_json(event)
                sent += 1
            except Exception as e:
                logger.error("[WS] Failed to send to profile %s: %s", profile_id, e)
                dead.append(ws)
        logger.info(
            "[WS] Notification sent to %d/%d connections for profile %s",
            sent,
            conns,
            profile_id,
        )
        for ws in dead:
            if profile_id not in self.active_connections:
                break
            self.active_connections[profile_id] = [
                w for w in self.active_connections[profile_id] if w is not ws
            ]
        if profile_id in self.active_connections and not self.active_connections[profile_id]:
            del self.active_connections[profile_id]


# Singleton instance used across the app
ws_manager = ConnectionManager()
