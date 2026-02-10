"""
Management command to approve KYC for test investor accounts.
Usage: python manage.py setup_test_kyc
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User


class Command(BaseCommand):
    help = 'Approve KYC for test investor accounts so they can invest'

    def handle(self, *args, **options):
        test_emails = [
            'investor@test.com',
            'investor.demo@capimax.com',
        ]

        for email in test_emails:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'User {email} not found, skipping'))
                continue

            # Ensure user is verified
            if not user.is_verified:
                user.is_verified = True
                user.save(update_fields=['is_verified'])
                self.stdout.write(f'  Set is_verified=True for {email}')

            # Create or update KYC profile
            from kyc.models import KYCProfile
            kyc_profile, created = KYCProfile.objects.get_or_create(
                user=user,
                defaults={
                    'status': 'approved',
                    'verification_level': 'enhanced',
                    'submitted_at': timezone.now(),
                    'reviewed_at': timezone.now(),
                }
            )

            if not created and kyc_profile.status != 'approved':
                kyc_profile.status = 'approved'
                kyc_profile.verification_level = 'enhanced'
                kyc_profile.reviewed_at = timezone.now()
                kyc_profile.save()
                self.stdout.write(f'  Updated KYC to approved for {email}')
            elif created:
                self.stdout.write(f'  Created approved KYC profile for {email}')
            else:
                self.stdout.write(f'  KYC already approved for {email}')

            self.stdout.write(self.style.SUCCESS(f'[OK] {email} ready to invest'))

        self.stdout.write(self.style.SUCCESS('\nDone! Test investors can now make investments.'))
