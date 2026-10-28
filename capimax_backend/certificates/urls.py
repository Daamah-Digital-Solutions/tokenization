from django.urls import path

from . import views

urlpatterns = [
    path('', views.MyCertificatesView.as_view(), name='my-certificates'),
    path('registrations/', views.RegistrationsView.as_view(), name='certificate-registrations'),
    path('verify/<str:code>/', views.VerifyCertificateView.as_view(), name='certificate-verify'),
]
