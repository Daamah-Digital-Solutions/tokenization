"""
WebSocket authentication and security middleware.
"""

import logging
from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings

User = get_user_model()
logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_string):
    """
    Get user from JWT token.
    """
    try:
        # Validate the token
        UntypedToken(token_string)
        
        # Decode the token to get user ID
        decoded_token = jwt_decode(
            token_string, 
            settings.SECRET_KEY, 
            algorithms=["HS256"]
        )
        
        user_id = decoded_token.get('user_id')
        if not user_id:
            return AnonymousUser()
        
        # Get the user
        user = User.objects.select_related().get(id=user_id)
        
        # Check if user is active
        if not user.is_active:
            return AnonymousUser()
        
        return user
        
    except (InvalidToken, TokenError, User.DoesNotExist, Exception) as e:
        logger.warning(f"WebSocket authentication failed: {str(e)}")
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens.
    
    Supports authentication via:
    1. Authorization header: Bearer <token>
    2. Query parameter: ?token=<token>
    3. Subprotocol: Sec-WebSocket-Protocol header
    """
    
    def __init__(self, inner):
        super().__init__(inner)
    
    async def __call__(self, scope, receive, send):
        # Only process WebSocket connections
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)
        
        # Try to authenticate the user
        user = await self.get_authenticated_user(scope)
        scope["user"] = user
        
        return await super().__call__(scope, receive, send)
    
    async def get_authenticated_user(self, scope):
        """
        Extract JWT token and authenticate user.
        """
        token = None
        
        # Method 1: Check Authorization header
        headers = dict(scope.get("headers", []))
        auth_header = headers.get(b"authorization", b"").decode()
        
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            logger.debug("Found token in Authorization header")
        
        # Method 2: Check query parameters
        if not token:
            query_string = scope.get("query_string", b"").decode()
            query_params = parse_qs(query_string)
            token_list = query_params.get("token", [])
            
            if token_list:
                token = token_list[0]
                logger.debug("Found token in query parameters")
        
        # Method 3: Check WebSocket subprotocols (less common)
        if not token:
            subprotocols = scope.get("subprotocols", [])
            for protocol in subprotocols:
                if protocol.startswith("token."):
                    token = protocol.replace("token.", "")
                    logger.debug("Found token in subprotocol")
                    break
        
        # If no token found, return anonymous user
        if not token:
            logger.debug("No authentication token found in WebSocket connection")
            return AnonymousUser()
        
        # Get user from token
        user = await get_user_from_token(token)
        
        if user.is_authenticated:
            logger.info(f"WebSocket authenticated user: {user.email}")
        else:
            logger.warning("WebSocket authentication failed - anonymous user")
        
        return user


class WebSocketSecurityMiddleware(BaseMiddleware):
    """
    Security middleware for WebSocket connections.
    
    Provides:
    - Origin validation
    - Rate limiting preparation
    - Connection logging
    - IP address tracking
    """
    
    def __init__(self, inner):
        super().__init__(inner)
        self.allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    
    async def __call__(self, scope, receive, send):
        # Only process WebSocket connections
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)
        
        # Validate origin
        if not self.validate_origin(scope):
            logger.warning(f"WebSocket connection rejected - invalid origin")
            await send({
                "type": "websocket.close",
                "code": 4003
            })
            return
        
        # Add security context
        scope["security"] = {
            "client_ip": self.get_client_ip(scope),
            "origin": self.get_origin(scope),
            "user_agent": self.get_user_agent(scope)
        }
        
        # Log connection attempt
        self.log_connection_attempt(scope)
        
        return await super().__call__(scope, receive, send)
    
    def validate_origin(self, scope):
        """
        Validate WebSocket origin against allowed origins.
        """
        # In development, allow all origins
        if settings.DEBUG:
            return True
        
        origin = self.get_origin(scope)
        if not origin:
            return False
        
        # Check against allowed origins
        return any(
            origin.startswith(allowed_origin) 
            for allowed_origin in self.allowed_origins
        )
    
    def get_origin(self, scope):
        """Get origin from headers."""
        headers = dict(scope.get("headers", []))
        return headers.get(b"origin", b"").decode()
    
    def get_client_ip(self, scope):
        """Get client IP address."""
        headers = dict(scope.get("headers", []))
        
        # Check X-Forwarded-For header (for proxies)
        forwarded_for = headers.get(b"x-forwarded-for", b"").decode()
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = headers.get(b"x-real-ip", b"").decode()
        if real_ip:
            return real_ip
        
        # Fallback to client address
        client = scope.get("client")
        if client:
            return client[0]
        
        return "unknown"
    
    def get_user_agent(self, scope):
        """Get user agent from headers."""
        headers = dict(scope.get("headers", []))
        return headers.get(b"user-agent", b"").decode()
    
    def log_connection_attempt(self, scope):
        """Log WebSocket connection attempt."""
        security = scope.get("security", {})
        user = scope.get("user", AnonymousUser())
        
        logger.info(
            f"WebSocket connection attempt - "
            f"User: {user.email if user.is_authenticated else 'Anonymous'}, "
            f"IP: {security.get('client_ip', 'unknown')}, "
            f"Origin: {security.get('origin', 'unknown')}"
        )


class WebSocketRateLimitMiddleware(BaseMiddleware):
    """
    Rate limiting middleware for WebSocket connections.
    
    This is a basic implementation. For production, consider using
    Redis-based rate limiting with more sophisticated algorithms.
    """
    
    def __init__(self, inner):
        super().__init__(inner)
        self.connection_limits = {
            'anonymous': 5,  # Max 5 connections per IP for anonymous users
            'authenticated': 10,  # Max 10 connections per user for authenticated users
        }
        # In-memory storage (use Redis in production)
        self.connections = {}
    
    async def __call__(self, scope, receive, send):
        # Only process WebSocket connections
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)
        
        # Check rate limits
        if not await self.check_rate_limit(scope):
            logger.warning("WebSocket connection rejected - rate limit exceeded")
            await send({
                "type": "websocket.close",
                "code": 4029  # Too Many Requests
            })
            return
        
        # Track connection
        connection_key = self.get_connection_key(scope)
        self.connections[connection_key] = self.connections.get(connection_key, 0) + 1
        
        try:
            return await super().__call__(scope, receive, send)
        finally:
            # Clean up connection tracking
            if connection_key in self.connections:
                self.connections[connection_key] -= 1
                if self.connections[connection_key] <= 0:
                    del self.connections[connection_key]
    
    async def check_rate_limit(self, scope):
        """Check if connection is within rate limits."""
        user = scope.get("user", AnonymousUser())
        connection_key = self.get_connection_key(scope)
        current_connections = self.connections.get(connection_key, 0)
        
        if user.is_authenticated:
            limit = self.connection_limits['authenticated']
        else:
            limit = self.connection_limits['anonymous']
        
        return current_connections < limit
    
    def get_connection_key(self, scope):
        """Get unique key for rate limiting."""
        user = scope.get("user", AnonymousUser())
        security = scope.get("security", {})
        
        if user.is_authenticated:
            return f"user_{user.id}"
        else:
            return f"ip_{security.get('client_ip', 'unknown')}"


class WebSocketLoggingMiddleware(BaseMiddleware):
    """
    Logging middleware for WebSocket connections.
    """
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)
        
        # Wrap receive to log incoming messages
        async def logged_receive():
            message = await receive()
            if message["type"] == "websocket.connect":
                self.log_connect(scope)
            elif message["type"] == "websocket.disconnect":
                self.log_disconnect(scope, message.get("code", "unknown"))
            return message
        
        # Wrap send to log outgoing messages
        async def logged_send(message):
            if message["type"] == "websocket.accept":
                self.log_accept(scope)
            elif message["type"] == "websocket.close":
                self.log_close(scope, message.get("code", "unknown"))
            await send(message)
        
        return await super().__call__(scope, logged_receive, logged_send)
    
    def log_connect(self, scope):
        """Log WebSocket connection."""
        user = scope.get("user", AnonymousUser())
        path = scope.get("path", "/")
        logger.debug(f"WebSocket CONNECT {path} - User: {user.email if user.is_authenticated else 'Anonymous'}")
    
    def log_accept(self, scope):
        """Log WebSocket accept."""
        user = scope.get("user", AnonymousUser())
        path = scope.get("path", "/")
        logger.debug(f"WebSocket ACCEPT {path} - User: {user.email if user.is_authenticated else 'Anonymous'}")
    
    def log_disconnect(self, scope, code):
        """Log WebSocket disconnect."""
        user = scope.get("user", AnonymousUser())
        path = scope.get("path", "/")
        logger.debug(f"WebSocket DISCONNECT {path} (code: {code}) - User: {user.email if user.is_authenticated else 'Anonymous'}")
    
    def log_close(self, scope, code):
        """Log WebSocket close."""
        user = scope.get("user", AnonymousUser())
        path = scope.get("path", "/")
        logger.debug(f"WebSocket CLOSE {path} (code: {code}) - User: {user.email if user.is_authenticated else 'Anonymous'}")


def create_websocket_application():
    """
    Create WebSocket application with all security middleware.
    """
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.security.websocket import AllowedHostsOriginValidator
    from .routing import websocket_urlpatterns
    
    return ProtocolTypeRouter({
        "websocket": AllowedHostsOriginValidator(
            WebSocketSecurityMiddleware(
                WebSocketRateLimitMiddleware(
                    WebSocketLoggingMiddleware(
                        JWTAuthMiddleware(
                            URLRouter(websocket_urlpatterns)
                        )
                    )
                )
            )
        ),
    })