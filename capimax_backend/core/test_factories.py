"""
Test factories for all models in the Capimax Backend.

This module provides Factory Boy factories for generating test data
for all models across all applications in a consistent and realistic manner.
"""

import factory
from factory.django import DjangoModelFactory
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

# Import all models
from accounts.models import User, UserRole, PasswordResetToken, EmailVerificationToken, UserSession
from properties.models import (
    Property, PropertyStatus, PropertyType, PropertyImage, 
    PropertyAnalytics, PropertyViewLog, PropertyMarketData
)
from investments.models import (
    Investment, InvestmentStatus, TokenReservation,
    InstallmentPayment, InvestmentWithdrawal, AutoInvestment, DividendPayment
)
from payments.models import (
    Wallet, WalletType, CryptoCurrency, FiatCurrency, 
    Transaction, TransactionType, TransactionStatus, Payment, PaymentMethod
)
from kyc.models import (
    KYCDocument, KYCDocumentType, KYCDocumentStatus, KYCVerification,
    KYCVerificationStatus, KYCProvider
)
from notifications.models import Notification, NotificationType, NotificationStatus
from construction.models import (
    ConstructionProject, ConstructionPhase, ConstructionStatus,
    ConstructionUpdate, ConstructionMilestone
)
from broker.models import BrokerProfile, BrokerCommission, BrokerAnalytics
from analytics.models import UserAnalytics, InvestmentAnalytics, PlatformAnalytics

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory for User model."""
    
    class Meta:
        model = User
    
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.Faker('email')
    phone = factory.Faker('phone_number')
    country = factory.Faker('country')
    date_of_birth = factory.Faker('date_of_birth', minimum_age=18, maximum_age=80)
    address = factory.Faker('address')
    city = factory.Faker('city')
    state = factory.Faker('state')
    postal_code = factory.Faker('postcode')
    role = UserRole.INVESTOR
    is_verified = True
    is_active = True
    
    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if not create:
            return
        
        password = extracted or 'test_password123'
        self.set_password(password)
        self.save()


class AdminUserFactory(UserFactory):
    """Factory for Admin users."""
    
    role = UserRole.ADMIN
    is_staff = True
    is_superuser = True


class InvestorUserFactory(UserFactory):
    """Factory for Investor users."""
    
    role = UserRole.INVESTOR


class PropertyOwnerUserFactory(UserFactory):
    """Factory for Property Owner users."""
    
    role = UserRole.PROPERTY_OWNER


class BrokerUserFactory(UserFactory):
    """Factory for Broker users."""
    
    role = UserRole.BROKER


class PasswordResetTokenFactory(DjangoModelFactory):
    """Factory for PasswordResetToken model."""
    
    class Meta:
        model = PasswordResetToken
    
    user = factory.SubFactory(UserFactory)
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=1))
    used = False


class EmailVerificationTokenFactory(DjangoModelFactory):
    """Factory for EmailVerificationToken model."""
    
    class Meta:
        model = EmailVerificationToken
    
    user = factory.SubFactory(UserFactory, is_verified=False)
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=24))
    verified = False


class UserSessionFactory(DjangoModelFactory):
    """Factory for UserSession model."""
    
    class Meta:
        model = UserSession
    
    user = factory.SubFactory(UserFactory)
    session_key = factory.Faker('sha1')
    ip_address = factory.Faker('ipv4')
    user_agent = factory.Faker('user_agent')
    is_active = True


class PropertyFactory(DjangoModelFactory):
    """Factory for Property model."""
    
    class Meta:
        model = Property
    
    owner = factory.SubFactory(PropertyOwnerUserFactory)
    title = factory.Faker('text', max_nb_chars=200)
    description = factory.Faker('text', max_nb_chars=2000)
    property_type = PropertyType.APARTMENT
    address = factory.Faker('address')
    city = factory.Faker('city')
    state = factory.Faker('state')
    postal_code = factory.Faker('postcode')
    country = factory.Faker('country')
    price = factory.Faker('pydecimal', left_digits=8, right_digits=2, positive=True, min_value=50000)
    total_tokens = factory.Faker('random_int', min=100, max=10000)
    available_tokens = factory.LazyAttribute(lambda obj: obj.total_tokens)
    token_price = factory.LazyAttribute(lambda obj: obj.price / obj.total_tokens)
    expected_annual_return = factory.Faker('pydecimal', left_digits=2, right_digits=2, positive=True, min_value=5, max_value=20)
    property_size = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True, min_value=500)
    bedrooms = factory.Faker('random_int', min=1, max=5)
    bathrooms = factory.Faker('random_int', min=1, max=4)
    status = PropertyStatus.ACTIVE
    is_featured = False


class PropertyImageFactory(DjangoModelFactory):
    """Factory for PropertyImage model."""
    
    class Meta:
        model = PropertyImage
    
    property = factory.SubFactory(PropertyFactory)
    image = factory.django.ImageField(filename='property.jpg')
    caption = factory.Faker('text', max_nb_chars=200)
    is_primary = False
    order = factory.Sequence(lambda n: n)


class PropertyAnalyticsFactory(DjangoModelFactory):
    """Factory for PropertyAnalytics model."""
    
    class Meta:
        model = PropertyAnalytics
    
    property = factory.SubFactory(PropertyFactory)
    views_count = factory.Faker('random_int', min=0, max=10000)
    investment_count = factory.Faker('random_int', min=0, max=100)
    total_invested = factory.Faker('pydecimal', left_digits=8, right_digits=2, positive=True)
    average_investment = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)


class WalletFactory(DjangoModelFactory):
    """Factory for Wallet model."""
    
    class Meta:
        model = Wallet
    
    user = factory.SubFactory(UserFactory)
    wallet_type = WalletType.FIAT
    currency_code = 'USD'
    balance = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    is_active = True


class CryptoCurrencyFactory(DjangoModelFactory):
    """Factory for CryptoCurrency model."""
    
    class Meta:
        model = CryptoCurrency
    
    name = factory.Faker('cryptocurrency_name')
    symbol = factory.Faker('cryptocurrency_code')
    network = 'Ethereum'
    contract_address = factory.Faker('ethereum_address')
    decimals = 18
    is_active = True


class TransactionFactory(DjangoModelFactory):
    """Factory for Transaction model."""
    
    class Meta:
        model = Transaction
    
    user = factory.SubFactory(UserFactory)
    wallet = factory.SubFactory(WalletFactory)
    transaction_type = TransactionType.INVESTMENT
    amount = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    status = TransactionStatus.COMPLETED
    description = factory.Faker('text', max_nb_chars=500)


class PaymentFactory(DjangoModelFactory):
    """Factory for Payment model."""
    
    class Meta:
        model = Payment
    
    user = factory.SubFactory(UserFactory)
    amount = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    currency = 'USD'
    payment_method = PaymentMethod.CREDIT_CARD
    status = TransactionStatus.COMPLETED
    provider_transaction_id = factory.Faker('uuid4')


class InvestmentFactory(DjangoModelFactory):
    """Factory for Investment model."""
    
    class Meta:
        model = Investment
    
    user = factory.SubFactory(InvestorUserFactory)
    property_investment = factory.SubFactory(PropertyFactory)
    token_amount = factory.Faker('random_int', min=1, max=1000)
    investment_amount = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    status = InvestmentStatus.PENDING
    payment_method = factory.LazyFunction(dict)
    blockchain_confirmed = False
    confirmation_blocks = 0


class TokenReservationFactory(DjangoModelFactory):
    """Factory for TokenReservation model."""
    
    class Meta:
        model = TokenReservation
    
    user = factory.SubFactory(InvestorUserFactory)
    property = factory.SubFactory(PropertyFactory)
    tokens_reserved = factory.Faker('random_int', min=1, max=100)
    reservation_price = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(minutes=15))
    is_active = True


class KYCDocumentFactory(DjangoModelFactory):
    """Factory for KYCDocument model."""
    
    class Meta:
        model = KYCDocument
    
    user = factory.SubFactory(UserFactory)
    document_type = KYCDocumentType.PASSPORT
    document_number = factory.Faker('uuid4')
    document_file = factory.django.FileField(filename='document.pdf')
    status = KYCDocumentStatus.PENDING
    country_of_issue = factory.Faker('country_code')


class KYCVerificationFactory(DjangoModelFactory):
    """Factory for KYCVerification model."""
    
    class Meta:
        model = KYCVerification
    
    user = factory.SubFactory(UserFactory)
    provider = KYCProvider.MANUAL
    status = KYCVerificationStatus.PENDING
    confidence_score = factory.Faker('pydecimal', left_digits=1, right_digits=2, positive=True, min_value=0, max_value=1)


class NotificationFactory(DjangoModelFactory):
    """Factory for Notification model."""
    
    class Meta:
        model = Notification
    
    user = factory.SubFactory(UserFactory)
    title = factory.Faker('text', max_nb_chars=100)
    message = factory.Faker('text', max_nb_chars=500)
    notification_type = NotificationType.INFO
    status = NotificationStatus.UNREAD
    is_read = False


class ConstructionProjectFactory(DjangoModelFactory):
    """Factory for ConstructionProject model."""
    
    class Meta:
        model = ConstructionProject
    
    property = factory.SubFactory(PropertyFactory)
    name = factory.Faker('text', max_nb_chars=200)
    description = factory.Faker('text', max_nb_chars=1000)
    total_budget = factory.Faker('pydecimal', left_digits=8, right_digits=2, positive=True)
    spent_budget = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    start_date = factory.Faker('date_this_year')
    estimated_completion_date = factory.LazyAttribute(
        lambda obj: obj.start_date + timedelta(days=365)
    )
    status = ConstructionStatus.PLANNING


class ConstructionPhaseFactory(DjangoModelFactory):
    """Factory for ConstructionPhase model."""
    
    class Meta:
        model = ConstructionPhase
    
    project = factory.SubFactory(ConstructionProjectFactory)
    name = factory.Faker('text', max_nb_chars=100)
    description = factory.Faker('text', max_nb_chars=500)
    start_date = factory.Faker('date_this_year')
    estimated_end_date = factory.LazyAttribute(
        lambda obj: obj.start_date + timedelta(days=90)
    )
    progress_percentage = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True, min_value=0, max_value=100)
    order = factory.Sequence(lambda n: n + 1)


class BrokerProfileFactory(DjangoModelFactory):
    """Factory for BrokerProfile model."""
    
    class Meta:
        model = BrokerProfile
    
    user = factory.SubFactory(BrokerUserFactory)
    license_number = factory.Faker('uuid4')
    company_name = factory.Faker('company')
    experience_years = factory.Faker('random_int', min=1, max=30)
    specialization = factory.Faker('text', max_nb_chars=200)
    commission_rate = factory.Faker('pydecimal', left_digits=2, right_digits=4, positive=True, min_value=0.001, max_value=0.1)
    is_verified = True
    is_active = True


class BrokerCommissionFactory(DjangoModelFactory):
    """Factory for BrokerCommission model."""
    
    class Meta:
        model = BrokerCommission
    
    broker = factory.SubFactory(BrokerProfileFactory)
    investment = factory.SubFactory(InvestmentFactory)
    commission_amount = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    commission_rate = factory.Faker('pydecimal', left_digits=2, right_digits=4, positive=True, min_value=0.001, max_value=0.1)
    is_paid = False


class UserAnalyticsFactory(DjangoModelFactory):
    """Factory for UserAnalytics model."""
    
    class Meta:
        model = UserAnalytics
    
    user = factory.SubFactory(UserFactory)
    login_count = factory.Faker('random_int', min=1, max=1000)
    total_investments = factory.Faker('pydecimal', left_digits=8, right_digits=2, positive=True)
    properties_viewed = factory.Faker('random_int', min=0, max=100)
    avg_session_duration = factory.Faker('random_int', min=60, max=3600)  # seconds


class InvestmentAnalyticsFactory(DjangoModelFactory):
    """Factory for InvestmentAnalytics model."""
    
    class Meta:
        model = InvestmentAnalytics
    
    property = factory.SubFactory(PropertyFactory)
    total_investors = factory.Faker('random_int', min=1, max=100)
    total_invested = factory.Faker('pydecimal', left_digits=8, right_digits=2, positive=True)
    average_investment = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    roi_percentage = factory.Faker('pydecimal', left_digits=2, right_digits=2, positive=True, min_value=0, max_value=50)


class PlatformAnalyticsFactory(DjangoModelFactory):
    """Factory for PlatformAnalytics model."""
    
    class Meta:
        model = PlatformAnalytics
    
    total_users = factory.Faker('random_int', min=100, max=10000)
    total_properties = factory.Faker('random_int', min=10, max=1000)
    total_investments = factory.Faker('pydecimal', left_digits=10, right_digits=2, positive=True)
    platform_commission = factory.Faker('pydecimal', left_digits=8, right_digits=2, positive=True)
    date = factory.Faker('date_this_year')


# Test Data Creation Utilities
class TestDataMixin:
    """Mixin providing common test data creation methods."""
    
    @classmethod
    def create_test_user(cls, role=UserRole.INVESTOR, **kwargs):
        """Create a test user with specified role."""
        if role == UserRole.ADMIN:
            return AdminUserFactory.create(**kwargs)
        elif role == UserRole.PROPERTY_OWNER:
            return PropertyOwnerUserFactory.create(**kwargs)
        elif role == UserRole.BROKER:
            return BrokerUserFactory.create(**kwargs)
        else:
            return InvestorUserFactory.create(**kwargs)
    
    @classmethod
    def create_test_property(cls, **kwargs):
        """Create a test property with owner."""
        return PropertyFactory.create(**kwargs)
    
    @classmethod
    def create_test_investment(cls, user=None, property=None, **kwargs):
        """Create a test investment."""
        if not user:
            user = InvestorUserFactory.create()
        if not property:
            property = PropertyFactory.create()
        
        return InvestmentFactory.create(
            user=user,
            property=property,
            **kwargs
        )
    
    @classmethod
    def create_complete_user_profile(cls, role=UserRole.INVESTOR):
        """Create a complete user profile with related data."""
        user = cls.create_test_user(role=role)
        
        # Create wallet
        WalletFactory.create(user=user)
        
        # Create KYC documents if not admin
        if role != UserRole.ADMIN:
            KYCDocumentFactory.create(user=user)
            KYCVerificationFactory.create(user=user)
        
        # Create broker profile if broker
        if role == UserRole.BROKER:
            BrokerProfileFactory.create(user=user)
        
        # Create investment if investor
        if role == UserRole.INVESTOR:
            property = PropertyFactory.create()
            InvestmentFactory.create(
                user=user,
                property_investment=property
            )
        
        return user