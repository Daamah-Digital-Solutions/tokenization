# Django Backend Specification for Capimax Real Estate Tokenization Platform

## Executive Summary

This document provides comprehensive Django backend specifications derived from analysis of the React frontend application. The platform is a sophisticated real estate tokenization system that enables fractional investment in properties through blockchain tokens, supporting multiple user roles (Investors, Property Owners, Brokers, Admins) with advanced payment processing, KYC verification, and portfolio management capabilities.

**Key Platform Features:**
- Multi-role user management with granular permissions
- Real estate property tokenization and fractional investment
- Comprehensive payment system (Credit Card, Bank Transfer, Cryptocurrency, PayPal)
- Advanced KYC/compliance verification workflows
- Real-time dashboards and analytics
- WebSocket integration for live updates
- Admin panel for platform management
- Construction milestone tracking for development properties
- Installment investment options
- Broker commission system

## Project Structure

The Django backend should be organized into the following apps, each representing distinct business domains:

```
capimax_backend/
├── capimax/                    # Main project settings
├── accounts/                   # User management and authentication
├── properties/                 # Property listing and management
├── investments/               # Investment processing and management
├── payments/                  # Payment processing and wallet management
├── kyc/                       # KYC verification and compliance
├── notifications/             # Notification system
├── dashboard/                 # Dashboard data aggregation
├── construction/              # Construction milestone tracking
├── broker/                    # Broker management and commissions
├── admin_panel/               # Admin-specific functionality
├── websockets/                # Real-time communication
├── analytics/                 # Data analytics and reporting
├── blockchain/                # Blockchain integration utilities
└── core/                      # Shared utilities and mixins
```

## Detailed Module Breakdown

### 1. Accounts App (`accounts/`)

**Purpose:** Handle user authentication, authorization, and profile management.

**Models:**

```python
# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class UserRole(models.TextChoices):
    INVESTOR = 'investor', 'Investor'
    PROPERTY_OWNER = 'property_owner', 'Property Owner'
    BROKER = 'broker', 'Broker'
    ADMIN = 'admin', 'Admin'

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.INVESTOR)
    phone = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100)
    date_of_birth = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    wallet_address = models.CharField(max_length=255, blank=True, null=True)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True, null=True)
    backup_codes = models.JSONField(default=list, blank=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    login_attempts = models.PositiveIntegerField(default=0)
    is_suspended = models.BooleanField(default=False)
    suspension_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'country']

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4)
    expires_at = models.DateTimeField()
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
```

**Views/Serializers:**

```python
# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'confirm_password', 'first_name', 
                 'last_name', 'role', 'phone', 'country')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    two_factor_code = serializers.CharField(required=False)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials.')
            if not user.is_active:
                raise serializers.ValidationError('Account disabled.')
            
            attrs['user'] = user
        return attrs

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'phone',
                 'country', 'date_of_birth', 'address', 'city', 'state',
                 'postal_code', 'is_verified', 'wallet_address', 'created_at')
        read_only_fields = ('id', 'email', 'role', 'is_verified', 'created_at')
```

**API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/password/reset-request` - Password reset request
- `POST /api/auth/password/reset` - Password reset with token
- `POST /api/auth/password/change` - Change password for authenticated user
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/auth/2fa/setup` - Setup two-factor authentication
- `POST /api/auth/2fa/verify` - Verify and enable 2FA
- `POST /api/auth/2fa/disable` - Disable 2FA
- `POST /api/auth/email/verify` - Verify email address
- `POST /api/auth/email/resend-verification` - Resend email verification

### 2. Properties App (`properties/`)

**Purpose:** Manage property listings, tokenization, and property-related operations.

**Models:**

