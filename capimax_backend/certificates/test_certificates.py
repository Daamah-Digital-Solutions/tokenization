"""
Client round 4, #5: ownership certificates like Capimax BRX — real SPV, contract
and wallet data, provisional → final, replaced when the holding changes, and a
public verification record behind the QR.
"""

from datetime import date
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from core.factories import make_investment, make_legal_entity, make_property, make_ready_investor
from properties.models import ConstructionInstallment

from .models import Certificate
from .services import sync_investment, sync_plan


def data(res):
    body = res.json()
    return body.get('data', body)


class CertificateIssueTests(TestCase):
    def setUp(self):
        spv = make_legal_entity(name='Capimax Skyline 01, LLC', jurisdiction='Wyoming, USA',
                                registration_number='2026-000123456')
        self.prop = make_property(title='Skyline Bungalows', token_price=Decimal('20.00'), total_tokens=1000,
                                  spv_entity=spv, smart_contract_address='0x' + 'a' * 40)
        self.user = make_ready_investor()
        self.user.first_name, self.user.last_name = 'Lina', 'Haddad'
        self.user.wallet_address = '0x' + 'b' * 40
        self.user.save()

    def _inv(self, **kw):
        kw.setdefault('status', 'completed')
        return make_investment(user=self.user, prop=self.prop, token_amount=kw.pop('tokens', 50),
                               investment_amount=kw.pop('amount', Decimal('1000.00')), **kw)

    def test_completed_purchase_gets_a_final_certificate_with_real_data(self):
        cert = sync_investment(self._inv(transaction_hash='0x' + 'c' * 64))
        self.assertEqual(cert.status, 'final')
        self.assertRegex(cert.certificate_id, r'^CERT-\d{4}-SKYL-[0-9A-F]{6}$')
        self.assertEqual((cert.spv_name, cert.spv_registration_ref), ('Capimax Skyline 01, LLC', '2026-000123456'))
        self.assertEqual(cert.investor_name, 'Lina Haddad')
        self.assertEqual(cert.holder_wallet, '0x' + 'b' * 40)
        self.assertEqual(cert.contract_address, '0x' + 'a' * 40)
        self.assertEqual(cert.ownership_percentage, Decimal('5.000000'))
        self.assertEqual(len(cert.digital_signature_hash), 64)
        self.assertTrue(cert.verification_url.endswith(f'/verify/{cert.verification_code}'))

    def test_paid_then_minted_goes_provisional_then_final_and_notifies_once(self):
        from notifications.models import Notification
        inv = self._inv(status='pending_mint')
        cert = sync_investment(inv)
        self.assertEqual(cert.status, 'provisional')
        inv.status = 'completed'
        inv.save(update_fields=['status'])
        with self.captureOnCommitCallbacks(execute=True):
            again = sync_investment(inv)
        self.assertEqual((again.pk, again.status), (cert.pk, 'final'))
        with self.captureOnCommitCallbacks(execute=True):
            sync_investment(inv)
        self.assertEqual(Notification.objects.filter(user=self.user, title__icontains='certificate').count(), 1)

    def test_unpaid_purchase_has_no_certificate(self):
        self.assertIsNone(sync_investment(self._inv(status='pending')))
        self.assertFalse(Certificate.objects.exists())

    def test_partial_sale_revokes_and_replaces(self):
        inv = self._inv()
        old = sync_investment(inv)
        inv.token_amount, inv.investment_amount = 30, Decimal('600.00')
        inv.save(update_fields=['token_amount', 'investment_amount'])
        new = sync_investment(inv)
        old.refresh_from_db()
        self.assertEqual((old.status, old.replaced_by_id), ('revoked', new.pk))
        self.assertEqual((new.status, new.units), ('final', 30))
        self.assertNotEqual(new.verification_code, old.verification_code)

    def test_sold_out_holding_is_revoked(self):
        inv = self._inv()
        cert = sync_investment(inv)
        inv.status = 'transferred'
        inv.save(update_fields=['status'])
        sync_investment(inv)
        cert.refresh_from_db()
        self.assertEqual(cert.status, 'revoked')

    def test_saving_a_purchase_issues_the_certificate_automatically(self):
        with self.captureOnCommitCallbacks(execute=True):
            inv = self._inv()
        self.assertEqual(Certificate.objects.get(investment=inv).status, 'final')

    def test_installment_plan_provisional_until_paid_off(self):
        plan = ConstructionInstallment.objects.create(
            property_investment=self.prop, investor=self.user, total_investment_amount=Decimal('2000.00'),
            token_allocation=100, installment_amount=Decimal('200.00'), total_installments=10,
            frequency='monthly', next_payment_date=date.today())
        self.assertIsNone(sync_plan(plan))  # nothing paid yet
        plan.payments_made, plan.total_amount_paid = 1, Decimal('200.00')
        self.assertEqual(sync_plan(plan).status, 'provisional')
        plan.status = 'completed'
        cert = sync_plan(plan)
        self.assertEqual((cert.status, cert.units, cert.unit_price), ('final', 100, Decimal('20.00')))


class CertificateApiTests(TestCase):
    def setUp(self):
        self.prop = make_property(title='Marina Tower', token_price=Decimal('10.00'), total_tokens=1000,
                                  spv_entity=make_legal_entity(jurisdiction='Wyoming, USA'))
        self.user = make_ready_investor()
        self.cert = sync_investment(make_investment(user=self.user, prop=self.prop, token_amount=10,
                                                    investment_amount=Decimal('100'), status='completed'))
        self.client = APIClient()

    def test_public_verify_by_code_or_certificate_id(self):
        for code in (self.cert.verification_code, self.cert.certificate_id.lower()):
            res = self.client.get(f'/api/v1/certificates/verify/{code}/')
            self.assertEqual(res.status_code, 200)
            body = data(res)
            self.assertEqual(body['certificate_id'], self.cert.certificate_id)
            self.assertNotIn('id', body)
            self.assertNotIn(self.user.email, str(body))
            self.assertEqual(body['spv_registry_url'], 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx')
        self.assertEqual(self.client.get('/api/v1/certificates/verify/nope/').status_code, 404)

    def test_list_shows_only_my_certificates(self):
        sync_investment(make_investment(user=make_ready_investor(), prop=self.prop, token_amount=5,
                                        investment_amount=Decimal('50'), status='completed'))
        self.client.force_authenticate(self.user)
        rows = data(self.client.get('/api/v1/certificates/'))
        self.assertEqual([r['certificate_id'] for r in rows], [self.cert.certificate_id])

    def test_registrations_list_published_properties_with_their_company(self):
        self.prop.is_published = True
        self.prop.save(update_fields=['is_published'])
        rows = data(self.client.get('/api/v1/certificates/registrations/'))
        self.assertEqual(rows[0]['spv_name'], self.prop.spv_entity.name)
        self.assertEqual(rows[0]['registry_url'], 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx')

    def test_backfill_command(self):
        Certificate.objects.all().delete()
        out = StringIO()
        call_command('issue_certificates', stdout=out)
        self.assertFalse(Certificate.objects.exists())
        call_command('issue_certificates', '--apply', stdout=out)
        self.assertEqual(Certificate.objects.count(), 1)
