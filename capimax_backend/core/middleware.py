"""
Security and performance middleware for the Capimax Backend.

This module provides comprehensive middleware for security headers,
rate limiting, request monitoring, and other security enhancements.
"""

import time
import json
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from ipaddress import ip_address, ip_network
import re

logger = logging.getLogger(__name__)
User = get_user_model()


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add comprehensive security headers to HTTP responses.
    
    Implements OWASP security headers recommendations for enhanced security.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Default security headers
        self.security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': self._get_permissions_policy(),
            'Content-Security-Policy': self._get_csp_policy(),
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        }
        
        # Override with custom settings
        if hasattr(settings, 'SECURITY_HEADERS'):
            self.security_headers.update(settings.SECURITY_HEADERS)
    
    def process_response(self, request, response):
        """Add security headers to the response."""
        # Skip security headers for certain content types or paths
        if self._should_skip_headers(request, response):
            return response
        
        # Add security headers
        for header, value in self.security_headers.items():
            if header not in response:
                response[header] = value
        
        # Add server header obfuscation
        response['Server'] = 'Capimax/1.0'
        
        # Remove Django version information
        if 'X-Powered-By' in response:
            del response['X-Powered-By']
        
        return response
    
    def _get_permissions_policy(self) -> str:
        """Get Permissions Policy header value."""
        policies = [
            "camera=()",
            "microphone=()",
            "geolocation=()",
            "payment=(self)",
            "usb=()",
            "magnetometer=()",
            "accelerometer=()",
            "gyroscope=()",
            "fullscreen=(self)"
        ]
        return ", ".join(policies)
    
    def _get_csp_policy(self) -> str:
        """Get Content Security Policy header value."""
        if hasattr(settings, 'CSP_POLICY'):
            return settings.CSP_POLICY
        
        # Default CSP policy
        policies = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.stripe.com wss:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ]
        return "; ".join(policies)
    
    def _should_skip_headers(self, request, response) -> bool:
        """Determine if security headers should be skipped."""
        # Skip for API responses that might be embedded
        if request.path.startswith('/api/') and 'application/json' in response.get('Content-Type', ''):
            # Only skip frame options for embeddable API responses
            if 'X-Frame-Options' in self.security_headers:
                del response['X-Frame-Options']
        
        # Skip for static files
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            return True
        
        return False


