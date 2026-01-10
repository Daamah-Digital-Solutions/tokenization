"""
URL configuration for capimax_backend project.

Main URL router for Capimax Real Estate Tokenization Platform API.
Routes requests to appropriate app-specific URL configurations.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi


# API Documentation Setup
schema_view = get_schema_view(
    openapi.Info(
        title="Capimax Real Estate Tokenization API",
        default_version='v1',
        description="""
        # Capimax Real Estate Tokenization Platform API
        
        Welcome to the comprehensive API documentation for the Capimax Real Estate Tokenization Platform.
        
        ## Overview
        
        This API provides complete functionality for:
        - **User Authentication & Management**: Registration, login, profile management, KYC
        - **Property Management**: Property listings, analytics, market data
        - **Investment Operations**: Token purchases, portfolio management, dividend distributions
        - **Payment Processing**: Multiple payment methods, wallet management, transactions
        - **Real-time Features**: WebSocket connections, live notifications, updates
        - **Administrative Tools**: Property approval, user management, analytics
        
        ## Authentication
        
        The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:
        ```
        Authorization: Bearer <your-jwt-token>
        ```
        
        ## Rate Limiting
        
        API requests are rate-limited based on user type:
        - **Anonymous users**: 30 requests/hour
        - **Authenticated users**: 500 requests/hour
        - **Premium users**: 1000 requests/hour
        
        ## Error Handling
        
        All API responses follow a consistent error format:
        ```json
        {
            "error": {
                "code": "ERROR_CODE",
                "message": "Human readable error message",
                "details": {}
            }
        }
        ```
        
        ## Pagination
        
        List endpoints support pagination with the following parameters:
        - `page`: Page number (default: 1)
        - `page_size`: Items per page (default: 20, max: 100)
        
        Response format:
        ```json
        {
            "count": 150,
            "next": "http://api.example.com/endpoint/?page=2",
            "previous": null,
            "results": [...]
        }
        ```
        
        ## WebSocket Connections
        
        Real-time features are available via WebSocket at:
        - `wss://api.capimax.com/ws/notifications/{user_id}/`
        - `wss://api.capimax.com/ws/property/{property_id}/`
        
        ## SDKs and Libraries
        
        Official SDKs are available for:
        - JavaScript/TypeScript
        - Python
        - React/React Native
        
        ## Support
        
        For API support, contact: api-support@capimax.com
        """,
        terms_of_service="https://capimax.com/terms/",
        contact=openapi.Contact(
            name="Capimax API Team",
            email="api@capimax.com",
            url="https://capimax.com/support"
        ),
        license=openapi.License(name="Proprietary License"),
        x_logo={
            "url": "https://capimax.com/logo.png",
            "altText": "Capimax Logo"
        }
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    authentication_classes=[],
)

urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/schema/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
    # API v1 root and core routes
    path('api/v1/', include('core.urls')),
    
    # API v1 routes
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/payments/', include('payments.urls')),
    path('api/v1/properties/', include('properties.urls')),
    path('api/v1/investments/', include('investments.urls')),
    path('api/v1/kyc/', include('kyc.urls')),
    path('api/v1/construction/', include('construction.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/v1/broker/', include('broker.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
    path('api/v1/dashboard/', include('dashboard.urls')),
    path('api/v1/marketplace/', include('marketplace.urls')),
    path('api/v1/admin/', include('admin_panel.urls')),
    path('api/v1/blockchain/', include('blockchain.urls')),  # ✅ ENABLED - Phase 1 Blockchain Activation
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
