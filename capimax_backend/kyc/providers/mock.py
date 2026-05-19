"""
Mock providers — DEVELOPMENT / TEST ONLY.

These adapters return predictable canned responses suitable for local dev,
contract tests, and unit tests. They REFUSE to boot in production:
importing this module raises ImportError if the production settings are
active. The factory enforces this at provider-selection time as well.
"""

from __future__ import annotations

import os
import sys
import secrets
from decimal import Decimal

from .interfaces import (
    BiometricProvider,
    BiometricSessionResult,
    BiometricVerificationResult,
    ComplianceCheckResult,
    ComplianceProvider,
    DocumentVerificationProvider,
    DocumentVerificationResult,
    GeolocationProvider,
    GeolocationResult,
)


def _is_production() -> bool:
    settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', '')
    return settings_module.endswith('production') or os.environ.get('ENVIRONMENT', '').lower() == 'production'


if _is_production() and 'pytest' not in sys.modules:
    raise ImportError(
        "kyc.providers.mock cannot be imported in production. "
        "Configure a real provider in KYC_*_PROVIDER environment vars."
    )


# ----------------------------------------------------------------------------
# Document verification
# ----------------------------------------------------------------------------
class MockDocumentVerificationProvider(DocumentVerificationProvider):
    def verify_document(
        self,
        *,
        document_type: str,
        file_bytes: bytes,
        file_name: str,
        user_reference: str,
    ) -> DocumentVerificationResult:
        return DocumentVerificationResult(
            success=True,
            document_type=document_type,
            extracted_data={
                'document_number': f'MOCK-{secrets.token_hex(4).upper()}',
                'full_name': 'TEST USER',
                'date_of_birth': '1990-01-01',
                'expiry_date': '2030-01-01',
                'nationality': 'US',
            },
            confidence=Decimal('95.00'),
            provider_reference=f'mock_doc_{secrets.token_hex(8)}',
        )


# ----------------------------------------------------------------------------
# Biometric
# ----------------------------------------------------------------------------
class MockBiometricProvider(BiometricProvider):
    def start_session(self, *, user_reference: str, return_url: str) -> BiometricSessionResult:
        sid = f'mock_bio_{secrets.token_hex(8)}'
        return BiometricSessionResult(
            success=True,
            session_id=sid,
            redirect_url=f'{return_url}?session_id={sid}',
            provider_reference=sid,
        )

    def fetch_result(self, *, session_id: str) -> BiometricVerificationResult:
        return BiometricVerificationResult(
            success=True,
            passed=True,
            liveness_score=Decimal('92.5'),
            face_match_score=Decimal('94.0'),
            raw_response={'session_id': session_id, 'provider': 'mock'},
        )


# ----------------------------------------------------------------------------
# Compliance screening
# ----------------------------------------------------------------------------
class MockComplianceProvider(ComplianceProvider):
    def screen(
        self,
        *,
        full_name: str,
        date_of_birth,
        country_code,
        check_type: str,
        user_reference: str,
    ) -> ComplianceCheckResult:
        return ComplianceCheckResult(
            check_type=check_type,
            result='clear',
            confidence=Decimal('98.00'),
            provider='mock',
            provider_reference=f'mock_{check_type}_{secrets.token_hex(8)}',
            hits=[],
            raw_response={'note': 'mock provider — always clear'},
        )


# ----------------------------------------------------------------------------
# Geolocation
# ----------------------------------------------------------------------------
class MockGeolocationProvider(GeolocationProvider):
    def lookup(self, ip_address: str) -> GeolocationResult:
        return GeolocationResult(
            success=True,
            country_code='US',
            country_name='United States',
            is_high_risk=False,
            is_suspicious=False,
            raw_response={'ip': ip_address, 'provider': 'mock'},
        )
