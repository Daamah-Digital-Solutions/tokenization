"""
Custom DRF authentication classes.

`JWTCookieAuthentication` reads the access token from an httpOnly cookie
named `access_token` (set on login via `_set_auth_cookies` in views.py).
Falls back to the standard Bearer-token header used by older API clients.
"""

from __future__ import annotations

from rest_framework_simplejwt.authentication import JWTAuthentication


COOKIE_NAME = 'access_token'


class JWTCookieAuthentication(JWTAuthentication):
    """JWT auth that prefers a cookie over the Authorization header."""

    def authenticate(self, request):
        # Try cookie first
        raw_token = request.COOKIES.get(COOKIE_NAME)
        if raw_token:
            try:
                validated = self.get_validated_token(raw_token)
                user = self.get_user(validated)
                return (user, validated)
            except Exception:
                # Cookie invalid — fall through to Authorization header
                pass

        # Fallback to the standard header-based flow
        return super().authenticate(request)
