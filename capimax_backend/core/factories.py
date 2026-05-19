"""
Minimal test factories aligned with the *current* model schema.

This module replaces the abandoned `core/test_factories.py` (which referenced
models that have been renamed or removed: `Wallet`, `Transaction`,
`UserRole.user_type`, etc.). The factories here are plain functions — no
factory_boy dependency — because the value is in having an *accurate*
fixture set, not in declarative DSL.

Convention:
- Every factory accepts named overrides via kwargs.
- Every factory returns a saved model instance.
- Factories that depend on other models accept the related instance as a
  kwarg; if omitted, a sensible default is created.
- Reasonable but deterministic defaults — no faker, no randomness.

Usage:
    from core.factories import (
        make_user, make_property, make_investment, make_payment,
    )

    investor = make_user(role='investor', email='inv@test.com')
    prop = make_property()
    inv = make_investment(user=investor, prop=prop)
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Optional

from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

def make_user(
    *,
    email: Optional[str] = None,
    role: str = 'investor',
    password: str = 'TestPass123!',
    country: str = 'US',
    is_verified: bool = True,
    wallet_address: Optional[str] = None,
    **extra,
):
    """Create a saved User. `email` defaults to a unique uuid-based address."""
    if email is None:
        email = f'user-{uuid.uuid4().hex[:8]}@test.com'
    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=extra.pop('first_name', 'Test'),
        last_name=extra.pop('last_name', 'User'),
        role=role,
        country=country,
        is_verified=is_verified,
        **extra,
    )
    if wallet_address is None and role == 'investor':
        wallet_address = '0x' + uuid.uuid4().hex[:8].ljust(40, 'a')[:40]
    if wallet_address:
        user.wallet_address = wallet_address
        user.save(update_fields=['wallet_address'])
    return user


def make_investor(**kwargs):
    return make_user(role='investor', **kwargs)


def make_property_owner(**kwargs):
    return make_user(role='property_owner', **kwargs)


def make_admin(**kwargs):
    kwargs.setdefault('is_verified', True)
    return make_user(role='admin', is_staff=True, is_superuser=True, **kwargs)


def make_broker(**kwargs):
    return make_user(role='broker', **kwargs)


# ---------------------------------------------------------------------------
# Properties
# ---------------------------------------------------------------------------

def make_property(
    *,
    owner=None,
    title: str = 'Test Property',
    property_type: str = 'residential',
    property_category: str = 'ready_property',
    city: str = 'Test City',
    country: str = 'US',
    total_value: Decimal = Decimal('1000000.00'),
    token_price: Decimal = Decimal('10.00'),
    total_tokens: int = 100_000,
    status: str = 'tokenized',
    smart_contract_address: Optional[str] = None,
    requires_accredited_investors: bool = False,
    lockup_months: int = 0,
    offering_type: str = 'private',
    spv_entity=None,
    **extra,
):
    """Create a saved Property. Defaults match the values used by the mint
    pipeline tests."""
    from properties.models import Property
    if owner is None:
        owner = make_property_owner()
    if smart_contract_address is None:
        smart_contract_address = '0x' + uuid.uuid4().hex.ljust(40, 'a')[:40]
    return Property.objects.create(
        title=title,
        property_type=property_type,
        property_category=property_category,
        city=city,
        country=country,
        address=extra.pop('address', '123 Test St'),
        total_value=total_value,
        token_price=token_price,
        total_tokens=total_tokens,
        status=status,
        smart_contract_address=smart_contract_address,
        owner=owner,
        requires_accredited_investors=requires_accredited_investors,
        lockup_months=lockup_months,
        offering_type=offering_type,
        spv_entity=spv_entity,
        **extra,
    )


# ---------------------------------------------------------------------------
# Legal (SPV)
# ---------------------------------------------------------------------------

def make_legal_entity(
    *,
    name: str = 'Test SPV LLC',
    entity_type: str = 'llc',
    jurisdiction: str = 'Delaware, USA',
    registration_number: Optional[str] = None,
    status: str = 'active',
    requires_accredited_investors: bool = False,
    allowed_investor_jurisdictions=None,
    **extra,
):
    from legal.models import LegalEntity
    if registration_number is None:
        registration_number = f'REG-{uuid.uuid4().hex[:8].upper()}'
    return LegalEntity.objects.create(
        name=name,
        entity_type=entity_type,
        jurisdiction=jurisdiction,
        registration_number=registration_number,
        formation_date=extra.pop('formation_date', timezone.now().date()),
        status=status,
        requires_accredited_investors=requires_accredited_investors,
        allowed_investor_jurisdictions=allowed_investor_jurisdictions or [],
        **extra,
    )


# ---------------------------------------------------------------------------
# Investments
# ---------------------------------------------------------------------------

def make_investment(
    *,
    user=None,
    prop=None,
    token_amount: int = 100,
    investment_amount: Decimal = Decimal('1000.00'),
    status: str = 'pending',
    **extra,
):
    """Create a saved Investment."""
    from investments.models import Investment
    if user is None:
        user = make_investor()
    if prop is None:
        prop = make_property()
    return Investment.objects.create(
        user=user,
        property_investment=prop,
        token_amount=token_amount,
        investment_amount=investment_amount,
        status=status,
        **extra,
    )


def make_pending_mint_investment(*, user=None, prop=None, **extra):
    """Investment in PENDING_MINT state, ready for the dispatcher."""
    return make_investment(
        user=user,
        prop=prop,
        status='pending_mint',
        mint_scheduled_at=timezone.now() - timezone.timedelta(seconds=1),
        **extra,
    )


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

def make_payment(
    *,
    user=None,
    investment=None,
    amount: Decimal = Decimal('1000.00'),
    currency: str = 'USD',
    payment_method: str = 'credit_card',
    status: str = 'pending',
    **extra,
):
    from payments.models import Payment
    if user is None:
        user = make_investor()
    return Payment.objects.create(
        user=user,
        investment=investment,
        amount=amount,
        currency=currency,
        payment_method=payment_method,
        status=status,
        net_amount=extra.pop('net_amount', amount),
        **extra,
    )


def make_wallet_balance(
    *,
    user=None,
    currency: str = 'USD',
    available_balance: Decimal = Decimal('10000.00'),
    **extra,
):
    from payments.models import WalletBalance
    if user is None:
        user = make_investor()
    return WalletBalance.objects.create(
        user=user,
        currency=currency,
        available_balance=available_balance,
        **extra,
    )


# ---------------------------------------------------------------------------
# KYC
# ---------------------------------------------------------------------------

def make_kyc_profile(
    *,
    user=None,
    status: str = 'approved',
    verification_level: str = 'enhanced',
    investment_limit: Optional[Decimal] = Decimal('50000.00'),
    expires_in_days: int = 365,
    **extra,
):
    """Return a KYCProfile, defaulting to fully-verified.

    Note: the kyc app auto-creates a KYCProfile via post_save signal on
    User creation. We update the existing row rather than insert a new
    one to avoid the unique-user constraint.
    """
    from kyc.models import KYCProfile
    if user is None:
        user = make_investor()

    defaults = {
        'status': status,
        'verification_level': verification_level,
        'investment_limit': investment_limit,
        'expires_at': timezone.now() + timezone.timedelta(days=expires_in_days),
        'reviewed_at': timezone.now() if status == 'approved' else None,
        **extra,
    }
    profile, created = KYCProfile.objects.update_or_create(
        user=user, defaults=defaults,
    )

    # Critical: Django's FK descriptor caches the reverse relation on
    # `user.kyc_profile` when the signal handler called
    # KYCProfile.objects.create(user=user). That cached instance still
    # carries the pre-update `status='pending'`. Permission checks
    # access `user.kyc_profile` directly, so we must invalidate the
    # cache to force a fresh DB read.
    try:
        user._state.fields_cache.pop('kyc_profile', None)
    except (AttributeError, KeyError):
        pass

    return profile


# ---------------------------------------------------------------------------
# Convenience: full "ready to invest" fixture
# ---------------------------------------------------------------------------

def make_ready_investor(*, wallet_balance: Decimal = Decimal('10000.00'),
                        with_kyc: bool = True):
    """Investor with a verified account, approved KYC, and funded USD wallet."""
    investor = make_investor()
    make_wallet_balance(user=investor, available_balance=wallet_balance)
    if with_kyc:
        make_kyc_profile(user=investor)
    return investor


def make_tokenized_property(*, owner=None, with_spv: bool = False, **kwargs):
    """Property in 'tokenized' state, optionally with an SPV legal entity."""
    spv = make_legal_entity() if with_spv else None
    return make_property(owner=owner, status='tokenized', spv_entity=spv,
                         **kwargs)
