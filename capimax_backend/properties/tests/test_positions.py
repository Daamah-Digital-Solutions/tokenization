"""
Selling an installment plan as one position (client, Nov 2026 — as on Capimax BRX): to an
investor at the asking price, or to a liquidity provider at its offer; the buyer takes over
the remaining installments.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from accounts.tests.test_partner_roles import _lp_application
from certificates.models import Certificate
from certificates.services import sync_plan
from core.factories import make_admin
from investments.models import TokenReservation
from payments.models import WalletBalance
from properties.installment_billing import charge_next
from properties.models import ConstructionInstallment, PositionListing, PositionOffer
from properties.positions import expire_offers
from properties.tests.test_payment_plan import make_property

URL = '/api/v1/properties/positions/'


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


def body(res):
    data = res.json()
    return data.get('data', data)


def make_user(email, money='0.00', role=UserRole.INVESTOR):
    user = User.objects.create_user(email=email, password='x12345678', role=role)
    WalletBalance.objects.create(user=user, currency='USD', available_balance=Decimal(money))
    return user


@patch('properties.services.InstallmentProcessingService._release_tokens_to_investor', lambda *a, **k: None)
class InstallmentPositionTests(TestCase):
    def setUp(self):
        owner = make_user('own-pos@example.com', role=UserRole.PROPERTY_OWNER)
        self.seller = make_user('seller-pos@example.com', '20000.00')
        self.buyer = make_user('buyer-pos@example.com', '20000.00')
        # 100 shares x $100 = $10,000: 25% down ($2,500 paid at start) + 3 monthly installments of $2,500
        self.prop = make_property(owner, installment_down_payment_percent=Decimal('25'),
                                  installment_count=3, installment_frequency='monthly', total_tokens=1000)
        self.client = APIClient()
        self.client.force_authenticate(self.seller)
        r = self.client.post('/api/v1/properties/installments/', {
            'property_investment': str(self.prop.id), 'token_allocation': 100}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.plan = ConstructionInstallment.objects.get(investor=self.seller)
        sync_plan(self.plan)  # the seller's provisional certificate (the signal runs after commit)

    def as_(self, user):
        self.client.force_authenticate(user)
        return self.client

    def _list(self, price='110.00'):
        return self.as_(self.seller).post(URL, {'plan': str(self.plan.id), 'price_per_share': price}, format='json')

    def test_holder_sees_the_plan_as_a_position(self):
        plans = body(self.as_(self.seller).get('/api/v1/properties/installments/'))
        plans = plans.get('results', plans) if isinstance(plans, dict) else plans
        pos = plans[0]['position']
        self.assertEqual((pos['value'], pos['remaining_principal'], pos['equity'], pos['blocked']),
                         ('10000.00', '7500.00', '2500.00', None))
        self.assertEqual(pos['floor_price'], '75.00')

    def test_investor_buys_the_position_and_takes_over_the_plan(self):
        r = self._list('110.00')
        self.assertEqual(r.status_code, 201, r.content)
        listing = PositionListing.objects.get()
        seller_before, buyer_before = balance(self.seller), balance(self.buyer)

        market = body(self.as_(self.buyer).get(URL))
        self.assertEqual(len(market), 1)
        row = market[0]
        # 100 x $110 = $11,000 - $7,500 still to pay = $3,500 to the seller, + 1% fee
        self.assertEqual((row['cash'], row['fee'], row['buyer_total'], row['remaining_payments']),
                         ('3500.00', '35.00', '3535.00', 3))
        self.assertEqual(body(self.as_(self.seller).get(URL)), [])  # not offered to its own seller

        r = self.as_(self.buyer).post(f'{URL}{listing.id}/buy/', {'expected_cash': '3500.00',
                                                                  'expected_fee': '35.00'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(balance(self.seller), seller_before + Decimal('3500.00'))
        self.assertEqual(balance(self.buyer), buyer_before - Decimal('3535.00'))

        self.plan.refresh_from_db()
        self.assertEqual(self.plan.investor, self.buyer)
        self.assertTrue(TokenReservation.objects.filter(installment_plan=self.plan, user=self.buyer,
                                                        released=False).exists())
        listing.refresh_from_db()
        self.assertEqual((listing.status, listing.buyer, listing.sold_via, listing.assumed_principal),
                         ('sold', self.buyer, 'market', Decimal('7500.00')))
        # The certificate follows the position
        certs = {c.user_id: c.status for c in Certificate.objects.filter(installment_plan=self.plan)}
        self.assertEqual(certs, {self.seller.pk: 'revoked', self.buyer.pk: 'provisional'})
        # The buyer pays the next installment from their own wallet
        before = balance(self.buyer)
        self.assertTrue(charge_next(self.plan)['success'])
        self.assertEqual(balance(self.buyer), before - Decimal('2600.00'))  # $2,500 + 4% fee
        self.assertEqual(balance(self.seller), seller_before + Decimal('3500.00'))
        # Their entry price is what they paid for it
        self.plan.refresh_from_db()
        mine = body(self.as_(self.buyer).get('/api/v1/properties/installments/'))
        mine = mine.get('results', mine) if isinstance(mine, dict) else mine
        self.assertEqual(mine[0]['position']['entry_price'], '110.00')

    def test_price_must_cover_the_remaining_installments(self):
        r = self._list('70.00')  # 100 x 70 = 7,000 < 7,500 still to pay
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error']['details']['code'], 'below_remaining')
        self.assertFalse(PositionListing.objects.exists())

    def test_amounts_moving_before_the_purchase_stop_it(self):
        self._list('110.00')
        listing = PositionListing.objects.get()
        self.assertTrue(charge_next(self.plan)['success'])  # seller pays an installment meanwhile
        r = self.as_(self.buyer).post(f'{URL}{listing.id}/buy/', {'expected_cash': '3500.00',
                                                                  'expected_fee': '35.00'}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['error']['details']['cash'], '6000.00')  # the seller's share grew
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.investor, self.seller)

    def test_buyer_without_funds_changes_nothing(self):
        self._list('110.00')
        listing = PositionListing.objects.get()
        WalletBalance.objects.filter(user=self.buyer).update(available_balance=Decimal('100.00'))
        r = self.as_(self.buyer).post(f'{URL}{listing.id}/buy/', {'expected_cash': '3500.00',
                                                                  'expected_fee': '35.00'}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['error']['details']['code'], 'INSUFFICIENT_FUNDS')
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.investor, self.seller)
        self.assertEqual(PositionListing.objects.get().status, 'listed')

    def test_liquidity_provider_offer_accepted_by_the_seller(self):
        admin = make_admin()
        lp_user = make_user('lp-pos@example.com', '10000.00')
        lp = _lp_application(lp_user.email).approve(admin)
        lp2_user = make_user('lp2-pos@example.com', '10000.00')
        lp2 = _lp_application(lp2_user.email).approve(admin)
        self._list('110.00')
        listing = PositionListing.objects.get()

        self.assertEqual(self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '110.00'},
                                                format='json').json()['error']['details']['code'], 'USE_BUY')
        self.assertEqual(self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '105.00'},
                                                format='json').status_code, 201)
        self.assertEqual(self.as_(lp2_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '100.00'},
                                                 format='json').status_code, 201)
        mine = body(self.as_(self.seller).get(f'{URL}mine/'))[0]
        self.assertEqual([o['cash'] for o in mine['offers']], ['3000.00', '2500.00'])  # best first

        best = PositionOffer.objects.get(liquidity_provider=lp)
        with self.captureOnCommitCallbacks(execute=True):  # the notices are sent after the commit
            r = self.as_(self.seller).post(f'{URL}{listing.id}/answer/', {'action': 'accept', 'offer': str(best.id)},
                                           format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.investor, lp_user)
        self.assertEqual(balance(lp_user), Decimal('10000.00') - Decimal('3030.00'))  # 3,000 + 1%
        self.assertEqual(PositionOffer.objects.get(liquidity_provider=lp2).status, 'lapsed')
        # Only the provider that lost is told the position went to another buyer
        from notifications.models import Notification
        told = set(Notification.objects.filter(title='Position sold to another buyer').values_list('user__email', flat=True))
        self.assertEqual(told, {lp2_user.email})
        self.assertTrue(Notification.objects.filter(user=lp_user, title='Installment position bought').exists())
        listing.refresh_from_db()
        self.assertEqual((listing.sold_via, listing.sold_price_per_share), ('liquidity_provider', Decimal('105.00')))
        lp.refresh_from_db()
        self.assertEqual(lp.current_month_total, Decimal('3000.00'))
        # The provider finds it in its own dashboard: My assets and its statement
        assets = body(self.as_(lp_user).get('/api/v1/liquidity-provider/providers/assets/'))
        pos = assets['positions'][0]
        self.assertEqual((pos['shares'], pos['remaining_principal'], pos['entry_price'], pos['remaining_payments']),
                         (100, '7500.00', '105.00', 3))
        self.assertEqual(pos['certificate']['status'], 'provisional')
        st = body(self.as_(lp_user).get('/api/v1/liquidity-provider/providers/statement/'))
        self.assertEqual((st['bought'][0]['total'], st['bought'][0]['fee']), ('3000.00', '30.00'))
        self.assertIn('installment position', st['bought'][0]['property'])
        self.assertEqual(st['summary']['bought_paid'], '3030.00')

    def test_provider_needs_funds_and_seller_can_decline(self):
        lp_user = make_user('lp3-pos@example.com', '50.00')
        lp = _lp_application(lp_user.email).approve(make_admin())
        self._list('110.00')
        listing = PositionListing.objects.get()
        r = self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '105.00'}, format='json')
        self.assertEqual(r.json()['error']['details']['code'], 'LP_INSUFFICIENT_FUNDS')
        WalletBalance.objects.filter(user=lp_user).update(available_balance=Decimal('9000.00'))
        self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '105.00'}, format='json')
        offer = PositionOffer.objects.get()
        r = self.as_(self.seller).post(f'{URL}{listing.id}/answer/', {'action': 'decline', 'offer': str(offer.id)},
                                       format='json')
        self.assertEqual(r.status_code, 200)
        offer.refresh_from_db()
        self.assertEqual(offer.status, 'declined')
        self.assertEqual(PositionListing.objects.get().status, 'listed')
        self.assertEqual(lp.position_offers.count(), 1)

    def test_offers_expire_and_cancelling_closes_them(self):
        lp_user = make_user('lp4-pos@example.com', '9000.00')
        _lp_application(lp_user.email).approve(make_admin())
        self._list('110.00')
        listing = PositionListing.objects.get()
        self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '105.00'}, format='json')
        self.assertEqual(expire_offers(), 0)
        self.assertEqual(expire_offers(now=timezone.now() + timedelta(hours=49)), 1)
        self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '104.00'}, format='json')
        self.assertEqual(self.as_(self.seller).post(f'{URL}{listing.id}/cancel/').status_code, 200)
        self.assertEqual(set(PositionOffer.objects.values_list('status', flat=True)), {'lapsed'})
        self.assertEqual(body(self.as_(self.buyer).get(URL)), [])

    def test_paying_off_the_plan_closes_its_listing(self):
        self._list('110.00')
        for _ in range(3):
            self.assertTrue(charge_next(self.plan)['success'])
            self.plan.refresh_from_db()
        self.assertEqual(self.plan.status, 'completed')
        self.assertEqual(PositionListing.objects.get().status, 'cancelled')

    def test_plan_with_nothing_paid_cannot_be_sold(self):
        self.prop.installment_down_payment_percent = Decimal('0')
        self.prop.installment_first_due_date = timezone.now().date() + timedelta(days=30)
        self.prop.save()
        other = make_user('other-pos@example.com', '20000.00')
        self.as_(other).post('/api/v1/properties/installments/', {
            'property_investment': str(self.prop.id), 'token_allocation': 50}, format='json')
        plan = ConstructionInstallment.objects.get(investor=other)
        r = self.as_(other).post(URL, {'plan': str(plan.id), 'price_per_share': '120.00'}, format='json')
        self.assertEqual(r.json()['error']['details']['code'], 'not_started')

    def test_only_the_holder_lists_and_nobody_buys_their_own(self):
        r = self.as_(self.buyer).post(URL, {'plan': str(self.plan.id), 'price_per_share': '110.00'}, format='json')
        self.assertEqual(r.status_code, 400)
        self._list('110.00')
        listing = PositionListing.objects.get()
        r = self.as_(self.seller).post(f'{URL}{listing.id}/buy/', {'expected_cash': '3500.00',
                                                                   'expected_fee': '35.00'}, format='json')
        self.assertEqual(r.json()['error']['details']['code'], 'OWN_LISTING')
        self.assertEqual(self._list('120.00').json()['error']['details']['code'], 'ALREADY_LISTED')

    # ---- where it is sold: secondary market and/or liquidity providers (client, Nov 2026) ----------

    def test_seller_chooses_the_secondary_market_the_providers_or_both(self):
        lp_user = make_user('lp-ch@example.com', '10000.00')
        _lp_application(lp_user.email).approve(make_admin())
        none = self.as_(self.seller).post(URL, {'plan': str(self.plan.id), 'price_per_share': '110.00',
                                                'to_market': False, 'to_providers': False}, format='json')
        self.assertEqual(none.json()['error']['details']['code'], 'NO_CHANNEL')

        # Secondary market only: investors see it there, providers don't get it in their market
        r = self.as_(self.seller).post(URL, {'plan': str(self.plan.id), 'price_per_share': '110.00',
                                             'to_market': True, 'to_providers': False}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual((body(r)['to_market'], body(r)['to_providers']), (True, False))
        self.assertIn('secondary market', r.json()['message'])
        listing = PositionListing.objects.get()
        self.assertEqual(len(body(self.as_(self.buyer).get(f'{URL}?channel=market'))), 1)
        self.assertEqual(len(body(self.as_(lp_user).get(f'{URL}?channel=providers'))), 0)
        offer = self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '100.00'}, format='json')
        self.assertEqual(offer.json()['error']['details']['code'], 'NOT_FOR_PROVIDERS')

        # Both: the provider offers; then the seller drops the providers and the offer closes with a notice
        self.as_(self.seller).post(f'{URL}{listing.id}/channels/', {'to_market': True, 'to_providers': True},
                                   format='json')
        self.assertEqual(len(body(self.as_(lp_user).get(f'{URL}?channel=providers'))), 1)
        self.assertEqual(self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '100.00'},
                                                format='json').status_code, 201)
        with self.captureOnCommitCallbacks(execute=True):
            r = self.as_(self.seller).post(f'{URL}{listing.id}/channels/', {'to_market': True, 'to_providers': False},
                                           format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(PositionOffer.objects.get().status, 'lapsed')
        from notifications.models import Notification
        self.assertTrue(Notification.objects.filter(user=lp_user,
                                                    title='Position offered on the secondary market only').exists())

        # Providers only: an investor can't buy it on the secondary market; the provider can
        self.as_(self.seller).post(f'{URL}{listing.id}/channels/', {'to_market': False, 'to_providers': True},
                                   format='json')
        self.assertEqual(len(body(self.as_(self.buyer).get(f'{URL}?channel=market'))), 0)
        fig = body(self.as_(lp_user).get(f'{URL}?channel=providers'))[0]
        no = self.as_(self.buyer).post(f'{URL}{listing.id}/buy/', {'expected_cash': fig['cash'],
                                                                   'expected_fee': fig['fee']}, format='json')
        self.assertEqual(no.status_code, 400)
        ok = self.as_(lp_user).post(f'{URL}{listing.id}/buy/', {'expected_cash': fig['cash'],
                                                                'expected_fee': fig['fee']}, format='json')
        self.assertEqual(ok.status_code, 200, ok.content)
        listing.refresh_from_db()
        self.assertEqual((listing.status, listing.sold_via), ('sold', 'liquidity_provider'))

    def test_a_provider_buying_a_market_only_listing_buys_as_an_investor(self):
        lp_user = make_user('lp-mk@example.com', '10000.00')
        lp = _lp_application(lp_user.email).approve(make_admin())
        self.as_(self.seller).post(URL, {'plan': str(self.plan.id), 'price_per_share': '110.00',
                                         'to_market': True, 'to_providers': False}, format='json')
        fig = body(self.as_(lp_user).get(f'{URL}?channel=market'))[0]
        r = self.as_(lp_user).post(f'{URL}{fig["id"]}/buy/', {'expected_cash': fig['cash'],
                                                              'expected_fee': fig['fee']}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(PositionListing.objects.get().sold_via, 'market')
        lp.refresh_from_db()
        self.assertEqual(lp.current_month_total, Decimal('0'))  # not counted against its provider limits

    def test_buyer_sees_the_card_and_the_installments_they_take_over(self):
        """Client, Nov 2026: the position shows as a property card and the buyer sees the schedule first."""
        self.assertEqual(self._list('110.00').status_code, 201)
        rows = body(self.as_(self.buyer).get(URL + '?channel=market'))
        row = rows[0]
        self.assertIn('property_image', row)
        self.assertEqual((row['property_category'], row['entry_price'], row['price_change']),
                         ('under_construction', '100.00', '1000.00'))
        self.assertEqual((row['payments_made'], row['total_payments'], len(row['schedule'])), (1, 4, 3))
        self.assertEqual([r['amount'] for r in row['schedule']], ['2500.00', '2500.00', '2500.00'])
        fees = sum(Decimal(r['fee']) for r in row['schedule'])
        self.assertEqual(Decimal(row['remaining_total']), Decimal('7500.00') + fees)
        self.assertEqual(Decimal(row['remaining_fees']), fees)
        self.assertEqual(row['overdue_count'], 0)
