"""
Celery tasks for property-related automation.

This module contains asynchronous tasks for:
- Installment payment processing
- Payment reminders
- Late payment handling
- Token release automation
"""

import logging
from typing import Dict, Any, Optional
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from .services import InstallmentProcessingService
from .models import InstallmentPayment, Property
from notifications.models import SystemAlert

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, retry_backoff=True)
def process_due_installments(self, max_payments: int = 100) -> Dict[str, Any]:
    """
    Process all installment payments that are due for collection.
    
    This task runs daily and processes payments that are due,
    including automatic collection and token release.
    
    Args:
        max_payments: Maximum number of payments to process in one batch
        
    Returns:
        Dictionary with processing results
    """
    try:
        logger.info(f"Starting due installment processing (max: {max_payments})")
        
        service = InstallmentProcessingService()
        results = service.process_due_payments(max_payments=max_payments)
        
        # Create system alert if there were failures
        if results['failed'] > 0:
            SystemAlert.objects.create(
                title=f"Installment Processing Failures: {results['failed']} failed",
                message=f"Failed to process {results['failed']} installment payments out of {results['processed']} total. Check logs for details.",
                alert_type='warning',
                category='payment',
                target_user_types=['admin'],
                metadata={
                    'task_id': str(self.request.id),
                    'results': results,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        # Create success alert for significant processing
        if results['successful'] > 0:
            SystemAlert.objects.create(
                title=f"Daily Installments Processed: {results['successful']} successful",
                message=f"Successfully processed {results['successful']} installment payments totaling ${results['total_amount']}. {results['tokens_released']} tokens released.",
                alert_type='info',
                category='payment',
                target_user_types=['admin'],
                metadata={
                    'task_id': str(self.request.id),
                    'results': results,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        logger.info(
            f"Due installment processing completed: {results['successful']} successful, "
            f"{results['failed']} failed, ${results['total_amount']} processed"
        )
        
        return results
        
    except Exception as exc:
        logger.error(f"Error in process_due_installments task: {exc}")
        
        # Create error alert
        SystemAlert.objects.create(
            title="Installment Processing Task Failed",
            message=f"The daily installment processing task failed with error: {str(exc)}",
            alert_type='error',
            category='system',
            target_user_types=['admin'],
            metadata={
                'task_id': str(self.request.id),
                'error': str(exc),
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # Retry the task
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=2, retry_backoff=True)
def send_payment_reminders(self, days_before_due: int = 3) -> Dict[str, Any]:
    """
    Send payment reminders to users with upcoming due dates.
    
    Args:
        days_before_due: Number of days before due date to send reminder
        
    Returns:
        Dictionary with reminder sending results
    """
    try:
        logger.info(f"Starting payment reminders ({days_before_due} days before due)")
        
        service = InstallmentProcessingService()
        results = service.send_payment_reminders(days_before_due=days_before_due)
        
        # Log results
        if results['failed'] > 0:
            logger.warning(f"Failed to send {results['failed']} payment reminders")
            
            SystemAlert.objects.create(
                title=f"Payment Reminder Failures: {results['failed']} failed",
                message=f"Failed to send {results['failed']} payment reminders. Check logs for details.",
                alert_type='warning',
                category='system',
                target_user_types=['admin'],
                metadata={
                    'task_id': str(self.request.id),
                    'results': results,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        logger.info(f"Payment reminders completed: {results['reminders_sent']} sent")
        
        return results
        
    except Exception as exc:
        logger.error(f"Error in send_payment_reminders task: {exc}")
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3, retry_backoff=True)
def process_late_payments(self, grace_period_days: Optional[int] = None) -> Dict[str, Any]:
    """
    Process late payments and apply fees.
    
    Args:
        grace_period_days: Override default grace period
        
    Returns:
        Dictionary with late payment processing results
    """
    try:
        logger.info("Starting late payment processing")
        
        service = InstallmentProcessingService()
        results = service.process_late_payments(grace_period_days=grace_period_days)
        
        # Create alerts for significant late payment activity
        if results['late_fees_applied'] > 0 or results['cancelled'] > 0:
            SystemAlert.objects.create(
                title=f"Late Payment Processing: {results['late_fees_applied']} fees, {results['cancelled']} cancelled",
                message=f"Applied {results['late_fees_applied']} late fees totaling ${results['total_fees']}. Cancelled {results['cancelled']} overdue installment plans.",
                alert_type='warning' if results['cancelled'] > 0 else 'info',
                category='payment',
                target_user_types=['admin'],
                metadata={
                    'task_id': str(self.request.id),
                    'results': results,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        logger.info(
            f"Late payment processing completed: {results['late_fees_applied']} fees applied, "
            f"{results['cancelled']} cancelled, ${results['total_fees']} in fees"
        )
        
        return results
        
    except Exception as exc:
        logger.error(f"Error in process_late_payments task: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def process_installment_payment(self, installment_id: str) -> Dict[str, Any]:
    """
    Process a specific installment payment (for manual/immediate processing).
    
    Args:
        installment_id: UUID of the InstallmentPayment to process
        
    Returns:
        Dictionary with processing result
    """
    try:
        logger.info(f"Processing individual installment payment: {installment_id}")
        
        installment = InstallmentPayment.objects.get(id=installment_id)
        service = InstallmentProcessingService()
        
        result = service._process_single_installment(installment)
        
        if result['success']:
            logger.info(f"Successfully processed installment {installment_id}")
        else:
            logger.error(f"Failed to process installment {installment_id}: {result['error']}")
        
        return result
        
    except InstallmentPayment.DoesNotExist:
        error_msg = f"InstallmentPayment with id {installment_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'amount_paid': 0,
            'tokens_released': 0
        }
    except Exception as exc:
        logger.error(f"Error processing installment {installment_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        else:
            return {
                'success': False,
                'error': str(exc),
                'amount_paid': 0,
                'tokens_released': 0
            }


@shared_task(bind=True, max_retries=2)
def send_payment_reminder(self, installment_id: str, days_before: int = 3) -> Dict[str, Any]:
    """
    Send payment reminder for a specific installment.
    
    Args:
        installment_id: UUID of the InstallmentPayment
        days_before: Number of days before due date
        
    Returns:
        Dictionary with reminder result
    """
    try:
        installment = InstallmentPayment.objects.select_related(
            'investor', 'property_investment'
        ).get(id=installment_id)
        
        service = InstallmentProcessingService()
        service._send_payment_reminder_notification(installment, days_before)
        
        logger.info(f"Sent payment reminder for installment {installment_id}")
        
        return {
            'success': True,
            'installment_id': installment_id,
            'recipient': installment.investor.email
        }
        
    except InstallmentPayment.DoesNotExist:
        error_msg = f"InstallmentPayment with id {installment_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as exc:
        logger.error(f"Error sending reminder for installment {installment_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        else:
            return {
                'success': False,
                'error': str(exc)
            }


@shared_task(bind=True, max_retries=3)
def release_tokens_for_completed_installment(self, installment_id: str) -> Dict[str, Any]:
    """
    Release all remaining tokens for a completed installment plan.
    
    This task is triggered when an installment plan is completed
    and uses non-graduated release (tokens released at completion).
    
    Args:
        installment_id: UUID of the completed InstallmentPayment
        
    Returns:
        Dictionary with token release result
    """
    try:
        installment = InstallmentPayment.objects.select_related(
            'investor', 'property_investment'
        ).get(id=installment_id)
        
        if not installment.is_completed:
            return {
                'success': False,
                'error': 'Installment plan is not completed'
            }
        
        if installment.graduated_release:
            return {
                'success': True,
                'message': 'Tokens already released gradually',
                'tokens_released': 0
            }
        
        tokens_to_release = installment.tokens_pending_release
        if tokens_to_release <= 0:
            return {
                'success': True,
                'message': 'No tokens pending release',
                'tokens_released': 0
            }
        
        service = InstallmentProcessingService()
        result = service._release_tokens_to_investor(installment, int(tokens_to_release))
        
        if result['success']:
            # Update installment record
            installment.tokens_released = installment.token_allocation
            installment.save()
            
            # Send notification
            service._send_token_release_notification(installment, int(tokens_to_release))
            
            logger.info(
                f"Released {tokens_to_release} tokens for completed installment {installment_id}"
            )
        
        return {
            'success': result['success'],
            'tokens_released': int(tokens_to_release) if result['success'] else 0,
            'error': result.get('error'),
            'blockchain_tx': result.get('transaction_hash')
        }
        
    except InstallmentPayment.DoesNotExist:
        error_msg = f"InstallmentPayment with id {installment_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'tokens_released': 0
        }
    except Exception as exc:
        logger.error(f"Error releasing tokens for installment {installment_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        else:
            return {
                'success': False,
                'error': str(exc),
                'tokens_released': 0
            }


@shared_task(bind=True)
def update_property_construction_progress(self, property_id: str, progress_percentage: float) -> Dict[str, Any]:
    """
    Update construction progress for a property and trigger token releases if applicable.
    
    Args:
        property_id: UUID of the Property
        progress_percentage: New construction progress percentage
        
    Returns:
        Dictionary with update result
    """
    try:
        property_obj = Property.objects.get(id=property_id)
        
        if not property_obj.is_under_construction:
            return {
                'success': False,
                'error': 'Property is not under construction'
            }
        
        old_progress = property_obj.construction_progress
        property_obj.construction_progress = progress_percentage
        property_obj.save()
        
        # Check if property is now completed
        if progress_percentage >= 100 and old_progress < 100:
            property_obj.status = 'tokenized'  # Update to completed status
            property_obj.save()
            
            # Trigger completion notifications and processes
            _handle_construction_completion.delay(property_id)
        
        logger.info(f"Updated construction progress for property {property_id}: {progress_percentage}%")
        
        return {
            'success': True,
            'property_id': property_id,
            'old_progress': float(old_progress),
            'new_progress': progress_percentage
        }
        
    except Property.DoesNotExist:
        error_msg = f"Property with id {property_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as exc:
        logger.error(f"Error updating construction progress for property {property_id}: {exc}")
        return {
            'success': False,
            'error': str(exc)
        }


@shared_task(bind=True)
def _handle_construction_completion(self, property_id: str) -> Dict[str, Any]:
    """
    Handle completion of property construction.
    
    This includes:
    - Notifying all investors
    - Releasing any pending tokens
    - Updating property status
    - Creating system alerts
    
    Args:
        property_id: UUID of the completed Property
        
    Returns:
        Dictionary with completion handling result
    """
    try:
        from investments.models import Investment
        from notifications.models import Notification, NotificationType, NotificationPriority
        
        property_obj = Property.objects.get(id=property_id)
        
        # Get all investors for this property
        investments = Investment.objects.filter(
            property=property_obj,
            status='active'
        ).select_related('user')
        
        notifications_sent = 0
        
        # Send completion notifications to all investors
        for investment in investments:
            Notification.objects.create(
                user=investment.user,
                title="Property Construction Completed",
                message=f"Great news! Construction of {property_obj.title} has been completed. Your investment is now in a completed property.",
                notification_type=NotificationType.SUCCESS,
                priority=NotificationPriority.HIGH,
                content_object=property_obj,
                action_url=f"/dashboard/investments/{property_obj.id}",
                action_label="View Property Details"
            )
            notifications_sent += 1
        
        # Create system alert
        SystemAlert.objects.create(
            title=f"Property Construction Completed: {property_obj.title}",
            message=f"Construction of property {property_obj.title} has been completed. {notifications_sent} investor notifications sent.",
            alert_type='info',
            category='property',
            target_user_types=['admin'],
            metadata={
                'property_id': property_id,
                'investor_count': notifications_sent,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        logger.info(f"Handled construction completion for property {property_id}, notified {notifications_sent} investors")
        
        return {
            'success': True,
            'property_id': property_id,
            'notifications_sent': notifications_sent
        }
        
    except Property.DoesNotExist:
        error_msg = f"Property with id {property_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as exc:
        logger.error(f"Error handling construction completion for property {property_id}: {exc}")
        return {
            'success': False,
            'error': str(exc)
        }


# Utility task for testing and monitoring
@shared_task
def test_installment_processing() -> str:
    """Test task for verifying installment processing system."""
    try:
        # Count pending installments
        pending_count = InstallmentPayment.objects.filter(
            status='pending',
            next_payment_date__lte=timezone.now().date()
        ).count()
        
        message = f"Installment processing system is operational. {pending_count} payments due for processing."
        logger.info(message)
        return message
        
    except Exception as e:
        error_message = f"Error in installment processing test: {e}"
        logger.error(error_message)
        return error_message