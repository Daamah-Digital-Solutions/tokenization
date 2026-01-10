#!/usr/bin/env python
"""Test the crypto price service."""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings.development')
django.setup()

from core.services.crypto_price_service import CryptoPriceService
from decimal import Decimal

def test_crypto_prices():
    """Test fetching crypto prices."""
    print("Testing Crypto Price Service...")
    print("-" * 50)

    # Test getting exchange rates
    currencies = ['BTC', 'ETH', 'USDC', 'USDT']
    rates = CryptoPriceService.get_exchange_rates(currencies, 'usd')

    print("Exchange Rates (vs USD):")
    for currency, rate in rates.items():
        print(f"  {currency}: ${rate:,.2f}")

    print("\n" + "-" * 50)

    # Test crypto quote
    quote = CryptoPriceService.get_crypto_quote('BTC', 'USD', Decimal('0.1'))
    print(f"Quote for 0.1 BTC to USD:")
    print(f"  Rate: ${quote['rate']:,.2f}")
    print(f"  Converted Amount: ${quote['converted_amount']:,.2f}")
    print(f"  Network Fee: {quote['network_fee']} BTC")
    print(f"  Processing Fee: ${quote['processing_fee']:,.2f}")

    print("\n" + "-" * 50)

    # Test USD conversion
    btc_amount = Decimal('0.5')
    usd_value = CryptoPriceService.convert_to_usd(btc_amount, 'BTC')
    print(f"0.5 BTC = ${usd_value:,.2f} USD")

    eth_amount = Decimal('2.0')
    usd_value = CryptoPriceService.convert_to_usd(eth_amount, 'ETH')
    print(f"2.0 ETH = ${usd_value:,.2f} USD")

    print("\n✅ Crypto Price Service is working!")

if __name__ == '__main__':
    test_crypto_prices()