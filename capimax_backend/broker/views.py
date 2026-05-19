"""
Broker Views for Capimax Real Estate Tokenization Platform.

This module contains API views for broker management, commission tracking,
referral systems, marketing materials, and performance analytics.
"""

from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from django.http import HttpResponse, Http404
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from core.permissions import IsBrokerUser, IsAdminUser
from .models import (
    BrokerProfile, BrokerCommission, BrokerReferral,
    MarketingMaterial, BrokerPerformanceMetrics,
    CommissionStatus, CommissionType
)
from .serializers import (
    BrokerProfileSerializer, BrokerCommissionSerializer,
    BrokerReferralSerializer, MarketingMaterialSerializer,
    BrokerPerformanceMetricsSerializer, BrokerDashboardSerializer,
    BrokerCommissionSummarySerializer, ReferralLinkGeneratorSerializer
)

logger = logging.getLogger(__name__)


def _get_or_create_broker_profile(user):
    """
    Return the BrokerProfile for ``user``, creating it on first access.

    The SPA expects ``/broker/dashboard/`` and ``/broker/commissions/summary/``
    to succeed on first login for any user with role=broker, but those views
    used to 404 until ``/broker/profile/`` had been called once (which is the
    only place that ran get_or_create). This helper unifies that behavior so
    every broker-scoped read auto-creates the placeholder profile.
    """
    profile, _ = BrokerProfile.objects.get_or_create(
        user=user,
        defaults={
            'license_number': f'TEMP-{user.id}',
            'license_state': 'Unknown',
            'license_expiry': timezone.now().date() + timedelta(days=365),
        },
    )
    return profile


class BrokerProfileView(generics.RetrieveUpdateAPIView):
    """
    API view for broker profile management.
    
    Allows brokers to view and update their profile information
    including professional credentials and commission settings.
    """
    
    serializer_class = BrokerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    
    def get_object(self):
        """Get or create broker profile for current user."""
        profile, created = BrokerProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                'license_number': f'TEMP-{self.request.user.id}',
                'license_state': 'Unknown',
                'license_expiry': timezone.now().date() + timedelta(days=365)
            }
        )
        return profile
    
    def update(self, request, *args, **kwargs):
        """Update broker profile with validation."""
        try:
            response = super().update(request, *args, **kwargs)
            logger.info(f"Broker profile updated for user {request.user.id}")
            return response
        except Exception as e:
            logger.error(f"Error updating broker profile: {str(e)}")
            return Response(
                {"error": "Failed to update profile"},
                status=status.HTTP_400_BAD_REQUEST
            )


class BrokerCommissionListView(generics.ListAPIView):
    """
    API view for broker commission tracking.
    
    Provides filtered list of commissions earned by the broker
    with status and payment tracking.
    """
    
    serializer_class = BrokerCommissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'commission_type']
    ordering_fields = ['earned_at', 'commission_amount', 'status']
    ordering = ['-earned_at']
    
    def get_queryset(self):
        """Get commissions for current broker."""
        try:
            broker_profile = self.request.user.broker_profile
            return BrokerCommission.objects.filter(
                broker=broker_profile
            ).select_related('investment', 'referral')
        except BrokerProfile.DoesNotExist:
            return BrokerCommission.objects.none()


