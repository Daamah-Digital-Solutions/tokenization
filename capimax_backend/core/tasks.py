"""
Core Celery tasks for rental income distribution automation.

This module contains asynchronous tasks for:
- Monthly rental income distribution processing
- Property rental income collection
- Distribution reporting and analytics
- Notification handling for rental distributions
"""

import logging
from typing import Dict, Any, Optional, List
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import timedelta

from .services.rental_income_service import RentalIncomeService
from properties.models import Property, RentalIncomeDistribution
from notifications.models import SystemAlert

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, retry_backoff=True)
def distribute_monthly_rental_income(
    self, 
    target_month: Optional[str] = None,
    property_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Process monthly rental income distributions for all eligible properties.
    
    This is the main task that runs monthly to distribute rental income
    to token holders across all properties.
    
    Args:
        target_month: Month to process in YYYY-MM format (defaults to last month)
        property_ids: Optional list of specific property IDs to process
        
    Returns:
        Dictionary with comprehensive processing results
    """
    try:
        if not target_month:
            # Default to last month
            last_month = (timezone.now().replace(day=1) - timedelta(days=1))
            target_month = last_month.strftime('%Y-%m')
        
        logger.info(f"Starting monthly rental income distribution for {target_month}")
        
        service = RentalIncomeService()
        results = service.process_monthly_distributions(
            target_month=target_month,
            property_ids=property_ids
        )
        
        # Create comprehensive system alerts based on results
        if results['properties_failed'] > 0:
            SystemAlert.objects.create(
                title=f"Rental Distribution Issues - {target_month}",
                message=f"Monthly rental distribution completed with issues: {results['properties_failed']} properties failed out of {results['properties_processed'] + results['properties_failed']} total. Check logs for details.",
                alert_type='warning',
                category='payment',
                target_user_types=['admin', 'finance'],
                metadata={
                    'task_id': str(self.request.id),
                    'period': target_month,
                    'results_summary': {
                        'properties_processed': results['properties_processed'],
                        'properties_failed': results['properties_failed'],
                        'total_distributed': str(results['total_distributed']),
                        'investors_paid': results['investors_paid']
                    },
                    'failed_properties': results['failed_distributions'],
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        # Create success alert for completed distributions
        if results['properties_processed'] > 0:
            SystemAlert.objects.create(
                title=f"Monthly Rental Distribution Success - {target_month}",
                message=f"Successfully distributed ${results['total_distributed']} to {results['investors_paid']} investors across {results['properties_processed']} properties. Platform fees collected: ${results['total_platform_fees']}.",
                alert_type='info',
                category='payment',
                target_user_types=['admin', 'finance'],
                metadata={
                    'task_id': str(self.request.id),
                    'period': target_month,
                    'financial_summary': {
                        'total_rental_income': str(results['total_rental_income']),
                        'total_platform_fees': str(results['total_platform_fees']),
                        'total_distributed': str(results['total_distributed']),
                        'properties_processed': results['properties_processed'],
                        'investors_paid': results['investors_paid']
                    },
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        logger.info(
            f"Monthly rental distribution completed for {target_month}: "
            f"{results['properties_processed']} properties, ${results['total_distributed']} distributed"
        )
        
        return results
        
    except Exception as exc:
        logger.error(f"Error in distribute_monthly_rental_income task: {exc}")
        
        # Create error alert
        SystemAlert.objects.create(
            title=f"Monthly Rental Distribution Failed - {target_month or 'Unknown Period'}",
            message=f"The monthly rental income distribution task failed with error: {str(exc)}",
            alert_type='error',
            category='system',
            target_user_types=['admin', 'finance'],
            metadata={
                'task_id': str(self.request.id),
                'period': target_month,
                'error': str(exc),
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # Retry the task with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3, retry_backoff=True)
def collect_rental_income(
    self, 
    property_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Collect rental income data from external property management systems.
    
    This task runs weekly to update rental income information from
    property management systems, bank feeds, or manual data entry.
    
    Args:
        property_ids: Optional list of specific property IDs to collect for
        
    Returns:
        Dictionary with collection results
    """
    try:
        logger.info("Starting rental income collection from external systems")
        
        service = RentalIncomeService()
        results = service.collect_property_rental_income(property_ids=property_ids)
        
        # Create alerts for collection issues
        if results['errors']:
            SystemAlert.objects.create(
                title=f"Rental Income Collection Errors: {len(results['errors'])} properties",
                message=f"Failed to collect rental income for {len(results['errors'])} properties out of {results['properties_checked']} checked.",
                alert_type='warning',
                category='system',
                target_user_types=['admin', 'property_manager'],
                metadata={
                    'task_id': str(self.request.id),
                    'collection_summary': {
                        'properties_checked': results['properties_checked'],
                        'properties_updated': results['properties_updated'],
                        'total_collected': str(results['total_income_collected'])
                    },
                    'errors': results['errors'],
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        # Create success alert for updates
        if results['properties_updated'] > 0:
            SystemAlert.objects.create(
                title=f"Rental Income Updated: {results['properties_updated']} properties",
                message=f"Successfully updated rental income for {results['properties_updated']} properties. Total income collected: ${results['total_income_collected']}.",
                alert_type='info',
                category='property',
                target_user_types=['admin', 'property_manager'],
                metadata={
                    'task_id': str(self.request.id),
                    'updates': results['updates'],
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        logger.info(
            f"Rental income collection completed: {results['properties_updated']} updated, "
            f"${results['total_income_collected']} collected"
        )
        
        return results
        
    except Exception as exc:
        logger.error(f"Error in collect_rental_income task: {exc}")
        
        # Create error alert
        SystemAlert.objects.create(
            title="Rental Income Collection Failed",
            message=f"The rental income collection task failed with error: {str(exc)}",
            alert_type='error',
            category='system',
            target_user_types=['admin', 'property_manager'],
            metadata={
                'task_id': str(self.request.id),
                'error': str(exc),
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # Retry the task
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=2)
def distribute_rental_income_to_investor(
    self,
    distribution_id: str,
    investor_id: str,
    amount: str,
    token_count: int
) -> Dict[str, Any]:
    """
    Distribute rental income to a specific investor.
    
    This task handles individual investor payouts and can be used for
    retry mechanisms when batch distributions fail.
    
    Args:
        distribution_id: UUID of the RentalIncomeDistribution
        investor_id: UUID of the investor User
        amount: Amount to distribute (as string for precision)
        token_count: Number of tokens owned by investor
        
    Returns:
        Dictionary with distribution result
    """
    try:
        from decimal import Decimal
        from accounts.models import User
        
        distribution = RentalIncomeDistribution.objects.select_related('property').get(
            id=distribution_id
        )
        investor = User.objects.get(id=investor_id)
        distribution_amount = Decimal(amount)
        
        logger.info(
            f"Processing individual rental distribution: ${distribution_amount} "
            f"to {investor.email} for {distribution.property.title}"
        )
        
        service = RentalIncomeService()
        
        # Create investor data structure
        investor_data = {
            'user': investor,
            'token_count': token_count,
            'ownership_percentage': (Decimal(token_count) / Decimal(distribution.tokens_eligible)) * 100
        }
        
        # Process the payout
        result = service._process_investor_payout(
            distribution=distribution,
            investor_data=investor_data,
            amount=distribution_amount
        )
        
        if result['success']:
            # Send success notification
            service._send_distribution_notification(
                investor,
                distribution.property,
                distribution_amount,
                distribution.distribution_period,
                token_count
            )
            
            logger.info(
                f"Successfully distributed ${distribution_amount} to {investor.email}"
            )
        else:
            # Send failure notification
            service._send_distribution_failure_notification(
                investor,
                distribution.property,
                distribution_amount,
                result['error']
            )
            
            logger.error(
                f"Failed to distribute ${distribution_amount} to {investor.email}: {result['error']}"
            )
        
        return result
        
    except (RentalIncomeDistribution.DoesNotExist, User.DoesNotExist) as e:
        error_msg = f"Record not found: {str(e)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as exc:
        logger.error(f"Error in distribute_rental_income_to_investor task: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
        else:
            return {
                'success': False,
                'error': str(exc)
            }


@shared_task(bind=True, max_retries=2)
def calculate_rental_distribution(
    self,
    property_id: str,
    period: str,
    rental_income: str,
    occupancy_rate: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculate rental income distribution for a specific property and period.
    
    This task can be used for manual distribution calculations or
    when specific properties need recalculation.
    
    Args:
        property_id: UUID of the Property
        period: Period in YYYY-MM format
        rental_income: Rental income amount (as string for precision)
        occupancy_rate: Optional occupancy rate override
        
    Returns:
        Dictionary with calculation results
    """
    try:
        from decimal import Decimal
        
        property_obj = Property.objects.get(id=property_id)
        income_amount = Decimal(rental_income)
        
        # Override occupancy rate if provided
        if occupancy_rate:
            property_obj.occupancy_rate = Decimal(occupancy_rate)
        
        # Override rental income for calculation
        original_income = property_obj.monthly_rental_income
        property_obj.monthly_rental_income = income_amount
        
        logger.info(
            f"Calculating rental distribution for {property_obj.title}: "
            f"${income_amount} for period {period}"
        )
        
        service = RentalIncomeService()
        result = service._process_single_property_distribution(property_obj, period)
        
        # Restore original income
        property_obj.monthly_rental_income = original_income
        
        if result['success']:
            logger.info(
                f"Calculated distribution for {property_obj.title}: "
                f"${result['net_distributed']} to {result['investor_count']} investors"
            )
        else:
            logger.error(
                f"Failed to calculate distribution for {property_obj.title}: {result['error']}"
            )
        
        return result
        
    except Property.DoesNotExist:
        error_msg = f"Property with id {property_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as exc:
        logger.error(f"Error in calculate_rental_distribution task: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        else:
            return {
                'success': False,
                'error': str(exc)
            }


@shared_task(bind=True)
def generate_rental_distribution_report(
    self,
    period: str,
    property_ids: Optional[List[str]] = None,
    send_to_admins: bool = True
) -> Dict[str, Any]:
    """
    Generate comprehensive rental distribution report for a period.
    
    Args:
        period: Period in YYYY-MM format
        property_ids: Optional list of property IDs to include
        send_to_admins: Whether to send report to admin users
        
    Returns:
        Dictionary with report data
    """
    try:
        logger.info(f"Generating rental distribution report for period {period}")
        
        service = RentalIncomeService()
        report = service.generate_distribution_report(
            period=period,
            property_ids=property_ids
        )
        
        if 'error' in report:
            logger.warning(f"No distributions found for period {period}")
            return report
        
        # Create system alert with report summary
        SystemAlert.objects.create(
            title=f"Rental Distribution Report Generated - {period}",
            message=f"Monthly report generated: {report['unique_properties']} properties, {report['unique_investors']} investors, ${report['financial_summary']['total_distributed']} distributed.",
            alert_type='info',
            category='reporting',
            target_user_types=['admin', 'finance'],
            metadata={
                'task_id': str(self.request.id),
                'report': report,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # TODO: In production, you might want to:
        # - Generate PDF reports
        # - Send email summaries to administrators
        # - Store reports in external document management systems
        # - Create dashboard visualizations
        
        logger.info(f"Successfully generated report for period {period}")
        
        return report
        
    except Exception as exc:
        logger.error(f"Error generating rental distribution report: {exc}")
        return {
            'success': False,
            'error': str(exc)
        }


@shared_task(bind=True)
def update_property_rental_income(
    self,
    property_id: str,
    monthly_income: str,
    occupancy_rate: Optional[str] = None,
    effective_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update rental income information for a specific property.
    
    This task can be triggered by external property management systems
    or manual admin updates.
    
    Args:
        property_id: UUID of the Property
        monthly_income: New monthly rental income amount
        occupancy_rate: Optional new occupancy rate
        effective_date: Optional effective date for the change
        
    Returns:
        Dictionary with update result
    """
    try:
        from decimal import Decimal
        from django.utils.dateparse import parse_date
        
        property_obj = Property.objects.get(id=property_id)
        new_income = Decimal(monthly_income)
        
        old_income = property_obj.monthly_rental_income
        property_obj.monthly_rental_income = new_income
        
        changes = [f"Monthly income: ${old_income} -> ${new_income}"]
        
        if occupancy_rate:
            old_occupancy = property_obj.occupancy_rate
            property_obj.occupancy_rate = Decimal(occupancy_rate)
            changes.append(f"Occupancy rate: {old_occupancy}% -> {occupancy_rate}%")
        
        property_obj.save(update_fields=['monthly_rental_income', 'occupancy_rate', 'updated_at'])
        
        # Create system alert for income change
        SystemAlert.objects.create(
            title=f"Property Rental Income Updated: {property_obj.title}",
            message=f"Rental income updated for {property_obj.title}. Changes: {'; '.join(changes)}",
            alert_type='info',
            category='property',
            target_user_types=['admin', 'property_manager'],
            metadata={
                'property_id': property_id,
                'changes': changes,
                'effective_date': effective_date,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        logger.info(f"Updated rental income for property {property_obj.title}: ${new_income}")
        
        return {
            'success': True,
            'property_id': property_id,
            'property_title': property_obj.title,
            'old_income': str(old_income),
            'new_income': str(new_income),
            'changes': changes
        }
        
    except Property.DoesNotExist:
        error_msg = f"Property with id {property_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as exc:
        logger.error(f"Error updating property rental income: {exc}")
        return {
            'success': False,
            'error': str(exc)
        }


# Utility task for testing and monitoring
@shared_task
def test_rental_income_processing() -> str:
    """Test task for verifying rental income processing system."""
    try:
        from django.db.models import Sum
        
        # Count properties with active rental income
        active_properties = Property.objects.filter(
            rental_income_active=True,
            monthly_rental_income__gt=0
        ).count()
        
        # Get total monthly rental income across all properties
        total_monthly_income = Property.objects.filter(
            rental_income_active=True,
            monthly_rental_income__gt=0
        ).aggregate(
            total=Sum('monthly_rental_income')
        )['total'] or Decimal('0.00')
        
        # Count recent distributions
        recent_distributions = RentalIncomeDistribution.objects.filter(
            distribution_date__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        message = (
            f"Rental income processing system operational. "
            f"{active_properties} active properties with ${total_monthly_income} total monthly income. "
            f"{recent_distributions} distributions in last 30 days."
        )
        
        logger.info(message)
        return message
        
    except Exception as e:
        error_message = f"Error in rental income processing test: {e}"
        logger.error(error_message)
        return error_message