class RateLimitMiddleware(MiddlewareMixin):
    """
    Advanced rate limiting middleware with multiple strategies.
    
    Supports IP-based, user-based, and endpoint-specific rate limiting.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Default rate limits (requests per minute)
        self.rate_limits = getattr(settings, 'RATE_LIMITS', {
            'default': 100,
            'api': 60,
            'auth': 10,
            'upload': 5,
            'anonymous': 20,
            'authenticated': 200
        })
        
        # Rate limit windows (in seconds)
        self.rate_windows = getattr(settings, 'RATE_WINDOWS', {
            'default': 60,
            'auth': 60,
            'upload': 300,  # 5 minutes
            'burst': 10     # Short burst window
        })
    
    def __call__(self, request):
        # Check rate limits before processing request
        if not self._check_rate_limit(request):
            return self._rate_limit_response(request)
        
        # Process request
        response = self.get_response(request)
        
        # Update rate limit counters
        self._update_rate_limit_counters(request)
        
        return response
    
    def _check_rate_limit(self, request) -> bool:
        """Check if request should be rate limited."""
        # Get client identifier
        client_id = self._get_client_identifier(request)
        
        # Get rate limit for this request
        limit_key, limit_count, window = self._get_rate_limit_config(request)
        
        # Check current count
        cache_key = f"rate_limit:{limit_key}:{client_id}"
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit_count:
            logger.warning(f"Rate limit exceeded for {client_id} on {request.path}")
            return False
        
        return True
    
    def _update_rate_limit_counters(self, request):
        """Update rate limit counters after successful request."""
        client_id = self._get_client_identifier(request)
        limit_key, limit_count, window = self._get_rate_limit_config(request)
        
        cache_key = f"rate_limit:{limit_key}:{client_id}"
        
        try:
            # Increment counter with expiry
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, window)
        except Exception as e:
            logger.error(f"Failed to update rate limit counter: {e}")
    
    def _get_client_identifier(self, request) -> str:
        """Get unique identifier for the client."""
        # Use user ID if authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            return f"user:{request.user.id}"
        
        # Use IP address for anonymous users
        ip = self._get_client_ip(request)
        return f"ip:{ip}"
    
    def _get_client_ip(self, request) -> str:
        """Get client IP address from request."""
        # Check for forwarded headers
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        
        return ip
    
    def _get_rate_limit_config(self, request) -> tuple:
        """Get rate limit configuration for the request."""
        path = request.path.lower()
        
        # Authentication endpoints
        if any(auth_path in path for auth_path in ['/auth/', '/login/', '/register/', '/password/']):
            return 'auth', self.rate_limits['auth'], self.rate_windows['auth']
        
        # Upload endpoints
        if 'upload' in path or request.method in ['POST', 'PUT', 'PATCH']:
            if request.content_type and 'multipart' in request.content_type:
                return 'upload', self.rate_limits['upload'], self.rate_windows['upload']
        
        # API endpoints
        if path.startswith('/api/'):
            if hasattr(request, 'user') and request.user.is_authenticated:
                return 'api_auth', self.rate_limits['authenticated'], self.rate_windows['default']
            else:
                return 'api_anon', self.rate_limits['anonymous'], self.rate_windows['default']
        
        # Default limits
        if hasattr(request, 'user') and request.user.is_authenticated:
            return 'default_auth', self.rate_limits['authenticated'], self.rate_windows['default']
        else:
            return 'default_anon', self.rate_limits['anonymous'], self.rate_windows['default']
    
    def _rate_limit_response(self, request) -> HttpResponse:
        """Return rate limit exceeded response."""
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': {
                    'code': 'RATE_LIMIT_EXCEEDED',
                    'message': 'Rate limit exceeded. Please try again later.'
                }
            }, status=429)
        else:
            return HttpResponse(
                'Rate limit exceeded. Please try again later.',
                status=429,
                content_type='text/plain'
            )


class RequestMonitoringMiddleware(MiddlewareMixin):
    """
    Middleware for monitoring and logging request patterns.
    
    Tracks request metrics, suspicious activities, and performance data.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Suspicious patterns to monitor
        self.suspicious_patterns = [
            re.compile(r'\.\./', re.IGNORECASE),  # Directory traversal
            re.compile(r'<script[^>]*>', re.IGNORECASE),  # XSS attempts
            re.compile(r'union\s+select', re.IGNORECASE),  # SQL injection
            re.compile(r'exec\s*\(', re.IGNORECASE),  # Code execution
            re.compile(r'eval\s*\(', re.IGNORECASE),  # Code evaluation
        ]
    
    def __call__(self, request):
        start_time = time.time()
        
        # Log request details
        self._log_request_start(request)
        
        # Check for suspicious patterns
        self._check_suspicious_activity(request)
        
        # Process request
        response = self.get_response(request)
        
        # Log response details
        end_time = time.time()
        self._log_request_end(request, response, end_time - start_time)
        
        return response
    
    def _log_request_start(self, request):
        """Log request initiation."""
        logger.debug(f"Request started: {request.method} {request.path} from {self._get_client_ip(request)}")
    
    def _log_request_end(self, request, response, duration):
        """Log request completion with metrics."""
        client_ip = self._get_client_ip(request)
        user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
        
        log_data = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration': round(duration, 3),
            'client_ip': client_ip,
            'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
            'user_id': user_id,
            'timestamp': timezone.now().isoformat()
        }
        
        # Log slow requests
        if duration > 2.0:  # 2 seconds threshold
            logger.warning(f"Slow request detected: {json.dumps(log_data)}")
        
        # Log errors
        if response.status_code >= 400:
            logger.warning(f"Error response: {json.dumps(log_data)}")
        
        # Store metrics in cache for monitoring
        self._store_request_metrics(log_data)
    
    def _check_suspicious_activity(self, request):
        """Check request for suspicious patterns."""
        # Check URL path
        path = request.path
        query_string = request.META.get('QUERY_STRING', '')
        
        full_url = f"{path}?{query_string}" if query_string else path
        
        for pattern in self.suspicious_patterns:
            if pattern.search(full_url):
                self._log_suspicious_activity(request, 'URL pattern', pattern.pattern)
        
        # Check POST data for suspicious content
        if request.method == 'POST' and hasattr(request, 'POST'):
            for key, value in request.POST.items():
                for pattern in self.suspicious_patterns:
                    if pattern.search(str(value)):
                        self._log_suspicious_activity(request, f'POST data ({key})', pattern.pattern)
    
    def _log_suspicious_activity(self, request, detection_type, pattern):
        """Log suspicious activity."""
        client_ip = self._get_client_ip(request)
        
        log_data = {
            'type': 'suspicious_activity',
            'detection_type': detection_type,
            'pattern': pattern,
            'path': request.path,
            'method': request.method,
            'client_ip': client_ip,
            'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
            'timestamp': timezone.now().isoformat()
        }
        
        logger.warning(f"Suspicious activity detected: {json.dumps(log_data)}")
        
        # Store in cache for security monitoring
        cache_key = f"suspicious_activity:{client_ip}"
        activities = cache.get(cache_key, [])\n        activities.append(log_data)\n        \n        # Keep last 10 activities\n        if len(activities) > 10:\n            activities = activities[-10:]\n        \n        cache.set(cache_key, activities, 3600)  # 1 hour\n    \n    def _store_request_metrics(self, log_data):\n        \"\"\"Store request metrics for monitoring.\"\"\"\n        try:\n            # Store hourly metrics\n            hour_key = f\"metrics:hour:{timezone.now().strftime('%Y%m%d%H')}\"\n            hourly_metrics = cache.get(hour_key, {'requests': 0, 'errors': 0, 'total_duration': 0})\n            \n            hourly_metrics['requests'] += 1\n            if log_data['status_code'] >= 400:\n                hourly_metrics['errors'] += 1\n            hourly_metrics['total_duration'] += log_data['duration']\n            \n            cache.set(hour_key, hourly_metrics, 7200)  # 2 hours\n            \n        except Exception as e:\n            logger.error(f\"Failed to store request metrics: {e}\")\n    \n    def _get_client_ip(self, request) -> str:\n        \"\"\"Get client IP address from request.\"\"\"\n        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')\n        if x_forwarded_for:\n            ip = x_forwarded_for.split(',')[0].strip()\n        else:\n            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')\n        return ip\n\n\nclass IPWhitelistMiddleware(MiddlewareMixin):\n    \"\"\"\n    Middleware for IP-based access control.\n    \n    Allows restricting access to specific endpoints based on IP addresses.\n    \"\"\"\n    \n    def __init__(self, get_response):\n        super().__init__(get_response)\n        self.get_response = get_response\n        \n        # Load IP whitelist configuration\n        self.ip_restrictions = getattr(settings, 'IP_RESTRICTIONS', {})\n        \n        # Parse IP networks\n        self.allowed_networks = {}\n        for path_pattern, ips in self.ip_restrictions.items():\n            networks = []\n            for ip_str in ips:\n                try:\n                    networks.append(ip_network(ip_str, strict=False))\n                except ValueError as e:\n                    logger.error(f\"Invalid IP/network in whitelist: {ip_str} - {e}\")\n            self.allowed_networks[path_pattern] = networks\n    \n    def __call__(self, request):\n        # Check IP restrictions\n        if not self._check_ip_access(request):\n            return self._access_denied_response(request)\n        \n        return self.get_response(request)\n    \n    def _check_ip_access(self, request) -> bool:\n        \"\"\"Check if client IP has access to the requested path.\"\"\"\n        if not self.allowed_networks:\n            return True  # No restrictions configured\n        \n        client_ip_str = self._get_client_ip(request)\n        \n        try:\n            client_ip = ip_address(client_ip_str)\n        except ValueError:\n            logger.warning(f\"Invalid client IP address: {client_ip_str}\")\n            return False\n        \n        path = request.path\n        \n        # Check each path pattern\n        for path_pattern, allowed_networks in self.allowed_networks.items():\n            if path.startswith(path_pattern):\n                # This path has IP restrictions\n                for network in allowed_networks:\n                    if client_ip in network:\n                        return True\n                \n                # IP not in allowed networks for this path\n                logger.warning(f\"IP {client_ip_str} denied access to {path}\")\n                return False\n        \n        # No restrictions for this path\n        return True\n    \n    def _get_client_ip(self, request) -> str:\n        \"\"\"Get client IP address from request.\"\"\"\n        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')\n        if x_forwarded_for:\n            ip = x_forwarded_for.split(',')[0].strip()\n        else:\n            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')\n        return ip\n    \n    def _access_denied_response(self, request) -> HttpResponse:\n        \"\"\"Return access denied response.\"\"\"\n        if request.path.startswith('/api/'):\n            return JsonResponse({\n                'error': {\n                    'code': 'ACCESS_DENIED',\n                    'message': 'Access denied from your IP address.'\n                }\n            }, status=403)\n        else:\n            return HttpResponse(\n                'Access denied from your IP address.',\n                status=403,\n                content_type='text/plain'\n            )\n\n\nclass MaintenanceModeMiddleware(MiddlewareMixin):\n    \"\"\"\n    Middleware for maintenance mode functionality.\n    \n    Allows putting the application into maintenance mode while allowing\n    admin access for testing.\n    \"\"\"\n    \n    def __init__(self, get_response):\n        super().__init__(get_response)\n        self.get_response = get_response\n        \n        # Paths that are always accessible during maintenance\n        self.maintenance_exempt_paths = getattr(settings, 'MAINTENANCE_EXEMPT_PATHS', [\n            '/admin/',\n            '/api/health/',\n            '/maintenance/',\n        ])\n    \n    def __call__(self, request):\n        # Check if maintenance mode is enabled\n        if self._is_maintenance_mode_enabled():\n            # Check if request should be exempt from maintenance mode\n            if not self._is_exempt_from_maintenance(request):\n                return self._maintenance_response(request)\n        \n        return self.get_response(request)\n    \n    def _is_maintenance_mode_enabled(self) -> bool:\n        \"\"\"Check if maintenance mode is enabled.\"\"\"\n        # Check cache first\n        maintenance_mode = cache.get('maintenance_mode', False)\n        \n        if maintenance_mode:\n            return True\n        \n        # Check settings\n        return getattr(settings, 'MAINTENANCE_MODE', False)\n    \n    def _is_exempt_from_maintenance(self, request) -> bool:\n        \"\"\"Check if request is exempt from maintenance mode.\"\"\"\n        path = request.path\n        \n        # Check exempt paths\n        for exempt_path in self.maintenance_exempt_paths:\n            if path.startswith(exempt_path):\n                return True\n        \n        # Check if user is admin\n        if hasattr(request, 'user') and request.user.is_authenticated:\n            if request.user.is_staff or request.user.is_superuser:\n                return True\n        \n        return False\n    \n    def _maintenance_response(self, request) -> HttpResponse:\n        \"\"\"Return maintenance mode response.\"\"\"\n        if request.path.startswith('/api/'):\n            return JsonResponse({\n                'error': {\n                    'code': 'MAINTENANCE_MODE',\n                    'message': 'The application is currently under maintenance. Please try again later.'\n                }\n            }, status=503)\n        else:\n            # Return simple maintenance page\n            html = \"\"\"\n            <!DOCTYPE html>\n            <html>\n            <head>\n                <title>Maintenance Mode</title>\n                <style>\n                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }\n                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n                    h1 { color: #333; }\n                    p { color: #666; line-height: 1.6; }\n                </style>\n            </head>\n            <body>\n                <div class=\"container\">\n                    <h1>Maintenance Mode</h1>\n                    <p>We're currently performing scheduled maintenance to improve our services.</p>\n                    <p>Please check back in a few minutes. We apologize for any inconvenience.</p>\n                </div>\n            </body>\n            </html>\n            \"\"\"\n            \n            return HttpResponse(html, status=503, content_type='text/html')