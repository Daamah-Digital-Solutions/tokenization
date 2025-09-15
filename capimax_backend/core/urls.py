"""
URL configuration for core app.
Provides root API endpoints and system utilities.
"""

from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('health/', views.health_check, name='health-check'),
    path('status/', views.api_status, name='api-status'),
]