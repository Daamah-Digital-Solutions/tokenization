"""
Payment Services for Capimax Real Estate Tokenization Platform.

This module contains service classes for payment processing, fraud detection,
analytics, and external integrations with payment providers.
"""

from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Sum, Count, Avg
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
import requests
import hashlib
import hmac
import json
import stripe
from dataclasses import dataclass

from .models import (
    Payment, UserPaymentMethod, WalletBalance, WalletTransaction,
    CryptoPayment, Refund, RecurringPayment, PaymentMethod, PaymentStatus
)
from accounts.models import User

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)


@dataclass
class PaymentResult:
    """Result object for payment operations."""
    success: bool
    payment_id: Optional[str] = None
    transaction_id: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class FraudScore:
    """Fraud detection score result."""
    score: int  # 0-100, higher is more suspicious
    risk_level: str  # 'low', 'medium', 'high', 'critical'
    factors: List[str]
    blocked: bool = False


class PaymentProcessorService:
    """Service for processing payments across different providers."""

    def __init__(self):
        self.stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
        self.paypal_client_id = getattr(settings, 'PAYPAL_CLIENT_ID', None)
        self.paypal_secret = getattr(settings, 'PAYPAL_CLIENT_SECRET', None)

    def _ensure_user_wallet(self, user: User, currency: str = 'USD') -> WalletBalance:
        """
        Ensure user has a wallet balance for the specified currency.
        Auto-creates wallet for fiat payment users.

        Args:
            user: The user to create wallet for
            currency: Currency code (default: USD)

        Returns:
            WalletBalance instance (existing or newly created)
        """
        from .models import CurrencyType

        # Determine currency type based on currency code
        crypto_currencies = ['BTC', 'ETH', 'MATIC', 'USDC', 'USDT', 'BNB']
        currency_type = CurrencyType.CRYPTOCURRENCY if currency.upper() in crypto_currencies else CurrencyType.FIAT

        wallet, created = WalletBalance.objects.get_or_create(
            user=user,
            currency=currency.upper(),
            defaults={
                'currency_type': currency_type,
                'available_balance': Decimal('0.00'),
                'pending_balance': Decimal('0.00'),
                'locked_balance': Decimal('0.00'),
            }
        )

        if created:
            logger.info(f"Auto-created {currency} wallet for user {user.id} (email: {user.email})")

        return wallet
    
    def process_payment(self, payment: Payment) -> PaymentResult:
        """Process payment based on payment method."""
        try:
            if payment.payment_method == PaymentMethod.CREDIT_CARD:
                return self._process_stripe_payment(payment)
            elif payment.payment_method == PaymentMethod.CRYPTOCURRENCY:
                return self._process_crypto_payment(payment)
            elif payment.payment_method == PaymentMethod.PAYPAL:
                return self._process_paypal_payment(payment)
            elif payment.payment_method == PaymentMethod.BANK_TRANSFER:
                return self._process_bank_transfer(payment)
            else:
                return PaymentResult(
                    success=False,
                    error_message=f"Unsupported payment method: {payment.payment_method}"
                )
        
        except Exception as e:
            logger.error(f"Error processing payment {payment.id}: {str(e)}")
            return PaymentResult(
                success=False,
                payment_id=str(payment.id),
                error_message=str(e)
            )
    
    def _process_stripe_payment(self, payment: Payment) -> PaymentResult:
        """Process Stripe credit card payment."""
        try:
            if not payment.payment_intent_id:
                # Create payment intent if not exists
                payment_intent = stripe.PaymentIntent.create(
                    amount=int(payment.amount * 100),  # Convert to cents
                    currency=payment.currency.lower(),
                    metadata={'payment_id': str(payment.id)}
                )
                payment.payment_intent_id = payment_intent.id
                payment.save()
            
            # Retrieve payment intent status
            payment_intent = stripe.PaymentIntent.retrieve(payment.payment_intent_id)
            
            if payment_intent.status == 'succeeded':
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = timezone.now()
                payment.external_transaction_id = payment_intent.id
                payment.save()

                # Auto-create wallet for fiat payment users
                self._ensure_user_wallet(payment.user, payment.currency)

                return PaymentResult(
                    success=True,
                    payment_id=str(payment.id),
                    transaction_id=payment_intent.id
                )
            elif payment_intent.status in ['processing', 'requires_action']:
                payment.status = PaymentStatus.PROCESSING
                payment.save()
                
                return PaymentResult(
                    success=True,
                    payment_id=str(payment.id),
                    transaction_id=payment_intent.id,
                    metadata={'status': 'processing', 'requires_action': True}
                )
            else:
                payment.status = PaymentStatus.FAILED
                payment.save()
                
                return PaymentResult(
                    success=False,
                    payment_id=str(payment.id),
                    error_message=f"Payment failed with status: {payment_intent.status}"
                )
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error for payment {payment.id}: {str(e)}")
            payment.status = PaymentStatus.FAILED
            payment.save()
            
            return PaymentResult(
                success=False,
                payment_id=str(payment.id),
                error_message=str(e)
            )
    
    def _process_crypto_payment(self, payment: Payment) -> PaymentResult:
        """Process cryptocurrency payment."""
        # This is a simplified implementation
        # In production, integrate with blockchain APIs
        
        try:
            crypto_details = payment.crypto_details
            
            # Mock blockchain verification
            # In reality, this would check the blockchain for transaction confirmation
            if self._verify_crypto_transaction(payment):
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = timezone.now()
                payment.save()
                
                return PaymentResult(
                    success=True,
                    payment_id=str(payment.id),
                    transaction_id=payment.transaction_hash
                )
            else:
                return PaymentResult(
                    success=False,
                    payment_id=str(payment.id),
                    error_message="Cryptocurrency transaction not found or insufficient confirmations"
                )
        
        except Exception as e:
            logger.error(f"Crypto payment error for payment {payment.id}: {str(e)}")
            return PaymentResult(
                success=False,
                payment_id=str(payment.id),
                error_message=str(e)
            )
    
    def _process_paypal_payment(self, payment: Payment) -> PaymentResult:
        """Process PayPal payment."""
        # Placeholder for PayPal integration
        return PaymentResult(
            success=False,
            error_message="PayPal integration not yet implemented"
        )
    
    def _process_bank_transfer(self, payment: Payment) -> PaymentResult:
        """Process bank transfer payment."""
        try:
            from .models import BankTransfer

            # Create bank transfer record
            bank_transfer_data = payment.payment_details.get('bank_transfer', {})

            # Validate required fields
            required_fields = ['account_holder_name', 'account_number', 'routing_number', 'bank_name']
            for field in required_fields:
                if not bank_transfer_data.get(field):
                    return PaymentResult(
                        success=False,
                        error_message=f"Missing required field: {field}"
                    )

            # Create bank transfer record
            bank_transfer = BankTransfer.objects.create(
                payment=payment,
                account_holder_name=bank_transfer_data['account_holder_name'],
                account_number=bank_transfer_data['account_number'],
                routing_number=bank_transfer_data['routing_number'],
                bank_name=bank_transfer_data['bank_name'],
                bank_address=bank_transfer_data.get('bank_address', ''),
                swift_code=bank_transfer_data.get('swift_code', ''),
                transfer_instructions=bank_transfer_data.get('transfer_instructions', ''),
                processing_fee=payment.amount * Decimal('0.005')  # 0.5% fee
            )

            # Generate unique reference and estimate completion
            bank_transfer.generate_reference()
            bank_transfer.estimate_completion()
            bank_transfer.save()

            # Update payment status
            payment.status = 'processing'
            payment.payment_intent_id = bank_transfer.transfer_reference
            payment.processed_at = timezone.now()
            payment.save()

            # Auto-create wallet for fiat payment users (bank transfer)
            self._ensure_user_wallet(payment.user, payment.currency)

            # In a real implementation, this would integrate with banking APIs
            # For now, we simulate the bank transfer initiation
            return PaymentResult(
                success=True,
                payment_id=str(payment.id),
                transaction_id=bank_transfer.transfer_reference,
                amount=payment.amount,
                currency=payment.currency,
                status='processing',
                metadata={
                    'transfer_reference': bank_transfer.transfer_reference,
                    'estimated_completion': bank_transfer.estimated_completion_date.isoformat() if bank_transfer.estimated_completion_date else None,
                    'processing_fee': str(bank_transfer.processing_fee),
                    'bank_name': bank_transfer.bank_name,
                    'account_holder': bank_transfer.account_holder_name,
                    'processing_message': f"Bank transfer initiated successfully. Reference: {bank_transfer.transfer_reference}. Expected completion: 1-3 business days."
                }
            )

        except Exception as e:
            logger.error(f"Bank transfer processing failed: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f"Bank transfer processing failed: {str(e)}"
            )
    
    def _verify_crypto_transaction(self, payment: Payment) -> bool:
        """Verify cryptocurrency transaction on blockchain."""
        # Mock implementation - in production, connect to blockchain APIs
        return True


