"""
URL configuration for accounts app.

This module defines URL patterns for authentication and user management
endpoints including registration, login, profile management, and 2FA.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    UserRegistrationView,
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
    UserLogoutView,
    UserProfileView,
    PasswordChangeView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    EmailVerificationView,
    ResendEmailVerificationView,
    TwoFactorSetupView,
    TwoFactorVerifyView,
    TwoFactorDisableView,
    user_stats_view,
    check_email_availability,
    # Role management views
    user_roles_view,
    add_user_role_view,
    remove_user_role_view,
    set_primary_role_view,
    role_permissions_view,
    # Google OAuth views
    GoogleAuthView,
    GoogleProfileCompletionView,
)

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token-refresh'),
    
    # Profile management
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('investor/profile/', UserProfileView.as_view(), name='investor-profile'),
    path('stats/', user_stats_view, name='user-stats'),
    
    # Password management
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
    path('password/reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Email verification
    path('email/verify/', EmailVerificationView.as_view(), name='email-verify'),
    path('email/resend-verification/', ResendEmailVerificationView.as_view(), name='resend-email-verification'),
    
    # Two-factor authentication
    path('2fa/setup/', TwoFactorSetupView.as_view(), name='2fa-setup'),
    path('2fa/verify/', TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('2fa/disable/', TwoFactorDisableView.as_view(), name='2fa-disable'),
    
    # Utility endpoints
    path('check-email/', check_email_availability, name='check-email-availability'),

    # Role management endpoints
    path('roles/', user_roles_view, name='user-roles'),
    path('roles/add/', add_user_role_view, name='add-user-role'),
    path('roles/remove/<str:role>/', remove_user_role_view, name='remove-user-role'),
    path('roles/set-primary/', set_primary_role_view, name='set-primary-role'),
    path('roles/permissions/', role_permissions_view, name='role-permissions'),

    # Google OAuth endpoints
    path('google/auth/', GoogleAuthView.as_view(), name='google-auth'),
    path('google/complete-profile/', GoogleProfileCompletionView.as_view(), name='google-complete-profile'),
]