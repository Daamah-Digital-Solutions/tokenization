"""
MaxMind GeoIP2 adapter for IP → country lookup.

Uses the MaxMind web service API (https://www.maxmind.com/en/geoip2-web-services).
Falls back to logging a warning and returning a "success=False" result if the
service is unreachable so calls don't crash the request pipeline.
"""

from __future__ import annotations

import logging
from typing import Optional

import requests
from django.conf import settings

from .interfaces import GeolocationProvider, GeolocationResult

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 5
HIGH_RISK_COUNTRIES = {
    # FATF high-risk + jurisdictions under increased monitoring (illustrative)
    'IR', 'KP', 'MM', 'SY',
}


class MaxMindGeolocationProvider(GeolocationProvider):

    def __init__(self):
        self.user_id = getattr(settings, 'MAXMIND_USER_ID', '')
        self.license_key = getattr(settings, 'MAXMIND_LICENSE_KEY', '')
        self.endpoint = getattr(
            settings, 'MAXMIND_ENDPOINT',
            'https://geoip.maxmind.com/geoip/v2.1/country/',
        )
        if not self.license_key:
            raise RuntimeError(
                "MaxMind credentials missing. Set MAXMIND_LICENSE_KEY and "
                "MAXMIND_USER_ID."
            )

    def lookup(self, ip_address: str) -> GeolocationResult:
        if not ip_address:
            return GeolocationResult(success=False, error='no ip')

        try:
            resp = requests.get(
                f'{self.endpoint}{ip_address}',
                auth=(self.user_id, self.license_key),
                timeout=DEFAULT_TIMEOUT,
                headers={'User-Agent': 'CapimaxRT/1.0'},
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as exc:
            logger.warning('MaxMind lookup failed', extra={'ip': ip_address, 'err': str(exc)})
            return GeolocationResult(success=False, error=str(exc))

        country = (data.get('country') or {})
        country_code = country.get('iso_code', '')
        return GeolocationResult(
            success=True,
            country_code=country_code,
            country_name=country.get('names', {}).get('en', ''),
            is_high_risk=country_code in HIGH_RISK_COUNTRIES,
            is_suspicious=bool(data.get('traits', {}).get('is_anonymous_proxy')
                              or data.get('traits', {}).get('is_satellite_provider')),
            raw_response=data,
        )
