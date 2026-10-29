"""
Certificates API (client round 4, #5 / #7).

  GET /api/v1/certificates/                 the caller's certificates (newest first)
  GET /api/v1/certificates/verify/<code>/   PUBLIC — the record behind a QR / code / certificate ID
  GET /api/v1/certificates/registrations/   PUBLIC — each listed property's SPV + token contract
"""

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from core.utils import create_error_response, create_success_response

from .models import Certificate
from .serializers import CertificatePublicSerializer, CertificateSerializer


class VerifyThrottle(AnonRateThrottle):
    """Per-IP limit on public look-ups (the rate lives here so no settings entry is needed)."""
    scope = 'certificate_verify'
    rate = '60/min'


class MyCertificatesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = (Certificate.objects.filter(user=request.user)
              .select_related('replaced_by').order_by('-created_at'))
        return Response(create_success_response(data=CertificateSerializer(qs, many=True).data))


class VerifyCertificateView(APIView):
    """Public: no login, no token evaluated. Accepts the QR code or the printed certificate ID."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [VerifyThrottle]

    def get(self, request, code):
        code = (code or '').strip()
        cert = (Certificate.objects.select_related('replaced_by').filter(verification_code=code).first()
                or Certificate.objects.select_related('replaced_by')
                .filter(certificate_id__iexact=code).first())
        if cert is None:
            return Response(create_error_response(message='Certificate not found.', status_code=404), status=404)
        return Response(create_success_response(data=CertificatePublicSerializer(cert).data))


class RegistrationsView(APIView):
    """Public: the company (SPV) and token contract behind every listed property — for the Verification Center."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        from properties.spv import spv_details
        from properties.workflow import public_properties

        from .services import _chain

        rows = []
        for prop in public_properties().select_related('spv_entity').order_by('title'):
            spv = spv_details(prop)
            chain = _chain(prop)
            if not spv and not chain['contract_address']:
                continue
            rows.append({
                'property_id': str(prop.pk), 'property_name': prop.title,
                'spv_name': (spv or {}).get('name', ''),
                'filing_id': (spv or {}).get('registration_number', ''),
                'jurisdiction': (spv or {}).get('jurisdiction', ''),
                'registry_url': (spv or {}).get('registry_url'),
                'contract_address': chain['contract_address'],
                'network_name': chain['network_name'],
                'contract_explorer_url': chain['contract_explorer_url'],
            })
        return Response(create_success_response(data=rows))
