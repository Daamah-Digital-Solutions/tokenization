"""
Management command to distribute dividends to investors.

This command processes all pending dividend payments and distributes
them to investors based on their token ownership.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from investments.services import DividendDistributionService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Distribute dividends command."""
    
    help = 'Process and distribute pending dividend payments'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without actually processing',
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed processing information',
        )
        
        parser.add_argument(
            '--property-id',
            type=str,
            help='Process dividends for specific property only',
        )
    
    def handle(self, *args, **options):
        """Execute the command."""
        dry_run = options['dry_run']
        verbose = options['verbose']
        property_id = options.get('property_id')
        
        self.stdout.write(
            self.style.SUCCESS(f'Processing dividend payments at {timezone.now()}')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No actual processing will occur')
            )
        
        if property_id:
            self.stdout.write(f'Processing dividends for property: {property_id}')
        
        try:
            # Get pending dividends count
            from investments.models import DividendPayment
            
            pending_query = DividendPayment.objects.filter(
                status='pending',
                payment_date__lte=timezone.now()
            )
            
            if property_id:
                pending_query = pending_query.filter(
                    investment__property_investment__id=property_id
                )
            
            pending_count = pending_query.count()
            
            if pending_count == 0:
                self.stdout.write(
                    self.style.SUCCESS('No pending dividends to process')
                )
                return
            
            self.stdout.write(f'Found {pending_count} pending dividend payments')
            
            if not dry_run:
                # Process dividend payments
                results = DividendDistributionService.calculate_pending_dividends()
                
                # Summarize results
                successful = len([r for r in results if r.get('success')])
                failed = len([r for r in results if not r.get('success')])
                total_amount = sum(r.get('amount', 0) for r in results if r.get('success'))
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Processed {successful} dividend payments successfully'
                    )
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f'Total dividend amount distributed: ${total_amount:,.2f}')
                )
                
                if failed > 0:
                    self.stdout.write(
                        self.style.WARNING(f'{failed} dividend payments failed')
                    )
                
                # Show detailed results if verbose
                if verbose:
                    for result in results:
                        if result.get('success'):
                            self.stdout.write(
                                f"  ✓ Dividend {result['dividend_id']}: "
                                f"${result.get('amount', 0):,.2f} to {result.get('user_email', 'N/A')} "
                                f"for {result.get('property_title', 'N/A')}"
                            )
                        else:
                            self.stdout.write(
                                f"  ✗ Dividend {result['dividend_id']}: "
                                f"{result.get('error', 'Unknown error')}"
                            )
            else:
                # Dry run - show what would be processed
                dividends = pending_query.select_related(
                    'investment__user',
                    'investment__property_investment'
                )
                
                total_amount = sum(d.amount for d in dividends)
                
                self.stdout.write(f'Would process {pending_count} dividend payments')
                self.stdout.write(f'Total amount to distribute: ${total_amount:,.2f}')
                
                if verbose:
                    for dividend in dividends:
                        self.stdout.write(
                            f"  • ${dividend.amount:,.2f} to {dividend.investment.user.email} "
                            f"for {dividend.investment.property_investment.title}"
                        )
            
        except Exception as e:
            logger.error(f'Error processing dividends: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'Error processing dividends: {str(e)}')
            )
            raise
        
        self.stdout.write(
            self.style.SUCCESS('Dividend processing completed')
        )