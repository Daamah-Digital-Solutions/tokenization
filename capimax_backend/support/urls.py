from django.urls import path

from .views import ContactView, TicketDetailView, TicketReplyView, TicketsView

urlpatterns = [
    path('contact/', ContactView.as_view(), name='support-contact'),
    path('tickets/', TicketsView.as_view(), name='support-tickets'),
    path('tickets/<uuid:ticket_id>/', TicketDetailView.as_view(), name='support-ticket-detail'),
    path('tickets/<uuid:ticket_id>/messages/', TicketReplyView.as_view(), name='support-ticket-reply'),
]