```python
# properties/models.py
from django.db import models
import uuid

class PropertyType(models.TextChoices):
    RESIDENTIAL = 'residential', 'Residential'
    COMMERCIAL = 'commercial', 'Commercial'
    INDUSTRIAL = 'industrial', 'Industrial'
    MIXED_USE = 'mixed_use', 'Mixed Use'
    LAND = 'land', 'Land'

class PropertyStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PENDING_APPROVAL = 'pending_approval', 'Pending Approval'
    APPROVED = 'approved', 'Approved'
    ACTIVE = 'active', 'Active'
    TOKENIZED = 'tokenized', 'Tokenized'
    UNDER_CONSTRUCTION = 'under_construction', 'Under Construction'
    SOLD_OUT = 'sold_out', 'Sold Out'
    CLOSED = 'closed', 'Closed'
    DELISTED = 'delisted', 'Delisted'

class Property(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    property_type = models.CharField(max_length=20, choices=PropertyType.choices)
    status = models.CharField(max_length=20, choices=PropertyStatus.choices, default=PropertyStatus.DRAFT)
    total_value = models.DecimalField(max_digits=15, decimal_places=2)
    token_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_tokens = models.PositiveIntegerField()
    tokens_sold = models.PositiveIntegerField(default=0)
    expected_return = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rental_yield = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    property_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    year_built = models.PositiveIntegerField(null=True, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    smart_contract_address = models.CharField(max_length=255, blank=True, null=True)
    owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='owned_properties')
    featured = models.BooleanField(default=False)
    minimum_investment = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'property_type']),
            models.Index(fields=['city', 'country']),
            models.Index(fields=['created_at']),
        ]

class PropertyImage(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='property_images/')
    caption = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class PropertyDocument(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    document = models.FileField(upload_to='property_documents/')
    document_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    size = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

class PropertyUpdate(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='updates')
    title = models.CharField(max_length=255)
    content = models.TextField()
    update_type = models.CharField(max_length=20, choices=[
        ('general', 'General'),
        ('financial', 'Financial'),
        ('construction', 'Construction'),
        ('legal', 'Legal'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

class PropertySubscription(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    property = models.ForeignKey(Property, on_delete=models.CASCADE)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'property')

class PropertyReview(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(choices=[(i, i) for i in range(1, 6)])
    review = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('property', 'user')

class PropertyValuation(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='valuations')
    current_value = models.DecimalField(max_digits=15, decimal_places=2)
    valuation_date = models.DateTimeField()
    valuation_method = models.CharField(max_length=100)
    appraiser = models.CharField(max_length=255)
    report = models.FileField(upload_to='valuation_reports/', null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**API Endpoints:**
- `GET /api/properties/` - List properties with filtering and pagination
- `POST /api/properties/` - Create new property (property owners only)
- `GET /api/properties/{id}/` - Get property details
- `PUT /api/properties/{id}/` - Update property
- `DELETE /api/properties/{id}/` - Delete property
- `POST /api/properties/{id}/images/` - Upload property images
- `POST /api/properties/{id}/documents/` - Upload property documents
- `GET /api/properties/{id}/analytics/` - Get property analytics
- `GET /api/properties/{id}/investors/` - Get property investors
- `GET /api/properties/{id}/investments/` - Get investment history
- `POST /api/properties/{id}/subscribe/` - Subscribe to property updates
- `GET /api/properties/featured/` - Get featured properties
- `GET /api/properties/trending/` - Get trending properties
- `POST /api/properties/{id}/submit/` - Submit property for approval

### 3. Investments App (`investments/`)

**Purpose:** Handle investment transactions, portfolio management, and token ownership tracking.

**Models:**

```python
# investments/models.py
from django.db import models
import uuid

class InvestmentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'

class Investment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='investments')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='investments')
    token_amount = models.PositiveIntegerField()
    investment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=InvestmentStatus.choices, default=InvestmentStatus.PENDING)
    payment_method = models.JSONField(default=dict)
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    blockchain_confirmed = models.BooleanField(default=False)
    confirmation_blocks = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['property', 'status']),
            models.Index(fields=['created_at']),
        ]

class InstallmentPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE)
    installment_number = models.PositiveIntegerField()
    due_date = models.DateTimeField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class TokenReservation(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE)
    token_amount = models.PositiveIntegerField()
    reserved_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    released = models.BooleanField(default=False)

class InvestmentWithdrawal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    investment = models.ForeignKey(Investment, on_delete=models.CASCADE)
    token_amount = models.PositiveIntegerField()
    estimated_amount = models.DecimalField(max_digits=12, decimal_places=2)
    processing_fee = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    estimated_completion = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)

class AutoInvestment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=[
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ])
    payment_method = models.JSONField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    max_total_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    next_execution = models.DateTimeField()
    total_invested = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ], default='active')
    created_at = models.DateTimeField(auto_now_add=True)

class DividendPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    investment = models.ForeignKey(Investment, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    payment_date = models.DateTimeField()
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
```

**API Endpoints:**
- `POST /api/investments/calculate/` - Calculate investment details
- `POST /api/investments/` - Create new investment
- `GET /api/investments/` - Get user's investments
- `GET /api/investments/{id}/` - Get specific investment
- `POST /api/investments/{id}/cancel/` - Cancel pending investment
- `GET /api/investments/portfolio/summary/` - Get portfolio summary
- `GET /api/investments/portfolio/performance/` - Get portfolio performance
- `GET /api/investments/transactions/` - Get investment transactions
- `POST /api/investments/simulate/` - Simulate investment returns
- `GET /api/investments/dividends/` - Get dividend history
- `GET /api/investments/recommendations/` - Get investment recommendations
- `GET /api/investments/limits/` - Get investment limits for user
- `POST /api/investments/{id}/withdraw/` - Request investment withdrawal
- `GET /api/investments/withdrawals/` - Get withdrawal requests
- `POST /api/investments/auto-invest/` - Setup automatic investment
- `GET /api/investments/auto-invest/` - Get automatic investment plans

### 4. Payments App (`payments/`)

**Purpose:** Handle payment processing, wallet management, and financial transactions.

**Models:**

```python
# payments/models.py
from django.db import models
import uuid

class PaymentMethod(models.TextChoices):
    CRYPTOCURRENCY = 'cryptocurrency', 'Cryptocurrency'
    CREDIT_CARD = 'credit_card', 'Credit Card'
    BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
    PAYPAL = 'paypal', 'PayPal'

class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'
    REFUNDED = 'refunded', 'Refunded'

class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='payments')
    investment = models.ForeignKey('investments.Investment', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    external_transaction_id = models.CharField(max_length=255, blank=True, null=True)
    processing_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

class UserPaymentMethod(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='payment_methods')
    method_type = models.CharField(max_length=20, choices=PaymentMethod.choices)
    display_name = models.CharField(max_length=255)
    last_four = models.CharField(max_length=4, blank=True)
    expiry_date = models.CharField(max_length=7, blank=True)  # MM/YYYY
    brand = models.CharField(max_length=50, blank=True)
    wallet_address = models.CharField(max_length=255, blank=True)
    network = models.CharField(max_length=50, blank=True)
    is_default = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    external_id = models.CharField(max_length=255, blank=True)  # Stripe customer ID, etc.
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

class WalletBalance(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='wallet_balances')
    currency = models.CharField(max_length=10)
    available_balance = models.DecimalField(max_digits=15, decimal_places=8, default=0)
    pending_balance = models.DecimalField(max_digits=15, decimal_places=8, default=0)
    locked_balance = models.DecimalField(max_digits=15, decimal_places=8, default=0)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'currency')

class WalletTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=20, choices=[
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('investment', 'Investment'),
        ('dividend', 'Dividend'),
        ('fee', 'Fee'),
        ('refund', 'Refund'),
    ])
    amount = models.DecimalField(max_digits=15, decimal_places=8)
    currency = models.CharField(max_length=10)
    balance_before = models.DecimalField(max_digits=15, decimal_places=8)
    balance_after = models.DecimalField(max_digits=15, decimal_places=8)
    reference_id = models.UUIDField(null=True, blank=True)  # Reference to payment, investment, etc.
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class CryptoPayment(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='crypto_details')
    wallet_address = models.CharField(max_length=255)
    network = models.CharField(max_length=50)
    gas_limit = models.PositiveIntegerField(null=True, blank=True)
    gas_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    confirmation_blocks_required = models.PositiveIntegerField(default=12)
    confirmations = models.PositiveIntegerField(default=0)
    block_height = models.PositiveIntegerField(null=True, blank=True)

class Refund(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='pending')
    external_refund_id = models.CharField(max_length=255, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class RecurringPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    frequency = models.CharField(max_length=20, choices=[
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ])
    payment_method = models.ForeignKey(UserPaymentMethod, on_delete=models.CASCADE)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    next_payment = models.DateTimeField()
    purpose = models.CharField(max_length=20, choices=[
        ('investment', 'Investment'),
        ('wallet_topup', 'Wallet Top-up'),
    ])
    investment = models.ForeignKey('investments.Investment', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ], default='active')
    total_payments = models.PositiveIntegerField(default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

**API Endpoints:**
- `GET /api/payments/methods/` - Get user's payment methods
- `POST /api/payments/methods/` - Add new payment method
- `DELETE /api/payments/methods/{id}/` - Remove payment method
- `PUT /api/payments/methods/{id}/default/` - Set default payment method
- `POST /api/payments/stripe/payment-intent/` - Create Stripe payment intent
- `POST /api/payments/stripe/confirm/` - Confirm Stripe payment
- `POST /api/payments/crypto/` - Process crypto payment
- `GET /api/payments/crypto/quote/` - Get crypto payment quote
- `POST /api/payments/paypal/` - Process PayPal payment
- `POST /api/payments/paypal/confirm/` - Confirm PayPal payment
- `GET /api/payments/` - Get payment history
- `GET /api/payments/{id}/` - Get specific payment
- `POST /api/payments/{id}/cancel/` - Cancel payment
- `POST /api/payments/{id}/refund/` - Request refund
- `GET /api/payments/estimate/` - Get payment estimate
- `GET /api/payments/wallet/balance/` - Get wallet balance
- `POST /api/payments/wallet/deposit/` - Add funds to wallet
- `POST /api/payments/wallet/withdraw/` - Withdraw funds from wallet
- `POST /api/payments/recurring/` - Setup recurring payment

### 5. KYC App (`kyc/`)

**Purpose:** Handle KYC verification, document uploads, and compliance management.

**Models:**

```python
# kyc/models.py
from django.db import models
import uuid

class KYCStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    IN_REVIEW = 'in_review', 'In Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'

class DocumentType(models.TextChoices):
    PASSPORT = 'passport', 'Passport'
    NATIONAL_ID = 'national_id', 'National ID'
    DRIVING_LICENSE = 'driving_license', 'Driving License'
    UTILITY_BILL = 'utility_bill', 'Utility Bill'
    BANK_STATEMENT = 'bank_statement', 'Bank Statement'

class DocumentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    IN_REVIEW = 'in_review', 'In Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'

class KYCProfile(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='kyc_profile')
    status = models.CharField(max_length=20, choices=KYCStatus.choices, default=KYCStatus.PENDING)
    verification_level = models.CharField(max_length=20, choices=[
        ('basic', 'Basic'),
        ('enhanced', 'Enhanced'),
        ('premium', 'Premium'),
    ], default='basic')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='kyc_reviews')
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    risk_score = models.PositiveIntegerField(default=0)
    investment_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class KYCDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kyc_profile = models.ForeignKey(KYCProfile, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.PENDING)
    file_path = models.FileField(upload_to='kyc_documents/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    expiry_date = models.DateField(null=True, blank=True)
    document_number = models.CharField(max_length=100, blank=True)
    reviewed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_documents')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    ocr_data = models.JSONField(default=dict, blank=True)  # OCR extracted data
    verification_checks = models.JSONField(default=dict, blank=True)  # Third-party verification results
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class BiometricVerification(models.Model):
    kyc_profile = models.OneToOneField(KYCProfile, on_delete=models.CASCADE, related_name='biometric')
    liveness_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    face_match_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    verification_session_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='pending')
    attempts = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ComplianceCheck(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='compliance_checks')
    check_type = models.CharField(max_length=50, choices=[
        ('aml', 'AML Screening'),
        ('sanctions', 'Sanctions Check'),
        ('pep', 'PEP Screening'),
        ('adverse_media', 'Adverse Media'),
    ])
    result = models.CharField(max_length=20, choices=[
        ('clear', 'Clear'),
        ('hit', 'Hit'),
        ('inconclusive', 'Inconclusive'),
    ])
    provider = models.CharField(max_length=100)
    reference_id = models.CharField(max_length=255, blank=True)
    raw_response = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

class KYCNote(models.Model):
    kyc_profile = models.ForeignKey(KYCProfile, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    note = models.TextField()
    is_internal = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**API Endpoints:**
- `GET /api/kyc/status/` - Get KYC status
- `POST /api/kyc/documents/upload/` - Upload KYC documents
- `GET /api/kyc/documents/` - Get uploaded documents
- `DELETE /api/kyc/documents/{id}/` - Delete document
- `POST /api/kyc/submit/` - Submit KYC for review
- `POST /api/kyc/biometric/start/` - Start biometric verification
- `POST /api/kyc/biometric/complete/` - Complete biometric verification
- `GET /api/kyc/requirements/` - Get KYC requirements by verification level
- `POST /api/kyc/admin/approve/` - Approve KYC (admin only)
- `POST /api/kyc/admin/reject/` - Reject KYC (admin only)
- `GET /api/kyc/admin/pending/` - Get pending KYC reviews (admin only)

### 6. Construction App (`construction/`)

**Purpose:** Track construction milestones for development properties.

**Models:**

```python
# construction/models.py
from django.db import models
import uuid

class MilestoneStatus(models.TextChoices):
    NOT_STARTED = 'not_started', 'Not Started'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    VERIFIED = 'verified', 'Verified'
    DELAYED = 'delayed', 'Delayed'

class ConstructionMilestone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='construction_milestones')
    title = models.CharField(max_length=255)
    description = models.TextField()
    target_date = models.DateTimeField()
    completion_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=MilestoneStatus.choices, default=MilestoneStatus.NOT_STARTED)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    verification_required = models.BooleanField(default=False)
    verified_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class MilestoneUpdate(models.Model):
    milestone = models.ForeignKey(ConstructionMilestone, on_delete=models.CASCADE, related_name='updates')
    title = models.CharField(max_length=255)
    content = models.TextField()
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    author = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class MilestoneDocument(models.Model):
    milestone = models.ForeignKey(ConstructionMilestone, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    document = models.FileField(upload_to='construction_documents/')
    document_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class MilestoneImage(models.Model):
    milestone = models.ForeignKey(ConstructionMilestone, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='construction_images/')
    caption = models.CharField(max_length=255, blank=True)
    taken_at = models.DateTimeField()
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
```

**API Endpoints:**
- `GET /api/construction/{property_id}/milestones/` - Get property construction milestones
- `POST /api/construction/{property_id}/milestones/` - Create milestone (property owner/admin)
- `PUT /api/construction/milestones/{id}/` - Update milestone
- `POST /api/construction/milestones/{id}/verify/` - Verify milestone completion
- `POST /api/construction/milestones/{id}/updates/` - Add milestone update
- `POST /api/construction/milestones/{id}/images/` - Upload milestone images
- `POST /api/construction/milestones/{id}/documents/` - Upload milestone documents

### 7. Broker App (`broker/`)

**Purpose:** Manage broker referrals, commissions, and broker-specific functionality.

**Models:**

```python
# broker/models.py
from django.db import models
import uuid

class CommissionStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    EARNED = 'earned', 'Earned'
    PAID = 'paid', 'Paid'
    CANCELLED = 'cancelled', 'Cancelled'

class BrokerCommission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    broker = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='broker_commissions')
    investment = models.ForeignKey('investments.Investment', on_delete=models.CASCADE)
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=4)  # e.g., 0.0250 for 2.5%
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=CommissionStatus.choices, default=CommissionStatus.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class BrokerReferral(models.Model):
    broker = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='referrals')
    referred_user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='referred_by')
    referral_code = models.CharField(max_length=50, unique=True)
    investment_made = models.BooleanField(default=False)
    first_investment = models.ForeignKey('investments.Investment', on_delete=models.SET_NULL, null=True, blank=True)
    total_commission_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class BrokerProfile(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='broker_profile')
    license_number = models.CharField(max_length=100, blank=True)
    agency_name = models.CharField(max_length=255, blank=True)
    experience_years = models.PositiveIntegerField(null=True, blank=True)
    specializations = models.JSONField(default=list)  # Array of property types
    commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0250)  # Default 2.5%
    is_verified = models.BooleanField(default=False)
    verification_documents = models.JSONField(default=list)
    bio = models.TextField(blank=True)
    website = models.URLField(blank=True)
    linkedin_profile = models.URLField(blank=True)
    marketing_materials = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class MarketingMaterial(models.Model):
    broker = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='marketing_materials')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='broker_materials/')
    file_type = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class BrokerPerformanceMetrics(models.Model):
    broker = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='performance_metrics')
    total_referrals = models.PositiveIntegerField(default=0)
    successful_referrals = models.PositiveIntegerField(default=0)
    total_commission_earned = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_commission_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    average_investment_size = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0)  # percentage
    last_calculated = models.DateTimeField(auto_now=True)
