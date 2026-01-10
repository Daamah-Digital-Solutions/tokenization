"""
NOWPayments Service for Capimax Real Estate Tokenization Platform.

This module provides integration with NOWPayments crypto payment gateway
for processing cryptocurrency payments with support for 150+ cryptocurrencies.
"""

import requests
import hmac
import hashlib
import logging
from typing import Dict, List, Optional, Any
from decimal import Decimal
from django.conf import settings
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class NOWPaymentsPayment:
    """Data class for NOWPayments payment."""
    payment_id: str
    pay_address: str
    pay_amount: Decimal
    pay_currency: str
    price_amount: Decimal
    price_currency: str
    order_id: str
    payment_status: str
    payment_url: Optional[str] = None
    invoice_id: Optional[str] = None
    ipn_callback_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> 'NOWPaymentsPayment':
        """Create NOWPaymentsPayment from API response."""
        return cls(
            payment_id=str(data.get('payment_id', '')),
            pay_address=data.get('pay_address', ''),
            pay_amount=Decimal(str(data.get('pay_amount', 0))),
            pay_currency=data.get('pay_currency', ''),
            price_amount=Decimal(str(data.get('price_amount', 0))),
            price_currency=data.get('price_currency', ''),
            order_id=data.get('order_id', ''),
            payment_status=data.get('payment_status', ''),
            payment_url=data.get('payment_url'),
            invoice_id=data.get('invoice_id'),
            ipn_callback_url=data.get('ipn_callback_url'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )


class NOWPaymentsService:
    """
    Service for interacting with NOWPayments API.

    Handles cryptocurrency payment creation, status checking,
    and webhook verification for crypto payments.
    """

    API_BASE_URL = "https://api.nowpayments.io/v1"
    SANDBOX_API_URL = "https://api-sandbox.nowpayments.io/v1"

    def __init__(self, api_key: Optional[str] = None, ipn_secret: Optional[str] = None, use_sandbox: bool = False):
        """
        Initialize NOWPayments service.

        Args:
            api_key: NOWPayments API key (defaults to settings)
            ipn_secret: IPN secret for webhook verification (defaults to settings)
            use_sandbox: Whether to use sandbox API
        """
        self.api_key = api_key or getattr(settings, 'NOWPAYMENTS_API_KEY', '')
        self.ipn_secret = ipn_secret or getattr(settings, 'NOWPAYMENTS_IPN_SECRET', '')
        self.use_sandbox = use_sandbox or getattr(settings, 'NOWPAYMENTS_SANDBOX', False)
        self.base_url = self.SANDBOX_API_URL if self.use_sandbox else self.API_BASE_URL

        if not self.api_key:
            logger.warning("NOWPayments API key not configured")

    def _get_headers(self) -> Dict[str, str]:
        """Get API request headers."""
        return {
            'x-api-key': self.api_key,
            'Content-Type': 'application/json'
        }

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make API request to NOWPayments.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request data

        Returns:
            API response as dict

        Raises:
            Exception: If API request fails
        """
        url = f"{self.base_url}/{endpoint}"
        headers = self._get_headers()

        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=data, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"NOWPayments API request failed: {str(e)}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response: {e.response.text}")
            raise Exception(f"NOWPayments API error: {str(e)}")

    def get_api_status(self) -> Dict[str, Any]:
        """Get API status."""
        try:
            return self._make_request('GET', 'status')
        except Exception as e:
            logger.error(f"Failed to get API status: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    def get_available_currencies(self) -> List[str]:
        """
        Get list of available cryptocurrencies.

        Returns:
            List of currency codes (e.g., ['BTC', 'ETH', 'USDT'])
        """
        try:
            response = self._make_request('GET', 'currencies')
            return response.get('currencies', [])
        except Exception as e:
            logger.error(f"Failed to get available currencies: {str(e)}")
            return []

    def get_minimum_payment_amount(self, currency_from: str, currency_to: str) -> Optional[Decimal]:
        """
        Get minimum payment amount for currency pair.

        Args:
            currency_from: Source currency (e.g., 'BTC')
            currency_to: Target currency (e.g., 'USD')

        Returns:
            Minimum payment amount or None
        """
        try:
            response = self._make_request('GET', 'min-amount', {
                'currency_from': currency_from,
                'currency_to': currency_to
            })
            return Decimal(str(response.get('min_amount', 0)))
        except Exception as e:
            logger.error(f"Failed to get minimum amount: {str(e)}")
            return None

    def get_estimated_price(self, amount: Decimal, currency_from: str, currency_to: str) -> Dict[str, Any]:
        """
        Get estimated price for conversion.

        Args:
            amount: Amount to convert
            currency_from: Source currency
            currency_to: Target currency

        Returns:
            Estimated price information
        """
        try:
            return self._make_request('GET', 'estimate', {
                'amount': str(amount),
                'currency_from': currency_from,
                'currency_to': currency_to
            })
        except Exception as e:
            logger.error(f"Failed to get estimated price: {str(e)}")
            return {}

    def create_payment(
        self,
        price_amount: Decimal,
        price_currency: str,
        pay_currency: str,
        order_id: str,
        order_description: str = "",
        ipn_callback_url: Optional[str] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> Optional[NOWPaymentsPayment]:
        """
        Create a new payment.

        Args:
            price_amount: Amount in fiat/base currency
            price_currency: Base currency (e.g., 'USD')
            pay_currency: Cryptocurrency to receive (e.g., 'BTC')
            order_id: Unique order identifier
            order_description: Description of the order
            ipn_callback_url: IPN callback URL for payment notifications
            success_url: Redirect URL on successful payment
            cancel_url: Redirect URL on cancelled payment

        Returns:
            NOWPaymentsPayment object or None if creation failed
        """
        try:
            data = {
                'price_amount': str(price_amount),
                'price_currency': price_currency,
                'pay_currency': pay_currency,
                'order_id': order_id,
                'order_description': order_description
            }

            if ipn_callback_url:
                data['ipn_callback_url'] = ipn_callback_url
            if success_url:
                data['success_url'] = success_url
            if cancel_url:
                data['cancel_url'] = cancel_url

            response = self._make_request('POST', 'payment', data)
            return NOWPaymentsPayment.from_api_response(response)

        except Exception as e:
            logger.error(f"Failed to create payment: {str(e)}")
            return None

    def create_invoice(
        self,
        price_amount: Decimal,
        price_currency: str,
        order_id: str,
        order_description: str = "",
        ipn_callback_url: Optional[str] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create a payment invoice (allows user to choose crypto currency).

        Args:
            price_amount: Amount in fiat/base currency
            price_currency: Base currency (e.g., 'USD')
            order_id: Unique order identifier
            order_description: Description of the order
            ipn_callback_url: IPN callback URL
            success_url: Success redirect URL
            cancel_url: Cancel redirect URL

        Returns:
            Invoice data or None if creation failed
        """
        try:
            data = {
                'price_amount': str(price_amount),
                'price_currency': price_currency,
                'order_id': order_id,
                'order_description': order_description
            }

            if ipn_callback_url:
                data['ipn_callback_url'] = ipn_callback_url
            if success_url:
                data['success_url'] = success_url
            if cancel_url:
                data['cancel_url'] = cancel_url

            response = self._make_request('POST', 'invoice', data)
            return response

        except Exception as e:
            logger.error(f"Failed to create invoice: {str(e)}")
            return None

    def get_payment_status(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """
        Get payment status.

        Args:
            payment_id: NOWPayments payment ID

        Returns:
            Payment status data or None
        """
        try:
            return self._make_request('GET', f'payment/{payment_id}')
        except Exception as e:
            logger.error(f"Failed to get payment status: {str(e)}")
            return None

    def verify_ipn_signature(self, request_data: bytes, signature: str) -> bool:
        """
        Verify IPN callback signature.

        Args:
            request_data: Raw request body bytes
            signature: HMAC signature from request header

        Returns:
            True if signature is valid, False otherwise
        """
        if not self.ipn_secret:
            logger.warning("IPN secret not configured, cannot verify signature")
            return False

        try:
            # Calculate expected signature
            expected_signature = hmac.new(
                self.ipn_secret.encode('utf-8'),
                request_data,
                hashlib.sha512
            ).hexdigest()

            # Compare signatures
            return hmac.compare_digest(expected_signature, signature)

        except Exception as e:
            logger.error(f"Failed to verify IPN signature: {str(e)}")
            return False

    def get_exchange_rate(self, currency_from: str, currency_to: str) -> Optional[Decimal]:
        """
        Get current exchange rate between currencies.

        Args:
            currency_from: Source currency
            currency_to: Target currency

        Returns:
            Exchange rate or None
        """
        try:
            estimate = self.get_estimated_price(Decimal('1'), currency_from, currency_to)
            return Decimal(str(estimate.get('estimated_amount', 0)))
        except Exception as e:
            logger.error(f"Failed to get exchange rate: {str(e)}")
            return None

    def list_payments(self, limit: int = 10, page: int = 0) -> List[Dict[str, Any]]:
        """
        List payments.

        Args:
            limit: Number of payments to return
            page: Page number

        Returns:
            List of payment data
        """
        try:
            response = self._make_request('GET', 'payment', {
                'limit': limit,
                'page': page
            })
            return response.get('data', [])
        except Exception as e:
            logger.error(f"Failed to list payments: {str(e)}")
            return []
