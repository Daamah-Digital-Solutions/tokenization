"""
WebSocket URL routing for real-time features.
"""

from django.urls import re_path, path
from . import consumers

websocket_urlpatterns = [
    # User-specific notification WebSocket
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
    
    # Admin system monitoring WebSocket
    re_path(r'ws/admin/$', consumers.AdminConsumer.as_asgi()),
    
    # Property-specific updates WebSocket
    re_path(r'ws/property/(?P<property_id>[0-9a-f-]+)/$', consumers.PropertyConsumer.as_asgi()),
    
    # Investment tracking WebSocket
    re_path(r'ws/investment/(?P<investment_id>[0-9a-f-]+)/$', consumers.InvestmentConsumer.as_asgi()),
]