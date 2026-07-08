"""
Property Services for Capimax Real Estate Tokenization Platform.

This module provides comprehensive services for automated installment payment processing,
token release management, and property investment operations.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple, Any
from django.db import transaction, models
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from .models import ConstructionInstallment, Property, RentalIncomeDistribution
from accounts.models import User
from payments.models import Payment, PaymentStatus, UserPaymentMethod, WalletBalance
from investments.models import Investment
from notifications.models import Notification, NotificationType, NotificationPriority

# ``BlockchainService`` no longer exists as a top-level export. Token-release
# now goes through ``_release_tokens_to_investor`` which uses Web3 directly
# against the per-property SmartContract row. Keep no module-level import.

logger = logging.getLogger(__name__)


class InstallmentProcessingService:
    """
    Service for processing automated installment payments.
    
    Handles the complete installment payment lifecycle including:
    - Automatic payment collection
    - Token release management
    - Late payment processing
    - Payment reminders
    - Integration with blockchain and payment systems
    """
    
    def __init__(self):
        # Removed: ``self.blockchain_service`` (BlockchainService no longer
        # exists as a top-level export). Web3 calls are made inline in
        # ``_release_tokens_to_investor`` against the per-property
        # SmartContract row.
        self.platform_commission_rate = getattr(settings, 'CAPIMAX_SETTINGS', {}).get(
            'PLATFORM_COMMISSION_RATE', Decimal('0.025')
        )
    
    @transaction.atomic
    def process_due_payments(self, max_payments: int = 100) -> Dict[str, Any]:
        """
        Process all installment payments that are due for collection.
        
        Args:
            max_payments: Maximum number of payments to process in one batch
            
        Returns:
            Dictionary with processing results and statistics
        """
        today = timezone.now().date()
        
        # Get all due installment payments
        due_payments = ConstructionInstallment.objects.filter(
            next_payment_date__lte=today,
            status='pending',
            payments_made__lt=models.F('total_installments')
        ).select_related(
            'investor', 'property_investment'
        ).order_by('next_payment_date')[:max_payments]
        
        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'errors': [],
            'total_amount': Decimal('0.00'),
            'tokens_released': 0
        }
        
        for installment in due_payments:
            try:
                result = self._process_single_installment(installment)
                results['processed'] += 1
                
                if result['success']:
                    results['successful'] += 1
                    results['total_amount'] += result['amount_paid']
                    results['tokens_released'] += result['tokens_released']
                    
                    logger.info(
                        f"Successfully processed installment payment: {installment.id} "
                        f"for user {installment.investor.email}"
                    )
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'installment_id': str(installment.id),
                        'user_email': installment.investor.email,
                        'error': result['error']
                    })
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'installment_id': str(installment.id),
                    'user_email': installment.investor.email,
                    'error': str(e)
                })
                logger.error(f"Error processing installment {installment.id}: {e}")
        
        # Log overall results
        logger.info(
            f"Installment processing complete: {results['successful']} successful, "
            f"{results['failed']} failed out of {results['processed']} total"
        )
        
        return results
    
    @transaction.atomic
    def _process_single_installment(self, installment: ConstructionInstallment) -> Dict[str, Any]:
        """
        Process a single installment payment.
        
        Args:
            installment: ConstructionInstallment instance to process
            
        Returns:
            Dictionary with processing result
        """
        try:
            # Check if payment can be made
            if not installment.can_make_payment():
                return {
                    'success': False,
                    'error': 'Payment cannot be processed at this time',
                    'amount_paid': Decimal('0.00'),
                    'tokens_released': 0
                }
            
            # Get user's default payment method
            payment_method = self._get_user_payment_method(installment.investor)
            if not payment_method:
                return {
                    'success': False,
                    'error': 'No valid payment method found',
                    'amount_paid': Decimal('0.00'),
                    'tokens_released': 0
                }
            
            # Process the payment
            payment_result = self._collect_installment_payment(installment, payment_method)
            
            if payment_result['success']:
                # Update installment status
                success, message, tokens_released = installment.process_payment(
                    amount=payment_result['amount_paid'],
                    payment_date=timezone.now().date()
                )
                
                if success:
                    # Release tokens to blockchain if graduated release
                    if installment.graduated_release and tokens_released > 0:
                        blockchain_result = self._release_tokens_to_investor(
                            installment, int(tokens_released)
                        )
                        if not blockchain_result['success']:
                            logger.warning(
                                f"Token release failed for installment {installment.id}: "
                                f"{blockchain_result['error']}"
                            )
                    
                    # Send success notification
                    self._send_payment_success_notification(installment, payment_result['amount_paid'])
                    
                    return {
                        'success': True,
                        'amount_paid': payment_result['amount_paid'],
                        'tokens_released': int(tokens_released),
                        'payment_id': payment_result.get('payment_id'),
                        'blockchain_tx': blockchain_result.get('transaction_hash') if 'blockchain_result' in locals() else None
                    }
                else:
                    return {
                        'success': False,
                        'error': message,
                        'amount_paid': Decimal('0.00'),
                        'tokens_released': 0
                    }
            else:
                # Send payment failure notification
                self._send_payment_failure_notification(installment, payment_result['error'])
                return payment_result
                
        except Exception as e:
            logger.error(f"Error processing installment {installment.id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'amount_paid': Decimal('0.00'),
                'tokens_released': 0
            }
    
    def pay_installment_from_wallet(self, installment: ConstructionInstallment) -> Dict[str, Any]:
        """
        Charge one installment to the investor's wallet — the interactive
        "Pay now" path used by the dashboard and the buy-in-instalments checkout.

        Unlike the automated ``_process_single_installment`` batch path this does
        NOT require a stored default UserPaymentMethod: the investor has
        explicitly chosen to pay from their wallet balance. The wallet debit
        (audited WalletTransaction), the Payment record and the plan advance all
        happen in one atomic block behind a ``select_for_update`` row lock so two
        rapid clicks can't double-pay; the best-effort on-chain token release
        runs AFTER commit so a slow RPC never holds the lock.

        Returns ``{success, amount_paid, tokens_released, payment_id?, error?}``.
        """
        payment = None
        tokens_released = 0
        try:
            with transaction.atomic():
                # Lock the plan row for the duration of the charge.
                installment = ConstructionInstallment.objects.select_for_update().get(pk=installment.pk)

                if not installment.can_make_payment():
                    return {
                        'success': False,
                        'error': 'This installment is not due for payment yet.',
                        'amount_paid': Decimal('0.00'),
                        'tokens_released': 0,
                    }

                amount = installment.installment_amount

                try:
                    WalletBalance.debit(
                        installment.investor,
                        amount,
                        transaction_type='investment',
                        description=f'Installment payment for {installment.property_investment.title}',
                        reference_id=installment.id,
                    )
                except ValueError:
                    return {
                        'success': False,
                        'error': 'Insufficient wallet balance',
                        'amount_paid': Decimal('0.00'),
                        'tokens_released': 0,
                    }

                payment = Payment.objects.create(
                    user=installment.investor,
                    amount=amount,
                    currency='USD',
                    payment_method='wallet',
                    status=PaymentStatus.COMPLETED,
                    net_amount=amount,
                    completed_at=timezone.now(),
                    metadata={
                        'installment_id': str(installment.id),
                        'property_id': str(installment.property_investment.id),
                        'payment_number': installment.payments_made + 1,
                        'total_payments': installment.total_installments,
                    },
                )

                success, message, tokens_released = installment.process_payment(
                    amount, payment_date=timezone.now().date()
                )
                if not success:
                    # Roll the debit + Payment back — should be unreachable after
                    # can_make_payment(), but never advance the plan without money.
                    raise RuntimeError(message)
        except RuntimeError as exc:
            return {
                'success': False,
                'error': str(exc),
                'amount_paid': Decimal('0.00'),
                'tokens_released': 0,
            }

        # --- post-commit, best-effort side effects ---------------------------
        if installment.graduated_release and tokens_released and tokens_released > 0:
            try:
                self._release_tokens_to_investor(installment, int(tokens_released))
            except Exception as e:
                logger.warning(f"Token release failed for installment {installment.id}: {e}")

        try:
            self._send_payment_success_notification(installment, installment.installment_amount)
        except Exception:
            pass

        return {
            'success': True,
            'amount_paid': installment.installment_amount,
            'tokens_released': int(tokens_released or 0),
            'payment_id': str(payment.id) if payment else None,
        }

    def _get_user_payment_method(self, user: User) -> Optional[UserPaymentMethod]:
        """Get user's preferred payment method for automatic payments."""
        # First try to get default payment method
        payment_method = user.payment_methods.filter(
            is_default=True,
            is_verified=True
        ).first()
        
        if not payment_method:
            # Fall back to any verified payment method
            payment_method = user.payment_methods.filter(
                is_verified=True
            ).first()
        
        return payment_method
    
    @transaction.atomic
    def _collect_installment_payment(
        self, 
        installment: ConstructionInstallment, 
        payment_method: UserPaymentMethod
    ) -> Dict[str, Any]:
        """
        Collect payment for an installment using the specified payment method.
        
        Args:
            installment: ConstructionInstallment instance
            payment_method: UserPaymentMethod to use for payment
            
        Returns:
            Dictionary with payment collection result
        """
        try:
            # For wallet balance payments, check if sufficient funds
            if payment_method.method_type == 'wallet':
                wallet_balance = WalletBalance.objects.filter(
                    user=installment.investor,
                    currency='USD'
                ).first()
                
                if not wallet_balance or wallet_balance.available_balance < installment.installment_amount:
                    return {
                        'success': False,
                        'error': 'Insufficient wallet balance',
                        'amount_paid': Decimal('0.00')
                    }
                
                # Deduct from wallet
                wallet_balance.available_balance -= installment.installment_amount
                wallet_balance.save()
                
                # Create payment record
                payment = Payment.objects.create(
                    user=installment.investor,
                    amount=installment.installment_amount,
                    currency='USD',
                    payment_method='wallet',
                    status=PaymentStatus.COMPLETED,
                    net_amount=installment.installment_amount,
                    completed_at=timezone.now(),
                    metadata={
                        'installment_id': str(installment.id),
                        'property_id': str(installment.property_investment.id),
                        'payment_number': installment.payments_made + 1,
                        'total_payments': installment.total_installments
                    }
                )
                
                return {
                    'success': True,
                    'amount_paid': installment.installment_amount,
                    'payment_id': str(payment.id),
                    'payment_method': 'wallet'
                }
            
            # For other payment methods, integrate with payment processors
            # This is a placeholder for actual payment processor integration
            # In production, this would call Stripe, PayPal, etc.
            
            return {
                'success': False,
                'error': 'Payment method not supported for automatic payments',
                'amount_paid': Decimal('0.00')
            }
            
        except Exception as e:
            logger.error(f"Error collecting payment for installment {installment.id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'amount_paid': Decimal('0.00')
            }
    
    def _release_tokens_to_investor(
        self,
        installment: ConstructionInstallment,
        token_count: int
    ) -> Dict[str, Any]:
        """
        Release tokens to investor's wallet via the on-chain
        ``processInstallment`` call.

        Under-construction properties pre-mint the investor's total token
        allotment into escrow on the per-property contract (see RealEstateToken
        .mintTokens with isInstallment=true). This method moves a slice of
        that escrow to the investor's wallet whenever they pay an installment.

        Returns a dict ``{success: bool, transaction_hash?: str, error?: str}``.
        """
        from django.conf import settings
        from blockchain.models import SmartContract
        from web3 import Web3
        from eth_account import Account

        property_obj = installment.property_investment
        investor = installment.investor

        if not property_obj.smart_contract_address:
            return {'success': False, 'error': 'Property is not tokenized.'}
        if token_count <= 0:
            return {'success': False, 'error': 'Nothing to release.'}

        # Hybrid wallet model: prefer the destination_wallet recorded on
        # the investor's most-recent Investment in this property — that's
        # the address the investor explicitly committed to at checkout.
        # Fall back to the investor's primary (custodial) wallet, then
        # their external one. Worst case: there's truly no address and
        # we surface the error.
        from investments.models import Investment
        latest_inv = (
            Investment.objects
            .filter(property_investment=property_obj, user=investor)
            .order_by('-created_at')
            .only('destination_wallet')
            .first()
        )
        destination = (
            (latest_inv.destination_wallet if latest_inv else None)
            or investor.wallet_address
            or investor.external_wallet_address
        )
        if not destination:
            return {'success': False, 'error': 'Investor has no destination wallet configured.'}

        # Per-property SmartContract row carries the clone address + ABI.
        token_sc = SmartContract.objects.filter(
            property_reference=property_obj,
            contract_type='real_estate_token',
            status='active',
        ).first()
        if not token_sc:
            return {
                'success': False,
                'error': 'No active per-property token SmartContract row.',
            }

        try:
            w3 = Web3(Web3.HTTPProvider(token_sc.network.rpc_url))
            signer = Account.from_key(settings.BLOCKCHAIN_PRIVATE_KEY)
            token = w3.eth.contract(
                address=Web3.to_checksum_address(token_sc.contract_address),
                abi=token_sc.abi,
            )

            # Each clone holds exactly one property at tokenId=0.
            CLONE_TOKEN_ID = 0
            tx = token.functions.processInstallment(
                CLONE_TOKEN_ID,
                Web3.to_checksum_address(destination),
                int(token_count),
            ).build_transaction({
                'from': signer.address,
                'nonce': w3.eth.get_transaction_count(signer.address, 'pending'),
                'gas': 300_000,
                'gasPrice': w3.eth.gas_price,
                'chainId': token_sc.network.chain_id,
            })
            signed = w3.eth.account.sign_transaction(tx, settings.BLOCKCHAIN_PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()

            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
            if receipt.status != 1:
                logger.error(
                    "processInstallment reverted for installment %s, tx 0x%s",
                    installment.id, tx_hash,
                )
                return {
                    'success': False,
                    'error': 'processInstallment reverted on chain',
                    'transaction_hash': f'0x{tx_hash}',
                }

            logger.info(
                "Released %s tokens via installment %s (tx 0x%s)",
                token_count, installment.id, tx_hash,
            )
            return {
                'success': True,
                'transaction_hash': f'0x{tx_hash}',
                'block_number': receipt.blockNumber,
                'gas_used': receipt.gasUsed,
            }
        except Exception as e:
            logger.exception("Error releasing tokens for installment %s", installment.id)
            return {'success': False, 'error': str(e)}
    
    def send_payment_reminders(self, days_before_due: int = 3) -> Dict[str, Any]:
        """
        Send payment reminders to users with upcoming due dates.
        
        Args:
            days_before_due: Number of days before due date to send reminder
            
        Returns:
            Dictionary with reminder sending results
        """
        reminder_date = timezone.now().date() + timedelta(days=days_before_due)
        
        upcoming_payments = ConstructionInstallment.objects.filter(
            next_payment_date=reminder_date,
            status='pending',
            payments_made__lt=models.F('total_installments')
        ).select_related('investor', 'property_investment')
        
        results = {
            'reminders_sent': 0,
            'failed': 0,
            'errors': []
        }
        
        for installment in upcoming_payments:
            try:
                self._send_payment_reminder_notification(installment, days_before_due)
                results['reminders_sent'] += 1
                
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'installment_id': str(installment.id),
                    'user_email': installment.investor.email,
                    'error': str(e)
                })
                logger.error(f"Error sending reminder for installment {installment.id}: {e}")
        
        logger.info(
            f"Payment reminders: {results['reminders_sent']} sent, {results['failed']} failed"
        )
        
        return results
    
    @transaction.atomic
    def process_late_payments(self, grace_period_days: int = None) -> Dict[str, Any]:
        """
        Process late payments and apply fees.
        
        Args:
            grace_period_days: Override default grace period
            
        Returns:
            Dictionary with late payment processing results
        """
        today = timezone.now().date()
        
        # Find overdue payments
        overdue_payments = ConstructionInstallment.objects.filter(
            status='pending',
            payments_made__lt=models.F('total_installments')
        ).select_related('investor', 'property_investment')
        
        results = {
            'processed': 0,
            'late_fees_applied': 0,
            'total_fees': Decimal('0.00'),
            'cancelled': 0
        }
        
        for installment in overdue_payments:
            grace_days = grace_period_days or installment.grace_period_days
            due_date_with_grace = installment.next_payment_date + timedelta(days=grace_days)
            
            if today > due_date_with_grace:
                try:
                    # Apply late fee if not already applied for this payment period
                    if installment.late_payment_fee > 0:
                        # Check if late fee already applied (this is simplified)
                        # In production, you'd track this more precisely
                        late_fee_applied = self._apply_late_fee(installment)
                        if late_fee_applied:
                            results['late_fees_applied'] += 1
                            results['total_fees'] += installment.late_payment_fee
                    
                    # Send late payment notification
                    self._send_late_payment_notification(installment)
                    
                    # If payment is very overdue (e.g., 30 days), consider cancellation
                    if today > (installment.next_payment_date + timedelta(days=30)):
                        self._handle_severely_overdue_payment(installment)
                        results['cancelled'] += 1
                    
                    results['processed'] += 1
                    
                except Exception as e:
                    logger.error(f"Error processing late payment {installment.id}: {e}")
        
        return results
    
    def _apply_late_fee(self, installment: ConstructionInstallment) -> bool:
        """Apply late payment fee to installment."""
        try:
            # In a production system, you'd track late fees more precisely
            # This is a simplified implementation
            installment.total_investment_amount += installment.late_payment_fee
            installment.save()
            
            # Create notification for late fee
            Notification.objects.create(
                user=installment.investor,
                title="Late Payment Fee Applied",
                message=f"A late fee of ${installment.late_payment_fee} has been applied to your installment payment for {installment.property_investment.title}.",
                notification_type=NotificationType.PAYMENT,
                priority=NotificationPriority.HIGH,
                content_object=installment
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error applying late fee for installment {installment.id}: {e}")
            return False
    
    def _handle_severely_overdue_payment(self, installment: ConstructionInstallment):
        """Handle payments that are severely overdue."""
        try:
            # Cancel the installment plan
            installment.status = 'cancelled'
            installment.save()
            
            # Notify user about cancellation
            Notification.objects.create(
                user=installment.investor,
                title="Installment Plan Cancelled",
                message=f"Your installment plan for {installment.property_investment.title} has been cancelled due to non-payment. Please contact support for assistance.",
                notification_type=NotificationType.WARNING,
                priority=NotificationPriority.URGENT,
                content_object=installment
            )
            
            # Create admin alert
            from notifications.models import SystemAlert
            SystemAlert.objects.create(
                title="Installment Plan Cancelled - Non-Payment",
                message=f"Installment plan {installment.id} for user {installment.investor.email} has been cancelled due to non-payment.",
                alert_type='warning',
                category='payment',
                target_user_types=['admin'],
                metadata={
                    'installment_id': str(installment.id),
                    'user_id': str(installment.investor.id),
                    'property_id': str(installment.property_investment.id)
                }
            )
            
            logger.warning(f"Cancelled overdue installment plan: {installment.id}")
            
        except Exception as e:
            logger.error(f"Error handling overdue payment {installment.id}: {e}")
    
    def _send_payment_reminder_notification(self, installment: ConstructionInstallment, days_before: int):
        """Send payment reminder notification to investor."""
        Notification.objects.create(
            user=installment.investor,
            title="Payment Reminder",
            message=f"Your installment payment of ${installment.installment_amount} for {installment.property_investment.title} is due in {days_before} days on {installment.next_payment_date}.",
            notification_type=NotificationType.PAYMENT,
            priority=NotificationPriority.MEDIUM,
            content_object=installment,
            action_url=f"/dashboard/investments/{installment.property_investment.id}/installments",
            action_label="View Installment Details"
        )
    
    def _send_payment_success_notification(self, installment: ConstructionInstallment, amount_paid: Decimal):
        """Send payment success notification to investor."""
        tokens_message = ""
        if installment.graduated_release and installment.tokens_per_payment:
            tokens_message = f" {installment.tokens_per_payment} tokens have been released to your wallet."
        
        Notification.objects.create(
            user=installment.investor,
            title="Payment Processed Successfully",
            message=f"Your installment payment of ${amount_paid} for {installment.property_investment.title} has been processed successfully.{tokens_message}",
            notification_type=NotificationType.SUCCESS,
            priority=NotificationPriority.MEDIUM,
            content_object=installment,
            action_url=f"/dashboard/investments/{installment.property_investment.id}/installments",
            action_label="View Installment Details"
        )
    
    def _send_payment_failure_notification(self, installment: ConstructionInstallment, error_message: str):
        """Send payment failure notification to investor."""
        Notification.objects.create(
            user=installment.investor,
            title="Payment Processing Failed",
            message=f"Your installment payment of ${installment.installment_amount} for {installment.property_investment.title} could not be processed. Reason: {error_message}",
            notification_type=NotificationType.ERROR,
            priority=NotificationPriority.HIGH,
            content_object=installment,
            action_url=f"/dashboard/investments/{installment.property_investment.id}/installments",
            action_label="Update Payment Method"
        )
    
    def _send_late_payment_notification(self, installment: ConstructionInstallment):
        """Send late payment notification to investor."""
        Notification.objects.create(
            user=installment.investor,
            title="Late Payment Notice",
            message=f"Your installment payment of ${installment.installment_amount} for {installment.property_investment.title} is overdue. Please make your payment as soon as possible to avoid additional fees.",
            notification_type=NotificationType.WARNING,
            priority=NotificationPriority.HIGH,
            content_object=installment,
            action_url=f"/dashboard/investments/{installment.property_investment.id}/installments",
            action_label="Make Payment Now"
        )


class RentalIncomeProcessingService:
    """
    Service for processing automated rental income distributions.
    
    Handles:
    - Monthly rental income collection from properties
    - Distribution calculation to token holders
    - Automated payout processing
    - Distribution reporting and analytics
    """
    
    def __init__(self):
        # Removed: ``self.blockchain_service`` (BlockchainService no longer
        # exists as a top-level export). Web3 calls are made inline in
        # ``_release_tokens_to_investor`` against the per-property
        # SmartContract row.
        self.platform_commission_rate = getattr(settings, 'CAPIMAX_SETTINGS', {}).get(
            'PLATFORM_COMMISSION_RATE', Decimal('0.025')
        )
    
    @transaction.atomic
    def process_monthly_distributions(self, target_month: Optional[str] = None) -> Dict[str, Any]:
        """
        Process monthly rental income distributions for all eligible properties.
        
        Args:
            target_month: Month to process in YYYY-MM format (defaults to last month)
            
        Returns:
            Dictionary with processing results
        """
        if not target_month:
            # Default to last month
            last_month = (timezone.now().replace(day=1) - timedelta(days=1))
            target_month = last_month.strftime('%Y-%m')
        
        # Get all properties that generate rental income and are active
        rental_properties = Property.objects.filter(
            rental_income_active=True,
            monthly_rental_income__gt=0,
            status__in=['active', 'tokenized']
        ).select_related()
        
        results = {
            'properties_processed': 0,
            'total_distributions': 0,
            'total_amount_distributed': Decimal('0.00'),
            'failed_distributions': 0,
            'errors': []
        }
        
        for property_obj in rental_properties:
            try:
                # Check if distribution already exists for this month
                existing_distribution = RentalIncomeDistribution.objects.filter(
                    property=property_obj,
                    distribution_period=target_month
                ).first()
                
                if existing_distribution:
                    logger.info(f"Distribution already exists for property {property_obj.id}, month {target_month}")
                    continue
                
                # Calculate and process distribution
                distribution_result = self._process_property_distribution(property_obj, target_month)
                
                if distribution_result['success']:
                    results['properties_processed'] += 1
                    results['total_distributions'] += distribution_result['investor_count']
                    results['total_amount_distributed'] += distribution_result['total_distributed']
                else:
                    results['failed_distributions'] += 1
                    results['errors'].append({
                        'property_id': str(property_obj.id),
                        'property_title': property_obj.title,
                        'error': distribution_result['error']
                    })
                    
            except Exception as e:
                results['failed_distributions'] += 1
                results['errors'].append({
                    'property_id': str(property_obj.id),
                    'property_title': property_obj.title,
                    'error': str(e)
                })
                logger.error(f"Error processing distribution for property {property_obj.id}: {e}")
        
        logger.info(
            f"Monthly distribution processing complete: {results['properties_processed']} properties, "
            f"{results['total_distributions']} distributions, ${results['total_amount_distributed']} total"
        )
        
        return results
    
    @transaction.atomic
    def _process_property_distribution(self, property_obj: Property, period: str) -> Dict[str, Any]:
        """
        Process rental income distribution for a single property.
        
        Args:
            property_obj: Property instance
            period: Distribution period in YYYY-MM format
            
        Returns:
            Dictionary with processing result
        """
        try:
            # Calculate the distribution amounts
            if not property_obj.monthly_rental_income:
                return {
                    'success': False,
                    'error': 'No monthly rental income set for property'
                }
            
            # Apply occupancy rate to rental income
            actual_income = (property_obj.monthly_rental_income * 
                           property_obj.occupancy_rate / Decimal('100.0'))
            
            # Calculate platform fee
            platform_fee = actual_income * self.platform_commission_rate
            net_distribution_amount = actual_income - platform_fee
            
            # Get all investors with tokens for this property
            investors = self._get_property_investors(property_obj)
            
            if not investors:
                return {
                    'success': False,
                    'error': 'No investors found for property'
                }
            
            total_tokens = sum(investor['token_count'] for investor in investors)
            amount_per_token = net_distribution_amount / Decimal(total_tokens) if total_tokens > 0 else Decimal('0')
            
            # Create the distribution record
            distribution = RentalIncomeDistribution.objects.create(
                property=property_obj,
                distribution_period=period,
                total_rental_income=actual_income,
                platform_fee=platform_fee,
                net_distribution_amount=net_distribution_amount,
                tokens_eligible=total_tokens,
                amount_per_token=amount_per_token,
                notes=f"Automated distribution for {period}. Occupancy rate: {property_obj.occupancy_rate}%"
            )
            
            # Process individual investor distributions
            successful_distributions = 0
            total_distributed = Decimal('0.00')
            
            for investor_data in investors:
                investor_amount = amount_per_token * Decimal(investor_data['token_count'])
                
                distribution_result = self._distribute_to_investor(
                    distribution=distribution,
                    investor=investor_data['user'],
                    token_count=investor_data['token_count'],
                    amount=investor_amount
                )
                
                if distribution_result['success']:
                    successful_distributions += 1
                    total_distributed += investor_amount
                    
                    # Send success notification
                    self._send_distribution_notification(
                        investor_data['user'],
                        property_obj,
                        investor_amount,
                        period
                    )
                else:
                    logger.error(
                        f"Failed to distribute to investor {investor_data['user'].id}: "
                        f"{distribution_result['error']}"
                    )
            
            return {
                'success': True,
                'distribution_id': str(distribution.id),
                'investor_count': successful_distributions,
                'total_distributed': total_distributed,
                'amount_per_token': amount_per_token
            }
            
        except Exception as e:
            logger.error(f"Error processing distribution for property {property_obj.id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_property_investors(self, property_obj: Property) -> List[Dict[str, Any]]:
        """
        Get all investors who hold tokens for a specific property.
        
        Args:
            property_obj: Property instance
            
        Returns:
            List of investor dictionaries with user and token_count
        """
        from investments.models import Investment
        
        investments = Investment.objects.filter(
            property=property_obj,
            token_count__gt=0,
            status='active'
        ).select_related('user')
        
        return [
            {
                'user': investment.user,
                'token_count': investment.token_count
            }
            for investment in investments
        ]
    
    @transaction.atomic
    def _distribute_to_investor(
        self,
        distribution: RentalIncomeDistribution,
        investor: User,
        token_count: int,
        amount: Decimal
    ) -> Dict[str, Any]:
        """
        Distribute rental income to a single investor.
        
        Args:
            distribution: RentalIncomeDistribution instance
            investor: User instance
            token_count: Number of tokens owned by investor
            amount: Amount to distribute
            
        Returns:
            Dictionary with distribution result
        """
        try:
            # Get or create USD wallet balance for investor
            wallet_balance, created = WalletBalance.objects.get_or_create(
                user=investor,
                currency='USD',
                defaults={
                    'currency_type': 'fiat',
                    'available_balance': Decimal('0.00')
                }
            )
            
            # Add to available balance
            wallet_balance.available_balance += amount
            wallet_balance.save()
            
            # Create wallet transaction record
            from payments.models import WalletTransaction
            
            WalletTransaction.objects.create(
                user=investor,
                transaction_type='dividend',
                amount=amount,
                currency='USD',
                balance_before=wallet_balance.available_balance - amount,
                balance_after=wallet_balance.available_balance,
                reference_id=distribution.id,
                description=f"Rental income distribution from {distribution.property.title} for {distribution.distribution_period}"
            )
            
            logger.info(
                f"Distributed ${amount} to investor {investor.email} "
                f"for property {distribution.property.title}"
            )
            
            return {
                'success': True,
                'amount': amount,
                'wallet_balance_id': str(wallet_balance.id)
            }
            
        except Exception as e:
            logger.error(f"Error distributing to investor {investor.id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _send_distribution_notification(
        self,
        investor: User,
        property_obj: Property,
        amount: Decimal,
        period: str
    ):
        """Send rental income distribution notification to investor."""
        Notification.objects.create(
            user=investor,
            title="Rental Income Received",
            message=f"You have received ${amount.quantize(Decimal('0.01'))} in rental income from {property_obj.title} for {period}. The amount has been added to your wallet.",
            notification_type=NotificationType.SUCCESS,
            priority=NotificationPriority.MEDIUM,
            content_object=property_obj,
            action_url=f"/dashboard/investments/{property_obj.id}",
            action_label="View Property Details"
        )
    
    def collect_rental_income_from_properties(self) -> Dict[str, Any]:
        """
        Collect rental income data from property management systems.
        
        This is a placeholder for integration with external property management
        systems or manual input processes. In production, this would:
        1. Connect to property management APIs
        2. Validate rental income amounts
        3. Update property rental income records
        4. Handle any discrepancies or issues
        
        Returns:
            Dictionary with collection results
        """
        # This is a simplified implementation
        # In production, you'd integrate with actual property management systems
        
        results = {
            'properties_updated': 0,
            'total_income_collected': Decimal('0.00'),
            'errors': []
        }
        
        # Placeholder for actual implementation
        logger.info("Rental income collection completed (placeholder implementation)")
        
        return results