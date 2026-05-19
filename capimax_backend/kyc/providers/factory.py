"""
Provider factory.

Reads `KYC_*_PROVIDER` from settings and returns a cached instance of the
selected adapter. In production, the `mock` provider is disabled — if
selected (or selected by accident) the factory raises immediately.
"""

from __future__ import annotations

import os
from functools import lru_cache

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .interfaces import (
    BiometricProvider,
    ComplianceProvider,
    DocumentVerificationProvider,
    GeolocationProvider,
)


def _is_production() -> bool:
    return (
        os.environ.get('DJANGO_SETTINGS_MODULE', '').endswith('production')
        or os.environ.get('ENVIRONMENT', '').lower() == 'production'
    )


def _require_real_in_production(provider_name: str) -> None:
    if provider_name == 'mock' and _is_production():
        raise ImproperlyConfigured(
            f"KYC mock providers are forbidden in production "
            f"(got provider '{provider_name}'). Configure a real provider."
        )


# ---------------------------------------------------------------------------
# Cached selection per process
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_document_provider() -> DocumentVerificationProvider:
    name = getattr(settings, 'KYC_DOCUMENT_PROVIDER', 'mock').lower()
    _require_real_in_production(name)
    if name == 'jumio':
        from .jumio import JumioDocumentVerificationProvider
        return JumioDocumentVerificationProvider()
    if name == 'mock':
        from .mock import MockDocumentVerificationProvider
        return MockDocumentVerificationProvider()
    raise ImproperlyConfigured(f"Unknown KYC_DOCUMENT_PROVIDER: {name}")


@lru_cache(maxsize=1)
def get_biometric_provider() -> BiometricProvider:
    name = getattr(settings, 'KYC_BIOMETRIC_PROVIDER', 'mock').lower()
    _require_real_in_production(name)
    if name == 'jumio':
        from .jumio import JumioBiometricProvider
        return JumioBiometricProvider()
    if name == 'mock':
        from .mock import MockBiometricProvider
        return MockBiometricProvider()
    raise ImproperlyConfigured(f"Unknown KYC_BIOMETRIC_PROVIDER: {name}")


@lru_cache(maxsize=1)
def get_compliance_provider() -> ComplianceProvider:
    name = getattr(settings, 'KYC_COMPLIANCE_PROVIDER', 'mock').lower()
    _require_real_in_production(name)
    if name == 'complyadvantage':
        from .complyadvantage import ComplyAdvantageProvider
        return ComplyAdvantageProvider()
    if name == 'mock':
        from .mock import MockComplianceProvider
        return MockComplianceProvider()
    raise ImproperlyConfigured(f"Unknown KYC_COMPLIANCE_PROVIDER: {name}")


@lru_cache(maxsize=1)
def get_geolocation_provider() -> GeolocationProvider:
    name = getattr(settings, 'KYC_GEOLOCATION_PROVIDER', 'mock').lower()
    _require_real_in_production(name)
    if name == 'maxmind':
        from .maxmind import MaxMindGeolocationProvider
        return MaxMindGeolocationProvider()
    if name == 'mock':
        from .mock import MockGeolocationProvider
        return MockGeolocationProvider()
    raise ImproperlyConfigured(f"Unknown KYC_GEOLOCATION_PROVIDER: {name}")
