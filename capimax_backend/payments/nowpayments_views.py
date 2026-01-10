"""
NOWPayments Views for Capimax Real Estate Tokenization Platform.

This module contains views for NOWPayments cryptocurrency payment processing
including payment creation, status checking, and IPN webhooks.
"""

import json
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Payment, PaymentMethod, PaymentStatus, NOWPaymentsTransaction, WalletBalance, WalletTransaction
from .nowpayments_service import NOWPaymentsService, NOWPaymentsPayment
from core.utils import create_success_response, create_error_response
from core.services.email_service import EmailService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nowpayments_currencies(request):
    """
    Get list of available cryptocurrencies for NOWPayments.

    Returns list of supported crypto currencies with their details.
    """
    try:
        service = NOWPaymentsService()
        currencies = service.get_available_currencies()

        if not currencies:
            return Response(
                create_error_response("Failed to retrieve currencies"),
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(create_success_response(
            data={'currencies': currencies},
            message=f"{len(currencies)} cryptocurrencies available"
        ))

    except Exception as e:
        logger.error(f"Error fetching NOWPayments currencies: {str(e)}")
        return Response(
            create_error_response("Failed to fetch currencies"),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nowpayments_estimate(request):
    """
    Get estimated price for cryptocurrency payment.

    Request body:
    {
        "amount": "100.00",
        "currency_from": "USD",
        "currency_to": "BTC"
    }
    """
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
        currency_from = request.data.get('currency_from', '').upper()
        currency_to = request.data.get('currency_to', '').upper()

        if amount <= 0:
            return Response(
                create_error_response("Invalid amount"),
                status=status.HTTP_400_BAD_REQUEST
            )

        if not currency_from or not currency_to:
            return Response(
                create_error_response("Currency codes required"),
                status=status.HTTP_400_BAD_REQUEST
            )

        service = NOWPaymentsService()

        # Get minimum amount
        min_amount = service.get_minimum_payment_amount(currency_to, currency_from)

        # Get estimated price
        estimate = service.get_estimated_price(amount, currency_from, currency_to)

        if not estimate:
            return Response(
                create_error_response("Failed to get price estimate"),
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(create_success_response(data={
            'amount': str(amount),
            'currency_from': currency_from,
            'currency_to': currency_to,
            'estimated_amount': estimate.get('estimated_amount'),
            'min_amount': str(min_amount) if min_amount else None,
            'exchange_rate': estimate.get('exchange_rate'),
            'valid_until': (timezone.now() + timezone.timedelta(minutes=15)).isoformat()
        }))

    except Exception as e:
        logger.error(f"Error estimating NOWPayments price: {str(e)}")
        return Response(
            create_error_response("Failed to estimate price"),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nowpayments_create_payment(request):
    """
    Create a NOWPayments cryptocurrency payment.

    Request body:
    {
        "amount": "100.00",
        "currency": "USD",
        "pay_currency": "BTC",
        "order_description": "Property investment",
        "investment_id": "uuid" (optional)
    }
    """
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
        currency = request.data.get('currency', 'USD').upper()
        pay_currency = request.data.get('pay_currency', '').upper()
        order_description = request.data.get('order_description', '')
        investment_id = request.data.get('investment_id')

        if amount <= 0:
            return Response(
                create_error_response("Invalid amount"),
                status=status.HTTP_400_BAD_REQUEST
            )

        if not pay_currency:
            return Response(
                create_error_response("Cryptocurrency required"),
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create internal payment record
            payment = Payment.objects.create(
                user=request.user,
                amount=amount,
                currency=currency,
                payment_method=PaymentMethod.CRYPTOCURRENCY,
                status=PaymentStatus.PENDING,
                net_amount=amount,
                investment_id=investment_id,
                metadata={
                    'provider': 'nowpayments',
                    'pay_currency': pay_currency,
                    'order_description': order_description
                }
            )

            # Create NOWPayments payment
            service = NOWPaymentsService()

            # Build IPN callback URL
            ipn_callback_url = request.build_absolute_uri('/api/v1/payments/nowpayments/ipn/')

            # Build redirect URLs
            success_url = request.data.get('success_url', request.build_absolute_uri('/dashboard'))
            cancel_url = request.data.get('cancel_url', request.build_absolute_uri('/dashboard'))

            # Create payment
            nowpayments_payment = service.create_payment(
                price_amount=amount,
                price_currency=currency,
                pay_currency=pay_currency,
                order_id=str(payment.id),
                order_description=order_description or f"Property investment - Order {payment.id}",
                ipn_callback_url=ipn_callback_url,
                success_url=success_url,
                cancel_url=cancel_url
            )

            if not nowpayments_payment:
                payment.status = PaymentStatus.FAILED
                payment.save()
                return Response(
                    create_error_response("Failed to create NOWPayments transaction"),
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # Create NOWPayments transaction record
            nowpayments_tx = NOWPaymentsTransaction.objects.create(
                payment=payment,
                nowpayments_payment_id=nowpayments_payment.payment_id,
                order_id=str(payment.id),
                payment_status=nowpayments_payment.payment_status,
                pay_address=nowpayments_payment.pay_address,
                pay_amount=nowpayments_payment.pay_amount,
                pay_currency=nowpayments_payment.pay_currency,
                price_amount=nowpayments_payment.price_amount,
                price_currency=nowpayments_payment.price_currency,
                order_description=order_description,
                invoice_id=nowpayments_payment.invoice_id,
                invoice_url=nowpayments_payment.payment_url,
                ipn_callback_url=nowpayments_payment.ipn_callback_url
            )

            # Update payment with external transaction ID
            payment.external_transaction_id = nowpayments_payment.payment_id
            payment.save()

            return Response(create_success_response(
                data={
                    'payment_id': str(payment.id),
                    'nowpayments_payment_id': nowpayments_payment.payment_id,
                    'pay_address': nowpayments_payment.pay_address,
                    'pay_amount': str(nowpayments_payment.pay_amount),
                    'pay_currency': nowpayments_payment.pay_currency,
                    'payment_status': nowpayments_payment.payment_status,
                    'payment_url': nowpayments_payment.payment_url,
                    'created_at': nowpayments_payment.created_at
                },
                message="NOWPayments transaction created successfully"
            ), status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error creating NOWPayments payment: {str(e)}")
        return Response(
            create_error_response(f"Failed to create payment: {str(e)}"),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nowpayments_create_invoice(request):
    """
    Create a NOWPayments invoice (user selects cryptocurrency).

    Request body:
    {
        "amount": "100.00",
        "currency": "USD",
        "order_description": "Property investment",
        "investment_id": "uuid" (optional)
    }
    """
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
        currency = request.data.get('currency', 'USD').upper()
        order_description = request.data.get('order_description', '')
        investment_id = request.data.get('investment_id')

        if amount <= 0:
            return Response(
                create_error_response("Invalid amount"),
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create internal payment record
            payment = Payment.objects.create(
                user=request.user,
                amount=amount,
                currency=currency,
                payment_method=PaymentMethod.CRYPTOCURRENCY,
                status=PaymentStatus.PENDING,
                net_amount=amount,
                investment_id=investment_id,
                metadata={
                    'provider': 'nowpayments',
                    'type': 'invoice',
                    'order_description': order_description
                }
            )

            # Create NOWPayments invoice
            service = NOWPaymentsService()

            # Build IPN callback URL
            ipn_callback_url = request.build_absolute_uri('/api/v1/payments/nowpayments/ipn/')

            # Build redirect URLs
            success_url = request.data.get('success_url', request.build_absolute_uri('/dashboard'))
            cancel_url = request.data.get('cancel_url', request.build_absolute_uri('/dashboard'))

            # Create invoice
            invoice = service.create_invoice(
                price_amount=amount,
                price_currency=currency,
                order_id=str(payment.id),
                order_description=order_description or f"Property investment - Order {payment.id}",
                ipn_callback_url=ipn_callback_url,
                success_url=success_url,
                cancel_url=cancel_url
            )

            if not invoice:
                payment.status = PaymentStatus.FAILED
                payment.save()
                return Response(
                    create_error_response("Failed to create NOWPayments invoice"),
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # Update payment with invoice data
            payment.external_transaction_id = invoice.get('id')
            payment.metadata['invoice_url'] = invoice.get('invoice_url')
            payment.save()

            return Response(create_success_response(
                data={
                    'payment_id': str(payment.id),
                    'invoice_id': invoice.get('id'),
                    'invoice_url': invoice.get('invoice_url'),
                    'created_at': invoice.get('created_at')
                },
                message="NOWPayments invoice created successfully"
            ), status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error creating NOWPayments invoice: {str(e)}")
        return Response(
            create_error_response(f"Failed to create invoice: {str(e)}"),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nowpayments_payment_status(request, payment_id):
    """Get NOWPayments payment status."""
    try:
        # Get internal payment
        payment = Payment.objects.get(id=payment_id, user=request.user)

        # Get NOWPayments transaction
        nowpayments_tx = NOWPaymentsTransaction.objects.get(payment=payment)

        # Fetch latest status from NOWPayments
        service = NOWPaymentsService()
        payment_status_data = service.get_payment_status(nowpayments_tx.nowpayments_payment_id)

        if payment_status_data:
            # Update transaction with latest status
            nowpayments_tx.payment_status = payment_status_data.get('payment_status', nowpayments_tx.payment_status)
            nowpayments_tx.actually_paid = Decimal(str(payment_status_data.get('actually_paid', 0)))

            if payment_status_data.get('outcome_amount'):
                nowpayments_tx.outcome_amount = Decimal(str(payment_status_data['outcome_amount']))
            if payment_status_data.get('outcome_currency'):
                nowpayments_tx.outcome_currency = payment_status_data['outcome_currency']

            nowpayments_tx.save()

            # Update internal payment status
            if nowpayments_tx.payment_status == 'finished':
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = timezone.now()
                payment.save()
            elif nowpayments_tx.is_failed:
                payment.status = PaymentStatus.FAILED
                payment.save()

        return Response(create_success_response(data={
            'payment_id': str(payment.id),
            'nowpayments_payment_id': nowpayments_tx.nowpayments_payment_id,
            'payment_status': nowpayments_tx.payment_status,
            'pay_address': nowpayments_tx.pay_address,
            'pay_amount': str(nowpayments_tx.pay_amount),
            'pay_currency': nowpayments_tx.pay_currency,
            'actually_paid': str(nowpayments_tx.actually_paid),
            'is_completed': nowpayments_tx.is_completed,
            'is_pending': nowpayments_tx.is_pending,
            'is_failed': nowpayments_tx.is_failed
        }))

    except Payment.DoesNotExist:
        return Response(
            create_error_response("Payment not found"),
            status=status.HTTP_404_NOT_FOUND
        )
    except NOWPaymentsTransaction.DoesNotExist:
        return Response(
            create_error_response("NOWPayments transaction not found"),
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error fetching payment status: {str(e)}")
        return Response(
            create_error_response("Failed to fetch payment status"),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def nowpayments_ipn_callback(request):
    """
    Handle NOWPayments IPN (Instant Payment Notification) callbacks.

    This endpoint receives webhook notifications from NOWPayments
    when payment status changes.
    """
    try:
        # Verify IPN signature
        signature = request.headers.get('x-nowpayments-sig', '')
        service = NOWPaymentsService()

        if not service.verify_ipn_signature(request.body, signature):
            logger.warning("Invalid IPN signature received")
            return Response(
                create_error_response("Invalid signature"),
                status=status.HTTP_403_FORBIDDEN
            )

        # Parse IPN data
        ipn_data = json.loads(request.body)
        logger.info(f"NOWPayments IPN received: {ipn_data}")

        payment_status = ipn_data.get('payment_status')
        nowpayments_payment_id = str(ipn_data.get('payment_id', ''))
        order_id = ipn_data.get('order_id', '')

        # Find NOWPayments transaction
        try:
            nowpayments_tx = NOWPaymentsTransaction.objects.get(
                nowpayments_payment_id=nowpayments_payment_id
            )
        except NOWPaymentsTransaction.DoesNotExist:
            logger.warning(f"NOWPayments transaction not found: {nowpayments_payment_id}")
            return Response(create_success_response(message="Transaction not found"))

        # Update transaction with new data
        nowpayments_tx.payment_status = payment_status
        nowpayments_tx.actually_paid = Decimal(str(ipn_data.get('actually_paid', 0)))

        if ipn_data.get('outcome_amount'):
            nowpayments_tx.outcome_amount = Decimal(str(ipn_data['outcome_amount']))
        if ipn_data.get('outcome_currency'):
            nowpayments_tx.outcome_currency = ipn_data['outcome_currency']
        if ipn_data.get('network_fee'):
            nowpayments_tx.network_fee = Decimal(str(ipn_data['network_fee']))
        if ipn_data.get('tx_hash'):
            nowpayments_tx.transaction_hash = ipn_data['tx_hash']

        nowpayments_tx.save()

        # Update payment status
        payment = nowpayments_tx.payment

        if payment_status == 'finished':
            with transaction.atomic():
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = timezone.now()
                payment.transaction_hash = ipn_data.get('tx_hash')
                payment.save()

                # Credit wallet balance
                wallet_balance, created = WalletBalance.objects.get_or_create(
                    user=payment.user,
                    currency=payment.currency,
                    defaults={'available_balance': Decimal('0.00')}
                )

                previous_balance = wallet_balance.available_balance
                wallet_balance.available_balance += payment.net_amount
                wallet_balance.save()

                # Create wallet transaction record
                wallet_tx = WalletTransaction.objects.create(
                    user=payment.user,
                    transaction_type='deposit',
                    amount=payment.net_amount,
                    currency=payment.currency,
                    balance_before=previous_balance,
                    balance_after=wallet_balance.available_balance,
                    reference_id=payment.id,
                    description=f"Crypto payment (NOWPayments) - {nowpayments_tx.pay_currency}"
                )

                # Send notification email
                try:
                    transaction_details = {
                        'type': 'Crypto Deposit',
                        'amount': str(payment.net_amount),
                        'transaction_id': str(wallet_tx.id),
                        'payment_method': f'Cryptocurrency ({nowpayments_tx.pay_currency})',
                        'status': 'Confirmed',
                        'previous_balance': str(previous_balance),
                        'new_balance': str(wallet_balance.available_balance),
                        'id': wallet_tx.id,
                        'crypto_amount': str(nowpayments_tx.actually_paid),
                        'crypto_currency': nowpayments_tx.pay_currency
                    }

                    EmailService.send_funds_notification_email(
                        user=payment.user,
                        transaction_details=transaction_details
                    )
                    logger.info(f"Funds notification email sent for NOWPayments payment {payment.id}")
                except Exception as e:
                    logger.error(f"Failed to send funds notification email: {str(e)}")

        elif payment_status in ['failed', 'expired']:
            payment.status = PaymentStatus.FAILED
            payment.save()

        return Response(create_success_response(message="IPN processed successfully"))

    except Exception as e:
        logger.error(f"Error processing NOWPayments IPN: {str(e)}")
        return Response(
            create_error_response("IPN processing failed"),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
