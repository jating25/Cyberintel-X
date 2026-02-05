import asyncio
import json
import logging
from typing import Dict, List, Optional, Set, Any, Callable, Awaitable
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.app_logging import logger
from app.database.models import ThreatIntel, Alert, UserInDB, ThreatType, Severity
from app.database.db import Database

class ConnectionManager:
    """Manages WebSocket connections and message broadcasting"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = defaultdict(set)  # user_id -> set of connection_ids
        self.connection_users: Dict[str, str] = {}  # connection_id -> user_id
        self.subscriptions: Dict[str, Set[str]] = defaultdict(set)  # channel -> set of connection_ids
        self.connection_subscriptions: Dict[str, Set[str]] = defaultdict(set)  # connection_id -> set of channels
        self.message_handlers = {}
        self.connection_timeouts: Dict[str, asyncio.Task] = {}
        self.connection_timeout = 300  # 5 minutes
        
        # Register default message handlers
        self.register_handler("ping", self._handle_ping)
        self.register_handler("subscribe", self._handle_subscribe)
        self.register_handler("unsubscribe", self._handle_unsubscribe)
    
    async def connect(self, websocket: WebSocket, user: UserInDB = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        # Generate a unique connection ID
        connection_id = str(uuid4())
        self.active_connections[connection_id] = websocket
        
        # Associate user with connection if authenticated
        user_id = str(user.id) if user else "anonymous"
        self.connection_users[connection_id] = user_id
        self.user_connections[user_id].add(connection_id)
        
        # Set up connection timeout
        self._reset_connection_timeout(connection_id)
        
        logger.info(f"New WebSocket connection: {connection_id} (User: {user_id})")
        
        return connection_id
    
    def disconnect(self, connection_id: str):
        """Handle disconnection"""
        if connection_id in self.active_connections:
            # Remove from active connections
            websocket = self.active_connections.pop(connection_id, None)
            
            # Clean up user association
            user_id = self.connection_users.pop(connection_id, None)
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Clean up subscriptions
            for channel in self.connection_subscriptions.get(connection_id, set()):
                self.subscriptions[channel].discard(connection_id)
                if not self.subscriptions[channel]:
                    del self.subscriptions[channel]
            
            if connection_id in self.connection_subscriptions:
                del self.connection_subscriptions[connection_id]
            
            # Cancel timeout task
            if connection_id in self.connection_timeouts:
                self.connection_timeouts[connection_id].cancel()
                del self.connection_timeouts[connection_id]
            
            logger.info(f"WebSocket disconnected: {connection_id} (User: {user_id or 'unknown'})")
    
    def _reset_connection_timeout(self, connection_id: str):
        """Reset the connection timeout"""
        # Cancel existing timeout if any
        if connection_id in self.connection_timeouts:
            self.connection_timeouts[connection_id].cancel()
        
        # Set a new timeout
        self.connection_timeouts[connection_id] = asyncio.create_task(
            self._connection_timeout(connection_id)
        )
    
    async def _connection_timeout(self, connection_id: str):
        """Handle connection timeout"""
        try:
            await asyncio.sleep(self.connection_timeout)
            if connection_id in self.active_connections:
                logger.info(f"Connection {connection_id} timed out")
                await self.send_json(
                    connection_id,
                    {"type": "error", "message": "Connection timed out due to inactivity"}
                )
                await self.close_connection(connection_id, 1000, "Connection timed out")
        except asyncio.CancelledError:
            # Timeout was reset
            pass
        except Exception as e:
            logger.error(f"Error in connection timeout handler: {e}")
    
    async def close_connection(self, connection_id: str, code: int = 1000, reason: str = None):
        """Close a WebSocket connection"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.close(code=code, reason=reason)
            except Exception as e:
                logger.error(f"Error closing WebSocket {connection_id}: {e}")
            finally:
                self.disconnect(connection_id)
    
    async def send_json(self, connection_id: str, data: dict):
        """Send a JSON message to a specific connection"""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(data)
                self._reset_connection_timeout(connection_id)
                return True
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)
        return False
    
    async def broadcast_json(self, data: dict, connection_ids: List[str] = None):
        """Send a JSON message to multiple connections"""
        if connection_ids is None:
            connection_ids = list(self.active_connections.keys())
        
        for connection_id in connection_ids[:]:  # Create a copy to allow modification during iteration
            await self.send_json(connection_id, data)
    
    async def broadcast_to_channel(self, channel: str, data: dict, exclude: List[str] = None):
        """Broadcast a message to all connections subscribed to a channel"""
        if channel in self.subscriptions:
            exclude_set = set(exclude or [])
            for connection_id in self.subscriptions[channel] - exclude_set:
                await self.send_json(connection_id, {"channel": channel, **data})
    
    async def send_to_user(self, user_id: str, data: dict):
        """Send a message to all connections of a specific user"""
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id]:
                await self.send_json(connection_id, {"user_message": True, **data})
    
    async def handle_message(self, connection_id: str, message: dict):
        """Handle an incoming WebSocket message"""
        if not isinstance(message, dict):
            logger.warning(f"Invalid message format from {connection_id}")
            return
        
        # Reset connection timeout on any message
        self._reset_connection_timeout(connection_id)
        
        # Get message type
        message_type = message.get("type")
        if not message_type:
            logger.warning(f"Message missing type from {connection_id}")
            return
        
        # Find and call the appropriate handler
        handler = self.message_handlers.get(message_type)
        if handler:
            try:
                await handler(connection_id, message)
            except Exception as e:
                logger.error(f"Error in message handler for type '{message_type}': {e}", exc_info=True)
                await self.send_json(connection_id, {
                    "type": "error",
                    "request_id": message.get("request_id"),
                    "message": f"Error processing {message_type} request: {str(e)}"
                })
        else:
            logger.warning(f"No handler for message type: {message_type}")
            await self.send_json(connection_id, {
                "type": "error",
                "request_id": message.get("request_id"),
                "message": f"Unknown message type: {message_type}"
            })
    
    def register_handler(self, message_type: str, handler: Callable[[str, dict], Awaitable[None]]):
        """Register a message handler"""
        self.message_handlers[message_type] = handler
    
    # Default message handlers
    async def _handle_ping(self, connection_id: str, message: dict):
        """Handle ping messages"""
        await self.send_json(connection_id, {
            "type": "pong",
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": message.get("request_id")
        })
    
    async def _handle_subscribe(self, connection_id: str, message: dict):
        """Handle subscription requests"""
        channels = message.get("channels", [])
        if not isinstance(channels, list):
            channels = [channels]
        
        for channel in channels:
            if not isinstance(channel, str):
                continue
                
            # Add to channel subscriptions
            self.subscriptions[channel].add(connection_id)
            self.connection_subscriptions[connection_id].add(channel)
        
        await self.send_json(connection_id, {
            "type": "subscription_update",
            "subscribed": list(self.connection_subscriptions.get(connection_id, [])),
            "request_id": message.get("request_id")
        })
    
    async def _handle_unsubscribe(self, connection_id: str, message: dict):
        """Handle unsubscription requests"""
        channels = message.get("channels", [])
        if not isinstance(channels, list):
            channels = [channels]
        
        for channel in channels:
            if not isinstance(channel, str):
                continue
                
            # Remove from channel subscriptions
            if channel in self.subscriptions:
                self.subscriptions[channel].discard(connection_id)
                if not self.subscriptions[channel]:
                    del self.subscriptions[channel]
            
            if connection_id in self.connection_subscriptions:
                self.connection_subscriptions[connection_id].discard(channel)
        
        await self.send_json(connection_id, {
            "type": "subscription_update",
            "subscribed": list(self.connection_subscriptions.get(connection_id, [])),
            "request_id": message.get("request_id")
        })


