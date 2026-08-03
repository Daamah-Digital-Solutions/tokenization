"""
Authentication Views for Capimax Backend.

This module contains views for user authentication, registration,
profile management, and account-related operations.
"""

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import logout
from django.utils import timezone
from django.db import models
from datetime import timedelta
import pyotp
import qrcode
import qrcode.image.svg
import base64
import io
import logging
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

logger = logging.getLogger(__name__)

from .models import User, PasswordResetToken, EmailVerificationToken, UserRoleAssignment, UserRole
from .serializers import (
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    PasswordChangeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    EmailVerificationSerializer,
    TwoFactorSetupSerializer,
    TwoFactorVerifySerializer
)
from core.utils import create_success_response, create_error_response
from core.permissions import IsOwnerOrReadOnly
from core.services.email_service import EmailService, get_request_info


class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint.

    Creates new user account with email verification token
    and sends welcome email.
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    
    def create(self, request, *args, **kwargs):
        """Create user and return success response without auth tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Send welcome and verification email with 6-digit code
        try:
            # Generate 6-digit verification code
            verification_code = EmailVerificationToken.generate_code()

            # Create verification token with code and expiration (15 minutes)
            verification_token, created = EmailVerificationToken.objects.get_or_create(
                user=user,
                defaults={
                    'code': verification_code,
                    'expires_at': timezone.now() + timedelta(minutes=15)
                }
            )
            if not created:
                # Update existing token with new code and expiration
                verification_token.code = verification_code
                verification_token.expires_at = timezone.now() + timedelta(minutes=15)
                verification_token.verified = False
                verification_token.save()

            # Send welcome email with 6-digit code
            EmailService.send_welcome_verification_email(
                user=user,
                verification_url='',  # No URL needed for code-based verification
                verification_code=verification_code
            )

        except Exception as e:
            # Log error but don't fail registration
            logger.warning(f"Failed to send welcome email to {user.email}: {str(e)}")

        # Do not provide JWT tokens - require email verification first
        return Response(
            create_success_response(
                data={
                    'user': {
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_verified': user.is_verified
                    },
                    'message': 'Registration successful. Please check your email to verify your account before logging in.',
                    'debug_marker': 'CUSTOM_VIEW_EXECUTED_SUCCESSFULLY'
                },
                message="User registered successfully. Email verification required.",
                status_code=status.HTTP_201_CREATED
            ),
            status=status.HTTP_201_CREATED
        )


def _set_auth_cookies(response, *, access: str, refresh: str | None) -> None:
    """
    Attach access/refresh tokens as httpOnly cookies.

    The frontend never reads these — it just sends them automatically on
    each request because the SPA uses `withCredentials: true`. The access
    cookie has a short lifetime; the refresh cookie has a longer one and
    is restricted to the refresh endpoint via `path=`.
    """
    from django.conf import settings as _settings

    secure = not getattr(_settings, 'DEBUG', False)
    samesite = 'Strict' if not _settings.DEBUG else 'Lax'

    response.set_cookie(
        key='access_token',
        value=access,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=int(_settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
            if isinstance(getattr(_settings, 'SIMPLE_JWT', {}), dict) and 'ACCESS_TOKEN_LIFETIME' in _settings.SIMPLE_JWT
            else 3600,
        path='/',
    )
    if refresh:
        response.set_cookie(
            key='refresh_token',
            value=refresh,
            httponly=True,
            secure=secure,
            samesite=samesite,
            max_age=int(_settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
                if isinstance(getattr(_settings, 'SIMPLE_JWT', {}), dict) and 'REFRESH_TOKEN_LIFETIME' in _settings.SIMPLE_JWT
                else 7 * 24 * 3600,
            path='/api/v1/auth/',
        )


def _clear_auth_cookies(response) -> None:
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/api/v1/auth/')


class CookieTokenRefreshView(APIView):
    """
    Refresh the access token using the httpOnly refresh cookie.

    Frontend never sends the refresh token in a header or body — the cookie
    is delivered automatically by the browser. The response sets a new
    access cookie and (if rotation is enabled) a new refresh cookie. The
    previous refresh token is blacklisted via simplejwt's rotation flow.
    """

    permission_classes = []  # Anonymous — the cookie is the credential.
    authentication_classes = []

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

        raw_refresh = request.COOKIES.get('refresh_token')
        if not raw_refresh:
            return Response(
                create_error_response(
                    message="Missing refresh token",
                    status_code=status.HTTP_401_UNAUTHORIZED,
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw_refresh)
        except (TokenError, InvalidToken):
            response = Response(
                create_error_response(
                    message="Refresh token invalid or expired",
                    status_code=status.HTTP_401_UNAUTHORIZED,
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_auth_cookies(response)
            return response

        # New access token
        access_str = str(refresh.access_token)

        # Optional refresh rotation (controlled by SIMPLE_JWT settings)
        new_refresh_str: str | None = None
        from django.conf import settings as _settings
        rotate = getattr(_settings, 'SIMPLE_JWT', {}).get('ROTATE_REFRESH_TOKENS', False)
        blacklist_after = getattr(_settings, 'SIMPLE_JWT', {}).get('BLACKLIST_AFTER_ROTATION', False)

        if rotate:
            try:
                if blacklist_after:
                    refresh.blacklist()
            except Exception:
                # If blacklisting isn't installed, continue with rotation
                pass
            # Mint a new refresh token from the same user
            new_refresh = RefreshToken.for_user(
                refresh.payload.get('user_id') and
                __import__('django.contrib.auth', fromlist=['get_user_model']).get_user_model().objects.get(
                    pk=refresh.payload['user_id']
                )
            ) if 'user_id' in refresh.payload else None
            if new_refresh is not None:
                new_refresh_str = str(new_refresh)

        response = Response(create_success_response(
            data={'access': access_str},
            message="Token refreshed",
        ))
        _set_auth_cookies(response, access=access_str, refresh=new_refresh_str)
        return response


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token obtain view with 2FA support.

    Returns the access token in the response body (for legacy clients that
    still expect it) AND as an httpOnly cookie (preferred — used by the
    new SPA flow with `withCredentials: true`). The refresh token is sent
    only via httpOnly cookie restricted to /api/v1/auth/.
    """

    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)

            if response.status_code == status.HTTP_200_OK:
                access = response.data.get('access')
                refresh = response.data.get('refresh')

                # Build the success response and attach cookies. The
                # response body intentionally still contains the user
                # info but the tokens are also delivered via cookies so
                # the SPA never has to store them in JS.
                payload = dict(response.data)
                # Remove the refresh token from the body — cookie-only.
                payload.pop('refresh', None)
                wrapped = Response(create_success_response(
                    data=payload,
                    message="Login successful",
                ))
                if access:
                    _set_auth_cookies(wrapped, access=access, refresh=refresh)
                return wrapped
            return response

        except Exception as e:
            return Response(
                create_error_response(
                    message="Authentication failed",
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    details={'error': str(e)}
                ),
                status=status.HTTP_401_UNAUTHORIZED
            )


