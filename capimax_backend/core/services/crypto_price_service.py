"""
Cryptocurrency price service for real-time exchange rates.

This module provides integration with cryptocurrency price APIs
to fetch real-time exchange rates for various cryptocurrencies.
"""

import logging
import requests
from django.conf import settings
from django.core.cache import cache
from decimal import Decimal
from typing import Dict, Optional
from datetime import timedelta

logger = logging.getLogger(__name__)


class CryptoPriceService:
    """Service for fetching real-time cryptocurrency prices."""

    # CoinGecko API (free tier, no API key required for basic usage)
    BASE_URL = "https://api.coingecko.com/api/v3"

    # Currency mappings for CoinGecko
    CURRENCY_MAPPING = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDC': 'usd-coin',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'MATIC': 'matic-network',
    }

    @classmethod
    def get_exchange_rates(cls, currencies: list = None, vs_currency: str = 'usd') -> Dict[str, Decimal]:
        """
        Get exchange rates for cryptocurrencies against a fiat currency.

        Args:
            currencies: List of cryptocurrency symbols (e.g., ['BTC', 'ETH'])
            vs_currency: Target fiat currency (default: 'usd')

        Returns:
            Dictionary mapping currency symbols to their exchange rates
        """
        if currencies is None:
            currencies = ['BTC', 'ETH', 'USDC', 'USDT']

        # Check cache first
        cache_key = f"crypto_rates_{vs_currency}_{'_'.join(sorted(currencies))}"
        cached_rates = cache.get(cache_key)
        if cached_rates:
            return cached_rates

        rates = {}

        # Always include USD as 1:1
        if vs_currency.upper() == 'USD':
            rates['USD'] = Decimal('1.00')

        # Try to fetch from CoinGecko API
        try:
            coin_ids = []
            symbol_to_id = {}

            for currency in currencies:
                if currency in cls.CURRENCY_MAPPING:
                    coin_id = cls.CURRENCY_MAPPING[currency]
                    coin_ids.append(coin_id)
                    symbol_to_id[coin_id] = currency

            if coin_ids:
                # CoinGecko simple price endpoint
                url = f"{cls.BASE_URL}/simple/price"
                params = {
                    'ids': ','.join(coin_ids),
                    'vs_currencies': vs_currency.lower()
                }

                response = requests.get(url, params=params, timeout=5)

                if response.status_code == 200:
                    data = response.json()

                    for coin_id, price_data in data.items():
                        if coin_id in symbol_to_id and vs_currency.lower() in price_data:
                            symbol = symbol_to_id[coin_id]
                            price = Decimal(str(price_data[vs_currency.lower()]))
                            rates[symbol] = price

                    # Cache for 5 minutes
                    cache.set(cache_key, rates, 300)
                    logger.info(f"Successfully fetched crypto rates: {rates}")
                    return rates
                else:
                    logger.warning(f"Failed to fetch crypto rates: HTTP {response.status_code}")

        except requests.RequestException as e:
            logger.error(f"Error fetching crypto rates: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in crypto price service: {str(e)}")

        # Fallback to reasonable default rates if API fails
        default_rates = {
            'USD': Decimal('1.00'),
            'BTC': Decimal('45000.00'),
            'ETH': Decimal('3000.00'),
            'USDC': Decimal('1.00'),
            'USDT': Decimal('1.00'),
            'BNB': Decimal('400.00'),
            'MATIC': Decimal('0.80'),
        }

        # Cache fallback rates for 1 minute
        cache.set(cache_key, default_rates, 60)

        return {k: default_rates.get(k, Decimal('1.00')) for k in currencies if k in default_rates}

    @classmethod
    def get_crypto_quote(cls, from_currency: str, to_currency: str, amount: Decimal) -> Dict:
        """
        Get a quote for converting cryptocurrency to another currency.

        Args:
            from_currency: Source cryptocurrency symbol
            to_currency: Target currency symbol
            amount: Amount to convert

        Returns:
            Quote details including rate, converted amount, and fees
        """
        # Get current rates
        rates = cls.get_exchange_rates([from_currency], to_currency.lower())

        rate = rates.get(from_currency, Decimal('1.00'))
        converted_amount = amount * rate

        # Calculate network fees (these should be fetched from blockchain data in production)
        network_fees = {
            'BTC': Decimal('0.0001'),  # ~$4.50 at $45k/BTC
            'ETH': Decimal('0.002'),   # ~$6 at $3k/ETH
            'USDC': Decimal('1.00'),   # Fixed fee for stablecoins
            'USDT': Decimal('1.00'),
            'BNB': Decimal('0.001'),    # ~$0.40 at $400/BNB
            'MATIC': Decimal('0.01'),   # ~$0.01 at $0.80/MATIC
        }

        network_fee = network_fees.get(from_currency, Decimal('1.00'))

        return {
            'from_currency': from_currency,
            'to_currency': to_currency,
            'amount': amount,
            'rate': rate,
            'converted_amount': converted_amount,
            'network_fee': network_fee,
            'processing_fee': converted_amount * Decimal('0.001'),  # 0.1% processing fee
            'total_amount': converted_amount + network_fee,
            'valid_until': None,  # Will be set by the caller
        }

    @classmethod
    def convert_to_usd(cls, amount: Decimal, currency: str) -> Decimal:
        """
        Convert an amount from a cryptocurrency to USD.

        Args:
            amount: Amount in cryptocurrency
            currency: Cryptocurrency symbol

        Returns:
            Equivalent amount in USD
        """
        if currency.upper() == 'USD':
            return amount

        rates = cls.get_exchange_rates([currency], 'usd')
        rate = rates.get(currency, Decimal('1.00'))

        return amount * rate