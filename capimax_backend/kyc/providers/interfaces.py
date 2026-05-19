"""
Provider interfaces for KYC / compliance external services.

Implementations must be deterministic-shaped: every method MUST return a
dataclass defined here, never raise on the happy path, and surface errors
via the result object's `error` field. This makes them composable in
Celery tasks and easy to mock in tests.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Optional


# ============================================================================
# Result dataclasses
# ============================================================================

@dataclass
class DocumentVerificationResult:
    success: bool
    document_type: str
    extracted_data: dict[str, Any] = field(default_factory=dict)
    confidence: Decimal = Decimal('0')
    provider_reference: str = ''
    error: Optional[str] = None


@dataclass
class BiometricSessionResult:
    success: bool
    session_id: str = ''
    redirect_url: str = ''
    provider_reference: str = ''
    error: Optional[str] = None


@dataclass
class BiometricVerificationResult:
    success: bool
    passed: bool = False
    liveness_score: Decimal = Decimal('0')
    face_match_score: Decimal = Decimal('0')
    raw_response: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class ComplianceCheckResult:
    """Result of a single compliance check (AML / sanctions / PEP / etc.)."""
    check_type: str  # 'aml' | 'sanctions' | 'pep' | 'adverse_media' | 'watchlist'
    result: str  # 'clear' | 'hit' | 'inconclusive' | 'error'
    confidence: Decimal = Decimal('0')
    provider: str = ''
    provider_reference: str = ''
    hits: list[dict[str, Any]] = field(default_factory=list)
    raw_response: dict[str, Any] = field(default_factory=dict)


@dataclass
class GeolocationResult:
    success: bool
    country_code: str = ''
    country_name: str = ''
    is_high_risk: bool = False
    is_suspicious: bool = False
    raw_response: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


# ============================================================================
# Provider interfaces
# ============================================================================

class DocumentVerificationProvider(ABC):
    """Adapter for document OCR + verification (Jumio, Onfido, AWS Textract)."""

    @abstractmethod
    def verify_document(
        self,
        *,
        document_type: str,
        file_bytes: bytes,
        file_name: str,
        user_reference: str,
    ) -> DocumentVerificationResult:
        ...


class BiometricProvider(ABC):
    """Adapter for liveness + face-match (Jumio, iProov)."""

    @abstractmethod
    def start_session(self, *, user_reference: str, return_url: str) -> BiometricSessionResult:
        ...

    @abstractmethod
    def fetch_result(self, *, session_id: str) -> BiometricVerificationResult:
        ...


class ComplianceProvider(ABC):
    """Adapter for sanctions / PEP / adverse media (ComplyAdvantage, Refinitiv)."""

    @abstractmethod
    def screen(
        self,
        *,
        full_name: str,
        date_of_birth: Optional[str],
        country_code: Optional[str],
        check_type: str,
        user_reference: str,
    ) -> ComplianceCheckResult:
        ...


class GeolocationProvider(ABC):
    """Adapter for IP → country lookups (MaxMind GeoIP2, IPinfo)."""

    @abstractmethod
    def lookup(self, ip_address: str) -> GeolocationResult:
        ...
