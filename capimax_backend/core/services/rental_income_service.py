"""
Rental Income Service for Capimax Real Estate Tokenization Platform.

This module provides comprehensive services for automated rental income processing,
distribution calculations, and payout management.
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

from properties.models import Property, RentalIncomeDistribution
from accounts.models import User
from payments.models import WalletBalance, WalletTransaction, CurrencyExchangeRate
from investments.models import Investment
from notifications.models import Notification, NotificationType, NotificationPriority, SystemAlert

logger = logging.getLogger(__name__)


class RentalIncomeService:
    """
    Comprehensive service for rental income processing and distribution.
    
    Handles:
    - Monthly rental income collection from properties
    - Automated distribution calculations
    - Multi-currency payout support
    - Tax calculation and reporting
    - Performance analytics and reporting
    """
    
    def __init__(self):
        self.platform_commission_rate = getattr(settings, 'CAPIMAX_SETTINGS', {}).get(
            'PLATFORM_COMMISSION_RATE', Decimal('0.025')
        )
        self.supported_currencies = ['USD', 'EUR', 'AED', 'BTC', 'ETH', 'USDC', 'USDT']
    
    @transaction.atomic
    def process_monthly_distributions(
        self, 
        target_month: Optional[str] = None,
        property_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Process monthly rental income distributions.
        
        Args:
            target_month: Month to process in YYYY-MM format (defaults to last month)
            property_ids: List of specific property IDs to process (optional)
            
        Returns:
            Dictionary with comprehensive processing results
        """
        if not target_month:
            # Default to last month
            last_month = (timezone.now().replace(day=1) - timedelta(days=1))
            target_month = last_month.strftime('%Y-%m')
        
        logger.info(f"Starting monthly rental income distribution for {target_month}")
        
        # Build property queryset
        property_queryset = Property.objects.filter(
            rental_income_active=True,
            monthly_rental_income__gt=0,
            status__in=['active', 'tokenized']
        )
        
        if property_ids:
            property_queryset = property_queryset.filter(id__in=property_ids)
        
        rental_properties = property_queryset.select_related()
        
        results = {
            'period': target_month,
            'properties_processed': 0,
            'properties_failed': 0,
            'total_distributions': 0,
            'total_rental_income': Decimal('0.00'),
            'total_platform_fees': Decimal('0.00'),
            'total_distributed': Decimal('0.00'),
            'investors_paid': 0,
            'failed_distributions': [],
            'distribution_details': []
        }
        
        for property_obj in rental_properties:
            try:
                # Check if distribution already exists
                existing_distribution = RentalIncomeDistribution.objects.filter(
                    property=property_obj,
                    distribution_period=target_month
                ).first()
                
                if existing_distribution:
                    logger.info(f"Distribution already exists for property {property_obj.title} ({target_month})")
                    continue
                
                # Process property distribution
                distribution_result = self._process_single_property_distribution(
                    property_obj, target_month
                )
                
                if distribution_result['success']:
                    results['properties_processed'] += 1
                    results['total_distributions'] += distribution_result['investor_count']
                    results['total_rental_income'] += distribution_result['total_income']
                    results['total_platform_fees'] += distribution_result['platform_fee']
                    results['total_distributed'] += distribution_result['net_distributed']
                    results['investors_paid'] += distribution_result['successful_payouts']
                    results['distribution_details'].append(distribution_result)
                    
                    logger.info(
                        f"Successfully processed distribution for {property_obj.title}: "
                        f"${distribution_result['net_distributed']} to {distribution_result['investor_count']} investors"
                    )
                else:
                    results['properties_failed'] += 1
                    results['failed_distributions'].append({
                        'property_id': str(property_obj.id),
                        'property_title': property_obj.title,
                        'error': distribution_result['error']
                    })
                    
                    logger.error(f"Failed to process distribution for {property_obj.title}: {distribution_result['error']}")
                    
            except Exception as e:
                results['properties_failed'] += 1
                results['failed_distributions'].append({
                    'property_id': str(property_obj.id),
                    'property_title': property_obj.title,
                    'error': str(e)
                })
                logger.error(f"Exception processing distribution for property {property_obj.id}: {e}")
        
        # Create system alert with results
        self._create_distribution_summary_alert(results)
        
        logger.info(
            f"Monthly distribution processing complete for {target_month}: "
            f"{results['properties_processed']} properties, ${results['total_distributed']} distributed"
        )
        
        return results
    
    @transaction.atomic
    def _process_single_property_distribution(
        self, 
        property_obj: Property, 
        period: str
    ) -> Dict[str, Any]:
        """
        Process rental income distribution for a single property.
        
        Args:
            property_obj: Property instance
            period: Distribution period in YYYY-MM format
            
        Returns:
            Dictionary with detailed processing result
        """
        try:
            # Calculate actual rental income based on occupancy
            gross_rental_income = property_obj.monthly_rental_income or Decimal('0.00')
            occupancy_rate = property_obj.occupancy_rate or Decimal('100.00')
            
            actual_income = (gross_rental_income * occupancy_rate / Decimal('100.0')).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            
            if actual_income <= 0:
                return {
                    'success': False,
                    'error': 'No rental income to distribute'
                }
            
            # Calculate platform fee
            platform_fee = (actual_income * self.platform_commission_rate).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            net_distribution_amount = actual_income - platform_fee
            
            # Get property investors and their token holdings
            investors = self._get_property_token_holders(property_obj)
            
            if not investors:
                return {
                    'success': False,
                    'error': 'No token holders found for property'
                }
            
            total_tokens = sum(investor['token_count'] for investor in investors)
            amount_per_token = (net_distribution_amount / Decimal(total_tokens)).quantize(
                Decimal('0.00000001'), rounding=ROUND_HALF_UP
            ) if total_tokens > 0 else Decimal('0.00')
            
            # Create distribution record
            distribution = RentalIncomeDistribution.objects.create(
                property=property_obj,
                distribution_period=period,
                total_rental_income=actual_income,
                platform_fee=platform_fee,
                net_distribution_amount=net_distribution_amount,
                tokens_eligible=total_tokens,
                amount_per_token=amount_per_token,
                notes=f"Automated distribution for {period}. Occupancy: {occupancy_rate}%, Gross: ${gross_rental_income}"
            )
            
            # Process individual distributions
            distribution_results = self._distribute_to_all_investors(
                distribution, investors, amount_per_token
            )
            
            # Generate distribution analytics
            analytics = self._generate_distribution_analytics(distribution, distribution_results)
            
            return {
                'success': True,
                'distribution_id': str(distribution.id),
                'property_title': property_obj.title,
                'total_income': actual_income,
                'platform_fee': platform_fee,
                'net_distributed': distribution_results['total_distributed'],
                'amount_per_token': amount_per_token,
                'investor_count': len(investors),
                'successful_payouts': distribution_results['successful_payouts'],
                'failed_payouts': distribution_results['failed_payouts'],
                'analytics': analytics,
                'occupancy_rate': occupancy_rate
            }
            
        except Exception as e:
            logger.error(f"Error processing distribution for property {property_obj.id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_property_token_holders(self, property_obj: Property) -> List[Dict[str, Any]]:
        """
        Get all active token holders for a property.
        
        Args:
            property_obj: Property instance
            
        Returns:
            List of investor data dictionaries
        """
        investments = Investment.objects.filter(
            property=property_obj,
            token_count__gt=0,
            status='active'
        ).select_related('user').order_by('user__email')
        
        return [
            {
                'user': investment.user,
                'investment': investment,
                'token_count': investment.token_count,
                'investment_amount': investment.amount_invested,
                'ownership_percentage': (Decimal(investment.token_count) / Decimal(property_obj.total_tokens)) * 100
            }
            for investment in investments
        ]
    
    @transaction.atomic
    def _distribute_to_all_investors(
        self,
        distribution: RentalIncomeDistribution,
        investors: List[Dict[str, Any]],
        amount_per_token: Decimal
    ) -> Dict[str, Any]:
        """
        Distribute rental income to all investors.
        
        Args:
            distribution: RentalIncomeDistribution instance
            investors: List of investor data dictionaries
            amount_per_token: Amount to pay per token
            
        Returns:
            Dictionary with distribution results
        """
        results = {
            'successful_payouts': 0,
            'failed_payouts': 0,
            'total_distributed': Decimal('0.00'),
            'payout_details': []
        }
        
        for investor_data in investors:
            try:
                investor_amount = (amount_per_token * Decimal(investor_data['token_count'])).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                
                if investor_amount <= Decimal('0.01'):  # Skip very small amounts
                    continue
                
                # Process payout to investor
                payout_result = self._process_investor_payout(
                    distribution=distribution,
                    investor_data=investor_data,
                    amount=investor_amount
                )
                
                if payout_result['success']:
                    results['successful_payouts'] += 1
                    results['total_distributed'] += investor_amount
                    
                    # Send success notification
                    self._send_distribution_notification(
                        investor_data['user'],
                        distribution.property,
                        investor_amount,
                        distribution.distribution_period,
                        investor_data['token_count']
                    )
                else:
                    results['failed_payouts'] += 1
                    
                    # Send failure notification
                    self._send_distribution_failure_notification(
                        investor_data['user'],
                        distribution.property,
                        investor_amount,
                        payout_result['error']
                    )
                
                results['payout_details'].append({
                    'user_email': investor_data['user'].email,
                    'token_count': investor_data['token_count'],
                    'amount': investor_amount,
                    'success': payout_result['success'],
                    'error': payout_result.get('error')
                })
                
            except Exception as e:
                results['failed_payouts'] += 1
                error_msg = str(e)
                logger.error(f"Error processing payout to {investor_data['user'].email}: {error_msg}")
                
                results['payout_details'].append({
                    'user_email': investor_data['user'].email,
                    'token_count': investor_data['token_count'],
                    'amount': Decimal('0.00'),
                    'success': False,
                    'error': error_msg
                })
        
        return results
    
    @transaction.atomic
    def _process_investor_payout(
        self,
        distribution: RentalIncomeDistribution,
        investor_data: Dict[str, Any],
        amount: Decimal,
        currency: str = 'USD'
    ) -> Dict[str, Any]:
        """
        Process payout to a single investor.
        
        Args:
            distribution: RentalIncomeDistribution instance
            investor_data: Investor data dictionary
            amount: Amount to pay
            currency: Currency for payout
            
        Returns:
            Dictionary with payout result
        """
        try:
            investor = investor_data['user']
            
            # Get or create wallet balance
            wallet_balance, created = WalletBalance.objects.get_or_create(
                user=investor,
                currency=currency,
                defaults={
                    'currency_type': 'fiat' if currency in ['USD', 'EUR', 'AED'] else 'cryptocurrency',
                    'available_balance': Decimal('0.00'),
                    'is_active': True
                }
            )
            
            # Record balance before transaction
            balance_before = wallet_balance.available_balance
            
            # Add to available balance
            wallet_balance.available_balance += amount
            wallet_balance.save(update_fields=['available_balance', 'updated_at'])
            
            # Create transaction record
            transaction_record = WalletTransaction.objects.create(
                user=investor,
                transaction_type='dividend',
                amount=amount,
                currency=currency,
                balance_before=balance_before,
                balance_after=wallet_balance.available_balance,
                reference_id=distribution.id,
                description=self._generate_transaction_description(distribution, investor_data)
            )
            
            logger.info(
                f"Processed rental payout: ${amount} {currency} to {investor.email} "
                f"for property {distribution.property.title}"
            )
            
            return {
                'success': True,
                'amount': amount,
                'currency': currency,
                'transaction_id': str(transaction_record.id),
                'wallet_balance_id': str(wallet_balance.id),
                'new_balance': wallet_balance.available_balance
            }
            
        except Exception as e:
            logger.error(
                f"Error processing payout to {investor_data['user'].email}: {e}"
            )
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_transaction_description(
        self,
        distribution: RentalIncomeDistribution,
        investor_data: Dict[str, Any]
    ) -> str:
        """Generate descriptive transaction description."""
        ownership_pct = investor_data['ownership_percentage'].quantize(Decimal('0.01'))
        
        return (
            f"Rental income distribution from {distribution.property.title} "
            f"for {distribution.distribution_period}. "
            f"Token holding: {investor_data['token_count']} tokens ({ownership_pct}% ownership)"
        )
    
    def _generate_distribution_analytics(
        self,
        distribution: RentalIncomeDistribution,
        distribution_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate analytics for the distribution.
        
        Args:
            distribution: RentalIncomeDistribution instance
            distribution_results: Results from investor distributions
            
        Returns:
            Dictionary with analytics data
        """
        try:
            total_property_value = distribution.property.total_value or Decimal('0.00')
            monthly_yield = Decimal('0.00')
            
            if total_property_value > 0:
                monthly_yield = (distribution.net_distribution_amount / total_property_value * 100).quantize(
                    Decimal('0.01')
                )
            
            annual_yield_projection = monthly_yield * 12
            
            return {
                'monthly_yield_percentage': monthly_yield,
                'annual_yield_projection': annual_yield_projection,
                'distribution_efficiency': (
                    (Decimal(distribution_results['successful_payouts']) / 
                     Decimal(distribution_results['successful_payouts'] + distribution_results['failed_payouts'])) * 100
                ).quantize(Decimal('0.01')) if (distribution_results['successful_payouts'] + distribution_results['failed_payouts']) > 0 else Decimal('0.00'),
                'average_payout_amount': (
                    distribution_results['total_distributed'] / Decimal(distribution_results['successful_payouts'])
                ).quantize(Decimal('0.01')) if distribution_results['successful_payouts'] > 0 else Decimal('0.00'),
                'platform_fee_percentage': (
                    distribution.platform_fee / distribution.total_rental_income * 100
                ).quantize(Decimal('0.01')) if distribution.total_rental_income > 0 else Decimal('0.00')
            }
            
        except Exception as e:
            logger.error(f"Error generating distribution analytics: {e}")
            return {}
    
    def collect_property_rental_income(
        self,
        property_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Collect rental income data from external property management systems.
        
        This method serves as an integration point with property management APIs,
        manual data entry systems, or third-party rental collection services.
        
        Args:
            property_ids: List of specific property IDs to collect for
            
        Returns:
            Dictionary with collection results
        """
        # Build queryset
        properties_queryset = Property.objects.filter(
            rental_income_active=True,
            status__in=['active', 'tokenized']
        )
        
        if property_ids:
            properties_queryset = properties_queryset.filter(id__in=property_ids)
        
        results = {
            'properties_checked': 0,
            'properties_updated': 0,
            'total_income_collected': Decimal('0.00'),
            'errors': [],
            'updates': []
        }
        
        for property_obj in properties_queryset:
            try:
                # This is where you would integrate with external systems
                # For now, we'll implement a placeholder that validates existing data
                
                collection_result = self._collect_single_property_income(property_obj)
                results['properties_checked'] += 1
                
                if collection_result['updated']:
                    results['properties_updated'] += 1
                    results['total_income_collected'] += collection_result['amount']
                    results['updates'].append(collection_result)
                
            except Exception as e:
                results['errors'].append({
                    'property_id': str(property_obj.id),
                    'property_title': property_obj.title,
                    'error': str(e)
                })
                logger.error(f"Error collecting income for property {property_obj.id}: {e}")
        
        logger.info(
            f"Rental income collection: {results['properties_updated']} updated, "
            f"${results['total_income_collected']} collected"
        )
        
        return results
    
    def _collect_single_property_income(self, property_obj: Property) -> Dict[str, Any]:
        """
        Collect rental income for a single property.
        
        In production, this would integrate with:
        - Property management software APIs (AppFolio, Buildium, etc.)
        - Bank account transaction monitoring
        - Manual data entry interfaces
        - Third-party rental collection services
        
        Args:
            property_obj: Property instance
            
        Returns:
            Dictionary with collection result
        """
        # Placeholder implementation - in production this would fetch from external systems
        return {
            'updated': False,
            'amount': Decimal('0.00'),
            'source': 'placeholder',
            'property_id': str(property_obj.id),
            'message': 'No external integration configured'
        }
    
    def _send_distribution_notification(
        self,
        investor: User,
        property_obj: Property,
        amount: Decimal,
        period: str,
        token_count: int
    ):
        """Send successful distribution notification to investor."""
        Notification.objects.create(
            user=investor,
            title="Rental Income Received",
            message=f"You received ${amount} in rental income from {property_obj.title} for {period}. Based on your {token_count} tokens, the amount has been credited to your wallet.",
            notification_type=NotificationType.SUCCESS,
            priority=NotificationPriority.MEDIUM,
            content_object=property_obj,
            action_url=f"/dashboard/investments/{property_obj.id}",
            action_label="View Investment Details"
        )
    
    def _send_distribution_failure_notification(
        self,
        investor: User,
        property_obj: Property,
        amount: Decimal,
        error: str
    ):
        """Send failed distribution notification to investor."""
        Notification.objects.create(
            user=investor,
            title="Rental Distribution Failed",
            message=f"We were unable to distribute ${amount} in rental income from {property_obj.title}. Error: {error}. Please contact support.",
            notification_type=NotificationType.ERROR,
            priority=NotificationPriority.HIGH,
            content_object=property_obj,
            action_url="/support",
            action_label="Contact Support"
        )
    
    def _create_distribution_summary_alert(self, results: Dict[str, Any]):
        """Create system alert summarizing distribution results."""
        alert_type = 'info'
        if results['properties_failed'] > 0:
            alert_type = 'warning'
        if results['properties_processed'] == 0 and results['properties_failed'] > 0:
            alert_type = 'error'
        
        SystemAlert.objects.create(
            title=f"Monthly Rental Distribution Complete - {results['period']}",
            message=f"Processed {results['properties_processed']} properties, distributed ${results['total_distributed']} to {results['investors_paid']} investors. Platform fees: ${results['total_platform_fees']}. {results['properties_failed']} properties failed.",
            alert_type=alert_type,
            category='payment',
            target_user_types=['admin'],
            metadata={
                'period': results['period'],
                'summary': {
                    'properties_processed': results['properties_processed'],
                    'total_distributed': str(results['total_distributed']),
                    'investors_paid': results['investors_paid'],
                    'platform_fees': str(results['total_platform_fees'])
                },
                'timestamp': timezone.now().isoformat()
            }
        )
    
    def generate_distribution_report(
        self,
        period: str,
        property_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive distribution report for a period.
        
        Args:
            period: Period in YYYY-MM format
            property_ids: Optional list of property IDs to include
            
        Returns:
            Dictionary with report data
        """
        distributions_queryset = RentalIncomeDistribution.objects.filter(
            distribution_period=period
        ).select_related('property')
        
        if property_ids:
            distributions_queryset = distributions_queryset.filter(property_id__in=property_ids)
        
        distributions = list(distributions_queryset)
        
        if not distributions:
            return {
                'period': period,
                'total_distributions': 0,
                'error': 'No distributions found for period'
            }
        
        # Calculate summary statistics
        total_rental_income = sum(d.total_rental_income for d in distributions)
        total_platform_fees = sum(d.platform_fee for d in distributions)
        total_distributed = sum(d.net_distribution_amount for d in distributions)
        total_tokens = sum(d.tokens_eligible for d in distributions)
        
        # Get investor counts
        unique_investors = set()
        for distribution in distributions:
            investors = self._get_property_token_holders(distribution.property)
            unique_investors.update(investor['user'].id for investor in investors)
        
        # Calculate yield metrics
        property_values = [d.property.total_value for d in distributions if d.property.total_value]
        avg_monthly_yield = Decimal('0.00')
        if property_values:
            total_value = sum(property_values)
            avg_monthly_yield = (total_distributed / total_value * 100).quantize(Decimal('0.01'))
        
        return {
            'period': period,
            'total_distributions': len(distributions),
            'unique_properties': len(distributions),
            'unique_investors': len(unique_investors),
            'financial_summary': {
                'total_rental_income': total_rental_income,
                'total_platform_fees': total_platform_fees,
                'total_distributed': total_distributed,
                'platform_fee_rate': (total_platform_fees / total_rental_income * 100).quantize(Decimal('0.01')) if total_rental_income > 0 else Decimal('0.00')
            },
            'token_metrics': {
                'total_tokens_eligible': total_tokens,
                'average_amount_per_token': (total_distributed / Decimal(total_tokens)).quantize(Decimal('0.00000001')) if total_tokens > 0 else Decimal('0.00')
            },
            'yield_metrics': {
                'average_monthly_yield_percentage': avg_monthly_yield,
                'projected_annual_yield_percentage': avg_monthly_yield * 12
            },
            'distribution_details': [
                {
                    'property_id': str(d.property.id),
                    'property_title': d.property.title,
                    'rental_income': d.total_rental_income,
                    'platform_fee': d.platform_fee,
                    'distributed': d.net_distribution_amount,
                    'tokens_eligible': d.tokens_eligible,
                    'amount_per_token': d.amount_per_token
                }
                for d in distributions
            ]
        }