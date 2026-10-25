"""Client round 3, #12 #13: a real Contact Us form and support tickets."""

from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.factories import make_admin, make_investor
from support.admin import SupportTicketAdmin
from support.models import ContactMessage, SupportTicket, SupportTicketMessage


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   SUPPORT_INBOX_EMAIL='inbox@example.com')
class ContactTests(TestCase):
    def test_contact_message_is_stored_and_emailed(self):
        r = APIClient().post('/api/v1/support/contact/', {
            'name': 'Sara', 'email': 'sara@example.com', 'topic': 'investment',
            'subject': 'Shares', 'message': 'How do I buy?', 'language': 'ar',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        msg = ContactMessage.objects.get()
        self.assertEqual(r.json()['data']['reference'], msg.reference)
        self.assertTrue(msg.reference.startswith('MSG-'))
        recipients = sorted(m.to[0] for m in mail.outbox)
        self.assertEqual(recipients, ['inbox@example.com', 'sara@example.com'])
        self.assertIn('استلمنا', [m for m in mail.outbox if m.to == ['sara@example.com']][0].subject)

    def test_validation_and_honeypot(self):
        client = APIClient()
        self.assertEqual(client.post('/api/v1/support/contact/', {'name': 'x'}, format='json').status_code, 400)
        r = client.post('/api/v1/support/contact/', {
            'name': 'Bot', 'email': 'bot@example.com', 'subject': 's', 'message': 'm', 'website': 'spam.example',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertFalse(ContactMessage.objects.exists())


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class TicketTests(TestCase):
    def setUp(self):
        self.user = make_investor()
        self.other = make_investor()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _open(self):
        r = self.client.post('/api/v1/support/tickets/', {
            'subject': 'Wallet', 'category': 'payments', 'priority': 'high', 'details': 'My deposit is late',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return SupportTicket.objects.get(id=r.json()['data']['id'])

    def test_open_list_reply_and_scope(self):
        ticket = self._open()
        self.assertTrue(ticket.reference.startswith('TKT-'))
        data = self.client.get('/api/v1/support/tickets/').json()['data']
        self.assertEqual(data['unresolved_count'], 1)
        r = self.client.post(f'/api/v1/support/tickets/{ticket.id}/messages/', {'body': 'Any news?'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(len(r.json()['data']['messages']), 1)

        stranger = APIClient()
        stranger.force_authenticate(self.other)
        self.assertEqual(stranger.get(f'/api/v1/support/tickets/{ticket.id}/').status_code, 404)
        self.assertEqual(stranger.get('/api/v1/support/tickets/').json()['data']['tickets'], [])
        self.assertIn(APIClient().get('/api/v1/support/tickets/').status_code, (401, 403))

    def test_staff_reply_in_admin_notifies_user(self):
        ticket = self._open()
        mail.outbox.clear()
        admin_user = make_admin()
        reply = SupportTicketMessage(ticket=ticket, body='We credited it.')

        class FakeFormset:
            deleted_objects = []

            def save(self, commit=True):
                return [reply]

            def save_m2m(self):
                pass

        class FakeForm:
            instance = ticket

        class Req:
            user = admin_user

        SupportTicketAdmin(SupportTicket, AdminSite()).save_formset(Req(), FakeForm(), FakeFormset(), True)
        reply.refresh_from_db()
        ticket.refresh_from_db()
        self.assertTrue(reply.is_staff)
        self.assertEqual(ticket.status, 'pending')
        self.assertEqual(mail.outbox[0].to, [self.user.email])