class UserLogoutView(APIView):
    """
    User logout endpoint.
    
    Blacklists refresh token and logs out user.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Logout user by blacklisting refresh token and clearing cookies."""
        try:
            # Try body first (legacy), then cookie (new flow).
            refresh_token = (
                request.data.get("refresh_token")
                or request.COOKIES.get('refresh_token')
            )
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except Exception:
                    pass  # already invalid — clearing the cookie below is enough

            logout(request)

            response = Response(create_success_response(message="Logged out successfully"))
            _clear_auth_cookies(response)
            return response
        except Exception as e:
            return Response(
                create_error_response(
                    message="Logout failed",
                    details={'error': str(e)}
                ),
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    User profile view for retrieving and updating profile information.
    """
    
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Return current user as the object."""
        return self.request.user
    
    def retrieve(self, request, *args, **kwargs):
        """Get user profile."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            create_success_response(
                data=serializer.data,
                message="Profile retrieved successfully"
            )
        )
    
    def update(self, request, *args, **kwargs):
        """Update user profile."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(
            create_success_response(
                data=serializer.data,
                message="Profile updated successfully"
            )
        )


class PasswordChangeView(APIView):
    """
    Password change endpoint for authenticated users.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Change user password."""
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(
                create_success_response(
                    message="Password changed successfully"
                )
            )
        
        return Response(
            create_error_response(
                message="Password change failed",
                details=serializer.errors
            ),
            status=status.HTTP_400_BAD_REQUEST
        )


