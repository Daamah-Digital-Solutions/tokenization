"""
User Account Models for Capimax Real Estate Tokenization Platform.

This module contains models for user management, authentication, and profile data.
Implements role-based access control for Investors, Property Owners, Brokers, and Admins.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid
import random
import secrets
import string


class UserRole(models.TextChoices):
    """User role choices for main platform role-based access control."""
    INVESTOR = 'investor', 'Investor'
    PROPERTY_OWNER = 'property_owner', 'Property Owner'
    BROKER = 'broker', 'Broker'
    ADMIN = 'admin', 'Admin'


class WalletKind(models.TextChoices):
    """
    Where a user's primary tokens live.

    - ``custodial``: platform-managed wallet derived from the master seed.
      The user does not hold the private key. Default for fiat-paying users.
    - ``external``: user-controlled wallet (MetaMask, hardware wallet, etc.).
      The platform never has the private key.

    A user may have BOTH a custodial wallet (``wallet_address``) AND a linked
    external wallet (``external_wallet_address``). ``wallet_kind`` indicates
    which one is the user's primary destination for new mints by default.
    """
    CUSTODIAL = 'custodial', 'Custodial (platform-managed)'
    EXTERNAL = 'external', 'External (self-custody)'


class UserManager(BaseUserManager):
    """
    Custom user manager for email-based authentication.

    Provides methods for creating regular users and superusers
    using email as the primary identifier instead of username.
    """

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError('The Email field must be set')

        email = self.normalize_email(email)
        # Use email as username if not provided
        if 'username' not in extra_fields:
            extra_fields['username'] = email
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def lookup_by_wallet(self, address):
        """
        Find a user by either their primary or external wallet address.

        Used by on-chain event listeners that see an address and need to
        map it back to a User. Case-insensitive (Ethereum addresses are
        case-insensitive when not checksummed).
        """
        if not address:
            return None
        from django.db.models import Q
        return self.filter(
            Q(wallet_address__iexact=address)
            | Q(external_wallet_address__iexact=address)
        ).first()
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    
    Supports multi-role authentication with comprehensive profile data
    for real estate tokenization platform users.
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False,
        help_text="Unique identifier for the user"
    )
    
    email = models.EmailField(
        unique=True,
        help_text="User's email address - used for login"
    )
    
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.INVESTOR,
        help_text="User's role in the platform"
    )
    
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="User's phone number"
    )
    
    country = models.CharField(
        max_length=100,
        help_text="User's country of residence"
    )
    
    date_of_birth = models.DateField(
        blank=True,
        null=True,
        help_text="User's date of birth"
    )
    
    address = models.TextField(
        blank=True,
        null=True,
        help_text="User's physical address"
    )
    
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="User's city"
    )
    
    state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="User's state/province"
    )
    
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="User's postal/zip code"
    )
    
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the user has completed email verification"
    )
    
    wallet_address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text=(
            "The user's primary on-chain destination. For fiat-paying users "
            "this is auto-populated with a deterministically-derived custodial "
            "address. For crypto-native users it is whichever wallet they "
            "first connected. Lower-cased / checksummed Ethereum address."
        ),
    )

    wallet_kind = models.CharField(
        max_length=16,
        choices=WalletKind.choices,
        default=WalletKind.CUSTODIAL,
        help_text=(
            "Whether ``wallet_address`` is platform-custodial or self-custody. "
            "Drives whether the backend can sign on the user's behalf."
        ),
    )

    external_wallet_address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text=(
            "Optional self-custody wallet linked by the user (e.g. via "
            "MetaMask + sign-to-prove). Used as the destination for crypto "
            "investments and for 'withdraw to my wallet' transfers."
        ),
    )

    google_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        help_text="Google OAuth user ID for social login"
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="User's phone number (for profile completion)"
    )

    two_factor_enabled = models.BooleanField(
        default=False,
        help_text="Whether two-factor authentication is enabled"
    )
    
    two_factor_secret = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        help_text="Secret key for 2FA token generation"
    )
    
    backup_codes = models.JSONField(
        default=list,
        blank=True,
        help_text="Backup codes for 2FA recovery"
    )
    
    last_login_ip = models.GenericIPAddressField(
        blank=True,
        null=True,
        help_text="IP address of last login"
    )
    
    login_attempts = models.PositiveIntegerField(
        default=0,
        help_text="Number of failed login attempts"
    )
    
    is_suspended = models.BooleanField(
        default=False,
        help_text="Whether the user account is suspended"
    )
    
    suspension_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason for account suspension"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'country']

    class Meta:
        db_table = 'accounts_user'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['created_at']),
            models.Index(fields=['google_id']),
        ]
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def save(self, *args, **kwargs):
        # role='admin' implies operational access to Django Admin. Without this
        # invariant the user could authenticate against the website API but be
        # locked out of /admin/ because is_staff=False — exactly the failure
        # mode that prompted the hybrid-admin cleanup.
        if self.role == UserRole.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    def get_full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def has_role(self, role):
        """Check if user has a specific role (multi-role support)."""
        if hasattr(self, '_role_cache'):
            return role in self._role_cache
        # For backward compatibility with single role
        return self.role == role or self.user_roles.filter(role=role, is_active=True).exists()

    def get_available_roles(self):
        """Get all available roles for this user."""
        if hasattr(self, '_role_cache'):
            return self._role_cache
        # Include both legacy single role and new multi-roles
        roles = set()
        if self.role:
            roles.add(self.role)
        roles.update(self.user_roles.filter(is_active=True).values_list('role', flat=True))
        return sorted(list(roles))

    def can_invest(self):
        """Check if user can make investments."""
        return self.has_role(UserRole.INVESTOR) and self.is_verified

    def can_list_properties(self):
        """Check if user can list properties."""
        return self.has_role(UserRole.PROPERTY_OWNER) and self.is_verified

    def is_admin_user(self):
        """Check if user has admin privileges."""
        return self.has_role(UserRole.ADMIN)

    def get_primary_role(self):
        """Get user's primary role."""
        primary_role_assignment = self.user_roles.filter(is_primary=True, is_active=True).first()
        if primary_role_assignment:
            return primary_role_assignment.role
        # Fallback to legacy single role
        return self.role

    @property
    def kyc_status(self):
        """Get user's KYC verification status mapped to frontend requirements."""
        try:
            kyc_profile = self.kyc_profile
            # Map KYC model statuses to frontend expected values
            status_mapping = {
                'pending': 'not_verified',      # Initial state
                'in_review': 'pending_review',  # User submitted documents
                'approved': 'approved',         # Admin approved
                'rejected': 'rejected',         # Admin rejected
                'expired': 'not_verified',      # Expired = needs re-verification
            }
            return status_mapping.get(kyc_profile.status, 'not_verified')
        except:
            # No KYC profile exists yet
            return 'not_verified'

    def is_kyc_verified(self):
        """Check if user is fully KYC verified and can perform financial activities."""
        try:
            kyc_profile = self.kyc_profile
            return kyc_profile.is_verified()
        except:
            return False