class FraudDetectionService:
    """Service for detecting fraudulent payment activities."""
    
    def __init__(self):
        self.max_daily_amount = Decimal('10000.00')  # $10k daily limit
        self.max_hourly_transactions = 10
        self.suspicious_countries = ['XX', 'YY']  # Example suspicious countries
    
    def assess_payment_risk(self, user: User, payment: Payment, request_data: Dict) -> FraudScore:
        """Assess fraud risk for a payment."""
        risk_factors = []
        score = 0
        
        # Check daily spending limit
        daily_spent = self._get_daily_spending(user)
        if daily_spent + payment.amount > self.max_daily_amount:
            risk_factors.append("Daily spending limit exceeded")
            score += 30
        
        # Check transaction frequency
        hourly_count = self._get_hourly_transaction_count(user)
        if hourly_count >= self.max_hourly_transactions:
            risk_factors.append("Too many transactions in last hour")
            score += 25
        
        # Check user location
        ip_address = request_data.get('ip_address')
        if ip_address and self._is_suspicious_location(ip_address):
            risk_factors.append("Transaction from suspicious location")
            score += 20
        
        # Check payment amount patterns
        if self._is_unusual_amount(user, payment.amount):
            risk_factors.append("Unusual payment amount for user")
            score += 15
        
        # Check user account age
        account_age = (timezone.now() - user.created_at).days
        if account_age < 7:  # Less than a week old
            risk_factors.append("New user account")
            score += 10
        
        # Check KYC status
        if not user.is_verified:
            risk_factors.append("User not verified")
            score += 20
        
        # Check for velocity patterns
        if self._has_velocity_pattern(user):
            risk_factors.append("Unusual transaction velocity pattern")
            score += 25
        
        # Determine risk level
        if score >= 80:
            risk_level = 'critical'
            blocked = True
        elif score >= 60:
            risk_level = 'high'
            blocked = True
        elif score >= 40:
            risk_level = 'medium'
            blocked = False
        else:
            risk_level = 'low'
            blocked = False
        
        return FraudScore(
            score=min(score, 100),
            risk_level=risk_level,
            factors=risk_factors,
            blocked=blocked
        )
    
    def _get_daily_spending(self, user: User) -> Decimal:
        """Get user's spending in the last 24 hours."""
        since = timezone.now() - timedelta(days=1)
        total = Payment.objects.filter(
            user=user,
            status=PaymentStatus.COMPLETED,
            created_at__gte=since
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        return total
    
    def _get_hourly_transaction_count(self, user: User) -> int:
        """Get user's transaction count in the last hour."""
        since = timezone.now() - timedelta(hours=1)
        count = Payment.objects.filter(
            user=user,
            created_at__gte=since
        ).count()
        
        return count
    
    def _is_suspicious_location(self, ip_address: str) -> bool:
        """Geolocate `ip_address` and flag if high-risk or anonymising."""
        if not ip_address:
            return False
        try:
            from kyc.providers import get_geolocation_provider
            geo = get_geolocation_provider().lookup(ip_address)
            if not geo.success:
                return False
            return geo.is_high_risk or geo.is_suspicious
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                'Geolocation lookup failed; defaulting to not-suspicious'
            )
            return False
    
    def _is_unusual_amount(self, user: User, amount: Decimal) -> bool:
        """Check if payment amount is unusual for this user."""
        # Get user's payment history
        payments = Payment.objects.filter(
            user=user,
            status=PaymentStatus.COMPLETED
        ).order_by('-created_at')[:10]
        
        if not payments:
            return amount > Decimal('1000.00')  # First payment over $1k is unusual
        
        amounts = [p.amount for p in payments]
        avg_amount = sum(amounts) / len(amounts)
        max_amount = max(amounts)
        
        # Consider unusual if more than 3x average or 2x max previous
        return amount > avg_amount * 3 or amount > max_amount * 2
    
    def _has_velocity_pattern(self, user: User) -> bool:
        """Check for unusual transaction velocity patterns."""
        recent_payments = Payment.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).order_by('-created_at')
        
        if len(recent_payments) < 3:
            return False
        
        # Check if payments are made in rapid succession
        for i in range(len(recent_payments) - 1):
            time_diff = (recent_payments[i].created_at - 
                        recent_payments[i + 1].created_at).total_seconds()
            if time_diff < 300:  # Less than 5 minutes between payments
                return True
        
        return False


