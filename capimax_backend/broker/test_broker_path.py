"""
Client round 4, #13 / #14: the broker path — apply with documents from the
signed-in account, approval from "under review", refer a client by email.
"""

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserRole
from core.factories import make_admin, make_ready_investor

from .models import BrokerApplication, BrokerReferral
from .onboarding import approve_application

FORM = {
    'first_name': 'Sara', 'last_name': 'Nabil', 'email': 'typed-something-else@example.com',
    'phone_number': '+20 100 000 0000', 'country': 'EG', 'city_address': 'Cairo',
    'license_number': 'BRK-77', 'experience_level': '2-5', 'current_company': 'Nile Realty',
    'referral_strategy': 'Clients from my agency', 'terms_accepted': 'true',
}


def pdf(name):
    return SimpleUploadedFile(name, b'%PDF-1.4', content_type='application/pdf')


class BrokerPathTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_ready_investor()

    def _apply(self, **extra):
        self.client.force_authenticate(self.user)
        return self.client.post('/api/v1/broker/applications/submit/', {**FORM, **extra}, format='multipart')

    def test_application_belongs_to_the_signed_in_account_with_its_documents(self):
        res = self._apply(documents=[pdf('licence.pdf'), pdf('id.pdf')], document_types=['license', 'id_document'])
        self.assertEqual(res.status_code, 201, res.content)
        app = BrokerApplication.objects.get()
        self.assertEqual((app.associated_user, app.email), (self.user, self.user.email))
        self.assertEqual(app.documents.count(), 2)
        self.assertTrue(app.documents.first().file.name.startswith('partner_documents/broker/'))

    def test_second_open_application_is_a_400_not_a_500(self):
        self._apply()
        res = self._apply()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'open_application')

    def test_under_review_can_be_approved_and_the_account_becomes_a_broker(self):
        self._apply()
        app = BrokerApplication.objects.get()
        app.application_status = 'under_review'
        app.save()
        user, profile, temp = approve_application(app, make_admin())
        self.assertEqual((user, temp), (self.user, None))
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_role(UserRole.BROKER))

    def test_broker_refers_a_client_by_email(self):
        self._apply()
        approve_application(BrokerApplication.objects.get(), make_admin())
        self.client.force_authenticate(self.user)
        res = self.client.post('/api/v1/broker/referrals/', {'referred_email': 'friend@example.com'}, format='json')
        self.assertIn(res.status_code, (200, 201), res.content)
        self.assertEqual(BrokerReferral.objects.get().referred_email, 'friend@example.com')

    def test_admin_rejection_emails_the_applicant(self):
        from django.contrib.admin.sites import AdminSite

        from .admin import BrokerApplicationAdmin
        self._apply()
        mail.outbox.clear()
        request = type('R', (), {'user': make_admin(), '_messages': None})()
        admin = BrokerApplicationAdmin(BrokerApplication, AdminSite())
        admin.message_user = lambda *a, **k: None
        admin.reject_applications(request, BrokerApplication.objects.all())
        self.assertEqual(BrokerApplication.objects.get().application_status, 'rejected')
        self.assertEqual(len(mail.outbox), 1)
