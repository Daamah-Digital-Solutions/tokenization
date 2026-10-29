"""The payment page sends the buyer back to the domain they paid from."""

from django.test import RequestFactory, SimpleTestCase, override_settings

from .checkout import _frontend


@override_settings(FRONTEND_URL='https://capimaxrt.tech',
                   CORS_ALLOWED_ORIGINS=['https://capimaxrt.tech', 'https://capimaxrt.com'],
                   CSRF_TRUSTED_ORIGINS=['https://www.capimaxrt.com'])
class CheckoutOriginTests(SimpleTestCase):
    def _req(self, origin=None):
        headers = {'HTTP_ORIGIN': origin} if origin else {}
        return RequestFactory().post('/api/v1/x/', **headers)

    def test_known_domain_is_kept(self):
        self.assertEqual(_frontend(self._req('https://capimaxrt.com')), 'https://capimaxrt.com')
        self.assertEqual(_frontend(self._req('https://www.capimaxrt.com')), 'https://www.capimaxrt.com')

    def test_unknown_or_missing_origin_uses_frontend_url(self):
        self.assertEqual(_frontend(self._req('https://evil.example')), 'https://capimaxrt.tech')
        self.assertEqual(_frontend(self._req()), 'https://capimaxrt.tech')
        self.assertEqual(_frontend(), 'https://capimaxrt.tech')
