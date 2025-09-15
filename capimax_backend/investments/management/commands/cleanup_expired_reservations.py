"""
Management command to clean up expired token reservations.

This command releases expired token reservations to make tokens
available for other investors.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from investments.models import TokenReservation
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Clean up expired token reservations command."""
    
    help = 'Release expired token reservations'
    
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
            '--hours',
            type=int,
            default=0,
            help='Only process reservations expired more than X hours ago',
        )
    
    def handle(self, *args, **options):
        """Execute the command."""
        dry_run = options['dry_run']
        verbose = options['verbose']
        hours_threshold = options['hours']
        
        self.stdout.write(
            self.style.SUCCESS(f'Cleaning up expired token reservations at {timezone.now()}')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No actual processing will occur')
            )
        
        try:
            # Get expired reservations
            cutoff_time = timezone.now()
            if hours_threshold > 0:
                from datetime import timedelta
                cutoff_time = timezone.now() - timedelta(hours=hours_threshold)
                self.stdout.write(
                    f'Processing reservations expired before {cutoff_time}'
                )
            
            expired_reservations = TokenReservation.objects.filter(
                released=False,
                expires_at__lt=cutoff_time
            ).select_related('user', 'property_investment')
            
            expired_count = expired_reservations.count()
            
            if expired_count == 0:
                self.stdout.write(
                    self.style.SUCCESS('No expired reservations to clean up')
                )
                return
            
            self.stdout.write(f'Found {expired_count} expired reservations')
            
            # Calculate total tokens to be released
            total_tokens = sum(r.token_amount for r in expired_reservations)
            self.stdout.write(f'Total tokens to release: {total_tokens:,}')
            
            if not dry_run:
                # Release the reservations
                updated_count = expired_reservations.update(released=True)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Released {updated_count} expired token reservations'
                    )
                )
                
                # Log by property if verbose
                if verbose:
                    from django.db.models import Sum
                    
                    property_summary = expired_reservations.values(
                        'property_investment__title'
                    ).annotate(
                        total_tokens=Sum('token_amount')
                    )
                    
                    for prop in property_summary:
                        self.stdout.write(
                            f"  • {prop['property_investment__title']}: "
                            f"{prop['total_tokens']:,} tokens released"
                        )
                        
            else:
                # Dry run - show detailed information
                if verbose:
                    for reservation in expired_reservations:
                        expired_hours = (timezone.now() - reservation.expires_at).total_seconds() / 3600
                        self.stdout.write(
                            f"  • {reservation.token_amount:,} tokens for {reservation.user.email} "
                            f"in {reservation.property_investment.title} "
                            f"(expired {expired_hours:.1f} hours ago)"
                        )
            
        except Exception as e:
            logger.error(f'Error cleaning up reservations: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'Error cleaning up reservations: {str(e)}')
            )
            raise
        
        self.stdout.write(
            self.style.SUCCESS('Token reservation cleanup completed')
        )