"""
Authentication Serializers for Capimax Backend.

This module contains serializers for user authentication, registration,
profile management, and account-related operations.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from datetime import timedelta
import pyotp
from .models import User, PasswordResetToken, EmailVerificationToken, UserRoleAssignment, UserRole
from core.utils import generate_secure_token, send_notification_email


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with multi-role support.

    Handles user creation with multiple role assignments, password validation,
    and automatic email verification token generation.
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="Password must be at least 8 characters long"
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text="Confirm your password"
    )
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=UserRole.choices),
        write_only=True,
        required=False,
        help_text="List of roles to assign to the user. If not provided, defaults to primary role."
    )
    
    class Meta:
        model = User
        fields = (
            'email', 'password', 'confirm_password', 'first_name',
            'last_name', 'role', 'roles', 'phone', 'country', 'city',
            'state', 'address', 'date_of_birth'
        )
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'country': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()
    
    def validate_phone(self, value):
        """Validate phone number format."""
        if value and len(value.replace('+', '').replace('-', '').replace(' ', '')) < 10:
            raise serializers.ValidationError("Please provide a valid phone number.")
        return value
    
    def validate(self, attrs):
        """Validate password confirmation, roles, and overall data integrity."""
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords don't match."})

        # Validate password strength
        password = attrs.get('password')
        try:
            validate_password(password)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": e.messages})

        # Handle role validation - support both single role and multi-role
        role = attrs.get('role')
        roles = attrs.get('roles', [])

        # If roles list is provided, validate it
        if roles:
            # Validate each role choice
            valid_roles = [choice[0] for choice in UserRole.choices]
            for role_value in roles:
                if role_value not in valid_roles:
                    raise serializers.ValidationError({"roles": f"Invalid role: {role_value}"})

            # Remove duplicates while preserving order
            attrs['roles'] = list(dict.fromkeys(roles))

            # Set primary role to first role in list if not already set
            if not role and roles:
                attrs['role'] = roles[0]
        elif role:
            # If only single role provided, create roles list for consistency
            attrs['roles'] = [role]
        else:
            # Default to investor role if no roles specified
            attrs['role'] = UserRole.INVESTOR
            attrs['roles'] = [UserRole.INVESTOR]

        # Remove confirm_password from validated data
        attrs.pop('confirm_password', None)
        return attrs
    
    def create(self, validated_data):
        """Create user with multi-role assignments and email verification token."""
        # Extract roles before creating user
        roles = validated_data.pop('roles', [])

        # Create user with primary role
        user = User.objects.create_user(**validated_data)

        # Create role assignments for all specified roles
        if roles:
            for i, role in enumerate(roles):
                UserRoleAssignment.objects.create(
                    user=user,
                    role=role,
                    is_primary=(i == 0),  # First role is primary
                    is_active=True
                )

        # Create email verification token
        EmailVerificationToken.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        # Send verification email (in a real app, this should be in a task)
        self.send_verification_email(user)

        return user
    
    def send_verification_email(self, user):
        """Send email verification email to user."""
        verification_token = user.emailverificationtoken_set.filter(verified=False).first()
        if verification_token:
            verification_url = f"http://localhost:3000/verify-email?token={verification_token.token}"
            send_notification_email(
                to_email=user.email,
                subject="Welcome to Capimax - Verify Your Email",
                message=f"Please verify your email by clicking: {verification_url}",
                html_message=f"""
                <h2>Welcome to Capimax Real Estate Tokenization Platform</h2>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="{verification_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
                <p>This link will expire in 24 hours.</p>
                """
            )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer with user role and verification status.
    
    Extends the default JWT serializer to include user information
    and handle two-factor authentication.
    """
    
    two_factor_code = serializers.CharField(
        required=False,
        help_text="Two-factor authentication code (if enabled)"
    )
    
    def validate(self, attrs):
        """Validate login credentials with 2FA support."""
        email = attrs.get('email') or attrs.get('username')
        password = attrs.get('password')
        two_factor_code = attrs.get('two_factor_code')
        
        if email and password:
            # Authenticate user
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid email or password.")
            
            if not user.is_active:
                raise serializers.ValidationError("Account is disabled.")
            
            if user.is_suspended:
                raise serializers.ValidationError(
                    f"Account is suspended. Reason: {user.suspension_reason or 'Contact support for more information.'}"
                )
            
            # Check 2FA if enabled
            if user.two_factor_enabled:
                if not two_factor_code:
                    raise serializers.ValidationError("Two-factor authentication code is required.")
                
                totp = pyotp.TOTP(user.two_factor_secret)
                if not totp.verify(two_factor_code, valid_window=2):
                    # Check backup codes as fallback
                    if two_factor_code not in user.backup_codes:
                        raise serializers.ValidationError("Invalid two-factor authentication code.")
                    else:
                        # Remove used backup code
                        user.backup_codes.remove(two_factor_code)
                        user.save(update_fields=['backup_codes'])
            
            # Update login attempts and IP
            user.login_attempts = 0
            if hasattr(self.context.get('request'), 'META'):
                user.last_login_ip = self.get_client_ip(self.context['request'])
            user.save(update_fields=['login_attempts', 'last_login_ip'])
            
            # Set user for token generation
            self.user = user
            attrs['user'] = user
        
        # Generate tokens
        data = super().validate(attrs)
        
        # Add user information to token response
        data['user'] = UserProfileSerializer(self.user).data
        
        return data
    
    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')
    
    @classmethod
    def get_token(cls, user):
        """Customize JWT token claims with multi-role support."""
        token = super().get_token(user)

        # Add custom claims
        token['user_id'] = str(user.id)
        token['email'] = user.email
        token['role'] = user.role  # Legacy primary role
        token['primary_role'] = user.get_primary_role()
        token['available_roles'] = user.get_available_roles()
        token['is_verified'] = user.is_verified
        token['full_name'] = user.get_full_name()

        return token


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile information with multi-role support.

    Provides read and update capabilities for user profile data
    with appropriate field restrictions and role information.
    """

    full_name = serializers.CharField(source='get_full_name', read_only=True)
    available_roles = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'full_name', 'role',
            'available_roles', 'primary_role', 'phone', 'country', 'date_of_birth',
            'address', 'city', 'state', 'postal_code', 'is_verified',
            'wallet_address', 'two_factor_enabled', 'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'email', 'role', 'available_roles', 'primary_role',
            'is_verified', 'two_factor_enabled', 'created_at', 'updated_at'
        )

    def get_available_roles(self, obj):
        """Get all available roles for this user."""
        return obj.get_available_roles()

    def get_primary_role(self, obj):
        """Get user's primary role."""
        return obj.get_primary_role()
    
    def validate_phone(self, value):
        """Validate phone number format."""
        if value and len(value.replace('+', '').replace('-', '').replace(' ', '')) < 10:
            raise serializers.ValidationError("Please provide a valid phone number.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change functionality.
    
    Requires current password validation and new password confirmation.
    """
    
    current_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_current_password(self, value):
        """Validate current password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
    
    def validate(self, attrs):
        """Validate password confirmation and strength."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords don't match."})
        
        try:
            validate_password(attrs['new_password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": e.messages})
        
        return attrs
    
    def save(self):
        """Update user password."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request.
    
    Accepts email and generates reset token if user exists.
    """
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate that user exists with this email."""
        try:
            user = User.objects.get(email=value.lower())
            self.user = user
            return value.lower()
        except User.DoesNotExist:
            # Don't reveal whether user exists for security
            # But still process the request silently
            self.user = None
            return value.lower()
    
    def save(self):
        """Generate password reset token and send email."""
        if self.user:
            # Invalidate existing tokens
            PasswordResetToken.objects.filter(user=self.user, used=False).update(used=True)
            
            # Create new token
            reset_token = PasswordResetToken.objects.create(
                user=self.user,
                expires_at=timezone.now() + timedelta(hours=1)
            )
            
            # Send reset email
            reset_url = f"http://localhost:3000/reset-password?token={reset_token.token}"
            send_notification_email(
                to_email=self.user.email,
                subject="Capimax - Password Reset Request",
                message=f"Reset your password by clicking: {reset_url}",
                html_message=f"""
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                """
            )
        
        return True


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation.
    
    Validates token and updates password.
    """
    
    token = serializers.UUIDField()
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_token(self, value):
        """Validate reset token."""
        try:
            reset_token = PasswordResetToken.objects.get(token=value)
            if not reset_token.is_valid():
                raise serializers.ValidationError("Invalid or expired reset token.")
            self.reset_token = reset_token
            return value
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("Invalid reset token.")
    
    def validate(self, attrs):
        """Validate password confirmation and strength."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords don't match."})
        
        try:
            validate_password(attrs['new_password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": e.messages})
        
        return attrs
    
    def save(self):
        """Reset user password and mark token as used."""
        user = self.reset_token.user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        
        # Mark token as used
        self.reset_token.mark_as_used()
        
        return user


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for email verification.
    
    Validates verification token and marks email as verified.
    """
    
    token = serializers.UUIDField()
    
    def validate_token(self, value):
        """Validate verification token."""
        try:
            verification_token = EmailVerificationToken.objects.get(token=value)
            if not verification_token.is_valid():
                raise serializers.ValidationError("Invalid or expired verification token.")
            self.verification_token = verification_token
            return value
        except EmailVerificationToken.DoesNotExist:
            raise serializers.ValidationError("Invalid verification token.")
    
    def save(self):
        """Mark email as verified."""
        user = self.verification_token.user
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        
        # Mark token as verified
        self.verification_token.mark_as_verified()
        
        return user


class TwoFactorSetupSerializer(serializers.Serializer):
    """
    Serializer for two-factor authentication setup.
    
    Generates TOTP secret and backup codes for 2FA setup.
    """
    
    def create_totp_secret(self, user):
        """Generate TOTP secret for user."""
        secret = pyotp.random_base32()
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="Capimax Real Estate Tokenization"
        )
        
        return {
            'secret': secret,
            'qr_code_uri': totp_uri,
            'manual_entry_key': secret
        }


class TwoFactorVerifySerializer(serializers.Serializer):
    """
    Serializer for two-factor authentication verification.
    
    Verifies TOTP code and enables 2FA for user.
    """
    
    secret = serializers.CharField()
    code = serializers.CharField(max_length=6, min_length=6)
    
    def validate(self, attrs):
        """Validate TOTP code with provided secret."""
        secret = attrs.get('secret')
        code = attrs.get('code')
        
        totp = pyotp.TOTP(secret)
        if not totp.verify(code, valid_window=2):
            raise serializers.ValidationError("Invalid authentication code.")
        
        return attrs
    
    def save(self):
        """Enable 2FA for user with secret and backup codes."""
        user = self.context['request'].user
        from core.utils import generate_backup_codes
        
        user.two_factor_secret = self.validated_data['secret']
        user.two_factor_enabled = True
        user.backup_codes = generate_backup_codes()
        user.save(update_fields=['two_factor_secret', 'two_factor_enabled', 'backup_codes'])
        
        return {
            'success': True,
            'backup_codes': user.backup_codes
        }