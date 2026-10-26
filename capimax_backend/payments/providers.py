"""
Which payment methods can be used right now (PropShare model).

Every property shows the same list. A method whose provider has no keys is
still shown, marked "Not available right now" — never hidden.
"""

from django.conf import settings

# Display order of the purchase methods.
METHODS = ('wallet', 'card', 'crypto', 'pronova', 'nova_sukuk', 'bank')


def stripe_configured() -> bool:
    key = getattr(settings, 'STRIPE_SECRET_KEY', '') or ''
    return key.startswith(('sk_', 'rk_'))


def stripe_live() -> bool:
    key = getattr(settings, 'STRIPE_SECRET_KEY', '') or ''
    return key.startswith(('sk_live_', 'rk_live_'))


def nowpayments_configured() -> bool:
    return bool(getattr(settings, 'NOWPAYMENTS_API_KEY', '') and getattr(settings, 'NOWPAYMENTS_IPN_SECRET', ''))


def provider_configured(method: str) -> bool:
    if method in ('card', 'pronova'):
        return stripe_configured()
    if method == 'crypto':
        return nowpayments_configured()
    return method in ('wallet', 'bank', 'nova_sukuk')


def method_list() -> list:
    """The purchase methods with their availability, for the checkout."""
    from .models import PlatformBankAccount, PlatformFeeSettings

    fees = PlatformFeeSettings.current()
    has_bank = PlatformBankAccount.objects.filter(is_active=True).exists()
    out = []
    for m in METHODS:
        available = provider_configured(m) and (m != 'bank' or has_bank)
        item = {'id': m, 'available': available}
        if m == 'pronova':
            item['discount_pct'] = str(fees.pronova_discount_pct)
        if m in ('card', 'pronova'):
            item['test_mode'] = stripe_configured() and not stripe_live()
        out.append(item)
    return out
