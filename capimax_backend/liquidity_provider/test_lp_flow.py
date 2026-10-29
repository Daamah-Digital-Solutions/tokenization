"""
Client round 4, #13 / #14: the liquidity-provider path works end to end —
apply with documents from the signed-in account, approval links that account,
and a sale to the LP really moves money and shares.
"""

from datetime import timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserRole
from accounts.tests.test_partner_roles import _lp_application
from core.factories import make_admin, make_investment, make_property, make_ready_investor
from investments.models import Investment
from marketplace.models import MarketListing
from payments.models import WalletBalance

from .models import ExitRequest, LiquidityProvider, LiquidityTransaction, LPApplication


def pdf(name='doc.pdf'):
    return SimpleUploadedFile(name, b'%PDF-1.4 test', content_type='application/pdf')


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


def body(res):
    data = res.json()
    return data.get('data', data)


APPLICATION = {
    'legal_entity_name': 'Gulf Liquidity Partners', 'country': 'AE', 'jurisdiction': 'DIFC',
    'entity_type': 'company', 'registration_number': 'CL-9', 'contact_person_name': 'Omar',
    'contact_position': 'Director', 'official_email': 'desk@gulf.example', 'phone_number': '+971 4 000 0000',
    'approximate_liquidity_available': '1000000', 'preferred_currencies': ['USD', 'EUR'],
    'average_transaction_size': '10000', 'expected_discount_rate': '5', 'max_per_transaction': '50000',
    'max_per_month': '200000', 'ack_independent_provider': 'true', 'ack_no_exit_guarantee': 'true',
    'ack_compliance_agreement': 'true',
}


class LPApplicationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_ready_investor()

    def _apply(self, docs):
        self.client.force_authenticate(self.user)
        return self.client.post('/api/v1/liquidity-provider/applications/', {
            **APPLICATION,
            'documents': [f for _, f in docs], 'document_types': [t for t, _ in docs],
        }, format='multipart')

    def test_application_keeps_documents_and_the_applicant(self):
        res = self._apply([('certificate_of_incorporation', pdf('coi.pdf')), ('director_id', pdf('id.pdf'))])
        self.assertEqual(res.status_code, 201, res.content)
        app = LPApplication.objects.get()
        self.assertEqual(app.applicant, self.user)
        self.assertEqual(app.preferred_currencies, ['USD', 'EUR'])
        self.assertEqual(sorted(app.documents.values_list('document_type', flat=True)),
                         ['certificate_of_incorporation', 'director_id'])
        self.assertTrue(app.documents.first().file.name.startswith('partner_documents/liquidity_provider/'))

    def test_wrong_file_type_is_a_clear_400(self):
        bad = SimpleUploadedFile('run.exe', b'MZ', content_type='application/octet-stream')
        res = self._apply([('director_id', bad)])
        self.assertEqual(res.status_code, 400)
        self.assertFalse(LPApplication.objects.exists())

    def test_approval_needs_documents_and_links_the_applicant_account(self):
        self._apply([('certificate_of_incorporation', pdf())])
        app = LPApplication.objects.get()
        self.client.force_authenticate(make_admin())
        res = self.client.post(f'/api/v1/liquidity-provider/applications/{app.pk}/approve/')
        self.assertEqual(res.status_code, 400)  # director ID missing
        app.documents.create(document_type='director_id', file=pdf('id2.pdf'), original_name='id2.pdf')
        res = self.client.post(f'/api/v1/liquidity-provider/applications/{app.pk}/approve/')
        self.assertEqual(res.status_code, 200, res.content)
        lp = LiquidityProvider.objects.get()
        self.assertEqual(lp.user, self.user)  # linked although the contact email differs
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_role(UserRole.LIQUIDITY_PROVIDER))


class SellToLiquidityProviderTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        self.investor = make_ready_investor(wallet_balance=Decimal('0.00'))
        self.lp_user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        self.lp = _lp_application(self.lp_user.email).approve(make_admin())
        self.lp.refresh_from_db()
        make_investment(user=self.investor, prop=self.prop, token_amount=60, investment_amount=Decimal('600.00'),
                        status='completed', completed_at=timezone.now())
        self.client = APIClient()

    def _request(self, units=40, price='9.50'):
        self.client.force_authenticate(self.investor)
        return self.client.post('/api/v1/liquidity-provider/exit-requests/', {
            'property': str(self.prop.pk), 'liquidity_provider': str(self.lp.pk),
            'units_requested': units, 'requested_price_per_unit': price}, format='json')

    def _offer(self, er, price='9.00'):
        self.client.force_authenticate(self.lp_user)
        return self.client.post(f'/api/v1/liquidity-provider/exit-requests/{er.pk}/lp_action/',
                                {'action': 'approve', 'offered_price_per_unit': price}, format='json')

    def _answer(self, er, action):
        self.client.force_authenticate(self.investor)
        return self.client.post(f'/api/v1/liquidity-provider/exit-requests/{er.pk}/investor_action/',
                                {'action': action}, format='json')

    def test_full_sale_moves_money_and_shares(self):
        self.assertEqual(self._request().status_code, 201)
        er = ExitRequest.objects.get()
        self.assertEqual(self._offer(er).status_code, 200)
        res = self._answer(er, 'accept')
        self.assertEqual(res.status_code, 200, res.content)

        # LP pays 40 x $9 = $360 + 1% resale fee; the investor receives $360
        self.assertEqual(balance(self.lp_user), Decimal('5000.00') - Decimal('363.60'))
        self.assertEqual(balance(self.investor), Decimal('360.00'))
        mine = Investment.objects.get(user=self.investor, status='completed')
        self.assertEqual((mine.token_amount, mine.investment_amount), (20, Decimal('200.00')))
        lp_holding = Investment.objects.get(user=self.lp_user, payment_method__exit_id=str(er.pk))
        self.assertEqual((lp_holding.token_amount, lp_holding.status), (40, 'completed'))
        tx = LiquidityTransaction.objects.get()
        self.assertEqual((tx.platform_fee, tx.net_amount_to_investor, tx.chain_status),
                         (Decimal('3.60'), Decimal('360.00'), 'pending'))
        er.refresh_from_db()
        self.assertEqual(er.status, 'completed')

    def test_offer_needs_funds_in_the_lp_wallet(self):
        WalletBalance.objects.filter(user=self.lp_user).update(available_balance=Decimal('10.00'))
        self._request()
        res = self._offer(ExitRequest.objects.get())
        self.assertEqual(res.status_code, 400)
        self.assertEqual(ExitRequest.objects.get().status, 'pending')

    def test_listed_shares_cannot_also_be_offered_to_an_lp(self):
        MarketListing.objects.create(property_listing=self.prop, seller=self.investor, listing_type='sell',
                                     tokens_offered=30, tokens_remaining=30, price_per_token=Decimal('12'),
                                     minimum_order_size=1, expires_at=timezone.now() + timedelta(days=3))
        self.assertEqual(self._request(units=40).status_code, 400)  # only 30 are free
        self.assertEqual(self._request(units=30).status_code, 201)

    def test_unsettled_sale_moves_nothing_when_the_lp_cannot_pay_anymore(self):
        self._request()
        er = ExitRequest.objects.get()
        self._offer(er)
        WalletBalance.objects.filter(user=self.lp_user).update(available_balance=Decimal('1.00'))
        res = self._answer(er, 'accept')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Investment.objects.get(user=self.investor).token_amount, 60)
        self.assertFalse(LiquidityTransaction.objects.exists())

    def test_reconcile_closes_the_transfer_of_a_property_not_on_chain(self):
        from marketplace.chain_transfer import reconcile
        self._request()
        er = ExitRequest.objects.get()
        self._offer(er)
        self._answer(er, 'accept')
        stats = reconcile()
        self.assertEqual(stats.get('not_required'), 1)
        self.assertEqual(LiquidityTransaction.objects.get().chain_status, 'not_required')
