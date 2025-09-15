"""
Management command to process automatic investments.

This command processes all due automatic investments (DCA strategies)
and should be run regularly via cron job or task scheduler.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from investments.services import AutoInvestmentService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Process automatic investments command."""
    
    help = 'Process all due automatic investments'
    
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
    
    def handle(self, *args, **options):
        """Execute the command."""
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        self.stdout.write(
            self.style.SUCCESS(f'Processing auto investments at {timezone.now()}')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No actual processing will occur')
            )
        
        try:
            # Get due auto investments count
            from investments.models import AutoInvestment
            due_count = AutoInvestment.objects.filter(
                status='active',
                next_execution__lte=timezone.now()
            ).count()
            
            if due_count == 0:
                self.stdout.write(
                    self.style.SUCCESS('No auto investments due for processing')
                )
                return
            
            self.stdout.write(f'Found {due_count} auto investments to process')
            
            if not dry_run:
                # Process auto investments
                results = AutoInvestmentService.process_due_auto_investments()
                
                # Summarize results
                successful = len([r for r in results if r.get('success')])
                failed = len([r for r in results if not r.get('success')])
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Processed {successful} auto investments successfully'
                    )
                )
                
                if failed > 0:
                    self.stdout.write(
                        self.style.WARNING(f'{failed} auto investments failed')
                    )
                
                # Show detailed results if verbose
                if verbose:
                    for result in results:
                        if result.get('success'):
                            self.stdout.write(
                                f"  ✓ Auto Investment {result['auto_investment_id']}: "
                                f"Created investment {result.get('investment_id', 'N/A')} "
                                f"for ${result.get('amount', 0):.2f}"
                            )
                        else:
                            self.stdout.write(
                                f"  ✗ Auto Investment {result['auto_investment_id']}: "
                                f"{result.get('error', 'Unknown error')}"
                            )
            
        except Exception as e:
            logger.error(f'Error processing auto investments: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'Error processing auto investments: {str(e)}')
            )
            raise
        
        self.stdout.write(
            self.style.SUCCESS('Auto investment processing completed')
        )