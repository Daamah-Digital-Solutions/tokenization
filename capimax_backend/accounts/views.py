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

from .models import User, PasswordResetToken, EmailVerificationToken
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
        """Create user and return success response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            create_success_response(
                data={
                    'user': UserProfileSerializer(user).data,
                    'message': 'Registration successful. Please check your email to verify your account.'
                },
                message="User registered successfully",
                status_code=status.HTTP_201_CREATED
            ),
            status=status.HTTP_201_CREATED
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token obtain view with 2FA support.
    
    Handles user login with optional two-factor authentication
    and returns user information along with tokens.
    """
    
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        """Authenticate user and return tokens with user info."""
        try:
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == status.HTTP_200_OK:
                # Wrap response in standard format
                return Response(
                    create_success_response(
                        data=response.data,
                        message="Login successful"
                    )
                )
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
        """Logout user by blacklisting refresh token."""
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            logout(request)
            
            return Response(
                create_success_response(
                    message="Logged out successfully"
                )
            )
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
        serializer = PasswordResetRequestSerializer(data=request.data)
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
        serializer = PasswordResetConfirmSerializer(data=request.data)
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
        """Verify email address."""
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                create_success_response(
                    data={'user': UserProfileSerializer(user).data},
                    message="Email verified successfully"
                )
            )
        
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
        
        # Invalidate existing tokens
        EmailVerificationToken.objects.filter(user=user, verified=False).update(verified=True)
        
        # Create new token
        verification_token = EmailVerificationToken.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        # Send verification email
        from .serializers import UserRegistrationSerializer
        serializer = UserRegistrationSerializer()
        serializer.send_verification_email(user)
        
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
