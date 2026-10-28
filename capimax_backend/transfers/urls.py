from django.urls import path

from . import views

urlpatterns = [
    path('', views.TransferListCreateView.as_view(), name='transfers'),
    path('giftable/', views.GiftableView.as_view(), name='transfers-giftable'),
    path('<uuid:pk>/cancel/', views.TransferCancelView.as_view(), name='transfer-cancel'),
]