class PasswordResetRequestView(APIView):
    """
    Password reset request endpoint.
    
    Accepts email and sends password reset link if user exists.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Request password reset."""
        serializer = PasswordResetRequestSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(
                create_success_response(
                    message="If an account with this email exists, a password reset link has been sent."
                )
            )
        
        return Response(
            create_error_response(
                message="Invalid email address",
                details=serializer.errors
            ),
            status=status.HTTP_400_BAD_REQUEST
        )


class PasswordResetConfirmView(APIView):
    """
    Password reset confirmation endpoint.
    
    Validates reset token and updates password.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Confirm password reset with token."""
        serializer = PasswordResetConfirmSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(
                create_success_response(
                    message="Password reset successfully"
                )
            )
        
        return Response(
            create_error_response(
                message="Password reset failed",
                details=serializer.errors
            ),
            status=status.HTTP_400_BAD_REQUEST
        )


class EmailVerificationView(APIView):
    """
    Email verification endpoint.
    
    Verifies email address using verification token.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Verify email address with 6-digit code and log user in."""
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            user = result['user']

            # Account-activation confirmation email (client edit #6).
            try:
                from notifications.services import NotificationService
                NotificationService.create_notification(
                    user=user,
                    title="Your account is now active",
                    message=(
                        "Welcome to Capimax RT! Your email has been verified and "
                        "your account is active. You can now complete identity "
                        "verification (KYC) and start co-owning tokenized real estate."
                    ),
                    notification_type='success',
                    priority='medium',
                    action_url='/dashboard',
                    action_label='Go to Dashboard',
                    send_email=True,
                    send_real_time=True,
                )
            except Exception:
                logging.getLogger(__name__).warning(
                    "Activation confirmation email failed", exc_info=True,
                )

            response = Response(
                create_success_response(
                    data={
                        'user': UserProfileSerializer(user).data,
                        'tokens': {
                            'access': result['access'],
                            'refresh': result['refresh'],
                        }
                    },
                    message="Email verified successfully. You are now logged in."
                )
            )
            # Same cookie pattern as CustomTokenObtainPairView — the SPA's
            # auth state is driven by httpOnly cookies, so a "log them in"
            # response that omits the cookies leaves the dashboard 401-ing.
            _set_auth_cookies(response, access=result['access'], refresh=result['refresh'])
            return response

        return Response(
            create_error_response(
                message="Email verification failed",
                details=serializer.errors
            ),
            status=status.HTTP_400_BAD_REQUEST
        )


