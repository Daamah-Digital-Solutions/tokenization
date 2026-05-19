"""
KYC provider abstraction layer.

The platform supports pluggable providers for the four external services
that traditional KYC pipelines need:

  - DocumentVerificationProvider — passport/ID/utility-bill OCR + verification
  - BiometricProvider — liveness + face-match challenges
  - ComplianceProvider — sanctions, PEP, adverse-media, watchlist screening
  - GeolocationProvider — IP → country for fraud / jurisdiction checks

The provider for each is selected by an environment variable
(`KYC_*_PROVIDER`). A mock provider remains available for development and
tests, but raises a hard error if it ever boots in production. Real
adapters (Jumio, ComplyAdvantage, etc.) plug in by implementing the
interfaces defined in `interfaces.py`.
"""

from .factory import (
    get_biometric_provider,
    get_compliance_provider,
    get_document_provider,
    get_geolocation_provider,
)

__all__ = [
    'get_biometric_provider',
    'get_compliance_provider',
    'get_document_provider',
    'get_geolocation_provider',
]
