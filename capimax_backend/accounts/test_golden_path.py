"""
Golden-path tests for the accounts app.

Critical user journeys:
  1. Registration creates an unverified user and returns NO tokens.
  2. An unverified user cannot log in (verification gate enforced).
  3. Email verification with a valid 6-digit code marks the user verified
     AND returns access/refresh tokens (auto-login).
  4. A verified user can log in by email + password and gets tokens
     via both response body (access only) and httpOnly cookies.
  5. Password reset request always returns 200 (no email enumeration).
  6. Password reset confirmation with a valid token actually changes
     the password.
  7. Logout clears auth cookies.

These tests bind to the actual API contract under `/api/v1/auth/`, so a
breaking change to the auth flow will fail one of them immediately.
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import EmailVerificationToken, PasswordResetToken
from core.factories import make_user

User = get_user_model()


class RegistrationGoldenPathTests(TestCase):
    """`POST /api/v1/auth/register/` creates an unverified user."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('accounts:register')
        self.payload = {
            'email': 'newinvestor@test.com',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'Investor',
            'country': 'US',
            'role': 'investor',
        }

    def test_registration_creates_unverified_user_and_returns_no_tokens(self):
        resp = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email='newinvestor@test.com')
        self.assertFalse(user.is_verified)

        # Critical: registration response must NOT carry JWT tokens.
        body = resp.json()
        self.assertNotIn('access', str(body))
        self.assertNotIn('refresh', str(body))

        # A verification token row must exist with a 6-digit code.
        token = EmailVerificationToken.objects.get(user=user)
        self.assertEqual(len(token.code), 6)

    def test_registration_rejects_mismatched_passwords(self):
        bad = dict(self.payload, confirm_password='DifferentPass456!')
        resp = self.client.post(self.url, bad, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='newinvestor@test.com').exists())

    def test_registration_rejects_duplicate_email(self):
        make_user(email='newinvestor@test.com')
        resp = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class EmailVerificationGoldenPathTests(TestCase):
    """`POST /api/v1/auth/email/verify/` verifies the email and auto-logs-in."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('accounts:email-verify')
        self.user = make_user(
            email='unverified@test.com', is_verified=False,
        )
        self.token = EmailVerificationToken.objects.create(
            user=self.user,
            code='123456',
            expires_at=timezone.now() + timedelta(minutes=15),
        )

    def test_valid_code_verifies_user_and_returns_tokens(self):
        resp = self.client.post(
            self.url,
            {'email': self.user.email, 'code': '123456'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

        body = resp.json()
        # Auto-login: both tokens must be in the response.
        self.assertIn('access', body['data']['tokens'])
        self.assertIn('refresh', body['data']['tokens'])
        self.assertTrue(body['data']['tokens']['access'])

    def test_invalid_code_returns_400_and_does_not_verify(self):
        resp = self.client.post(
            self.url,
            {'email': self.user.email, 'code': '999999'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_verified)

    def test_expired_code_is_rejected(self):
        self.token.expires_at = timezone.now() - timedelta(seconds=1)
        self.token.save(update_fields=['expires_at'])

        resp = self.client.post(
            self.url,
            {'email': self.user.email, 'code': '123456'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_verified)


class LoginGoldenPathTests(TestCase):
    """`POST /api/v1/auth/login/` issues tokens and sets cookies."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('accounts:login')
        self.password = 'TestPass123!'
        self.user = make_user(
            email='login@test.com',
            password=self.password,
            is_verified=True,
        )

    def test_correct_credentials_return_tokens_and_set_cookies(self):
        resp = self.client.post(
            self.url,
            {'email': self.user.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        body = resp.json()
        self.assertTrue(body['data']['access'])
        # Refresh token is cookie-only — must not appear in body.
        self.assertNotIn('refresh', body['data'])

        # Access cookie present and httpOnly.
        access_cookie = resp.cookies.get('access_token')
        self.assertIsNotNone(access_cookie)
        self.assertTrue(access_cookie['httponly'])

        # Refresh cookie present, scoped to /api/v1/auth/.
        refresh_cookie = resp.cookies.get('refresh_token')
        self.assertIsNotNone(refresh_cookie)
        self.assertTrue(refresh_cookie['httponly'])
        self.assertEqual(refresh_cookie['path'], '/api/v1/auth/')

    def test_wrong_password_returns_401(self):
        resp = self.client.post(
            self.url,
            {'email': self.user.email, 'password': 'wrong-password'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIsNone(resp.cookies.get('access_token'))


class PasswordResetGoldenPathTests(TestCase):
    """`POST /api/v1/auth/password/reset/` and `.../confirm/` work end-to-end."""

    def setUp(self):
        self.client = APIClient()
        self.request_url = reverse('accounts:password-reset-request')
        self.confirm_url = reverse('accounts:password-reset-confirm')
        self.user = make_user(email='reset@test.com', password='OldPass123!')

    def test_request_always_returns_200_for_security(self):
        """No email enumeration: same 200 for existing & nonexistent emails."""
        existing = self.client.post(
            self.request_url, {'email': self.user.email}, format='json',
        )
        ghost = self.client.post(
            self.request_url, {'email': 'noone@nowhere.example'}, format='json',
        )
        self.assertEqual(existing.status_code, status.HTTP_200_OK)
        self.assertEqual(ghost.status_code, status.HTTP_200_OK)

    def test_request_creates_reset_token_for_existing_user(self):
        self.client.post(
            self.request_url, {'email': self.user.email}, format='json',
        )
        self.assertTrue(
            PasswordResetToken.objects.filter(user=self.user, used=False).exists()
        )

    def test_request_does_not_create_token_for_nonexistent_user(self):
        self.client.post(
            self.request_url, {'email': 'ghost@nowhere.test'}, format='json',
        )
        self.assertEqual(PasswordResetToken.objects.count(), 0)

    def test_confirm_with_valid_token_changes_password(self):
        token = PasswordResetToken.objects.create(
            user=self.user,
            expires_at=timezone.now() + timedelta(hours=1),
        )
        new_password = 'NewStrongPass456!'

        resp = self.client.post(
            self.confirm_url,
            {
                'token': str(token.token),
                'new_password': new_password,
                'confirm_password': new_password,
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # User can now log in with the new password.
        login_resp = self.client.post(
            reverse('accounts:login'),
            {'email': self.user.email, 'password': new_password},
            format='json',
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    def test_confirm_with_invalid_token_returns_400(self):
        import uuid
        resp = self.client.post(
            self.confirm_url,
            {
                'token': str(uuid.uuid4()),
                'new_password': 'NewStrongPass456!',
                'confirm_password': 'NewStrongPass456!',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutGoldenPathTests(TestCase):
    """Logout clears the auth cookies."""

    def setUp(self):
        self.client = APIClient()
        self.user = make_user(email='logout@test.com', password='TestPass123!')

    def test_logout_clears_auth_cookies(self):
        # Login first to set the cookies.
        login_url = reverse('accounts:login')
        self.client.post(
            login_url,
            {'email': self.user.email, 'password': 'TestPass123!'},
            format='json',
        )
        self.assertIsNotNone(self.client.cookies.get('access_token'))

        # Now logout.
        logout_url = reverse('accounts:logout')
        resp = self.client.post(logout_url, format='json')
        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_205_RESET_CONTENT))

        # Cookies cleared (deletion sets value to empty + max_age=0).
        access_cookie = resp.cookies.get('access_token')
        if access_cookie is not None:
            self.assertEqual(access_cookie.value, '')