class ResendEmailVerificationView(APIView):
    """
    Resend email verification endpoint.
    
    Generates new verification token and sends email.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Resend email verification."""
        user = request.user
        
        if user.is_verified:
            return Response(
                create_error_response(
                    message="Email is already verified"
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate 6-digit verification code
        verification_code = EmailVerificationToken.generate_code()

        # Create or update verification token with code and expiration (15 minutes)
        verification_token, created = EmailVerificationToken.objects.get_or_create(
            user=user,
            defaults={
                'code': verification_code,
                'expires_at': timezone.now() + timedelta(minutes=15)
            }
        )
        if not created:
            # Update existing token with new code and expiration
            verification_token.code = verification_code
            verification_token.expires_at = timezone.now() + timedelta(minutes=15)
            verification_token.verified = False
            verification_token.save()

        # Send welcome and verification email with 6-digit code
        EmailService.send_welcome_verification_email(
            user=user,
            verification_url='',  # No URL needed for code-based verification
            verification_code=verification_code
        )
        
        return Response(
            create_success_response(
                message="Verification email sent successfully"
            )
        )


class TwoFactorSetupView(APIView):
    """
    Two-factor authentication setup endpoint.
    
    Generates TOTP secret and QR code for 2FA setup.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Setup 2FA for user."""
        user = request.user
        
        if user.two_factor_enabled:
            return Response(
                create_error_response(
                    message="Two-factor authentication is already enabled"
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate TOTP secret
        secret = pyotp.random_base32()
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="Capimax Real Estate Tokenization"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        # Convert QR code to base64 image
        img_buffer = io.BytesIO()
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img.save(img_buffer, format='PNG')
        qr_code_b64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        return Response(
            create_success_response(
                data={
                    'secret': secret,
                    'qr_code': f"data:image/png;base64,{qr_code_b64}",
                    'manual_entry_key': secret,
                    'instructions': 'Scan the QR code with your authenticator app or enter the manual key.'
                },
                message="2FA setup initiated"
            )
        )


class TwoFactorVerifyView(APIView):
    """
    Two-factor authentication verification endpoint.
    
    Verifies TOTP code and enables 2FA.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Verify and enable 2FA."""
        serializer = TwoFactorVerifySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            result = serializer.save()
            return Response(
                create_success_response(
                    data=result,
                    message="Two-factor authentication enabled successfully"
                )
            )
        
        return Response(
            create_error_response(
                message="2FA verification failed",
                details=serializer.errors
            ),
            status=status.HTTP_400_BAD_REQUEST
        )


class TwoFactorDisableView(APIView):
    """
    Two-factor authentication disable endpoint.
    
    Disables 2FA for user after password verification.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Disable 2FA for user."""
        user = request.user
        password = request.data.get('password')
        
        if not user.two_factor_enabled:
            return Response(
                create_error_response(
                    message="Two-factor authentication is not enabled"
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not password:
            return Response(
                create_error_response(
                    message="Password is required to disable 2FA"
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user.check_password(password):
            return Response(
                create_error_response(
                    message="Invalid password"
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Disable 2FA
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.backup_codes = []
        user.save(update_fields=['two_factor_enabled', 'two_factor_secret', 'backup_codes'])
        
        return Response(
            create_success_response(
                message="Two-factor authentication disabled successfully"
            )
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_stats_view(request):
    """
    Get user statistics for dashboard.
    
    Returns investment count, portfolio value, and other user metrics.
    """
    user = request.user
    
    # Calculate user statistics (these would be optimized with proper queries in production)
    stats = {
        'total_investments': user.investments.filter(status='completed').count(),
        'total_invested': user.investments.filter(status='completed').aggregate(
            total=models.Sum('investment_amount')
        )['total'] or 0,
        'properties_invested': user.investments.filter(status='completed').values('property_investment').distinct().count(),
        'account_created': user.created_at,
        'last_login': user.last_login,
        'verification_status': {
            'email_verified': user.is_verified,
            'two_factor_enabled': user.two_factor_enabled,
            'kyc_status': getattr(user, 'kyc_profile', None) and user.kyc_profile.status or 'not_started'
        }
    }
    
    return Response(
        create_success_response(
            data=stats,
            message="User statistics retrieved successfully"
        )
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def check_email_availability(request):
    """
    Check if email address is available for registration.
    """
    email = request.data.get('email')
    if not email:
        return Response(
            create_error_response(
                message="Email is required"
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    is_available = not User.objects.filter(email=email.lower()).exists()

    return Response(
        create_success_response(
            data={'available': is_available},
            message="Email availability checked"
        )
    )


# ========================================
# ROLE MANAGEMENT API ENDPOINTS
# ========================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_roles_view(request):
    """
    Get user's current role assignments.

    Returns all active roles with their details including primary role status.
    """
    user = request.user

    # Get all role assignments
    role_assignments = UserRoleAssignment.objects.filter(
        user=user,
        is_active=True
    ).order_by('-is_primary', 'assigned_at')

    roles_data = []
    for assignment in role_assignments:
        roles_data.append({
            'role': assignment.role,
            'role_display': assignment.get_role_display(),
            'is_primary': assignment.is_primary,
            'assigned_at': assignment.assigned_at,
            'assigned_by': assignment.assigned_by.get_full_name() if assignment.assigned_by else 'Self-assigned'
        })

    return Response(
        create_success_response(
            data={
                'roles': roles_data,
                'primary_role': user.get_primary_role(),
                'available_roles': user.get_available_roles(),
                'permissions': {
                    'can_invest': user.can_invest(),
                    'can_list_properties': user.can_list_properties(),
                    'is_admin': user.is_admin_user()
                }
            },
            message="User roles retrieved successfully"
        )
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_user_role_view(request):
    """
    Add a new role to user's account.

    Allows users to add additional roles (INVESTOR, PROPERTY_OWNER).
    Admin users can add any role including ADMIN.
    """
    user = request.user
    role = request.data.get('role')

    if not role:
        return Response(
            create_error_response(
                message="Role is required",
                details={'role': ['This field is required.']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate role choice
    valid_roles = [choice[0] for choice in UserRole.choices]
    if role not in valid_roles:
        return Response(
            create_error_response(
                message="Invalid role",
                details={'role': [f'Invalid choice. Valid choices are: {", ".join(valid_roles)}']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if role already exists
    if user.has_role(role):
        return Response(
            create_error_response(
                message="Role already assigned",
                details={'role': ['User already has this role.']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Security check: Only admins can assign ADMIN role
    if role == UserRole.ADMIN and not user.is_admin_user():
        return Response(
            create_error_response(
                message="Permission denied",
                details={'role': ['Only administrators can assign admin role.']}
            ),
            status=status.HTTP_403_FORBIDDEN
        )

    # Create role assignment
    UserRoleAssignment.objects.create(
        user=user,
        role=role,
        is_primary=False,  # New roles are never primary by default
        is_active=True,
        assigned_by=user  # Self-assigned
    )

    return Response(
        create_success_response(
            data={
                'role': role,
                'role_display': dict(UserRole.choices)[role],
                'available_roles': user.get_available_roles()
            },
            message=f"Role '{dict(UserRole.choices)[role]}' added successfully"
        )
    )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_user_role_view(request, role):
    """
    Remove a role from user's account.

    Users can remove roles with restrictions:
    - Cannot remove primary role if it's the only role
    - Cannot remove ADMIN role from self (security measure)
    """
    user = request.user

    # Validate role choice
    valid_roles = [choice[0] for choice in UserRole.choices]
    if role not in valid_roles:
        return Response(
            create_error_response(
                message="Invalid role",
                details={'role': [f'Invalid role: {role}']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user has this role
    if not user.has_role(role):
        return Response(
            create_error_response(
                message="Role not found",
                details={'role': ['User does not have this role.']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get role assignment
    role_assignment = UserRoleAssignment.objects.filter(
        user=user,
        role=role,
        is_active=True
    ).first()

    if not role_assignment:
        return Response(
            create_error_response(
                message="Role assignment not found"
            ),
            status=status.HTTP_404_NOT_FOUND
        )

    # Security checks
    active_roles_count = UserRoleAssignment.objects.filter(
        user=user,
        is_active=True
    ).count()

    # Cannot remove the only role
    if active_roles_count <= 1:
        return Response(
            create_error_response(
                message="Cannot remove role",
                details={'role': ['Cannot remove the only active role. Users must have at least one role.']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Cannot remove primary role if user has multiple roles (must switch primary first)
    if role_assignment.is_primary and active_roles_count > 1:
        return Response(
            create_error_response(
                message="Cannot remove primary role",
                details={'role': ['Cannot remove primary role. Please set another role as primary first.']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Security: Prevent self-removal of admin role (admin must be removed by another admin)
    if role == UserRole.ADMIN:
        return Response(
            create_error_response(
                message="Cannot remove admin role",
                details={'role': ['Admin role cannot be self-removed for security reasons.']}
            ),
            status=status.HTTP_403_FORBIDDEN
        )

    # Remove role assignment
    role_assignment.delete()

    return Response(
        create_success_response(
            data={
                'removed_role': role,
                'available_roles': user.get_available_roles()
            },
            message=f"Role '{dict(UserRole.choices)[role]}' removed successfully"
        )
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def set_primary_role_view(request):
    """
    Set a user's primary role.

    The primary role determines the default dashboard and permissions context.
    User must already have the role to set it as primary.
    """
    user = request.user
    role = request.data.get('role')

    if not role:
        return Response(
            create_error_response(
                message="Role is required",
                details={'role': ['This field is required.']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user has this role
    if not user.has_role(role):
        return Response(
            create_error_response(
                message="Role not found",
                details={'role': ['User does not have this role.']}
            ),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the role assignment
    new_primary = UserRoleAssignment.objects.filter(
        user=user,
        role=role,
        is_active=True
    ).first()

    if not new_primary:
        return Response(
            create_error_response(
                message="Role assignment not found"
            ),
            status=status.HTTP_404_NOT_FOUND
        )

    # Update primary role (this will automatically set others to non-primary via model save method)
    new_primary.is_primary = True
    new_primary.save()

    # Also update the legacy role field for backward compatibility
    user.role = role
    user.save(update_fields=['role'])

    return Response(
        create_success_response(
            data={
                'primary_role': role,
                'role_display': dict(UserRole.choices)[role],
                'available_roles': user.get_available_roles()
            },
            message=f"Primary role set to '{dict(UserRole.choices)[role]}'"
        )
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def role_permissions_view(request):
    """
    Get detailed permissions for user's current roles.

    Returns specific capabilities and access levels for each role.
    """
    user = request.user

    permissions = {
        'roles': user.get_available_roles(),
        'primary_role': user.get_primary_role(),
        'capabilities': {
            'can_invest': user.can_invest(),
            'can_list_properties': user.can_list_properties(),
            'is_admin': user.is_admin_user(),
            'can_access_investor_dashboard': user.has_role(UserRole.INVESTOR),
            'can_access_property_owner_dashboard': user.has_role(UserRole.PROPERTY_OWNER),
            'can_access_admin_panel': user.has_role(UserRole.ADMIN),
        },
        'requirements': {
            'email_verification_required': not user.is_verified,
            'kyc_verification_required': getattr(user, 'kyc_profile', None) is None or
                                         getattr(user.kyc_profile, 'status', 'not_started') != 'approved',
        },
        'role_descriptions': {
            UserRole.INVESTOR: 'Can invest in tokenized properties and track investments',
            UserRole.PROPERTY_OWNER: 'Can list properties for tokenization and manage listings',
            UserRole.ADMIN: 'Full administrative access to the platform'
        }
    }

    return Response(
        create_success_response(
            data=permissions,
            message="Role permissions retrieved successfully"
        )
    )


# ========================================
# GOOGLE OAUTH AUTHENTICATION
# ========================================

class GoogleAuthView(APIView):
    """
    Google OAuth authentication endpoint.

    Handles Google Sign-In by verifying ID tokens and either:
    - Logging in existing users
    - Creating partial accounts for new users (requiring profile completion)
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        Authenticate with Google ID token.

        Expected payload:
        {
            "id_token": "google_id_token_string"
        }

        Returns:
        - For existing users: JWT tokens and user data
        - For new users: user data with requires_profile_completion=True
        """
        id_token_str = request.data.get('id_token')

        if not id_token_str:
            return Response(
                create_error_response(
                    message="Google ID token is required",
                    status_code=status.HTTP_400_BAD_REQUEST
                ),
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify the Google ID token
            google_client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None)

            if not google_client_id:
                logger.error("GOOGLE_OAUTH_CLIENT_ID not configured in settings")
                return Response(
                    create_error_response(
                        message="Google authentication is not configured",
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                    ),
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                google_client_id
            )

            # Extract user info from Google token
            google_user_id = idinfo.get('sub')
            email = idinfo.get('email')
            email_verified = idinfo.get('email_verified', False)
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            picture = idinfo.get('picture', '')

            if not email:
                return Response(
                    create_error_response(
                        message="Email not provided by Google",
                        status_code=status.HTTP_400_BAD_REQUEST
                    ),
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user exists
            try:
                user = User.objects.get(email=email.lower())

                # Check if account was created with email/password (no google_id)
                if not user.google_id and user.has_usable_password():
                    return Response(
                        create_error_response(
                            message="An account with this email already exists. Please sign in with your email and password.",
                            status_code=status.HTTP_409_CONFLICT,
                            details={'email_exists': True, 'auth_method': 'email_password'}
                        ),
                        status=status.HTTP_409_CONFLICT
                    )

                # Update Google ID if not set (linking accounts)
                if not user.google_id:
                    user.google_id = google_user_id
                    user.save(update_fields=['google_id'])

                # Check if profile is complete
                if not self._is_profile_complete(user):
                    return Response(
                        create_success_response(
                            data={
                                'requires_profile_completion': True,
                                'user': {
                                    'email': user.email,
                                    'first_name': user.first_name,
                                    'last_name': user.last_name,
                                    'google_id': user.google_id,
                                }
                            },
                            message="Please complete your profile to continue"
                        )
                    )

                # Generate JWT tokens for existing complete user
                refresh = RefreshToken.for_user(user)
                access_str = str(refresh.access_token)
                refresh_str = str(refresh)

                # Update last login
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])

                response = Response(
                    create_success_response(
                        data={
                            'requires_profile_completion': False,
                            'user': UserProfileSerializer(user).data,
                            'tokens': {
                                'access': access_str,
                                'refresh': refresh_str,
                            }
                        },
                        message="Login successful"
                    )
                )
                # The SPA reads auth from the httpOnly access_token cookie.
                # Without this the frontend lands on /dashboard with no
                # credential, the first authenticated call 401s, and the
                # user is bounced to /login — looking like a broken redirect.
                _set_auth_cookies(response, access=access_str, refresh=refresh_str)
                return response

            except User.DoesNotExist:
                # Generate unique username from email (before @) + random suffix
                import uuid
                base_username = email.split('@')[0][:20]  # Take first 20 chars before @
                unique_suffix = uuid.uuid4().hex[:8]
                username = f"{base_username}_{unique_suffix}"

                # Create new user with Google data (partial account)
                user = User.objects.create(
                    username=username,
                    email=email.lower(),
                    first_name=first_name,
                    last_name=last_name,
                    google_id=google_user_id,
                    is_verified=email_verified,  # Google already verified email
                    role=UserRole.INVESTOR,  # Default role, will be updated in profile completion
                )
                # Set unusable password since they're using Google auth
                user.set_unusable_password()
                user.save()

                # Return data indicating profile completion is needed
                return Response(
                    create_success_response(
                        data={
                            'requires_profile_completion': True,
                            'is_new_user': True,
                            'user': {
                                'email': user.email,
                                'first_name': user.first_name,
                                'last_name': user.last_name,
                                'google_id': user.google_id,
                            }
                        },
                        message="Account created. Please complete your profile to continue."
                    ),
                    status=status.HTTP_201_CREATED
                )

        except ValueError as e:
            # Invalid token
            error_msg = str(e)
            logger.warning(f"Invalid Google ID token: {error_msg}")

            # Provide more specific error messages
            if 'Token used too early' in error_msg or 'Token used too late' in error_msg:
                message = "Google token has expired. Please try signing in again."
            elif 'Wrong issuer' in error_msg:
                message = "Invalid Google token issuer."
            elif 'Could not verify audience' in error_msg:
                message = "Google token audience mismatch. Please contact support."
            else:
                message = "Invalid Google ID token. Please try again."

            return Response(
                create_error_response(
                    message=message,
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    details={'error_type': 'token_validation'} if settings.DEBUG else {}
                ),
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            import traceback
            error_msg = str(e)
            error_traceback = traceback.format_exc()
            logger.error(f"Google authentication error: {error_msg}")
            logger.error(f"Traceback: {error_traceback}")

            # Return more helpful error message in production
            return Response(
                create_error_response(
                    message=f"Google authentication failed: {error_msg}",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    details={'error': error_msg, 'traceback': error_traceback} if settings.DEBUG else {}
                ),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _is_profile_complete(self, user):
        """Check if user has completed their profile.

        ``last_name`` is intentionally NOT required — Google's ``family_name``
        is empty for many single-name accounts and historical first-time-only
        users. Requiring it locks those users into an infinite "complete your
        profile" loop even after they submit the form, because the next
        sign-in re-checks the same emptiness.
        """
        required_fields = [
            user.first_name,
            user.phone_number,
            user.country,
        ]
        has_role = UserRoleAssignment.objects.filter(user=user, is_active=True).exists()
        return all(required_fields) and has_role


class GoogleProfileCompletionView(APIView):
    """
    Complete profile for Google-authenticated users.

    New Google users must complete their profile with:
    - Phone number
    - Date of birth
    - Country
    - City
    - Role selection
    - Terms agreement
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        Complete user profile after Google authentication.

        Expected payload:
        {
            "email": "user@example.com",
            "google_id": "google_user_id",
            "phone_number": "+1234567890",
            "date_of_birth": "1990-01-01",
            "country": "us",
            "city": "New York",
            "roles": ["investor"],  # or ["property_owner"] or both
            "agree_to_terms": true,
            "agree_to_privacy": true,
            "agree_to_marketing": false
        }
        """
        email = request.data.get('email')
        google_id = request.data.get('google_id')

        if not email or not google_id:
            return Response(
                create_error_response(
                    message="Email and Google ID are required",
                    status_code=status.HTTP_400_BAD_REQUEST
                ),
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email.lower(), google_id=google_id)
        except User.DoesNotExist:
            return Response(
                create_error_response(
                    message="User not found or Google ID mismatch",
                    status_code=status.HTTP_404_NOT_FOUND
                ),
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate required fields
        required_fields = ['phone_number', 'country', 'city', 'roles', 'agree_to_terms', 'agree_to_privacy']
        missing_fields = [f for f in required_fields if not request.data.get(f)]

        if missing_fields:
            return Response(
                create_error_response(
                    message="Missing required fields",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    details={'missing_fields': missing_fields}
                ),
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate agreements
        if not request.data.get('agree_to_terms') or not request.data.get('agree_to_privacy'):
            return Response(
                create_error_response(
                    message="You must agree to the Terms and Privacy Policy",
                    status_code=status.HTTP_400_BAD_REQUEST
                ),
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate roles
        roles = request.data.get('roles', [])
        valid_roles = [UserRole.INVESTOR, UserRole.PROPERTY_OWNER]

        if not roles or not all(r in valid_roles for r in roles):
            return Response(
                create_error_response(
                    message="Invalid role selection",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    details={'valid_roles': valid_roles}
                ),
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update user profile
        user.phone_number = request.data.get('phone_number')
        user.date_of_birth = request.data.get('date_of_birth')
        user.country = request.data.get('country')
        user.city = request.data.get('city')
        user.role = roles[0]  # Primary role
        user.save()

        # Create role assignments
        for i, role in enumerate(roles):
            UserRoleAssignment.objects.get_or_create(
                user=user,
                role=role,
                defaults={
                    'is_primary': i == 0,
                    'is_active': True,
                    'assigned_by': user
                }
            )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_str = str(refresh.access_token)
        refresh_str = str(refresh)

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        response = Response(
            create_success_response(
                data={
                    'user': UserProfileSerializer(user).data,
                    'tokens': {
                        'access': access_str,
                        'refresh': refresh_str,
                    }
                },
                message="Profile completed successfully. Welcome to Capimax!"
            )
        )
        # Without these cookies the dashboard's first authenticated request
        # 401s and the frontend bounces the user back to /login as if they
        # never completed the form.
        _set_auth_cookies(response, access=access_str, refresh=refresh_str)
        return response
