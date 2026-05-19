"""
ComplyAdvantage adapter for AML / sanctions / PEP / adverse-media screening.

ComplyAdvantage exposes a single `/searches` endpoint. We map our internal
check types to ComplyAdvantage `types[]` query and parse hits.

Configuration:
  COMPLYADVANTAGE_API_KEY
  COMPLYADVANTAGE_API_URL (default: https://api.complyadvantage.com)
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Optional

import requests
from django.conf import settings

from .interfaces import ComplianceCheckResult, ComplianceProvider

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 30


CHECK_TYPE_MAP = {
    'sanctions': ['sanction'],
    'pep': ['pep', 'pep-class-1', 'pep-class-2', 'pep-class-3'],
    'adverse_media': ['adverse-media'],
    'watchlist': ['warning'],
    # AML is a meta-check spanning everything
    'aml': ['sanction', 'warning', 'fitness-probity', 'adverse-media'],
}


class ComplyAdvantageProvider(ComplianceProvider):

    def __init__(self):
        self.api_key = getattr(settings, 'COMPLYADVANTAGE_API_KEY', '') \
            or getattr(settings, 'KYC_PROVIDERS', {}).get('COMPLYADVANTAGE', {}).get('API_KEY', '')
        if not self.api_key:
            raise RuntimeError(
                "ComplyAdvantage credentials missing. Set "
                "COMPLYADVANTAGE_API_KEY in your environment."
            )
        self.base_url = getattr(
            settings, 'COMPLYADVANTAGE_API_URL', 'https://api.complyadvantage.com'
        )

    def screen(
        self,
        *,
        full_name: str,
        date_of_birth: Optional[str],
        country_code: Optional[str],
        check_type: str,
        user_reference: str,
    ) -> ComplianceCheckResult:
        types = CHECK_TYPE_MAP.get(check_type, [check_type])

        try:
            resp = requests.post(
                f'{self.base_url}/searches',
                params={'api_key': self.api_key},
                json={
                    'search_term': full_name,
                    'client_ref': user_reference,
                    'fuzziness': 0.6,
                    'filters': {
                        'types': types,
                        'birth_year': self._birth_year(date_of_birth),
                        'country_codes': [country_code] if country_code else [],
                    },
                },
                timeout=DEFAULT_TIMEOUT,
                headers={'User-Agent': 'CapimaxRT/1.0'},
            )
            resp.raise_for_status()
            data = resp.json().get('content', {}).get('data', {})

            hits = data.get('hits', [])
            result = 'hit' if hits else 'clear'
            confidence = self._confidence_from_hits(hits)

            return ComplianceCheckResult(
                check_type=check_type,
                result=result,
                confidence=confidence,
                provider='complyadvantage',
                provider_reference=str(data.get('id', '')),
                hits=hits[:25],  # cap to keep DB payload reasonable
                raw_response={
                    'search_id': data.get('id'),
                    'hit_count': len(hits),
                    'total_hits': data.get('total_hits', 0),
                },
            )
        except requests.RequestException as exc:
            logger.exception('ComplyAdvantage screen failed')
            return ComplianceCheckResult(
                check_type=check_type,
                result='error',
                provider='complyadvantage',
                raw_response={'error': str(exc)},
            )

    @staticmethod
    def _birth_year(date_of_birth) -> Optional[int]:
        if not date_of_birth:
            return None
        try:
            return int(str(date_of_birth)[:4])
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _confidence_from_hits(hits) -> Decimal:
        if not hits:
            return Decimal('99.0')
        # ComplyAdvantage scores 0-1; we present as 0-100.
        try:
            best = max(float(h.get('score', 0)) for h in hits)
        except (ValueError, TypeError):
            return Decimal('50.0')
        return Decimal(str(round(best * 100, 2)))
