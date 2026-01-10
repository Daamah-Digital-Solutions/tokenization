"""
ASGI config for capimax_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import ws_app.routing
from ws_app.middleware import (
    JWTAuthMiddleware, WebSocketSecurityMiddleware,
    WebSocketRateLimitMiddleware, WebSocketLoggingMiddleware
)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        WebSocketSecurityMiddleware(
            WebSocketRateLimitMiddleware(
                WebSocketLoggingMiddleware(
                    JWTAuthMiddleware(
                        URLRouter(
                            ws_app.routing.websocket_urlpatterns
                        )
                    )
                )
            )
        )
    ),
})
