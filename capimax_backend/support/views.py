"""
Support API (client round 3, #12 #13) — mounted at /api/v1/support/.

  POST /contact/                      Contact Us form (no account needed; throttled)
  GET  /tickets/                      the caller's own tickets
  POST /tickets/                      open a ticket
  GET  /tickets/<id>/                 one own ticket with its conversation
  POST /tickets/<id>/messages/        reply (re-opens the ticket)

Every ticket query is scoped to request.user; support staff answer in the
Django admin (Support tickets → add a reply), which emails the user.
"""

from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from core.utils import create_error_response, create_success_response

from . import notify
from .models import ContactMessage, SupportTicket, SupportTicketMessage


class ContactThrottle(AnonRateThrottle):
    rate = '10/hour'


class ContactUserThrottle(UserRateThrottle):
    rate = '20/hour'


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    topic = serializers.ChoiceField(choices=ContactMessage.Topic.choices, default=ContactMessage.Topic.GENERAL)
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField(max_length=5000)
    language = serializers.CharField(max_length=5, required=False, default='en')
    # Honeypot: real people never fill this hidden field.
    website = serializers.CharField(required=False, allow_blank=True)


class ContactView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ContactThrottle, ContactUserThrottle]

    def post(self, request):
        ser = ContactSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if data.get('website'):
            # A bot filled the hidden field: answer like a success, store nothing.
            return Response(create_success_response(data={'reference': 'MSG-00000'}, message='Received'),
                            status=status.HTTP_201_CREATED)
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ip = (forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')) or None
        msg = ContactMessage.objects.create(
            user=request.user if request.user.is_authenticated else None,
            name=data['name'].strip(), email=data['email'], phone=data.get('phone', '').strip(),
            topic=data['topic'], subject=data['subject'].strip(), message=data['message'].strip(),
            language=(data.get('language') or 'en')[:5], ip_address=ip,
        )
        notify.contact_received(msg)
        return Response(create_success_response(data={'reference': msg.reference}, message='Received'),
                        status=status.HTTP_201_CREATED)


def _ticket(t: SupportTicket, with_messages: bool = False) -> dict:
    out = {
        'id': str(t.id), 'reference': t.reference, 'subject': t.subject, 'category': t.category,
        'priority': t.priority, 'details': t.details, 'status': t.status,
        'created_at': t.created_at.isoformat(), 'updated_at': t.updated_at.isoformat(),
    }
    if with_messages:
        out['messages'] = [
            {'id': str(m.id), 'from_support': m.is_staff, 'body': m.body, 'created_at': m.created_at.isoformat()}
            for m in t.messages.all()
        ]
    return out


class TicketCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=200)
    category = serializers.ChoiceField(choices=SupportTicket.Category.choices)
    priority = serializers.ChoiceField(choices=SupportTicket.Priority.choices, default=SupportTicket.Priority.LOW)
    details = serializers.CharField(max_length=5000)


class TicketsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = SupportTicket.objects.filter(user=request.user)
        return Response(create_success_response(data={
            'tickets': [_ticket(t) for t in qs],
            'unresolved_count': qs.exclude(status=SupportTicket.Status.RESOLVED).count(),
        }))

    def post(self, request):
        ser = TicketCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ticket = SupportTicket.objects.create(user=request.user, **ser.validated_data)
        notify.ticket_opened(ticket)
        return Response(create_success_response(data=_ticket(ticket, True)), status=status.HTTP_201_CREATED)


class TicketDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, ticket_id):
        ticket = get_object_or_404(SupportTicket, id=ticket_id, user=request.user)
        return Response(create_success_response(data=_ticket(ticket, True)))


class TicketReplyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, ticket_id):
        ticket = get_object_or_404(SupportTicket, id=ticket_id, user=request.user)
        body = (request.data.get('body') or '').strip()
        if not body:
            return Response(create_error_response('Write your reply.', status_code=400), status=400)
        SupportTicketMessage.objects.create(ticket=ticket, author=request.user, body=body[:5000])
        ticket.status = SupportTicket.Status.OPEN
        ticket.save(update_fields=['status', 'updated_at'])
        notify.user_replied(ticket, body)
        return Response(create_success_response(data=_ticket(ticket, True)), status=status.HTTP_201_CREATED)
