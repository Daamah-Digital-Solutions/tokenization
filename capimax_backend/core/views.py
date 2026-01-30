"""
Core API views for Capimax backend.
Provides root API endpoint and common API utilities.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    Root API endpoint providing system information and available endpoints.
    Note: Sensitive information (debug mode, environment, django version) removed for security.
    """
    return Response({
        'message': 'Welcome to Capimax Real Estate Tokenization API',
        'version': 'v1',
        'endpoints': {
            'authentication': '/api/v1/auth/',
            'properties': '/api/v1/properties/',
            'investments': '/api/v1/investments/',
            'payments': '/api/v1/payments/',
            'kyc': '/api/v1/kyc/',
            'construction': '/api/v1/construction/',
            'notifications': '/api/v1/notifications/',
            'broker': '/api/v1/broker/',
            'analytics': '/api/v1/analytics/',
            'dashboard': '/api/v1/dashboard/',
            'marketplace': '/api/v1/marketplace/',
            'documentation': '/api/docs/',
        },
        'support': {
            'email': 'api-support@capimax.com',
            'documentation': '/api/docs/',
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancers.
    Note: Environment info removed for security - use authenticated endpoints for detailed status.
    """
    return Response({
        'status': 'healthy',
        'timestamp': request.META.get('HTTP_DATE'),
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_status(request):
    """
    Detailed API status including database and cache connectivity.
    """
    from django.db import connection
    from django.core.cache import cache
    
    status_data = {
        'api': 'operational',
        'database': 'unknown',
        'cache': 'unknown',
        'timestamp': request.META.get('HTTP_DATE'),
    }
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        status_data['database'] = 'operational'
    except Exception:
        status_data['database'] = 'error'
    
    # Check cache connectivity
    try:
        cache.set('health_check', 'ok', 30)
        if cache.get('health_check') == 'ok':
            status_data['cache'] = 'operational'
        else:
            status_data['cache'] = 'error'
    except Exception:
        status_data['cache'] = 'error'
    
    # Determine overall status
    if status_data['database'] == 'error' or status_data['cache'] == 'error':
        overall_status = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        overall_status = status.HTTP_200_OK
    
    return Response(status_data, status=overall_status)