class WalletService:
    """Service for wallet management operations."""
    
    def get_user_balances(self, user: User) -> Dict[str, Any]:
        """Get all wallet balances for a user."""
        balances = WalletBalance.objects.filter(user=user)
        
        balance_data = []
        total_usd_value = Decimal('0.00')
        
        for balance in balances:
            balance_info = {
                'currency': balance.currency,
                'available': balance.available_balance,
                'pending': balance.pending_balance,
                'locked': balance.locked_balance,
                'total': balance.total_balance
            }
            
            # Convert to USD for total calculation (mock rates)
            usd_rate = self._get_exchange_rate(balance.currency, 'USD')
            usd_value = balance.total_balance * usd_rate
            balance_info['usd_value'] = usd_value
            total_usd_value += usd_value
            
            balance_data.append(balance_info)
        
        return {
            'balances': balance_data,
            'total_usd_value': total_usd_value,
            'last_updated': timezone.now()
        }
    
    def transfer_funds(self, user: User, from_currency: str, to_currency: str, 
                      amount: Decimal) -> PaymentResult:
        """Transfer funds between different currencies in user's wallet."""
        try:
            with transaction.atomic():
                # Get source balance
                source_balance = WalletBalance.objects.get(
                    user=user, 
                    currency=from_currency
                )
                
                if source_balance.available_balance < amount:
                    return PaymentResult(
                        success=False,
                        error_message="Insufficient balance"
                    )
                
                # Calculate conversion
                exchange_rate = self._get_exchange_rate(from_currency, to_currency)
                converted_amount = amount * exchange_rate
                
                # Deduct from source
                source_balance.available_balance -= amount
                source_balance.save()
                
                # Add to destination
                dest_balance, created = WalletBalance.objects.get_or_create(
                    user=user,
                    currency=to_currency,
                    defaults={'available_balance': Decimal('0.00')}
                )
                dest_balance.available_balance += converted_amount
                dest_balance.save()
                
                # Create transaction records
                WalletTransaction.objects.create(
                    user=user,
                    transaction_type='transfer',
                    amount=-amount,
                    currency=from_currency,
                    balance_before=source_balance.available_balance + amount,
                    balance_after=source_balance.available_balance,
                    description=f"Transfer to {to_currency}"
                )
                
                WalletTransaction.objects.create(
                    user=user,
                    transaction_type='transfer',
                    amount=converted_amount,
                    currency=to_currency,
                    balance_before=dest_balance.available_balance - converted_amount,
                    balance_after=dest_balance.available_balance,
                    description=f"Transfer from {from_currency}"
                )
                
                return PaymentResult(
                    success=True,
                    metadata={
                        'from_currency': from_currency,
                        'to_currency': to_currency,
                        'original_amount': amount,
                        'converted_amount': converted_amount,
                        'exchange_rate': exchange_rate
                    }
                )
        
        except WalletBalance.DoesNotExist:
            return PaymentResult(
                success=False,
                error_message=f"Wallet balance not found for {from_currency}"
            )
        except Exception as e:
            logger.error(f"Error transferring funds: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=str(e)
            )
    
    def lock_funds(self, user: User, currency: str, amount: Decimal, 
                   reason: str) -> PaymentResult:
        """Lock funds in user's wallet for pending transactions."""
        try:
            with transaction.atomic():
                balance = WalletBalance.objects.get(user=user, currency=currency)
                
                if balance.available_balance < amount:
                    return PaymentResult(
                        success=False,
                        error_message="Insufficient available balance"
                    )
                
                balance.available_balance -= amount
                balance.locked_balance += amount
                balance.save()
                
                WalletTransaction.objects.create(
                    user=user,
                    transaction_type='fee',  # Using fee type for locks
                    amount=-amount,
                    currency=currency,
                    balance_before=balance.available_balance + amount,
                    balance_after=balance.available_balance,
                    description=f"Funds locked: {reason}"
                )
                
                return PaymentResult(success=True)
        
        except WalletBalance.DoesNotExist:
            return PaymentResult(
                success=False,
                error_message=f"Wallet balance not found for {currency}"
            )
    
    def unlock_funds(self, user: User, currency: str, amount: Decimal, 
                     reason: str) -> PaymentResult:
        """Unlock previously locked funds."""
        try:
            with transaction.atomic():
                balance = WalletBalance.objects.get(user=user, currency=currency)
                
                if balance.locked_balance < amount:
                    return PaymentResult(
                        success=False,
                        error_message="Insufficient locked balance"
                    )
                
                balance.locked_balance -= amount
                balance.available_balance += amount
                balance.save()
                
                WalletTransaction.objects.create(
                    user=user,
                    transaction_type='refund',  # Using refund type for unlocks
                    amount=amount,
                    currency=currency,
                    balance_before=balance.available_balance - amount,
                    balance_after=balance.available_balance,
                    description=f"Funds unlocked: {reason}"
                )
                
                return PaymentResult(success=True)
        
        except WalletBalance.DoesNotExist:
            return PaymentResult(
                success=False,
                error_message=f"Wallet balance not found for {currency}"
            )
    
    def _get_exchange_rate(self, from_currency: str, to_currency: str) -> Decimal:
        """Get exchange rate between currencies (mock implementation)."""
        # Mock exchange rates - in production, use real exchange rate API
        mock_rates = {
            ('USD', 'EUR'): Decimal('0.85'),
            ('USD', 'GBP'): Decimal('0.73'),
            ('BTC', 'USD'): Decimal('45000.00'),
            ('ETH', 'USD'): Decimal('3000.00'),
            ('USDC', 'USD'): Decimal('1.00'),
            ('USDT', 'USD'): Decimal('1.00'),
        }
        
        if from_currency == to_currency:
            return Decimal('1.00')
        
        rate = mock_rates.get((from_currency, to_currency))
        if rate:
            return rate
        
        # Try reverse rate
        reverse_rate = mock_rates.get((to_currency, from_currency))
        if reverse_rate:
            return Decimal('1.00') / reverse_rate
        
        # Default rate
        return Decimal('1.00')


