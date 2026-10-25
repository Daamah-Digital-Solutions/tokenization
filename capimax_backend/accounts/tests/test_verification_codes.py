"""
Client round 3, #2 — "the verification code doesn't reach Gmail".
The causes were in the code path; these tests pin the fixes.
"""

from datetime import timedelta
from unittest import mock

from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import EmailVerificationToken, User

REGISTER = {
    'email': 'gmailuser@gmail.com',
    'password': 'StrongPass123!',
    'confirm_password': 'StrongPass123!',
    'first_name': 'Gmail',
    'last_name': 'User',
    'country': 'EG',
    'role': 'investor',
}


class VerificationCodeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.post(reverse('accounts:register'), REGISTER, format='json')
        self.user = User.objects.get(email='gmailuser@gmail.com')

    def _code(self):
        return EmailVerificationToken.objects.get(user=self.user, verified=False).code

    def test_registration_creates_exactly_one_code_and_emails_it_in_text_part(self):
        self.assertEqual(EmailVerificationToken.objects.filter(user=self.user).count(), 1)
        code = self._code()
        self.assertEqual(len(code), 6)
        self.assertEqual(len(mail.outbox), 1)
        # The plain-text part carries the code (no "view in HTML" placeholder).
        self.assertIn(code, mail.outbox[0].body)
        self.assertNotIn('Please view this email in HTML format', mail.outbox[0].body)

    def test_resend_works_without_login_and_replaces_the_code(self):
        old = self._code()
        token = EmailVerificationToken.objects.get(user=self.user, verified=False)
        token.created_at = timezone.now() - timedelta(minutes=5)  # past the cooldown
        token.save(update_fields=['created_at'])
        response = self.client.post('/api/v1/auth/email/resend-verification/',
                                    {'email': 'GmailUser@Gmail.com'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(EmailVerificationToken.objects.filter(user=self.user, verified=False).count(), 1)
        self.assertNotEqual(self._code(), old)
        self.assertEqual(len(mail.outbox), 2)

    def test_resend_cooldown(self):
        response = self.client.post('/api/v1/auth/email/resend-verification/',
                                    {'email': 'gmailuser@gmail.com'}, format='json')
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data['error']['code'], 'RESEND_COOLDOWN')

    def test_resend_does_not_reveal_unknown_emails(self):
        response = self.client.post('/api/v1/auth/email/resend-verification/',
                                    {'email': 'nobody@example.com'}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_verify_with_different_email_case(self):
        response = self.client.post(reverse('accounts:email-verify'),
                                    {'email': 'GmailUser@GMAIL.com', 'code': self._code()}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_code_valid_for_30_minutes(self):
        token = EmailVerificationToken.objects.get(user=self.user, verified=False)
        remaining = (token.expires_at - timezone.now()).total_seconds() / 60
        self.assertGreater(remaining, 25)

    def test_login_unverified_explains_and_sends_new_code(self):
        token = EmailVerificationToken.objects.get(user=self.user, verified=False)
        token.created_at = timezone.now() - timedelta(minutes=5)
        token.save(update_fields=['created_at'])
        response = self.client.post(reverse('accounts:login'),
                                    {'email': 'gmailuser@gmail.com', 'password': 'StrongPass123!'},
                                    format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['error']['code'], 'EMAIL_NOT_VERIFIED')
        self.assertIn('verified', response.data['error']['message'])
        self.assertEqual(len(mail.outbox), 2)  # a fresh code was sent

    def test_wrong_password_message_is_specific(self):
        response = self.client.post(reverse('accounts:login'),
                                    {'email': 'gmailuser@gmail.com', 'password': 'nope'}, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertIn('Invalid email or password', response.data['error']['message'])

    def test_registration_survives_email_failure(self):
        with mock.patch('core.services.email_service.EmailMultiAlternatives.send',
                        side_effect=OSError('smtp down')):
            response = self.client.post(reverse('accounts:register'),
                                        dict(REGISTER, email='second@gmail.com'), format='json')
        self.assertEqual(response.status_code, 201)

    def test_login_accepts_capitalised_email(self):
        self.user.is_verified = True
        self.user.save(update_fields=['is_verified'])
        response = self.client.post(reverse('accounts:login'),
                                    {'email': 'GmailUser@Gmail.com', 'password': 'StrongPass123!'},
                                    format='json')
        self.assertEqual(response.status_code, 200, response.content)