class UserRoleAssignment(models.Model):
    """
    Model for managing multiple roles per user.

    Enables users to have multiple roles (e.g., both Investor and Property Owner)
    with the ability to switch between them seamlessly.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_roles',
        help_text="User assigned to this role"
    )

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        help_text="Role assigned to the user"
    )

    is_primary = models.BooleanField(
        default=False,
        help_text="Whether this is the user's primary role"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this role assignment is active"
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this role was assigned"
    )

    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_roles',
        help_text="Admin user who assigned this role"
    )

    class Meta:
        db_table = 'accounts_user_role_assignment'
        unique_together = ('user', 'role')
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['user', 'is_primary']),
        ]
        verbose_name = 'User Role Assignment'
        verbose_name_plural = 'User Role Assignments'

    def __str__(self):
        primary_indicator = " (Primary)" if self.is_primary else ""
        return f"{self.user.get_full_name()} - {self.get_role_display()}{primary_indicator}"

    def save(self, *args, **kwargs):
        """Ensure only one primary role per user."""
        if self.is_primary:
            # Set all other roles for this user to non-primary
            UserRoleAssignment.objects.filter(
                user=self.user,
                is_active=True
            ).exclude(pk=self.pk).update(is_primary=False)

        super().save(*args, **kwargs)


class PasswordResetToken(models.Model):
    """
    Token model for password reset functionality.
    
    Provides secure password reset with expiration and single-use tokens.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text="User requesting password reset"
    )
    
    token = models.UUIDField(
        default=uuid.uuid4,
        help_text="Unique token for password reset"
    )
    
    expires_at = models.DateTimeField(
        help_text="Token expiration timestamp"
    )
    
    used = models.BooleanField(
        default=False,
        help_text="Whether the token has been used"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_password_reset_token'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'

    def __str__(self):
        return f"Password reset token for {self.user.email}"
    
    def is_valid(self):
        """Check if token is still valid."""
        return not self.used and self.expires_at > timezone.now()
    
    def mark_as_used(self):
        """Mark token as used."""
        self.used = True
        self.save(update_fields=['used'])


class EmailVerificationToken(models.Model):
    """
    Token model for email verification functionality.

    Provides secure email verification with expiration and single-use tokens.
    Supports both UUID tokens (legacy) and 6-digit codes.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text="User to verify email for"
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        help_text="Unique token for email verification"
    )

    code = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        help_text="6-digit verification code"
    )

    expires_at = models.DateTimeField(
        help_text="Token expiration timestamp"
    )

    verified = models.BooleanField(
        default=False,
        help_text="Whether email has been verified"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_email_verification_token'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = 'Email Verification Token'
        verbose_name_plural = 'Email Verification Tokens'

    def __str__(self):
        return f"Email verification token for {self.user.email}"

    @staticmethod
    def generate_code():
        """Generate a cryptographically secure 6-digit verification code."""
        return ''.join(secrets.choice(string.digits) for _ in range(6))

    def is_valid(self):
        """Check if token is still valid."""
        return not self.verified and self.expires_at > timezone.now()

    def mark_as_verified(self):
        """Mark token as verified."""
        self.verified = True
        self.save(update_fields=['verified'])


class UserSession(models.Model):
    """
    Model for tracking user sessions and login activity.
    
    Provides session management and security monitoring capabilities.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text="User associated with this session"
    )
    
    session_key = models.CharField(
        max_length=40,
        unique=True,
        help_text="Django session key"
    )
    
    ip_address = models.GenericIPAddressField(
        help_text="IP address of the session"
    )
    
    user_agent = models.TextField(
        help_text="Browser user agent string"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    last_activity = models.DateTimeField(
        auto_now=True,
        help_text="Last activity timestamp"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the session is active"
    )

    class Meta:
        db_table = 'accounts_user_session'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'

    def __str__(self):
        return f"Session for {self.user.email} from {self.ip_address}"
    
    def deactivate(self):
        """Deactivate the session."""
        self.is_active = False
        self.save(update_fields=['is_active'])