class BrokerCommissionSummaryView(generics.GenericAPIView):
    """
    API view for broker commission summary statistics.
    
    Provides aggregated commission data including totals,
    growth rates, and breakdowns by type.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    
    def get(self, request):
        """Get commission summary for current broker."""
        try:
            broker_profile = _get_or_create_broker_profile(request.user)
            commissions = BrokerCommission.objects.filter(broker=broker_profile)
            
            # Calculate summary statistics
            summary = {
                'total_earned': commissions.aggregate(
                    total=Sum('commission_amount')
                )['total'] or Decimal('0.00'),
                
                'total_paid': commissions.filter(
                    status=CommissionStatus.PAID
                ).aggregate(
                    total=Sum('commission_amount')
                )['total'] or Decimal('0.00'),
                
                'total_pending': commissions.filter(
                    status__in=[CommissionStatus.PENDING, CommissionStatus.APPROVED]
                ).aggregate(
                    total=Sum('commission_amount')
                )['total'] or Decimal('0.00'),
                
                'commission_count': commissions.count(),
                
                'avg_commission_size': commissions.aggregate(
                    avg=Avg('commission_amount')
                )['avg'] or Decimal('0.00'),
            }
            
            # This month vs last month
            now = timezone.now()
            this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
            last_month_end = this_month_start - timedelta(seconds=1)
            
            summary['this_month'] = commissions.filter(
                earned_at__gte=this_month_start
            ).aggregate(
                total=Sum('commission_amount')
            )['total'] or Decimal('0.00')
            
            summary['last_month'] = commissions.filter(
                earned_at__gte=last_month_start,
                earned_at__lte=last_month_end
            ).aggregate(
                total=Sum('commission_amount')
            )['total'] or Decimal('0.00')
            
            # Growth rate calculation
            if summary['last_month'] > 0:
                summary['growth_rate'] = round(
                    float((summary['this_month'] - summary['last_month']) / 
                          summary['last_month'] * 100), 2
                )
            else:
                summary['growth_rate'] = 0.0
            
            # Breakdown by commission type
            summary['by_type'] = {}
            for commission_type in CommissionType:
                type_total = commissions.filter(
                    commission_type=commission_type.value
                ).aggregate(
                    total=Sum('commission_amount')
                )['total'] or Decimal('0.00')
                summary['by_type'][commission_type.value] = type_total
            
            serializer = BrokerCommissionSummarySerializer(summary)
            return Response(serializer.data)
            
        except BrokerProfile.DoesNotExist:
            return Response(
                {"error": "Broker profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting commission summary: {str(e)}")
            return Response(
                {"error": "Failed to retrieve commission summary"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BrokerReferralListView(generics.ListCreateAPIView):
    """
    API view for broker referral management.
    
    Allows brokers to view their referrals and create new referral codes
    with tracking and conversion monitoring.
    """
    
    serializer_class = BrokerReferralSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_converted', 'is_active']
    ordering_fields = ['created_at', 'conversion_amount', 'commission_earned']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get referrals for current broker."""
        try:
            broker_profile = self.request.user.broker_profile
            return BrokerReferral.objects.filter(
                broker=broker_profile
            ).select_related('referred_user')
        except BrokerProfile.DoesNotExist:
            return BrokerReferral.objects.none()
    
    def perform_create(self, serializer):
        """Create referral with broker association."""
        try:
            broker_profile = self.request.user.broker_profile
            serializer.save(broker=broker_profile)
            logger.info(f"Referral created by broker {self.request.user.id}")
        except BrokerProfile.DoesNotExist:
            raise serializers.ValidationError("Broker profile required")


