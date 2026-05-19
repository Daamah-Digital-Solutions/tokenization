"""
ASGI config for capimax_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from pathlib import Path

# Load .env BEFORE Django settings are imported (see manage.py for details).
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / '.env', override=False)
except ImportError:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')

# Initialize Django ASGI application FIRST so the app registry is populated
# before any module that touches the ORM (channels consumers transitively
# import ContentType, which requires apps to be ready). Order matters here:
# don't move these imports above this line.
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()

# Safe to import ORM-touching code now.
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import ws_app.routing
from ws_app.middleware import (
    JWTAuthMiddleware, WebSocketSecurityMiddleware,
    WebSocketRateLimitMiddleware, WebSocketLoggingMiddleware
)

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
