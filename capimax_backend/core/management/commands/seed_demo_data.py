"""
Seed the development database with realistic users and properties so a
human can exercise every flow in the platform from the SPA.

This command is **idempotent** — running it twice doesn't create duplicate
rows. It uses `update_or_create` / `get_or_create` everywhere.

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --wipe-first   # delete demo data first

Test credentials produced by this command (all use password `TestPass123!`):

    Admin
      admin@capimax.com         full admin, all permissions

    Investors
      investor@test.com         verified KYC, $50k wallet, has investments
      investor2@test.com        verified KYC + accredited, $25k wallet
      investor3@test.com        pending KYC (use to test compliance gate)
      investor4@test.com        verified KYC, low-tier ($10k wallet)

    Property owner
      owner@test.com            owns all demo properties

    Broker
      broker@test.com           broker role

Properties created (all owned by owner@test.com):

    Marina Tower 12          tokenized · residential · no SPV · no lockup
    DIFC Office Park         tokenized · commercial · ACCREDITED-ONLY · SPV
    Palm Villa 27            tokenized · residential · SPV · 12-month lockup
    Skyline Construction     under_construction · residential
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

User = get_user_model()


DEMO_PASSWORD = 'TestPass123!'

# A marker on the metadata / notes fields so `--wipe-first` knows what
# was created by this command and what was created by humans.
DEMO_TAG = 'seed_demo_data'


class Command(BaseCommand):
    help = (
        'Seed the dev DB with users (every role), properties (varied compliance '
        'requirements), and a few investments + marketplace listings so the '
        'platform can be exercised end-to-end from the SPA.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--wipe-first',
            action='store_true',
            help='Delete prior demo data (users with @test.com / @capimax.com '
                 'emails and properties tagged demo) before seeding.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['wipe_first']:
            self._wipe()

        self.stdout.write(self.style.HTTP_INFO('\n=== Seeding users ==='))
        users = self._seed_users()

        self.stdout.write(self.style.HTTP_INFO('\n=== Seeding properties ==='))
        properties = self._seed_properties(owner=users['owner'])

        self.stdout.write(self.style.HTTP_INFO('\n=== Seeding investments ==='))
        investments = self._seed_investments(users, properties)

        self.stdout.write(self.style.HTTP_INFO('\n=== Seeding marketplace listings ==='))
        self._seed_listings(users, properties)

        self._print_summary(users, properties, investments)

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    def _seed_users(self) -> dict:
        users = {}

        # Admin
        users['admin'] = self._upsert_user(
            email='admin@capimax.com',
            role='admin',
            first_name='Demo', last_name='Admin',
            is_staff=True, is_superuser=True,
            is_verified=True,
        )

        # Investors (4 different states)
        users['investor'] = self._upsert_user(
            email='investor@test.com',
            role='investor',
            first_name='Iris', last_name='Investor',
            is_verified=True,
        )
        users['investor2'] = self._upsert_user(
            email='investor2@test.com',
            role='investor',
            first_name='Aida', last_name='Accredited',
            is_verified=True,
        )
        users['investor3'] = self._upsert_user(
            email='investor3@test.com',
            role='investor',
            first_name='Pat', last_name='Pending',
            is_verified=True,
        )
        users['investor4'] = self._upsert_user(
            email='investor4@test.com',
            role='investor',
            first_name='Lou', last_name='Lowtier',
            is_verified=True,
        )

        # Property owner
        users['owner'] = self._upsert_user(
            email='owner@test.com',
            role='property_owner',
            first_name='Olga', last_name='Owner',
            is_verified=True,
        )

        # Broker
        users['broker'] = self._upsert_user(
            email='broker@test.com',
            role='broker',
            first_name='Brent', last_name='Broker',
            is_verified=True,
        )

        # KYC + wallet balances. The post_save signal on User already
        # created a KYCProfile with status='pending'; we update it.
        self._set_kyc(users['investor'], status='approved',
                     level='enhanced', limit=Decimal('50000'))
        self._set_kyc(users['investor2'], status='approved',
                     level='premium', limit=Decimal('500000'),
                     extras={'is_accredited': True} if self._has_field('is_accredited') else {})
        # investor3 left as pending — used to test the compliance gate
        self._set_kyc(users['investor3'], status='pending',
                     level='basic', limit=Decimal('1000'))
        self._set_kyc(users['investor4'], status='approved',
                     level='basic', limit=Decimal('10000'))

        # Wallet balances
        from payments.models import WalletBalance
        for user, amount in [
            (users['investor'], Decimal('50000.00')),
            (users['investor2'], Decimal('25000.00')),
            (users['investor4'], Decimal('10000.00')),
        ]:
            WalletBalance.objects.update_or_create(
                user=user,
                currency='USD',
                defaults={
                    'available_balance': amount,
                    'currency_type': 'fiat',
                    'is_active': True,
                },
            )

        return users

    def _upsert_user(self, *, email, role, first_name, last_name,
                     is_staff=False, is_superuser=False, is_verified=True):
        user, created = User.objects.update_or_create(
            email=email,
            defaults={
                'role': role,
                'first_name': first_name,
                'last_name': last_name,
                'country': 'US',
                'is_staff': is_staff,
                'is_superuser': is_superuser,
                'is_verified': is_verified,
                'username': email,
            },
        )
        user.set_password(DEMO_PASSWORD)
        # Give investors a wallet address.
        if role == 'investor' and not user.wallet_address:
            user.wallet_address = '0x' + ('a' * 8 + email.split('@')[0]).ljust(40, '0')[:40]
        user.save()

        action = 'CREATED' if created else 'updated'
        self.stdout.write(f'  {action}: {email} ({role})')
        return user

    def _set_kyc(self, user, *, status, level, limit, extras=None):
        from kyc.models import KYCProfile
        defaults = {
            'status': status,
            'verification_level': level,
            'investment_limit': limit,
            'expires_at': timezone.now() + timedelta(days=365),
            'reviewed_at': timezone.now() if status == 'approved' else None,
        }
        if extras:
            defaults.update(extras)
        KYCProfile.objects.update_or_create(user=user, defaults=defaults)
        # Invalidate the cached reverse-relation on user so subsequent
        # permission checks see the fresh row.
        try:
            user._state.fields_cache.pop('kyc_profile', None)
        except (AttributeError, KeyError):
            pass

    def _has_field(self, field_name: str) -> bool:
        from kyc.models import KYCProfile
        return any(f.name == field_name for f in KYCProfile._meta.get_fields())

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    def _seed_properties(self, *, owner) -> dict:
        from properties.models import Property

        properties = {}

        # Try to attach SPVs to two of the properties (best-effort — legal
        # app might not yet be in INSTALLED_APPS for some deployments).
        spv_us, spv_uae = self._seed_spvs()

        # 1. Basic tokenized property, no SPV, anyone can invest
        properties['marina'] = self._upsert_property(
            slug_marker=DEMO_TAG + ':marina',
            owner=owner,
            title='Marina Tower 12',
            property_type='residential',
            property_category='ready_property',
            city='Miami', country='US',
            address='12 Marina Drive, Miami Beach, FL 33139',
            total_value=Decimal('2000000.00'),
            token_price=Decimal('10.00'),
            total_tokens=200_000,
            status='tokenized',
            lockup_months=0,
            requires_accredited_investors=False,
            offering_type='reg_cf',
            spv_entity=None,
        )
        self._attach_cover_image(
            properties['marina'],
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
            'Marina Tower 12 — cover',
        )

        # 2. Accredited-only commercial property with US SPV
        properties['difc'] = self._upsert_property(
            slug_marker=DEMO_TAG + ':difc',
            owner=owner,
            title='DIFC Office Park',
            property_type='commercial',
            property_category='ready_property',
            city='Dubai', country='AE',
            address='Gate Village 7, DIFC, Dubai',
            total_value=Decimal('15000000.00'),
            token_price=Decimal('50.00'),
            total_tokens=300_000,
            status='tokenized',
            lockup_months=6,
            requires_accredited_investors=True,
            offering_type='reg_d',
            spv_entity=spv_uae,
        )
        self._attach_cover_image(
            properties['difc'],
            'https://images.unsplash.com/photo-1577415124269-fc1140a69e91?w=1200&q=80',
            'DIFC Office Park — cover',
        )

        # 3. Tokenized residential with lockup + SPV — open to all KYC
        properties['palm'] = self._upsert_property(
            slug_marker=DEMO_TAG + ':palm',
            owner=owner,
            title='Palm Villa 27',
            property_type='residential',
            property_category='ready_property',
            city='Los Angeles', country='US',
            address='27 Palm Crescent, Beverly Hills, CA 90210',
            total_value=Decimal('5000000.00'),
            token_price=Decimal('25.00'),
            total_tokens=200_000,
            status='tokenized',
            lockup_months=12,
            requires_accredited_investors=False,
            offering_type='reg_a',
            spv_entity=spv_us,
        )
        self._attach_cover_image(
            properties['palm'],
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
            'Palm Villa 27 — cover',
        )

        # 4. Under-construction project
        properties['skyline'] = self._upsert_property(
            slug_marker=DEMO_TAG + ':skyline',
            owner=owner,
            title='Skyline Construction Hub',
            property_type='residential',
            property_category='under_construction',
            city='Austin', country='US',
            address='100 Skyline Pkwy, Austin, TX 78701',
            total_value=Decimal('8000000.00'),
            token_price=Decimal('20.00'),
            total_tokens=400_000,
            status='active',
            lockup_months=0,
            requires_accredited_investors=False,
            offering_type='reg_cf',
            spv_entity=None,
        )
        self._attach_cover_image(
            properties['skyline'],
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
            'Skyline Construction Hub — cover',
        )

        return properties

    def _attach_cover_image(self, property_obj, image_url: str, caption: str):
        """Download a remote stock photo and attach it as the property's
        primary PropertyImage. Idempotent — if the property already has a
        primary image we leave it alone (the user may have uploaded their
        own cover).
        """
        import io
        import urllib.request

        from django.core.files.base import ContentFile
        from properties.models import PropertyImage

        if PropertyImage.objects.filter(property=property_obj).exists():
            self.stdout.write(
                f'  skip image: {property_obj.title} already has one'
            )
            return

        try:
            req = urllib.request.Request(
                image_url,
                headers={'User-Agent': 'Mozilla/5.0 (capimax seed_demo_data)'},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read()
        except Exception as exc:
            # Don't fail the whole seed run if Unsplash is unreachable — the
            # property is still useful without a cover. The marketplace
            # gracefully falls back to the gradient + Building2 icon.
            self.stdout.write(self.style.WARNING(
                f'  skip image for {property_obj.title}: download failed ({exc})'
            ))
            return

        filename = f'{property_obj.id}.jpg'
        image_file = ContentFile(content, name=filename)
        PropertyImage.objects.create(
            property=property_obj,
            caption=caption,
            is_primary=True,
            order=0,
            image=image_file,
        )
        self.stdout.write(f'  attached cover image: {property_obj.title}')

    def _seed_spvs(self):
        """Create demo Legal Entities. Returns (us_spv, uae_spv)."""
        try:
            from legal.models import LegalEntity
        except ImportError:
            return None, None
        us, _ = LegalEntity.objects.update_or_create(
            registration_number='DEMO-US-001',
            jurisdiction='Delaware, USA',
            defaults={
                'name': 'Capimax Palm Villa SPV LLC',
                'entity_type': 'llc',
                'formation_date': timezone.now().date() - timedelta(days=365),
                'status': 'active',
                'allowed_investor_jurisdictions': [],  # all allowed
                'requires_accredited_investors': False,
            },
        )
        uae, _ = LegalEntity.objects.update_or_create(
            registration_number='DEMO-AE-001',
            jurisdiction='DIFC, UAE',
            defaults={
                'name': 'Capimax DIFC Office Park Ltd',
                'entity_type': 'corp',
                'formation_date': timezone.now().date() - timedelta(days=180),
                'status': 'active',
                'allowed_investor_jurisdictions': ['US', 'AE', 'GB', 'SG'],
                'requires_accredited_investors': True,
            },
        )
        self.stdout.write('  CREATED/updated: 2 SPVs (US + UAE)')
        return us, uae

    def _upsert_property(self, *, slug_marker, owner, title, **fields):
        """Upsert a Property by a unique marker we stash in description."""
        from properties.models import Property
        prop, created = Property.objects.update_or_create(
            owner=owner,
            title=title,
            defaults={
                **fields,
                'description': f'[{slug_marker}] {title} — demo property created '
                               'by seed_demo_data. Safe to delete in dev.',
                'smart_contract_address': '0x' + slug_marker.replace(':', '_').ljust(40, '0')[:40],
            },
        )
        action = 'CREATED' if created else 'updated'
        self.stdout.write(f'  {action}: {title}')
        return prop

    # ------------------------------------------------------------------
    # Investments — give the portfolio screen something to display
    # ------------------------------------------------------------------

    def _seed_investments(self, users, properties) -> dict:
        """Seed a few demo investments so the portfolio screen has rows.

        Idempotency note: the previous version used `update_or_create` keyed
        on `(user, property_investment)`, but the model allows multiple
        investments by the same user in the same property — and we have demo
        accounts that DO accumulate extra rows from UI testing. That made
        `update_or_create` raise `MultipleObjectsReturned` on the second run,
        which (under the `@transaction.atomic` handle) rolled back everything
        the seed had just done — including the cover-image uploads. The
        helper below tolerates duplicates by picking the most recent matching
        row and updating it, and creating a fresh row only when none exists.
        """
        from investments.models import Investment, InvestmentStatus

        investments = {}

        def upsert(user, property_obj, defaults):
            qs = Investment.objects.filter(user=user, property_investment=property_obj)
            existing = qs.order_by('-created_at').first() if qs.exists() else None
            if existing is None:
                return Investment.objects.create(
                    user=user, property_investment=property_obj, **defaults
                )
            for field, value in defaults.items():
                setattr(existing, field, value)
            existing.save()
            return existing

        # investor@test.com: one COMPLETED, one PENDING_MINT
        investments['inv1_marina_completed'] = upsert(
            users['investor'], properties['marina'],
            {
                'token_amount': 100,
                'investment_amount': Decimal('1000.00'),
                'status': InvestmentStatus.COMPLETED,
                'completed_at': timezone.now() - timedelta(days=30),
                'transaction_hash': '0x' + 'demo01'.ljust(64, '0'),
                'lockup_end_date': timezone.now() - timedelta(days=1),  # past — sellable
            },
        )

        investments['inv2_palm_pending'] = upsert(
            users['investor'], properties['palm'],
            {
                'token_amount': 50,
                'investment_amount': Decimal('1250.00'),
                'status': InvestmentStatus.PENDING_MINT,
                'mint_scheduled_at': timezone.now() - timedelta(seconds=1),
            },
        )

        # investor2: COMPLETED in DIFC (the accredited property)
        investments['inv3_difc_locked'] = upsert(
            users['investor2'], properties['difc'],
            {
                'token_amount': 200,
                'investment_amount': Decimal('10000.00'),
                'status': InvestmentStatus.COMPLETED,
                'completed_at': timezone.now() - timedelta(days=60),
                'transaction_hash': '0x' + 'demo02'.ljust(64, '0'),
                'lockup_end_date': timezone.now() + timedelta(days=120),  # still locked
                'accredited_at_investment_time': True,
            },
        )

        self.stdout.write(f'  Investments: {len(investments)} ('
                          'investor: 1 completed + 1 pending_mint, '
                          'investor2: 1 completed locked)')
        return investments

    # ------------------------------------------------------------------
    # Marketplace listings — give the marketplace UI something to render
    # ------------------------------------------------------------------

    def _seed_listings(self, users, properties):
        from marketplace.models import MarketListing, ListingType, ListingStatus

        # investor@test.com lists 30 of their 100 Marina tokens for sale
        listing, created = MarketListing.objects.update_or_create(
            seller=users['investor'],
            property_listing=properties['marina'],
            listing_type=ListingType.SELL,
            defaults={
                'tokens_offered': 30,
                'tokens_remaining': 30,
                'price_per_token': Decimal('11.50'),
                'total_price': Decimal('345.00'),
                'minimum_order_size': 5,
                'status': ListingStatus.ACTIVE,
                'expires_at': timezone.now() + timedelta(days=30),
                'notes': f'[{DEMO_TAG}] Demo SELL listing — Marina Tower 12.',
            },
        )
        action = 'CREATED' if created else 'updated'
        self.stdout.write(f'  {action}: Marina sell listing (30 tokens @ $11.50)')

    # ------------------------------------------------------------------
    # Wipe (only deletes things tagged by us)
    # ------------------------------------------------------------------

    def _wipe(self):
        self.stdout.write(self.style.WARNING('--wipe-first: deleting prior demo data'))
        from marketplace.models import MarketListing
        from investments.models import Investment
        from properties.models import Property
        from payments.models import WalletBalance

        emails = [
            'admin@capimax.com',
            'investor@test.com', 'investor2@test.com',
            'investor3@test.com', 'investor4@test.com',
            'owner@test.com', 'broker@test.com',
        ]
        demo_users = User.objects.filter(email__in=emails)

        # Cascade: investments + listings + wallets + KYC + properties
        # owned by the demo owner.
        MarketListing.objects.filter(seller__in=demo_users).delete()
        Investment.objects.filter(user__in=demo_users).delete()
        WalletBalance.objects.filter(user__in=demo_users).delete()
        Property.objects.filter(owner__email='owner@test.com',
                                description__contains=DEMO_TAG).delete()
        try:
            from legal.models import LegalEntity
            LegalEntity.objects.filter(registration_number__startswith='DEMO-').delete()
        except ImportError:
            pass

        deleted = demo_users.count()
        demo_users.delete()
        self.stdout.write(self.style.WARNING(
            f'  Deleted {deleted} demo users and their data\n'))

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def _print_summary(self, users, properties, investments):
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('Demo data ready.'))
        self.stdout.write('=' * 70)
        self.stdout.write(f'\nAll demo accounts use the password: {self.style.HTTP_INFO(DEMO_PASSWORD)}')
        self.stdout.write('\nLogin URLs:')
        self.stdout.write('  Frontend SPA:  http://localhost:5173/')
        self.stdout.write('  Backend admin: http://localhost:8500/admin/')
        self.stdout.write('  API docs:      http://localhost:8500/api/docs/')

        self.stdout.write('\n' + self.style.HTTP_INFO('Users') + ':')
        self.stdout.write('  admin@capimax.com       admin')
        self.stdout.write('  investor@test.com       verified KYC, $50k wallet, '
                          'has 1 COMPLETED + 1 PENDING_MINT investment')
        self.stdout.write('  investor2@test.com      verified+accredited KYC, $25k wallet, '
                          'invested in DIFC (locked)')
        self.stdout.write('  investor3@test.com      pending KYC — use to test '
                          'the compliance gate (should be blocked from investing)')
        self.stdout.write('  investor4@test.com      verified KYC (basic tier), $10k wallet')
        self.stdout.write('  owner@test.com          property owner of all demo properties')
        self.stdout.write('  broker@test.com         broker')

        self.stdout.write('\n' + self.style.HTTP_INFO('Properties') + ':')
        for key, p in properties.items():
            tags = []
            if getattr(p, 'requires_accredited_investors', False):
                tags.append('ACCREDITED-ONLY')
            if getattr(p, 'lockup_months', 0):
                tags.append(f'lockup={p.lockup_months}mo')
            if getattr(p, 'spv_entity', None):
                tags.append('SPV')
            tags_str = ' '.join(tags) or 'no special restrictions'
            self.stdout.write(f'  {p.title:<28} {p.status:<22} {tags_str}')

        self.stdout.write('\n' + self.style.HTTP_INFO('Flows you can now test') + ':')
        self.stdout.write('  1. Login as investor3@test.com -> try to invest -> '
                          'should be blocked at the compliance gate (no KYC).')
        self.stdout.write('  2. Login as investor4@test.com -> try to invest in DIFC -> '
                          'blocked (not accredited).')
        self.stdout.write('  3. Login as investor2@test.com -> can invest in DIFC '
                          '(is accredited).')
        self.stdout.write('  4. Login as investor@test.com -> see portfolio with '
                          'past investments; try to sell Marina tokens on '
                          'marketplace (should work — lockup expired).')
        self.stdout.write('  5. Login as investor2@test.com -> try to sell DIFC '
                          'tokens -> blocked (lockup not yet expired).')
        self.stdout.write('  6. Login as admin@capimax.com -> /admin/ shows all '
                          'data; can approve KYC, manually adjust balances, etc.')
        self.stdout.write('  7. Browse /api/v1/marketplace/listings/ (auth required) -> '
                          'see the SELL listing.')
        self.stdout.write('  8. Open API docs -> poke endpoints with the '
                          'investor@test.com bearer token.')
        self.stdout.write('')