```

**API Endpoints:**
- `GET /api/broker/profile/` - Get broker profile
- `PUT /api/broker/profile/` - Update broker profile
- `GET /api/broker/commissions/` - Get broker commissions
- `GET /api/broker/referrals/` - Get broker referrals
- `POST /api/broker/referrals/` - Create referral link
- `GET /api/broker/performance/` - Get performance metrics
- `POST /api/broker/materials/` - Upload marketing materials
- `GET /api/broker/materials/` - Get marketing materials
- `POST /api/broker/verification/submit/` - Submit verification documents

### 8. Notifications App (`notifications/`)

**Purpose:** Handle all notifications, alerts, and communication.

**Models:**

```python
# notifications/models.py
from django.db import models
import uuid

class NotificationType(models.TextChoices):
    INVESTMENT_CONFIRMED = 'investment_confirmed', 'Investment Confirmed'
    KYC_APPROVED = 'kyc_approved', 'KYC Approved'
    KYC_REJECTED = 'kyc_rejected', 'KYC Rejected'
    NEW_PROPERTY = 'new_property_available', 'New Property Available'
    DIVIDEND_RECEIVED = 'dividend_received', 'Dividend Received'
    PAYMENT_CONFIRMED = 'payment_confirmed', 'Payment Confirmed'
    PAYMENT_FAILED = 'payment_failed', 'Payment Failed'
    PROPERTY_SOLD_OUT = 'property_sold_out', 'Property Sold Out'
    PROPERTY_APPROVED = 'property_approved', 'Property Approved'
    PROPERTY_TOKENIZED = 'property_tokenized', 'Property Tokenized'
    CONSTRUCTION_MILESTONE = 'construction_milestone', 'Construction Milestone'
    BROKER_COMMISSION = 'broker_commission', 'Broker Commission'

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Additional data for the notification
    read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.URLField(blank=True)
    priority = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], default='normal')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'read', 'created_at']),
            models.Index(fields=['type', 'created_at']),
        ]

