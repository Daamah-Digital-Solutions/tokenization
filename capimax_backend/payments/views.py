"""
Payment Views for Capimax Real Estate Tokenization Platform.

This module contains views for payment processing, wallet management,
and financial transactions with multi-provider support.
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction, models
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from decimal import Decimal
from datetime import timedelta
import logging
import json
import stripe
import requests
from typing import Dict, Any, Optional

from .models import (
    Payment, UserPaymentMethod, WalletBalance, WalletTransaction,
    CryptoPayment, Refund, RecurringPayment, PaymentMethod, PaymentStatus
)
from .serializers import (
    PaymentMethodSerializer, PaymentCreateSerializer, PaymentSerializer,
    WalletBalanceSerializer, WalletTransactionSerializer, CryptoPaymentSerializer,
    RefundCreateSerializer, RefundSerializer, RecurringPaymentCreateSerializer,
    RecurringPaymentSerializer, PaymentEstimateSerializer, PaymentQuoteSerializer,
    StripePaymentIntentSerializer, PaymentConfirmationSerializer,
    WalletDepositSerializer, WalletWithdrawalSerializer
)
from core.utils import create_success_response, create_error_response
from core.services.crypto_price_service import CryptoPriceService
from core.services.email_service import EmailService
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)


class PaymentMethodViewSet(ModelViewSet):
    """ViewSet for managing user payment methods."""
    
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get payment methods for current user."""
        # Handle schema generation for drf-yasg
        if getattr(self, 'swagger_fake_view', False):
            return UserPaymentMethod.objects.none()
        return UserPaymentMethod.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create payment method for current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set payment method as default."""
        payment_method = self.get_object()
        
        # Remove default from other payment methods
        UserPaymentMethod.objects.filter(
            user=request.user, 
            is_default=True
        ).update(is_default=False)
        
        # Set this as default
        payment_method.is_default = True
        payment_method.save()
        
        return Response(create_success_response(
            data=PaymentMethodSerializer(payment_method).data,
            message="Payment method set as default"
        ))


class PaymentViewSet(ModelViewSet):
    """ViewSet for payment management."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Get appropriate serializer based on action."""
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer
    
    def get_queryset(self):
        """Get payments for current user."""
        # Handle schema generation for drf-yasg
        if getattr(self, 'swagger_fake_view', False):
            return Payment.objects.none()
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create payment for current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def estimate(self, request):
        """Estimate payment fees and processing time."""
        serializer = PaymentEstimateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response("Invalid data", details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = serializer.validated_data['amount']
        payment_method = serializer.validated_data['payment_method']
        currency = serializer.validated_data['currency']
        
        # Calculate fees based on payment method
        fee_rates = {
            PaymentMethod.CREDIT_CARD: Decimal('0.029'),  # 2.9%
            PaymentMethod.BANK_TRANSFER: Decimal('0.005'),  # 0.5%
            PaymentMethod.CRYPTOCURRENCY: Decimal('0.01'),  # 1%
            PaymentMethod.PAYPAL: Decimal('0.034'),  # 3.4%
        }
        
        fee_rate = fee_rates.get(payment_method, Decimal('0.029'))
        processing_fee = (amount * fee_rate).quantize(Decimal('0.01'))
        net_amount = amount - processing_fee
        
        # Estimate processing time
        processing_times = {
            PaymentMethod.CREDIT_CARD: "Instant",
            PaymentMethod.BANK_TRANSFER: "1-3 business days",
            PaymentMethod.CRYPTOCURRENCY: "10-60 minutes",
            PaymentMethod.PAYPAL: "Instant",
        }
        
        return Response(create_success_response(data={
            'amount': amount,
            'currency': currency,
            'payment_method': payment_method,
            'processing_fee': processing_fee,
            'net_amount': net_amount,
            'fee_percentage': ((processing_fee / amount) * 100).quantize(Decimal('0.01')),
            'estimated_processing_time': processing_times.get(payment_method, "Unknown")
        }))
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel pending payment."""
        payment = self.get_object()
        
        if payment.status not in [PaymentStatus.PENDING, PaymentStatus.PROCESSING]:
            return Response(
                create_error_response("Payment cannot be cancelled in current status"),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payment.status = PaymentStatus.CANCELLED
        payment.save()
        
        # Release any locked tokens or wallet balance
        self._release_locked_resources(payment)
        
        return Response(create_success_response(
            data=PaymentSerializer(payment).data,
            message="Payment cancelled successfully"
        ))
    
    def _release_locked_resources(self, payment):
        """Release locked resources when payment is cancelled."""
        # Implementation would depend on specific business logic
        # This is a placeholder for resource release logic
        pass


class StripePaymentView(APIView):
    """Handle Stripe payment processing."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, action):
        """Handle Stripe payment actions."""
        if action == 'create-payment-intent':
            return self._create_payment_intent(request)
        elif action == 'confirm-payment':
            return self._confirm_payment(request)
        else:
            return Response(
                create_error_response("Invalid action"),
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _create_payment_intent(self, request):
        """Create Stripe payment intent."""
        serializer = StripePaymentIntentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response("Invalid data", details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount_cents = int(serializer.validated_data['amount'] * 100)
            currency = serializer.validated_data['currency'].lower()
            
            # Create payment intent with Stripe
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                automatic_payment_methods={'enabled': True},
                metadata={
                    'user_id': str(request.user.id),
                    'investment_id': str(serializer.validated_data.get('investment_id', '')),
                }
            )
            
            # Create payment record
            payment = Payment.objects.create(
                user=request.user,
                amount=serializer.validated_data['amount'],
                currency=currency.upper(),
                payment_method=PaymentMethod.CREDIT_CARD,
                payment_intent_id=payment_intent.id,
                net_amount=serializer.validated_data['amount'],
                investment_id=serializer.validated_data.get('investment_id'),
                metadata={
                    'stripe_payment_intent_id': payment_intent.id,
                    'save_payment_method': serializer.validated_data.get('save_payment_method', False)
                }
            )
            
            return Response(create_success_response(data={
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'payment_id': payment.id,
            }))
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            return Response(
                create_error_response("Payment processing error"),
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            return Response(
                create_error_response("Internal server error"),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _confirm_payment(self, request):
        """Confirm Stripe payment."""
        serializer = PaymentConfirmationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response("Invalid data", details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            payment_intent_id = serializer.validated_data['payment_intent_id']
            
            # Retrieve payment intent from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Find corresponding payment record
            payment = Payment.objects.get(
                payment_intent_id=payment_intent_id,
                user=request.user
            )
            
            # Update payment status based on Stripe status
            if payment_intent.status == 'succeeded':
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = timezone.now()
                payment.external_transaction_id = payment_intent.id
                
                # Process successful payment
                self._process_successful_payment(payment)
                
            elif payment_intent.status in ['processing', 'requires_action']:
                payment.status = PaymentStatus.PROCESSING
            else:
                payment.status = PaymentStatus.FAILED
            
            payment.save()
            
            return Response(create_success_response(
                data=PaymentSerializer(payment).data,
                message="Payment processed successfully"
            ))
            
        except Payment.DoesNotExist:
            return Response(
                create_error_response("Payment not found"),
                status=status.HTTP_404_NOT_FOUND
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            return Response(
                create_error_response("Payment confirmation error"),
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            return Response(
                create_error_response("Internal server error"),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_successful_payment(self, payment):
        """Process successful payment."""
        with transaction.atomic():
            # Update wallet balance
            wallet_balance, created = WalletBalance.objects.get_or_create(
                user=payment.user,
                currency=payment.currency,
                defaults={'available_balance': Decimal('0.00')}
            )
            
            wallet_balance.available_balance += payment.net_amount
            wallet_balance.save()
            
            # Create wallet transaction record
            transaction_record = WalletTransaction.objects.create(
                user=payment.user,
                transaction_type='deposit',
                amount=payment.net_amount,
                currency=payment.currency,
                balance_before=wallet_balance.available_balance - payment.net_amount,
                balance_after=wallet_balance.available_balance,
                reference_id=payment.id,
                description=f"Payment deposit - {payment.payment_method}"
            )

            # Send funds notification email for deposit
            try:
                transaction_details = {
                    'type': 'Deposit',
                    'amount': str(payment.net_amount),
                    'transaction_id': str(transaction_record.id),
                    'payment_method': payment.payment_method.title(),
                    'status': 'Confirmed',
                    'previous_balance': str(wallet_balance.available_balance - payment.net_amount),
                    'new_balance': str(wallet_balance.available_balance),
                    'id': transaction_record.id
                }

                EmailService.send_funds_notification_email(
                    user=payment.user,
                    transaction_details=transaction_details
                )
                logger.info(f"Funds notification email sent for deposit {transaction_record.id}")
            except Exception as e:
                logger.error(f"Failed to send funds notification email for deposit {transaction_record.id}: {str(e)}")
            
            # Process investment if applicable
            if payment.investment:
                self._process_investment_payment(payment)
    
    def _process_investment_payment(self, payment):
        """Process payment for investment - triggers deferred token minting."""
        investment = payment.investment

        # Mark payment confirmed - tokens will be minted by Celery task
        # This sets status to PENDING_MINT and schedules minting
        investment.mark_payment_confirmed()

        # Reserve tokens (mark as sold) but don't mint yet
        # Actual on-chain minting happens via process_pending_mints Celery task
        property_obj = investment.property_investment
        property_obj.tokens_sold += investment.token_amount
        property_obj.save(update_fields=['tokens_sold'])

        logger.info(
            f"Investment {investment.id} payment confirmed. "
            f"Status: {investment.status}. Tokens will be minted by background task."
        )


class CryptoPaymentView(APIView):
    """Handle cryptocurrency payment processing."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, action):
        """Handle crypto payment actions."""
        if action == 'get-quote':
            return self._get_crypto_quote(request)
        elif action == 'create-payment':
            return self._create_crypto_payment(request)
        elif action == 'verify-payment':
            return self._verify_crypto_payment(request)
        else:
            return Response(
                create_error_response("Invalid action"),
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _get_crypto_quote(self, request):
        """Get cryptocurrency payment quote."""
        serializer = PaymentQuoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response("Invalid data", details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mock implementation - in production, integrate with price API
        quote_data = self._fetch_crypto_quote(
            serializer.validated_data['from_currency'],
            serializer.validated_data['to_currency'],
            serializer.validated_data['amount']
        )
        
        return Response(create_success_response(data=quote_data))
    
    def _create_crypto_payment(self, request):
        """Create cryptocurrency payment."""
        # Implementation would integrate with blockchain services
        # This is a simplified version for demonstration
        
        data = request.data
        
        try:
            # Create payment record
            payment = Payment.objects.create(
                user=request.user,
                amount=Decimal(data['amount']),
                currency=data['currency'],
                payment_method=PaymentMethod.CRYPTOCURRENCY,
                status=PaymentStatus.PENDING,
                net_amount=Decimal(data['amount'])
            )
            
            # Create crypto payment details
            crypto_payment = CryptoPayment.objects.create(
                payment=payment,
                wallet_address=data['wallet_address'],
                network=data['network'],
                confirmation_blocks_required=data.get('confirmations_required', 6)
            )
            
            return Response(create_success_response(data={
                'payment_id': payment.id,
                'wallet_address': crypto_payment.wallet_address,
                'network': crypto_payment.network,
                'amount': payment.amount,
                'currency': payment.currency,
                'status': payment.status
            }))
            
        except Exception as e:
            logger.error(f"Error creating crypto payment: {str(e)}")
            return Response(
                create_error_response("Crypto payment creation failed"),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _verify_crypto_payment(self, request):
        """Verify cryptocurrency payment on blockchain."""
        # Implementation would check blockchain for transaction confirmation
        # This is a placeholder implementation
        
        payment_id = request.data.get('payment_id')
        transaction_hash = request.data.get('transaction_hash')
        
        try:
            payment = Payment.objects.get(id=payment_id, user=request.user)
            crypto_payment = payment.crypto_details
            
            # Mock verification - in production, check blockchain
            is_verified = self._verify_blockchain_transaction(
                transaction_hash, 
                crypto_payment.wallet_address, 
                payment.amount
            )
            
            if is_verified:
                payment.status = PaymentStatus.COMPLETED
                payment.transaction_hash = transaction_hash
                payment.completed_at = timezone.now()
                payment.save()
                
                crypto_payment.confirmations = 6  # Mock confirmation count
                crypto_payment.save()
                
                # Process successful payment
                self._process_successful_crypto_payment(payment)
            
            return Response(create_success_response(data={
                'payment_id': payment.id,
                'verified': is_verified,
                'status': payment.status,
                'confirmations': crypto_payment.confirmations
            }))
            
        except Payment.DoesNotExist:
            return Response(
                create_error_response("Payment not found"),
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error verifying crypto payment: {str(e)}")
            return Response(
                create_error_response("Crypto payment verification failed"),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _fetch_crypto_quote(self, from_currency, to_currency, amount):
        """Fetch cryptocurrency quote from external API."""
        # Use real crypto price service
        quote = CryptoPriceService.get_crypto_quote(from_currency, to_currency, amount)
        quote['valid_until'] = timezone.now() + timedelta(minutes=15)
        return quote
    
    def _verify_blockchain_transaction(self, tx_hash, wallet_address, amount):
        """Verify blockchain transaction (mock implementation)."""
        # In production, this would connect to blockchain nodes
        # and verify the transaction details
        return True  # Mock verification success
    
    def _process_successful_crypto_payment(self, payment):
        """Process successful cryptocurrency payment."""
        # Similar to Stripe payment processing
        self._process_successful_payment(payment)


class WalletManagementView(APIView):
    """Handle wallet management operations."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's wallet balances."""
        balances = WalletBalance.objects.filter(user=request.user)
        serializer = WalletBalanceSerializer(balances, many=True)
        
        return Response(create_success_response(data={
            'balances': serializer.data,
            'total_value_usd': self._calculate_total_wallet_value(balances)
        }))
    
    def post(self, request, action):
        """Handle wallet actions."""
        if action == 'deposit':
            return self._deposit_funds(request)
        elif action == 'withdraw':
            return self._withdraw_funds(request)
        elif action == 'transfer':
            return self._transfer_funds(request)
        else:
            return Response(
                create_error_response("Invalid action"),
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _deposit_funds(self, request):
        """Deposit funds to wallet."""
        serializer = WalletDepositSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response("Invalid data", details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Create payment for deposit
                payment = Payment.objects.create(
                    user=request.user,
                    amount=serializer.validated_data['amount'],
                    currency=serializer.validated_data['currency'],
                    payment_method=PaymentMethod.CREDIT_CARD,
                    status=PaymentStatus.PENDING,
                    net_amount=serializer.validated_data['amount'],
                    metadata={'type': 'wallet_deposit'}
                )
                
                # Process payment through appropriate provider
                # This would integrate with Stripe or other payment processors
                
                return Response(create_success_response(data={
                    'payment_id': payment.id,
                    'amount': payment.amount,
                    'currency': payment.currency,
                    'status': payment.status
                }, message="Deposit initiated successfully"))
                
        except Exception as e:
            logger.error(f"Error processing wallet deposit: {str(e)}")
            return Response(
                create_error_response("Deposit processing failed"),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _withdraw_funds(self, request):
        """Withdraw funds from wallet."""
        serializer = WalletWithdrawalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response("Invalid data", details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                amount = serializer.validated_data['amount']
                currency = serializer.validated_data['currency']
                
                # Check available balance
                wallet_balance = WalletBalance.objects.get(
                    user=request.user,
                    currency=currency
                )
                
                if wallet_balance.available_balance < amount:
                    return Response(
                        create_error_response("Insufficient balance"),
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Lock funds for withdrawal
                wallet_balance.available_balance -= amount
                wallet_balance.locked_balance += amount
                wallet_balance.save()
                
                # Create withdrawal transaction
                transaction_record = WalletTransaction.objects.create(
                    user=request.user,
                    transaction_type='withdrawal',
                    amount=-amount,
                    currency=currency,
                    balance_before=wallet_balance.available_balance + amount,
                    balance_after=wallet_balance.available_balance,
                    description="Withdrawal request initiated"
                )

                # Send funds notification email for withdrawal
                try:
                    transaction_details = {
                        'type': 'Withdrawal',
                        'amount': str(amount),
                        'transaction_id': str(transaction_record.id),
                        'payment_method': 'Wallet Withdrawal',
                        'status': 'Processing',
                        'previous_balance': str(wallet_balance.available_balance + amount),
                        'new_balance': str(wallet_balance.available_balance),
                        'id': transaction_record.id
                    }

                    EmailService.send_funds_notification_email(
                        user=request.user,
                        transaction_details=transaction_details
                    )
                    logger.info(f"Funds notification email sent for withdrawal {transaction_record.id}")
                except Exception as e:
                    logger.error(f"Failed to send funds notification email for withdrawal {transaction_record.id}: {str(e)}")
                
                return Response(create_success_response(data={
                    'transaction_id': transaction_record.id,
                    'amount': amount,
                    'currency': currency,
                    'status': 'pending',
                    'estimated_completion': timezone.now() + timedelta(days=2)
                }, message="Withdrawal initiated successfully"))
                
        except WalletBalance.DoesNotExist:
            return Response(
                create_error_response("Wallet balance not found"),
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error processing withdrawal: {str(e)}")
            return Response(
                create_error_response("Withdrawal processing failed"),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _transfer_funds(self, request):
        """Transfer funds between currencies or to other users."""
        # Implementation for internal fund transfers
        return Response(create_error_response("Transfer functionality not yet implemented"))
    
    def _calculate_total_wallet_value(self, balances):
        """Calculate total wallet value in USD."""
        total = Decimal('0.00')

        # Collect all unique currencies
        currencies = [b.currency for b in balances if b.currency != 'USD']

        # Get real exchange rates if we have non-USD currencies
        if currencies:
            rates = CryptoPriceService.get_exchange_rates(currencies, 'usd')
        else:
            rates = {}

        for balance in balances:
            if balance.currency == 'USD':
                total += balance.total_balance
            else:
                # Use real exchange rate, fallback to 1:1 if not available
                rate = rates.get(balance.currency, Decimal('1.00'))
                total += balance.total_balance * rate

        return total


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wallet_transactions(request):
    """Get user's wallet transaction history."""
    transactions = WalletTransaction.objects.filter(user=request.user).order_by('-created_at')
    
    # Apply pagination
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 20))
    start = (page - 1) * page_size
    end = start + page_size
    
    paginated_transactions = transactions[start:end]
    total_count = transactions.count()
    
    serializer = WalletTransactionSerializer(paginated_transactions, many=True)
    
    return Response(create_success_response(data={
        'transactions': serializer.data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_count': total_count,
            'total_pages': (total_count + page_size - 1) // page_size
        }
    }))


class RefundViewSet(ModelViewSet):
    """ViewSet for refund management."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Get appropriate serializer based on action."""
        if self.action == 'create':
            return RefundCreateSerializer
        return RefundSerializer
    
    def get_queryset(self):
        """Get refunds for current user's payments."""
        # Handle schema generation for drf-yasg
        if getattr(self, 'swagger_fake_view', False):
            return Refund.objects.none()
        return Refund.objects.filter(payment__user=self.request.user).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create refund request."""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response("Invalid data", details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                refund = serializer.save()
                
                # Process refund through payment provider
                self._process_refund(refund)
                
                return Response(create_success_response(
                    data=RefundSerializer(refund).data,
                    message="Refund request created successfully"
                ), status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating refund: {str(e)}")
            return Response(
                create_error_response("Refund creation failed"),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_refund(self, refund):
        """Process refund through appropriate payment provider."""
        payment = refund.payment
        
        try:
            if payment.payment_method == PaymentMethod.CREDIT_CARD and payment.payment_intent_id:
                # Process Stripe refund
                stripe_refund = stripe.Refund.create(
                    payment_intent=payment.payment_intent_id,
                    amount=int(refund.amount * 100),  # Convert to cents
                    metadata={'refund_id': str(refund.id)}
                )
                
                refund.external_refund_id = stripe_refund.id
                refund.status = 'processing'
                refund.save()
                
            else:
                # Handle other payment methods
                refund.status = 'processing'
                refund.save()
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund error: {str(e)}")
            refund.status = 'failed'
            refund.save()
        except Exception as e:
            logger.error(f"Refund processing error: {str(e)}")
            refund.status = 'failed'
            refund.save()


class RecurringPaymentViewSet(ModelViewSet):
    """ViewSet for recurring payment management."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Get appropriate serializer based on action."""
        if self.action == 'create':
            return RecurringPaymentCreateSerializer
        return RecurringPaymentSerializer
    
    def get_queryset(self):
        """Get recurring payments for current user."""
        # Handle schema generation for drf-yasg
        if getattr(self, 'swagger_fake_view', False):
            return RecurringPayment.objects.none()
        return RecurringPayment.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create recurring payment for current user."""
        # Calculate next payment date
        start_date = serializer.validated_data['start_date']
        frequency = serializer.validated_data['frequency']
        
        next_payment = self._calculate_next_payment_date(start_date, frequency)
        
        serializer.save(
            user=self.request.user,
            next_payment=next_payment
        )
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause recurring payment."""
        recurring_payment = self.get_object()
        recurring_payment.status = 'paused'
        recurring_payment.save()
        
        return Response(create_success_response(
            data=RecurringPaymentSerializer(recurring_payment).data,
            message="Recurring payment paused"
        ))
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume recurring payment."""
        recurring_payment = self.get_object()
        recurring_payment.status = 'active'
        recurring_payment.save()
        
        return Response(create_success_response(
            data=RecurringPaymentSerializer(recurring_payment).data,
            message="Recurring payment resumed"
        ))
    
    def _calculate_next_payment_date(self, start_date, frequency):
        """Calculate next payment date based on frequency."""
        if frequency == 'weekly':
            return start_date + timedelta(weeks=1)
        elif frequency == 'monthly':
            return start_date + timedelta(days=30)
        elif frequency == 'quarterly':
            return start_date + timedelta(days=90)
        elif frequency == 'annually':
            return start_date + timedelta(days=365)
        else:
            return start_date


# Helper function to process successful payments
def _process_successful_payment(payment):
    """Process successful payment - shared utility function."""
    with transaction.atomic():
        # Update wallet balance
        wallet_balance, created = WalletBalance.objects.get_or_create(
            user=payment.user,
            currency=payment.currency,
            defaults={'available_balance': Decimal('0.00')}
        )
        
        previous_balance = wallet_balance.available_balance
        wallet_balance.available_balance += payment.net_amount
        wallet_balance.save()
        
        # Create wallet transaction record
        transaction_record = WalletTransaction.objects.create(
            user=payment.user,
            transaction_type='deposit',
            amount=payment.net_amount,
            currency=payment.currency,
            balance_before=previous_balance,
            balance_after=wallet_balance.available_balance,
            reference_id=payment.id,
            description=f"Payment deposit - {payment.payment_method}"
        )

        # Send funds notification email for deposit
        try:
            transaction_details = {
                'type': 'Deposit',
                'amount': str(payment.net_amount),
                'transaction_id': str(transaction_record.id),
                'payment_method': payment.payment_method.title(),
                'status': 'Confirmed',
                'previous_balance': str(previous_balance),
                'new_balance': str(wallet_balance.available_balance),
                'id': transaction_record.id
            }

            EmailService.send_funds_notification_email(
                user=payment.user,
                transaction_details=transaction_details
            )
            logger.info(f"Funds notification email sent for deposit {transaction_record.id}")
        except Exception as e:
            logger.error(f"Failed to send funds notification email for deposit {transaction_record.id}: {str(e)}")
        
        # Process investment if applicable - triggers deferred minting
        if payment.investment:
            investment = payment.investment

            # Mark payment confirmed - tokens will be minted by Celery task
            investment.mark_payment_confirmed()

            # Reserve tokens (mark as sold) but don't mint on-chain yet
            property_obj = investment.property_investment
            property_obj.tokens_sold += investment.token_amount
            property_obj.save(update_fields=['tokens_sold'])

            logger.info(
                f"Investment {investment.id} payment confirmed via helper. "
                f"Status: {investment.status}. Minting scheduled."
            )


class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events.

    This endpoint receives asynchronous notifications from Stripe about
    payment events. No authentication required - uses Stripe signature verification.
    """
    permission_classes = []  # No auth - Stripe sends webhooks

    def post(self, request):
        """Process incoming Stripe webhook events."""
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)

        if not webhook_secret:
            logger.error("STRIPE_WEBHOOK_SECRET not configured")
            return Response(
                {'error': 'Webhook not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            logger.error(f"Invalid Stripe webhook payload: {str(e)}")
            return Response(
                {'error': 'Invalid payload'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid Stripe signature: {str(e)}")
            return Response(
                {'error': 'Invalid signature'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle the event
        event_type = event['type']
        logger.info(f"Received Stripe webhook event: {event_type}")

        try:
            if event_type == 'payment_intent.succeeded':
                self._handle_payment_intent_succeeded(event['data']['object'])
            elif event_type == 'payment_intent.payment_failed':
                self._handle_payment_intent_failed(event['data']['object'])
            elif event_type == 'charge.refunded':
                self._handle_charge_refunded(event['data']['object'])
            else:
                logger.info(f"Unhandled Stripe event type: {event_type}")

            return Response({'status': 'success'}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error processing Stripe webhook {event_type}: {str(e)}")
            # Return 200 to prevent Stripe retries for application errors
            # The error is logged for manual investigation
            return Response({'status': 'error logged'}, status=status.HTTP_200_OK)

    def _handle_payment_intent_succeeded(self, payment_intent):
        """Handle successful payment intent from Stripe webhook."""
        payment_intent_id = payment_intent['id']
        logger.info(f"Processing payment_intent.succeeded for {payment_intent_id}")

        try:
            # Find the payment record
            payment = Payment.objects.get(payment_intent_id=payment_intent_id)

            # Skip if already processed
            if payment.status == PaymentStatus.COMPLETED:
                logger.info(f"Payment {payment.id} already completed, skipping")
                return

            with transaction.atomic():
                # Update payment status
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = timezone.now()
                payment.external_transaction_id = payment_intent_id
                payment.save()

                # Update wallet balance
                wallet_balance, created = WalletBalance.objects.get_or_create(
                    user=payment.user,
                    currency=payment.currency,
                    defaults={'available_balance': Decimal('0.00')}
                )

                previous_balance = wallet_balance.available_balance
                wallet_balance.available_balance += payment.net_amount
                wallet_balance.save()

                # Create wallet transaction record
                transaction_record = WalletTransaction.objects.create(
                    user=payment.user,
                    transaction_type='deposit',
                    amount=payment.net_amount,
                    currency=payment.currency,
                    balance_before=previous_balance,
                    balance_after=wallet_balance.available_balance,
                    reference_id=payment.id,
                    description=f"Payment deposit via Stripe webhook"
                )

                # Process investment if linked
                if payment.investment:
                    investment = payment.investment

                    # Only process if not already processed
                    if investment.status not in ['completed', 'pending_mint', 'minting']:
                        # Mark payment confirmed - triggers deferred minting
                        investment.mark_payment_confirmed()

                        # Reserve tokens
                        property_obj = investment.property_investment
                        property_obj.tokens_sold += investment.token_amount
                        property_obj.save(update_fields=['tokens_sold'])

                        logger.info(
                            f"Investment {investment.id} payment confirmed via webhook. "
                            f"Status: {investment.status}. Minting scheduled."
                        )

                # Send email notification
                try:
                    transaction_details = {
                        'type': 'Deposit',
                        'amount': str(payment.net_amount),
                        'transaction_id': str(transaction_record.id),
                        'payment_method': 'Credit Card',
                        'status': 'Confirmed',
                        'previous_balance': str(previous_balance),
                        'new_balance': str(wallet_balance.available_balance),
                        'id': transaction_record.id
                    }
                    EmailService.send_funds_notification_email(
                        user=payment.user,
                        transaction_details=transaction_details
                    )
                except Exception as e:
                    logger.error(f"Failed to send webhook payment email: {str(e)}")

            logger.info(f"Successfully processed payment {payment.id} via webhook")

        except Payment.DoesNotExist:
            logger.warning(f"Payment not found for intent {payment_intent_id}")
        except Exception as e:
            logger.error(f"Error processing payment_intent.succeeded: {str(e)}")
            raise

    def _handle_payment_intent_failed(self, payment_intent):
        """Handle failed payment intent from Stripe webhook."""
        payment_intent_id = payment_intent['id']
        logger.info(f"Processing payment_intent.payment_failed for {payment_intent_id}")

        try:
            payment = Payment.objects.get(payment_intent_id=payment_intent_id)

            # Update payment status
            payment.status = PaymentStatus.FAILED
            payment.metadata = payment.metadata or {}
            payment.metadata['failure_reason'] = payment_intent.get('last_payment_error', {}).get('message', 'Unknown')
            payment.save()

            # Update investment if linked
            if payment.investment:
                investment = payment.investment
                if investment.status == 'processing':
                    investment.status = 'failed'
                    investment.save(update_fields=['status'])

            logger.info(f"Marked payment {payment.id} as failed via webhook")

        except Payment.DoesNotExist:
            logger.warning(f"Payment not found for failed intent {payment_intent_id}")

    def _handle_charge_refunded(self, charge):
        """Handle refunded charge from Stripe webhook."""
        payment_intent_id = charge.get('payment_intent')
        if not payment_intent_id:
            logger.warning("Refund webhook missing payment_intent")
            return

        try:
            payment = Payment.objects.get(payment_intent_id=payment_intent_id)

            # Check if fully refunded
            if charge.get('refunded', False):
                payment.status = PaymentStatus.REFUNDED
                payment.save()

                # Update investment if linked
                if payment.investment:
                    investment = payment.investment
                    investment.status = 'refunded'
                    investment.save(update_fields=['status'])

                logger.info(f"Marked payment {payment.id} as refunded via webhook")

        except Payment.DoesNotExist:
            logger.warning(f"Payment not found for refund intent {payment_intent_id}")


class BankTransferView(APIView):
    """
    Bank Transfer payment processing view.

    Handles bank transfer payment creation, status updates, and management.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, action):
        """Handle bank transfer actions."""
        if action == 'create':
            return self._create_bank_transfer(request)
        elif action == 'status':
            return self._get_transfer_status(request)
        elif action == 'update':
            return self._update_transfer_status(request)
        elif action == 'cancel':
            return self._cancel_transfer(request)
        else:
            return create_error_response(
                message="Invalid action",
                status_code=status.HTTP_400_BAD_REQUEST
            )

    def _create_bank_transfer(self, request):
        """Create a new bank transfer payment."""
        from .serializers import BankTransferCreateSerializer
        from .services import PaymentService
        from properties.models import Property

        try:
            serializer = BankTransferCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return create_error_response(
                    message="Invalid data",
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            validated_data = serializer.validated_data

            # Verify property exists
            try:
                property_obj = Property.objects.get(id=validated_data['property_id'])
            except Property.DoesNotExist:
                return create_error_response(
                    message="Property not found",
                    status_code=status.HTTP_404_NOT_FOUND
                )

            # Create payment record
            payment_details = {
                'bank_transfer': {
                    'account_holder_name': validated_data['account_holder_name'],
                    'account_number': validated_data['account_number'],
                    'routing_number': validated_data['routing_number'],
                    'bank_name': validated_data['bank_name'],
                    'bank_address': validated_data.get('bank_address', ''),
                    'swift_code': validated_data.get('swift_code', ''),
                    'transfer_instructions': validated_data.get('transfer_instructions', ''),
                }
            }

            payment = Payment.objects.create(
                user=request.user,
                amount=validated_data['amount'],
                currency=validated_data['currency'],
                payment_method=PaymentMethod.BANK_TRANSFER,
                payment_details=payment_details,
                property_reference=property_obj.id
            )

            # Process payment
            payment_service = PaymentService()
            result = payment_service.process_payment(payment)

            if result.success:
                # Get the created bank transfer record
                bank_transfer = payment.bank_transfer
                from .serializers import BankTransferSerializer
                transfer_data = BankTransferSerializer(bank_transfer).data

                return create_success_response(
                    data={
                        'payment_id': result.payment_id,
                        'transfer_reference': result.transaction_id,
                        'status': result.status,
                        'bank_transfer': transfer_data,
                        'metadata': result.metadata
                    },
                    message="Bank transfer initiated successfully"
                )
            else:
                return create_error_response(
                    message=result.error_message,
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Bank transfer creation failed: {str(e)}")
            return create_error_response(
                message="Failed to create bank transfer",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_transfer_status(self, request):
        """Get bank transfer status."""
        from .models import BankTransfer
        from .serializers import BankTransferSerializer

        try:
            transfer_reference = request.query_params.get('transfer_reference')
            payment_id = request.query_params.get('payment_id')

            if transfer_reference:
                bank_transfer = get_object_or_404(
                    BankTransfer,
                    transfer_reference=transfer_reference,
                    payment__user=request.user
                )
            elif payment_id:
                bank_transfer = get_object_or_404(
                    BankTransfer,
                    payment__id=payment_id,
                    payment__user=request.user
                )
            else:
                return create_error_response(
                    message="Transfer reference or payment ID required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            serializer = BankTransferSerializer(bank_transfer)
            return create_success_response(
                data=serializer.data,
                message="Transfer status retrieved successfully"
            )

        except Exception as e:
            logger.error(f"Transfer status retrieval failed: {str(e)}")
            return create_error_response(
                message="Failed to retrieve transfer status",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _update_transfer_status(self, request):
        """Update bank transfer status (admin only)."""
        from .models import BankTransfer
        from .serializers import BankTransferStatusSerializer
        from core.permissions import IsAdminUser

        # Check admin permissions
        if not IsAdminUser().has_permission(request, self):
            return create_error_response(
                message="Admin access required",
                status_code=status.HTTP_403_FORBIDDEN
            )

        try:
            transfer_reference = request.data.get('transfer_reference')
            if not transfer_reference:
                return create_error_response(
                    message="Transfer reference required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            bank_transfer = get_object_or_404(
                BankTransfer,
                transfer_reference=transfer_reference
            )

            serializer = BankTransferStatusSerializer(data=request.data)
            if not serializer.is_valid():
                return create_error_response(
                    message="Invalid data",
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            validated_data = serializer.validated_data

            # Update transfer status
            bank_transfer.transfer_status = validated_data['transfer_status']

            if validated_data.get('bank_reference_number'):
                bank_transfer.bank_reference_number = validated_data['bank_reference_number']

            if validated_data.get('admin_notes'):
                bank_transfer.admin_notes = validated_data['admin_notes']

            if validated_data.get('completed_at'):
                bank_transfer.completed_at = validated_data['completed_at']

            # Update payment status based on transfer status
            if bank_transfer.transfer_status == 'completed':
                bank_transfer.payment.status = PaymentStatus.COMPLETED
                bank_transfer.payment.completed_at = validated_data.get('completed_at', timezone.now())
                bank_transfer.payment.save()

                if not bank_transfer.completed_at:
                    bank_transfer.completed_at = timezone.now()

            elif bank_transfer.transfer_status == 'failed':
                bank_transfer.payment.status = PaymentStatus.FAILED
                bank_transfer.payment.save()

            elif bank_transfer.transfer_status == 'cancelled':
                bank_transfer.payment.status = PaymentStatus.CANCELLED
                bank_transfer.payment.save()

            bank_transfer.save()

            from .serializers import BankTransferSerializer
            transfer_data = BankTransferSerializer(bank_transfer).data

            return create_success_response(
                data=transfer_data,
                message="Transfer status updated successfully"
            )

        except Exception as e:
            logger.error(f"Transfer status update failed: {str(e)}")
            return create_error_response(
                message="Failed to update transfer status",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _cancel_transfer(self, request):
        """Cancel bank transfer."""
        from .models import BankTransfer

        try:
            transfer_reference = request.data.get('transfer_reference')
            if not transfer_reference:
                return create_error_response(
                    message="Transfer reference required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            bank_transfer = get_object_or_404(
                BankTransfer,
                transfer_reference=transfer_reference,
                payment__user=request.user
            )

            # Only allow cancellation if transfer is still pending
            if bank_transfer.transfer_status not in ['initiated', 'pending']:
                return create_error_response(
                    message="Transfer cannot be cancelled at this stage",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # Update status
            bank_transfer.transfer_status = 'cancelled'
            bank_transfer.save()

            bank_transfer.payment.status = PaymentStatus.CANCELLED
            bank_transfer.payment.save()

            return create_success_response(
                data={'transfer_reference': transfer_reference, 'status': 'cancelled'},
                message="Transfer cancelled successfully"
            )

        except Exception as e:
            logger.error(f"Transfer cancellation failed: {str(e)}")
            return create_error_response(
                message="Failed to cancel transfer",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