# Global WebSocket manager instance
websocket_manager = ConnectionManager()

# Notification service for sending real-time updates
class NotificationService:
    """Service for sending real-time notifications via WebSockets"""
    
    @staticmethod
    async def send_threat_update(threat: ThreatIntel):
        """Send a threat update to all subscribed clients"""
        await websocket_manager.broadcast_to_channel(
            f"threats:{threat.type.value}",
            {
                "type": "threat_update",
                "threat": threat.dict()
            }
        )
    
    @staticmethod
    async def send_alert(alert: Alert, user_ids: List[str] = None):
        """Send an alert to specific users or all users"""
        alert_data = {
            "type": "alert",
            "alert": alert.dict()
        }
        
        if user_ids:
            for user_id in user_ids:
                await websocket_manager.send_to_user(user_id, alert_data)
        else:
            # Broadcast to all connections subscribed to alerts
            await websocket_manager.broadcast_to_channel("alerts", alert_data)
    
    @staticmethod
    async def send_system_message(message: str, level: str = "info", user_ids: List[str] = None):
        """Send a system message to specific users or all users"""
        message_data = {
            "type": "system_message",
            "message": message,
            "level": level,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if user_ids:
            for user_id in user_ids:
                await websocket_manager.send_to_user(user_id, message_data)
        else:
            # Broadcast to all connections
            await websocket_manager.broadcast_json(message_data)
    
    @staticmethod
    async def notify_correlation(correlation: dict):
        """Notify about a new correlation"""
        await websocket_manager.broadcast_to_channel(
            "correlations",
            {
                "type": "correlation",
                "correlation": correlation
            }
        )


# Global notification service instance
notification_service = NotificationService()


async def websocket_endpoint(websocket: WebSocket, user: UserInDB = None):
    """Handle WebSocket connections"""
    connection_id = await websocket_manager.connect(websocket, user)
    
    try:
        while True:
            try:
                # Wait for any message from the client
                data = await websocket.receive_text()
                
                try:
                    # Try to parse the message as JSON
                    message = json.loads(data)
                    await websocket_manager.handle_message(connection_id, message)
                except json.JSONDecodeError:
                    # If not JSON, treat as raw text (e.g., simple ping)
                    if data.strip().lower() == "ping":
                        await websocket_manager.send_json(connection_id, {"type": "pong"})
                    else:
                        logger.warning(f"Received non-JSON message: {data[:100]}...")
            
            except WebSocketDisconnect:
                logger.info(f"WebSocket client disconnected: {connection_id}")
                break
            except Exception as e:
                logger.error(f"Error in WebSocket handler: {e}", exc_info=True)
                await asyncio.sleep(1)  # Prevent tight loop on errors
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}", exc_info=True)
    
    finally:
        # Ensure the connection is properly cleaned up
        websocket_manager.disconnect(connection_id)