class NotificationPreference(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='notification_preferences')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    investment_updates = models.BooleanField(default=True)
    property_updates = models.BooleanField(default=True)
    payment_notifications = models.BooleanField(default=True)
    kyc_updates = models.BooleanField(default=True)
    marketing_communications = models.BooleanField(default=False)
    construction_updates = models.BooleanField(default=True)
    commission_notifications = models.BooleanField(default=True)
    weekly_summary = models.BooleanField(default=True)
    monthly_report = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class EmailTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True)
    subject = models.CharField(max_length=255)
    html_content = models.TextField()
    text_content = models.TextField(blank=True)
    variables = models.JSONField(default=dict)  # Available template variables
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class EmailLog(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, null=True, blank=True)
    to_email = models.EmailField()
    subject = models.CharField(max_length=255)
    template = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
    ], default='pending')
    external_id = models.CharField(max_length=255, blank=True)  # Provider message ID
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class SystemAlert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ])
    source = models.CharField(max_length=100)  # System component that generated the alert
    status = models.CharField(max_length=20, choices=[
        ('ACTIVE', 'Active'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESOLVED', 'Resolved'),
    ], default='ACTIVE')
    acknowledged_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**API Endpoints:**
- `GET /api/notifications/` - Get user notifications
- `PUT /api/notifications/{id}/read/` - Mark notification as read
- `PUT /api/notifications/mark-all-read/` - Mark all notifications as read
- `DELETE /api/notifications/{id}/` - Delete notification
- `GET /api/notifications/preferences/` - Get notification preferences
- `PUT /api/notifications/preferences/` - Update notification preferences
- `GET /api/notifications/unread-count/` - Get unread notification count
- `POST /api/admin/notifications/system-alert/` - Create system alert (admin only)
- `GET /api/admin/notifications/system-alerts/` - Get system alerts (admin only)
- `PUT /api/admin/notifications/system-alerts/{id}/acknowledge/` - Acknowledge alert

### 9. Analytics App (`analytics/`)

**Purpose:** Generate analytics, reports, and business intelligence.

**Models:**

```python
# analytics/models.py
from django.db import models
import uuid

class AnalyticsEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=100, blank=True)
    event_type = models.CharField(max_length=100)
    event_category = models.CharField(max_length=100)
    event_action = models.CharField(max_length=100)
    event_label = models.CharField(max_length=255, blank=True)
    value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    properties = models.JSONField(default=dict)
    page_url = models.URLField(blank=True)
    referrer = models.URLField(blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class DashboardMetrics(models.Model):
    date = models.DateField(unique=True)
    total_users = models.PositiveIntegerField(default=0)
    new_users = models.PositiveIntegerField(default=0)
    active_users = models.PositiveIntegerField(default=0)
    verified_users = models.PositiveIntegerField(default=0)
    total_properties = models.PositiveIntegerField(default=0)
    active_properties = models.PositiveIntegerField(default=0)
    completed_properties = models.PositiveIntegerField(default=0)
    total_investments = models.PositiveIntegerField(default=0)
    total_investment_volume = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_payments = models.PositiveIntegerField(default=0)
    total_payment_volume = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    platform_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    broker_commissions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_investment_size = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class PropertyAnalytics(models.Model):
    property = models.OneToOneField('properties.Property', on_delete=models.CASCADE, related_name='analytics')
    total_views = models.PositiveIntegerField(default=0)
    unique_views = models.PositiveIntegerField(default=0)
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    average_investment = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    investor_count = models.PositiveIntegerField(default=0)
    funding_velocity = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # tokens per day
    last_calculated = models.DateTimeField(auto_now=True)

class UserAnalytics(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='analytics')
    total_sessions = models.PositiveIntegerField(default=0)
    total_page_views = models.PositiveIntegerField(default=0)
    last_active = models.DateTimeField(null=True, blank=True)
    registration_source = models.CharField(max_length=100, blank=True)
    first_investment_days = models.PositiveIntegerField(null=True, blank=True)  # Days from registration to first investment
    lifetime_investment_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    property_views = models.PositiveIntegerField(default=0)
    last_calculated = models.DateTimeField(auto_now=True)

class PerformanceReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=50, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
    ])
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    data = models.JSONField(default=dict)
    generated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    file_path = models.FileField(upload_to='reports/', null=True, blank=True)
```

**API Endpoints:**
- `GET /api/analytics/dashboard/` - Get dashboard analytics
- `GET /api/analytics/properties/{id}/` - Get property analytics
- `GET /api/analytics/users/{id}/` - Get user analytics (admin only)
- `GET /api/analytics/investments/` - Get investment analytics
- `GET /api/analytics/payments/` - Get payment analytics
- `POST /api/analytics/events/` - Track analytics event
- `GET /api/analytics/reports/` - Get available reports
- `POST /api/analytics/reports/generate/` - Generate custom report
- `GET /api/analytics/market-trends/` - Get market trend data

### 10. WebSockets App (`websockets/`)

**Purpose:** Handle real-time communication and live updates.

**Consumer Classes:**

```python
# websockets/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
            return
            
        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

class AdminConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous or self.user.role != 'admin':
            await self.close()
            return
            
        self.group_name = "admin_updates"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def system_alert(self, event):
        await self.send(text_data=json.dumps(event))
        
    async def user_update(self, event):
        await self.send(text_data=json.dumps(event))
        
    async def property_update(self, event):
        await self.send(text_data=json.dumps(event))
        
    async def financial_update(self, event):
        await self.send(text_data=json.dumps(event))

class PropertyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.property_id = self.scope['url_route']['kwargs']['property_id']
        self.group_name = f"property_{self.property_id}"
        
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def property_update(self, event):
        await self.send(text_data=json.dumps(event))
        
    async def investment_update(self, event):
        await self.send(text_data=json.dumps(event))
```

**Routing Configuration:**

```python
# websockets/routing.py
from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/notifications/', consumers.NotificationConsumer.as_asgi()),
    path('ws/admin/', consumers.AdminConsumer.as_asgi()),
    path('ws/property/<uuid:property_id>/', consumers.PropertyConsumer.as_asgi()),
]
```

## Database Schema

### Key Relationships and Constraints

```sql
-- Primary user table with role-based access
CREATE INDEX idx_users_role ON accounts_user(role);
CREATE INDEX idx_users_email ON accounts_user(email);
CREATE INDEX idx_users_verified ON accounts_user(is_verified);

-- Property indexing for efficient searching
CREATE INDEX idx_properties_status_type ON properties_property(status, property_type);
CREATE INDEX idx_properties_location ON properties_property(city, country);
CREATE INDEX idx_properties_featured ON properties_property(featured, status);
CREATE INDEX idx_properties_owner ON properties_property(owner_id);

-- Investment tracking and portfolio queries
CREATE INDEX idx_investments_user_status ON investments_investment(user_id, status);
CREATE INDEX idx_investments_property ON investments_investment(property_id);
CREATE INDEX idx_investments_date ON investments_investment(created_at);

-- Payment processing and financial tracking
CREATE INDEX idx_payments_user_status ON payments_payment(user_id, status);
CREATE INDEX idx_payments_date ON payments_payment(created_at);
CREATE INDEX idx_wallet_balances_user ON payments_walletbalance(user_id, currency);

-- KYC and compliance
CREATE INDEX idx_kyc_status ON kyc_kycprofile(status);
CREATE INDEX idx_kyc_documents_status ON kyc_kycdocument(status);

-- Notification system
CREATE INDEX idx_notifications_user_read ON notifications_notification(user_id, read, created_at);
CREATE INDEX idx_notifications_type ON notifications_notification(type);

-- Analytics and reporting
CREATE INDEX idx_analytics_events_user ON analytics_analyticsevent(user_id, timestamp);
CREATE INDEX idx_analytics_events_type ON analytics_analyticsevent(event_type, timestamp);
```

### Data Integrity Constraints

```sql
-- Ensure token conservation
ALTER TABLE properties_property ADD CONSTRAINT chk_tokens_sold 
CHECK (tokens_sold <= total_tokens);

-- Ensure positive financial values
ALTER TABLE investments_investment ADD CONSTRAINT chk_positive_amount 
CHECK (investment_amount > 0 AND token_amount > 0);

ALTER TABLE payments_payment ADD CONSTRAINT chk_positive_payment 
CHECK (amount > 0);

-- Ensure valid percentage values
ALTER TABLE broker_brokercommission ADD CONSTRAINT chk_commission_rate 
CHECK (commission_rate >= 0 AND commission_rate <= 1);

-- Ensure construction progress is valid
ALTER TABLE construction_constructionmilestone ADD CONSTRAINT chk_progress_percentage 
CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Ensure proper user roles
ALTER TABLE accounts_user ADD CONSTRAINT chk_valid_role 
CHECK (role IN ('investor', 'property_owner', 'broker', 'admin'));
```

## API Contracts

### Authentication Endpoints

```python
# POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword123",
  "confirm_password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "investor",
  "phone": "+1234567890",
  "country": "United States"
}

# Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "investor",
      "is_verified": false,
      "created_at": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token"
    }
  }
}
```

### Property Endpoints

```python
# GET /api/properties/
# Query Parameters: ?type=residential&status=active&page=1&limit=20&sort=created_at&order=desc

# Response
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "property_uuid",
        "title": "Luxury Downtown Condo",
        "description": "Beautiful property description...",
        "property_type": "residential",
        "status": "active",
        "total_value": "500000.00",
        "token_price": "100.00",
        "total_tokens": 5000,
        "tokens_sold": 1500,
        "expected_return": "8.50",
        "rental_yield": "6.20",
        "address": "123 Main St, Downtown",
        "city": "New York",
        "country": "United States",
        "images": ["image1.jpg", "image2.jpg"],
        "funding_percentage": 30.0,
        "investor_count": 15,
        "owner": {
          "id": "owner_uuid",
          "name": "Property Developer Inc."
        },
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Investment Endpoints

```python
# POST /api/investments/
{
  "property_id": "property_uuid",
  "token_amount": 50,
  "investment_amount": "5000.00",
  "payment_method": {
    "type": "credit_card",
    "currency": "USD",
    "payment_method_id": "pm_stripe_id"
  }
}

# Response
{
  "success": true,
  "data": {
    "investment": {
      "id": "investment_uuid",
      "property_id": "property_uuid",
      "token_amount": 50,
      "investment_amount": "5000.00",
      "status": "pending",
      "payment_method": {
        "type": "credit_card",
        "currency": "USD"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Payment Endpoints

```python
# POST /api/payments/stripe/payment-intent
{
  "amount": "5000.00",
  "currency": "USD",
  "investment_id": "investment_uuid",
  "payment_method_id": "pm_stripe_id"
}

# Response
{
  "success": true,
  "data": {
    "client_secret": "pi_stripe_secret",
    "payment_intent_id": "pi_stripe_id"
  }
}
```

## Security Model

### User Roles and Permissions

```python
# Role-based permissions matrix
ROLE_PERMISSIONS = {
    'investor': [
        'view_properties',
        'create_investment',
        'view_own_investments',
        'view_own_portfolio',
        'upload_kyc_documents',
        'manage_payment_methods',
        'view_own_notifications',
    ],
    'property_owner': [
        'view_properties',
        'create_property',
        'manage_own_properties',
        'view_property_analytics',
        'manage_construction_milestones',
        'view_property_investors',
        'upload_kyc_documents',
    ],
    'broker': [
        'view_properties',
        'view_referrals',
        'view_commissions',
        'manage_marketing_materials',
        'upload_kyc_documents',
        'view_broker_analytics',
    ],
    'admin': [
        'view_all_users',
        'manage_users',
        'approve_kyc',
        'approve_properties',
        'view_all_investments',
        'view_all_payments',
        'manage_system_alerts',
        'view_platform_analytics',
        'manage_content',
    ]
}
```

### Authentication Flow

```python
# JWT token structure
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "investor",
  "is_verified": true,
  "kyc_status": "approved",
  "exp": 1640995200,
  "iat": 1640908800
}

# Two-factor authentication flow
# 1. User enables 2FA
POST /api/auth/2fa/setup/
# Returns QR code and backup codes

# 2. User verifies 2FA setup
POST /api/auth/2fa/verify/
{
  "code": "123456"
}

# 3. Subsequent logins require 2FA
POST /api/auth/login/
{
  "email": "user@example.com",
  "password": "password",
  "two_factor_code": "123456"
}
```

### Data Protection

```python
# Sensitive data encryption
SENSITIVE_FIELDS = [
    'accounts.User.phone',
    'accounts.User.date_of_birth',
    'accounts.User.address',
    'kyc.KYCDocument.file_path',
    'payments.UserPaymentMethod.external_id',
]

# PII data retention policies
PII_RETENTION_POLICIES = {
    'kyc_documents': '7_years',
    'payment_data': '7_years',
    'user_profiles': 'account_lifetime',
    'analytics_events': '2_years',
}
```

## Integration Notes

### Blockchain Integration

```python
# Blockchain service integration
class BlockchainService:
    @staticmethod
    def deploy_property_contract(property_data):
        """Deploy smart contract for property tokenization"""
        pass
    
    @staticmethod
    def mint_tokens(contract_address, amount, recipient):
        """Mint tokens for investment"""
        pass
    
    @staticmethod
    def verify_transaction(tx_hash):
        """Verify blockchain transaction"""
        pass
    
    @staticmethod
    def get_token_balance(contract_address, wallet_address):
        """Get user's token balance"""
        pass
```

### Payment Provider Integration

```python
# Multiple payment provider support
PAYMENT_PROVIDERS = {
    'stripe': {
        'handler': 'payments.providers.StripeHandler',
        'supports': ['credit_card', 'bank_transfer'],
    },
    'coinbase': {
        'handler': 'payments.providers.CoinbaseHandler',
        'supports': ['cryptocurrency'],
    },
    'paypal': {
        'handler': 'payments.providers.PayPalHandler',
        'supports': ['paypal'],
    },
}
```

### External Service Integration

```python
# KYC verification providers
KYC_PROVIDERS = {
    'jumio': {
        'handler': 'kyc.providers.JumioHandler',
        'document_types': ['passport', 'national_id', 'driving_license'],
    },
    'onfido': {
        'handler': 'kyc.providers.OnfidoHandler',
        'biometric_verification': True,
    },
}

# Email service providers
EMAIL_PROVIDERS = {
    'sendgrid': {
        'handler': 'notifications.providers.SendGridHandler',
    },
    'ses': {
        'handler': 'notifications.providers.SESHandler',
    },
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Weeks 1-4)
**Priority: Critical**
- Set up Django project structure with all apps
- Implement user authentication and authorization system
- Create basic models for User, Property, Investment, Payment
- Set up database schema with proper indexing
- Implement API client integration patterns
- Set up JWT authentication with refresh tokens
- Basic error handling and logging

**Dependencies:** None
**Deliverables:**
- Functional user registration, login, logout
- Basic property CRUD operations
- Database migrations
- API documentation

### Phase 2: Payment Processing (Weeks 5-8)
**Priority: Critical**
- Implement Stripe integration for credit card payments
- Set up crypto payment processing with blockchain integration
- Create wallet management system
- Implement payment validation and fraud detection
- Set up payment method management
- Create payment analytics tracking

**Dependencies:** Phase 1 completion
**Deliverables:**
- Functional payment processing for all supported methods
- Wallet balance management
- Payment history and reporting
- Automated payment reconciliation

### Phase 3: Investment Management (Weeks 9-12)
**Priority: High**
- Implement investment creation and processing
- Create portfolio management functionality
- Set up token reservation and release system
- Implement dividend calculation and distribution
- Create investment analytics and reporting
- Set up automatic investment (DCA) functionality

**Dependencies:** Phases 1-2 completion
**Deliverables:**
- Complete investment workflow
- Portfolio analytics dashboard
- Automated dividend distribution
- Investment recommendation engine

### Phase 4: KYC and Compliance (Weeks 13-16)
**Priority: High**
- Implement document upload and verification
- Create admin KYC review workflow
- Set up biometric verification
- Implement compliance checking (AML, sanctions)
- Create audit trail for compliance
- Set up automated risk scoring

**Dependencies:** Phase 1 completion
**Deliverables:**
- Complete KYC verification system
- Admin approval workflows
- Compliance reporting
- Automated risk assessment

### Phase 5: Property Management (Weeks 17-20)
**Priority: High**
- Implement property creation and management
- Create property approval workflow
- Set up construction milestone tracking
- Implement property analytics and valuation
- Create property subscription system
- Set up property search and filtering

**Dependencies:** Phases 1, 4 completion
**Deliverables:**
- Complete property management system
- Construction progress tracking
- Property analytics dashboard
- Advanced search and filtering

### Phase 6: Real-time Features (Weeks 21-24)
**Priority: Medium**
- Implement WebSocket integration
- Create real-time notifications system
- Set up live dashboard updates
- Implement real-time investment tracking
- Create system alert management
- Set up admin real-time monitoring

**Dependencies:** Phases 1-5 completion
**Deliverables:**
- Real-time notification system
- Live dashboard updates
- WebSocket-based features
- Admin monitoring tools

### Phase 7: Advanced Features (Weeks 25-28)
**Priority: Medium**
- Implement broker management and commissions
- Create marketing material management
- Set up referral tracking system
- Implement advanced analytics and reporting
- Create automated report generation
- Set up performance monitoring

**Dependencies:** All previous phases
**Deliverables:**
- Complete broker functionality
- Advanced analytics platform
- Automated reporting system
- Performance monitoring tools

### Phase 8: Testing and Optimization (Weeks 29-32)
**Priority: High**
- Comprehensive testing of all features
- Performance optimization and caching
- Security audit and penetration testing
- Load testing and scalability improvements
- Documentation completion
- Production deployment preparation

**Dependencies:** All development phases
**Deliverables:**
- Fully tested system
- Performance benchmarks
- Security audit report
- Production-ready deployment

## Technical Specifications

### Performance Requirements
- API response time: < 500ms for 95% of requests
- Database query optimization with proper indexing
- Caching strategy for frequently accessed data
- Asynchronous processing for heavy operations
- WebSocket connections: Support 10,000+ concurrent users

### Security Requirements
- HTTPS only for all communications
- JWT tokens with appropriate expiration
- Rate limiting on all API endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure file upload handling
- Encrypted storage for sensitive data

### Scalability Considerations
- Horizontal scaling support with load balancers
- Database read replicas for query optimization
- Redis caching for session management
- Celery for background task processing
- CDN integration for static file serving
- Microservice architecture preparation

This comprehensive specification provides the foundation for building a production-ready Django backend that fully supports the React frontend requirements. The implementation should follow Django best practices, maintain security standards, and ensure scalability for future growth.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze project structure and identify main application domains", "status": "completed", "activeForm": "Analyzing project structure and identifying main application domains"}, {"content": "Examine authentication components and user management flows", "status": "completed", "activeForm": "Examining authentication components and user management flows"}, {"content": "Analyze property-related components and data requirements", "status": "completed", "activeForm": "Analyzing property-related components and data requirements"}, {"content": "Examine investment and tokenization components", "status": "completed", "activeForm": "Examining investment and tokenization components"}, {"content": "Analyze dashboard components for different user roles", "status": "completed", "activeForm": "Analyzing dashboard components for different user roles"}, {"content": "Review context providers and state management", "status": "completed", "activeForm": "Reviewing context providers and state management"}, {"content": "Examine service layer and API integration patterns", "status": "completed", "activeForm": "Examining service layer and API integration patterns"}, {"content": "Generate comprehensive Django backend specification document", "status": "completed", "activeForm": "Generating comprehensive Django backend specification document"}]