class GenerateReferralLinkView(generics.CreateAPIView):
    """
    API view for generating custom referral links.
    
    Allows brokers to generate referral codes with custom
    parameters and expiration settings.
    """
    
    serializer_class = ReferralLinkGeneratorSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    
    def create(self, request, *args, **kwargs):
        """Generate new referral link."""
        try:
            broker_profile = request.user.broker_profile
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Create referral with custom or generated code
            referral_data = {
                'broker': broker_profile,
                'expires_at': serializer.validated_data.get('expires_at'),
                'notes': serializer.validated_data.get('notes', ''),
            }
            
            # Use custom code if provided
            custom_code = serializer.validated_data.get('custom_code')
            if custom_code:
                referral_data['referral_code'] = custom_code
            
            referral = BrokerReferral.objects.create(**referral_data)
            
            # Build referral URL
            base_url = request.build_absolute_uri('/')
            referral_url = f"{base_url}register?ref={referral.referral_code}"
            
            response_data = {
                'referral_code': referral.referral_code,
                'referral_url': referral_url,
                'expires_at': referral.expires_at,
                'created_at': referral.created_at
            }
            
            logger.info(f"Referral link generated by broker {request.user.id}")
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except BrokerProfile.DoesNotExist:
            return Response(
                {"error": "Broker profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error generating referral link: {str(e)}")
            return Response(
                {"error": "Failed to generate referral link"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BrokerPerformanceView(generics.ListAPIView):
    """
    API view for broker performance metrics.
    
    Provides monthly performance data with rankings,
    trends, and comparative analytics.
    """
    
    serializer_class = BrokerPerformanceMetricsSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    ordering = ['-month']
    
    def get_queryset(self):
        """Get performance metrics for current broker."""
        try:
            broker_profile = self.request.user.broker_profile
            return BrokerPerformanceMetrics.objects.filter(broker=broker_profile)
        except BrokerProfile.DoesNotExist:
            return BrokerPerformanceMetrics.objects.none()


class MarketingMaterialListView(generics.ListAPIView):
    """
    API view for marketing materials.
    
    Provides filtered list of available marketing materials
    with download tracking and premium access control.
    """
    
    serializer_class = MarketingMaterialSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['material_type', 'is_premium_only']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['created_at', 'download_count', 'title']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get available marketing materials based on broker status."""
        queryset = MarketingMaterial.objects.filter(is_active=True)
        
        # Filter based on premium status
        try:
            broker_profile = self.request.user.broker_profile
            if not broker_profile.is_premium_active():
                queryset = queryset.filter(is_premium_only=False)
        except BrokerProfile.DoesNotExist:
            queryset = queryset.filter(is_premium_only=False)
        
        return queryset


class DownloadMarketingMaterialView(generics.GenericAPIView):
    """
    API view for downloading marketing materials.
    
    Handles file downloads with access control and
    download tracking for analytics.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    
    def get(self, request, material_id):
        """Download marketing material file."""
        try:
            material = get_object_or_404(MarketingMaterial, id=material_id, is_active=True)
            
            # Check premium access
            if material.is_premium_only:
                broker_profile = request.user.broker_profile
                if not broker_profile.is_premium_active():
                    return Response(
                        {"error": "Premium membership required"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Increment download count
            material.increment_download_count()
            
            # Log download event (if analytics app is available)
            try:
                from analytics.models import AnalyticsEvent, EventType
                AnalyticsEvent.objects.create(
                    user=request.user,
                    event_type=EventType.USER_ACTION,
                    event_name='material_download',
                    event_data={
                        'material_id': str(material.id),
                        'material_type': material.material_type,
                        'material_title': material.title
                    }
                )
            except ImportError:
                pass
            
            # Return file response
            if material.file:
                response = HttpResponse(
                    material.file.read(),
                    content_type='application/octet-stream'
                )
                response['Content-Disposition'] = f'attachment; filename="{material.file.name}"'
                return response
            else:
                raise Http404("File not found")
                
        except BrokerProfile.DoesNotExist:
            return Response(
                {"error": "Broker profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error downloading material: {str(e)}")
            return Response(
                {"error": "Failed to download material"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BrokerDashboardView(generics.GenericAPIView):
    """
    API view for broker dashboard summary.
    
    Provides comprehensive dashboard data including profile,
    performance metrics, commissions, and key statistics.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsBrokerUser]
    
    def get(self, request):
        """Get broker dashboard summary data."""
        try:
            broker_profile = _get_or_create_broker_profile(request.user)

            # Get current month metrics
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()
            current_metrics = BrokerPerformanceMetrics.objects.filter(
                broker=broker_profile,
                month=current_month
            ).first()
            
            # Calculate pending commissions
            pending_commissions = BrokerCommission.objects.filter(
                broker=broker_profile,
                status__in=[CommissionStatus.PENDING, CommissionStatus.APPROVED]
            ).aggregate(
                total=Sum('commission_amount')
            )['total'] or Decimal('0.00')
            
            # Active referrals count
            active_referrals = BrokerReferral.objects.filter(
                broker=broker_profile,
                is_active=True
            ).count()
            
            # This month sales
            this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            this_month_commissions = BrokerCommission.objects.filter(
                broker=broker_profile,
                earned_at__gte=this_month_start
            ).aggregate(
                sales=Sum('base_amount')
            )['sales'] or Decimal('0.00')
            
            # Calculate conversion rate
            total_referrals = BrokerReferral.objects.filter(broker=broker_profile).count()
            converted_referrals = BrokerReferral.objects.filter(
                broker=broker_profile,
                is_converted=True
            ).count()
            
            conversion_rate = Decimal('0.00')
            if total_referrals > 0:
                conversion_rate = Decimal(converted_referrals / total_referrals * 100).quantize(Decimal('0.01'))
            
            # Rank change (simplified - would need historical data for real calculation)
            rank_change = 0
            
            # Top properties (simplified - would need actual investment data)
            top_properties = []
            
            dashboard_data = {
                'profile': broker_profile,
                'current_month_metrics': current_metrics,
                'pending_commissions': pending_commissions,
                'active_referrals': active_referrals,
                'this_month_sales': this_month_commissions,
                'conversion_rate': conversion_rate,
                'rank_change': rank_change,
                'top_properties': top_properties
            }
            
            serializer = BrokerDashboardSerializer(dashboard_data)
            return Response(serializer.data)
            
        except BrokerProfile.DoesNotExist:
            return Response(
                {"error": "Broker profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting broker dashboard: {str(e)}")
            return Response(
                {"error": "Failed to retrieve dashboard data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsBrokerUser])
def submit_verification_documents(request):
    """
    Submit broker verification documents.
    
    Allows brokers to upload documents for verification
    with automatic status updates.
    """
    try:
        broker_profile = request.user.broker_profile
        
        # Handle file uploads (simplified - would integrate with file storage)
        files = request.FILES
        
        # Update verification status
        if files:
            broker_profile.verification_status = 'under_review'
            broker_profile.save()
            
            logger.info(f"Verification documents submitted by broker {request.user.id}")
            
            return Response({
                'message': 'Documents submitted successfully',
                'status': broker_profile.verification_status
            })
        else:
            return Response(
                {'error': 'No files uploaded'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except BrokerProfile.DoesNotExist:
        return Response(
            {'error': 'Broker profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error submitting verification documents: {str(e)}")
        return Response(
            {'error': 'Failed to submit documents'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Admin-only views for broker management

class AdminBrokerListView(generics.ListAPIView):
    """
    Admin view for listing all brokers.
    
    Provides comprehensive broker list with filtering
    and search capabilities for admin users.
    """
    
    serializer_class = BrokerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = BrokerProfile.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['verification_status', 'is_premium']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'license_number']
    ordering_fields = ['created_at', 'total_sales', 'total_commissions_earned']
    ordering = ['-created_at']


class AdminBrokerCommissionListView(generics.ListAPIView):
    """
    Admin view for all broker commissions.
    
    Allows admins to view and manage all broker commissions
    with filtering and bulk operations.
    """
    
    serializer_class = BrokerCommissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = BrokerCommission.objects.all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'commission_type', 'broker']
    ordering_fields = ['earned_at', 'commission_amount', 'status']
    ordering = ['-earned_at']


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def approve_broker_commission(request, commission_id):
    """
    Approve broker commission for payment.
    
    Allows admins to approve pending commissions
    with audit trail and notification.
    """
    try:
        commission = get_object_or_404(BrokerCommission, id=commission_id)
        commission.approve()
        
        logger.info(f"Commission {commission_id} approved by admin {request.user.id}")
        
        return Response({
            'message': 'Commission approved successfully',
            'commission_id': str(commission.id),
            'status': commission.status
        })
        
    except Exception as e:
        logger.error(f"Error approving commission: {str(e)}")
        return Response(
            {'error': 'Failed to approve commission'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