class PaymentAnalyticsService:
    """Service for payment analytics and reporting."""
    
    def get_payment_summary(self, user: User = None, 
                           start_date: datetime = None,
                           end_date: datetime = None) -> Dict[str, Any]:
        """Get payment summary statistics."""
        queryset = Payment.objects.all()
        
        if user:
            queryset = queryset.filter(user=user)
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        # Calculate statistics
        stats = queryset.aggregate(
            total_payments=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
            completed_payments=Count('id', filter=Q(status=PaymentStatus.COMPLETED)),
            failed_payments=Count('id', filter=Q(status=PaymentStatus.FAILED)),
        )
        
        # Payment method breakdown
        method_breakdown = queryset.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        # Status breakdown
        status_breakdown = queryset.values('status').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        # Calculate success rate
        success_rate = 0
        if stats['total_payments'] > 0:
            success_rate = (stats['completed_payments'] / stats['total_payments']) * 100
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'summary': {
                'total_payments': stats['total_payments'] or 0,
                'total_amount': stats['total_amount'] or Decimal('0.00'),
                'average_amount': stats['avg_amount'] or Decimal('0.00'),
                'success_rate': round(success_rate, 2)
            },
            'by_method': list(method_breakdown),
            'by_status': list(status_breakdown),
            'generated_at': timezone.now()
        }
    
    def get_revenue_trends(self, days: int = 30) -> Dict[str, Any]:
        """Get revenue trends over specified period."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Daily revenue
        daily_revenue = []
        current_date = start_date.date()
        
        while current_date <= end_date.date():
            day_revenue = Payment.objects.filter(
                status=PaymentStatus.COMPLETED,
                completed_at__date=current_date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            daily_revenue.append({
                'date': current_date,
                'revenue': day_revenue
            })
            
            current_date += timedelta(days=1)
        
        # Calculate growth rate
        if len(daily_revenue) >= 2:
            recent_avg = sum(day['revenue'] for day in daily_revenue[-7:]) / 7
            previous_avg = sum(day['revenue'] for day in daily_revenue[-14:-7]) / 7
            
            if previous_avg > 0:
                growth_rate = ((recent_avg - previous_avg) / previous_avg) * 100
            else:
                growth_rate = 0
        else:
            growth_rate = 0
        
        return {
            'daily_revenue': daily_revenue,
            'growth_rate': round(growth_rate, 2),
            'period_days': days,
            'generated_at': timezone.now()
        }
    
    def get_fraud_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Get fraud detection statistics."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        total_payments = Payment.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()
        
        # Mock fraud data - in production, track actual fraud detections
        suspicious_payments = int(total_payments * 0.02)  # 2% suspicious
        blocked_payments = int(total_payments * 0.005)    # 0.5% blocked
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days
            },
            'total_payments': total_payments,
            'suspicious_payments': suspicious_payments,
            'blocked_payments': blocked_payments,
            'false_positive_rate': 1.2,  # Mock data
            'fraud_detection_rate': 98.5,  # Mock data
            'generated_at': timezone.now()
        }


class RecurringPaymentService:
    """Service for managing recurring payments and subscriptions."""
    
    def execute_due_payments(self) -> List[Dict[str, Any]]:
        """Execute all recurring payments that are due."""
        due_payments = RecurringPayment.objects.filter(
            status='active',
            next_payment__lte=timezone.now()
        )
        
        results = []
        
        for recurring_payment in due_payments:
            result = self._execute_recurring_payment(recurring_payment)
            results.append({
                'recurring_payment_id': recurring_payment.id,
                'user_id': recurring_payment.user.id,
                'amount': recurring_payment.amount,
                'result': result
            })
        
        return results
    
    def _execute_recurring_payment(self, recurring_payment: RecurringPayment) -> PaymentResult:
        """Execute a single recurring payment."""
        try:
            with transaction.atomic():
                # Create payment record
                payment = Payment.objects.create(
                    user=recurring_payment.user,
                    amount=recurring_payment.amount,
                    currency=recurring_payment.currency,
                    payment_method=recurring_payment.payment_method.method_type,
                    investment=recurring_payment.investment,
                    metadata={
                        'recurring_payment_id': str(recurring_payment.id),
                        'execution_type': 'automatic'
                    }
                )
                
                # Process payment
                processor = PaymentProcessorService()
                result = processor.process_payment(payment)
                
                if result.success:
                    # Update recurring payment
                    recurring_payment.total_payments += 1
                    recurring_payment.total_amount += recurring_payment.amount
                    recurring_payment.next_payment = self._calculate_next_payment(
                        recurring_payment.next_payment,
                        recurring_payment.frequency
                    )
                    
                    # Check if we should stop
                    if (recurring_payment.end_date and 
                        recurring_payment.next_payment > recurring_payment.end_date):
                        recurring_payment.status = 'cancelled'
                    
                    recurring_payment.save()
                
                return result
        
        except Exception as e:
            logger.error(f"Error executing recurring payment {recurring_payment.id}: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=str(e)
            )
    
    def _calculate_next_payment(self, current_date: datetime, frequency: str) -> datetime:
        """Calculate next payment date based on frequency."""
        if frequency == 'weekly':
            return current_date + timedelta(weeks=1)
        elif frequency == 'monthly':
            return current_date + timedelta(days=30)
        elif frequency == 'quarterly':
            return current_date + timedelta(days=90)
        elif frequency == 'annually':
            return current_date + timedelta(days=365)
        else:
            return current_date + timedelta(days=30)  # Default to monthly


# ============================================================================
# RefundService — single entry point for all refund creation
# ============================================================================

class RefundService:
    """
    Refund orchestration.

    The previous codebase had refund creation logic inline inside views.py.
    This service consolidates that logic so it can be invoked from:
    - the RefundViewSet (admin-initiated refund)
    - the auto_refund_failed_mint Celery task
    - the Stripe charge.refunded webhook handler

    For Stripe payments, the actual refund happens via Stripe API. For
    crypto/bank/Sukuk payments, the refund is created in `manual_review`
    status — operators must process those out of band.
    """

    @staticmethod
    def create_refund(
        payment,
        amount=None,
        reason: str = '',
        initiated_by=None,
        initiated_by_system: bool = False,
    ):
        """
        Create a Refund record and execute the refund where possible.

        Returns the created Refund instance. Caller is responsible for
        ensuring the payment is in a refundable state.
        """
        if amount is None:
            amount = payment.amount

        if amount > payment.amount:
            raise ValueError("Refund amount exceeds payment amount")

        # Atomic refund creation + payment update
        with transaction.atomic():
            payment_locked = Payment.objects.select_for_update().get(pk=payment.pk)

            # Already fully refunded?
            existing_total = payment_locked.refunds.filter(
                status__in=['pending', 'processing', 'completed']
            ).aggregate(s=Sum('amount'))['s'] or Decimal('0')

            if existing_total + amount > payment_locked.amount:
                raise ValueError(
                    f"Cumulative refunds would exceed payment amount "
                    f"(existing {existing_total}, requested {amount}, "
                    f"payment {payment_locked.amount})"
                )

            refund = Refund.objects.create(
                payment=payment_locked,
                amount=amount,
                reason=reason or 'no_reason_given',
                status='pending',
            )

        # Execute the refund per payment method
        try:
            if payment.payment_method == PaymentMethod.CREDIT_CARD and payment.payment_intent_id:
                RefundService._execute_stripe_refund(refund)
            else:
                # Crypto, bank, Nova Sukuk, wallet — these require manual ops.
                refund.status = 'pending'
                refund.save(update_fields=['status'])
                logger.info(
                    "Refund created for manual processing",
                    extra={
                        'refund_id': str(refund.id),
                        'payment_id': str(payment.pk),
                        'method': payment.payment_method,
                    }
                )
        except Exception as e:
            logger.exception("Refund execution failed")
            refund.status = 'failed'
            refund.save(update_fields=['status'])
            raise

        return refund

    @staticmethod
    def _execute_stripe_refund(refund):
        """Call Stripe's refund API and update the refund record."""
        try:
            stripe_refund = stripe.Refund.create(
                payment_intent=refund.payment.payment_intent_id,
                amount=int(refund.amount * 100),
                metadata={'refund_id': str(refund.id)},
            )
            refund.external_refund_id = stripe_refund.id
            refund.status = 'processing'
            refund.save(update_fields=['external_refund_id', 'status'])
        except stripe.error.StripeError as e:
            logger.error(
                "Stripe refund failed",
                extra={'refund_id': str(refund.id), 'error': str(e)},
            )
            refund.status = 'failed'
            refund.save(update_fields=['status'])
            raise
