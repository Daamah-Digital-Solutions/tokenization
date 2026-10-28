"""
Transfers API (client round 4, extra #3).

  GET  /api/v1/transfers/              my transfers: everything I sent, and what reached me
  GET  /api/v1/transfers/giftable/     what I can send (free shares per property, balance, fee %, claim days)
  POST /api/v1/transfers/              send shares or money to an email
  POST /api/v1/transfers/<id>/cancel/  the sender cancels an open transfer (everything comes back)
"""

from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import create_error_response, create_success_response

from .models import Transfer
from .serializers import TransferCreateSerializer, TransferSerializer
from .services import TransferError, cancel, create, giftable


def _error(exc: TransferError):
    return Response(create_error_response(message=exc.message, details={'code': exc.code}),
                    status=status.HTTP_400_BAD_REQUEST)


class TransferListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        incoming = (Q(recipient=user) | Q(recipient_email__iexact=user.email)) & Q(
            status__in=['scheduled', 'waiting', 'delivered'])
        qs = (Transfer.objects.filter(Q(sender=user) | incoming)
              .select_related('sender', 'property_ref').order_by('-created_at')[:200])
        return Response(create_success_response(
            data=TransferSerializer(qs, many=True, context={'request': request}).data))

    def post(self, request):
        s = TransferCreateSerializer(data=request.data)
        if not s.is_valid():
            return Response(create_error_response(message='Please check the form.', details=s.errors),
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            t = create(request.user, **s.validated_data)
        except TransferError as exc:
            return _error(exc)
        t.refresh_from_db()
        return Response(create_success_response(
            data=TransferSerializer(t, context={'request': request}).data,
            message='Transfer sent.' if t.status == 'delivered' else 'Transfer scheduled.'),
            status=status.HTTP_201_CREATED)


class GiftableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(create_success_response(data=giftable(request.user)))


class TransferCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        t = Transfer.objects.filter(pk=pk).first()
        if t is None:
            return Response(create_error_response(message='Transfer not found.', status_code=404), status=404)
        try:
            t = cancel(t, request.user)
        except TransferError as exc:
            return _error(exc)
        return Response(create_success_response(
            data=TransferSerializer(t, context={'request': request}).data, message='Transfer cancelled.'))
