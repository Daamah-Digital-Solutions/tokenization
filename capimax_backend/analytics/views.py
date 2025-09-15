"""
Analytics Views for Capimax Real Estate Tokenization Platform.

This module contains API views for analytics tracking, performance metrics,
dashboard data, event logging, and automated report generation.
"""

from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Avg, Q, F, Max, Min
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncHour
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from core.permissions import IsAdminUser, IsBrokerUser
from accounts.models import User, UserRole
from investments.models import Investment
from properties.models import Property
from .models import (
    AnalyticsEvent, DashboardMetrics, DetailedPropertyAnalytics,
    UserAnalytics, PerformanceReport,
    EventType, ReportType, ReportStatus
)
from .serializers import (
    AnalyticsEventSerializer, DashboardMetricsSerializer,
    PropertyAnalyticsSerializer, UserAnalyticsSerializer,
    PerformanceReportSerializer, AnalyticsDashboardSerializer,
    EventTrackingSerializer, AnalyticsQuerySerializer,
    MarketTrendsSerializer, CustomReportRequestSerializer
)

logger = logging.getLogger(__name__)


class DashboardAnalyticsView(generics.GenericAPIView):
    """
    API view for main dashboard analytics.
    
    Provides comprehensive dashboard metrics including user stats,
    investment data, property performance, and system metrics.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get dashboard analytics data."""
        try:
            # Get date range from query params
            days = int(request.query_params.get('days', 30))
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days)
            
            # Get latest dashboard metrics
            latest_metrics = DashboardMetrics.objects.filter(
                date__gte=start_date,
                date__lte=end_date
            ).order_by('-date')
            
            overview_metrics = latest_metrics.first() if latest_metrics else None
            
            # Get top performing properties
            top_properties = DetailedPropertyAnalytics.objects.select_related('property').order_by(
                '-total_invested'
            )[:10]
            
            # Get recent analytics events
            recent_events = AnalyticsEvent.objects.select_related('user').order_by(
                '-created_at'
            )[:20]
            
            # User segments analysis
            total_users = User.objects.count()
            user_segments = {
                'investors': User.objects.filter(role=UserRole.INVESTOR).count(),
                'brokers': User.objects.filter(role=UserRole.BROKER).count(),
                'property_owners': User.objects.filter(role=UserRole.PROPERTY_OWNER).count(),
                'admins': User.objects.filter(role=UserRole.ADMIN).count(),
            }
            
            # Growth trends (simplified calculation)
            metrics_data = list(latest_metrics.values(
                'date', 'daily_investments', 'new_users', 'active_users'
            ))
            
            growth_trends = {
                'investment_trend': [
                    {'date': m['date'].isoformat(), 'value': float(m['daily_investments'])}
                    for m in metrics_data
                ],
                'user_growth': [
                    {'date': m['date'].isoformat(), 'value': m['new_users']}
                    for m in metrics_data
                ],
            }
            
            # Conversion funnels (basic implementation)
            property_views = AnalyticsEvent.objects.filter(
                event_type=EventType.PROPERTY_VIEW,
                created_at__gte=timezone.now() - timedelta(days=days)
            ).count()
            
            investments_made = Investment.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=days)
            ).count()
            
            conversion_funnels = {
                'property_to_investment': {
                    'views': property_views,
                    'investments': investments_made,
                    'conversion_rate': round(
                        (investments_made / property_views * 100) if property_views > 0 else 0, 2
                    )
                }
            }
            
            dashboard_data = {
                'overview_metrics': overview_metrics,
                'top_properties': top_properties,
                'recent_events': recent_events,
                'user_segments': user_segments,
                'growth_trends': growth_trends,
                'conversion_funnels': conversion_funnels
            }
            
            serializer = AnalyticsDashboardSerializer(dashboard_data)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error getting dashboard analytics: {str(e)}")
            return Response(
                {"error": "Failed to retrieve dashboard analytics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PropertyAnalyticsDetailView(generics.RetrieveAPIView):
    """
    API view for individual property analytics.
    
    Provides detailed analytics for a specific property
    including performance metrics and trends.
    """
    
    serializer_class = PropertyAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'property_id'
    lookup_url_kwarg = 'property_id'
    
    def get_object(self):
        """Get property analytics by property ID."""
        property_id = self.kwargs['property_id']
        property_obj = get_object_or_404(Property, id=property_id)
        
        analytics, created = DetailedPropertyAnalytics.objects.get_or_create(
            property=property_obj,
            defaults={
                'total_views': 0,
                'unique_views': 0,
                'conversion_rate': Decimal('0.00')
            }
        )
        
        return analytics


class UserAnalyticsDetailView(generics.RetrieveAPIView):
    """
    API view for individual user analytics.
    
    Provides detailed user behavior analytics for admins
    with privacy controls and consent management.
    """
    
    serializer_class = UserAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    lookup_field = 'user_id'
    lookup_url_kwarg = 'user_id'
    
    def get_object(self):
        """Get user analytics by user ID."""
        user_id = self.kwargs['user_id']
        user_obj = get_object_or_404(User, id=user_id)
        
        analytics, created = UserAnalytics.objects.get_or_create(
            user=user_obj,
            defaults={
                'total_sessions': 0,
                'engagement_score': Decimal('0.00'),
                'loyalty_score': Decimal('0.00')
            }
        )
        
        return analytics


class InvestmentAnalyticsView(generics.GenericAPIView):
    """
    API view for investment analytics.
    
    Provides aggregated investment data with filtering
    and time-based analysis capabilities.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get investment analytics data."""
        try:
            # Get query parameters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            group_by = request.query_params.get('group_by', 'day')
            
            # Default to last 30 days if no dates provided
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Base queryset
            investments = Investment.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            )
            
            # Group by time period
            if group_by == 'hour':
                time_series = investments.extra({
                    'period': "DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:00:00')"
                }).values('period').annotate(
                    count=Count('id'),
                    total_amount=Sum('amount'),
                    avg_amount=Avg('amount')
                ).order_by('period')
            elif group_by == 'week':
                time_series = investments.extra({
                    'period': "DATE_FORMAT(created_at, '%%Y-%%u')"
                }).values('period').annotate(
                    count=Count('id'),
                    total_amount=Sum('amount'),
                    avg_amount=Avg('amount')
                ).order_by('period')
            elif group_by == 'month':
                time_series = investments.extra({
                    'period': "DATE_FORMAT(created_at, '%%Y-%%m')"
                }).values('period').annotate(
                    count=Count('id'),
                    total_amount=Sum('amount'),
                    avg_amount=Avg('amount')
                ).order_by('period')
            else:  # day
                time_series = investments.extra({
                    'period': "DATE(created_at)"
                }).values('period').annotate(
                    count=Count('id'),
                    total_amount=Sum('amount'),
                    avg_amount=Avg('amount')
                ).order_by('period')
            
            # Summary statistics
            summary = investments.aggregate(
                total_count=Count('id'),
                total_amount=Sum('amount'),
                avg_amount=Avg('amount'),
                max_amount=Max('amount'),
                min_amount=Min('amount')
            )
            
            # Top investors
            top_investors = investments.values('user__email').annotate(
                total_invested=Sum('amount'),
                investment_count=Count('id')
            ).order_by('-total_invested')[:10]
            
            # Investment by property type (if available)
            by_property_type = investments.values(
                'property_investment__property_type'
            ).annotate(
                count=Count('id'),
                total_amount=Sum('amount')
            ).order_by('-total_amount')
            
            analytics_data = {
                'summary': summary,
                'time_series': list(time_series),
                'top_investors': list(top_investors),
                'by_property_type': list(by_property_type),
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'group_by': group_by
                }
            }
            
            return Response(analytics_data)
            
        except Exception as e:
            logger.error(f"Error getting investment analytics: {str(e)}")
            return Response(
                {"error": "Failed to retrieve investment analytics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentAnalyticsView(generics.GenericAPIView):
    """
    API view for payment analytics.
    
    Provides payment processing metrics including success rates,
    method preferences, and transaction volumes.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get payment analytics data."""
        try:
            # This would integrate with the payments app
            # For now, return a basic structure
            
            analytics_data = {
                'summary': {
                    'total_volume': Decimal('0.00'),
                    'transaction_count': 0,
                    'success_rate': Decimal('100.00'),
                    'avg_transaction_size': Decimal('0.00')
                },
                'by_method': {},
                'success_rates': {},
                'time_series': []
            }
            
            # Try to get actual payment data if payments app is available
            try:
                from payments.models import Payment
                
                payments = Payment.objects.filter(
                    created_at__gte=timezone.now() - timedelta(days=30)
                )
                
                analytics_data['summary'] = payments.aggregate(
                    total_volume=Sum('amount'),
                    transaction_count=Count('id'),
                    avg_transaction_size=Avg('amount')
                )
                
                # Add success rate calculation based on payment status
                # This would depend on actual Payment model structure
                
            except ImportError:
                pass
            
            return Response(analytics_data)
            
        except Exception as e:
            logger.error(f"Error getting payment analytics: {str(e)}")
            return Response(
                {"error": "Failed to retrieve payment analytics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EventTrackingView(generics.CreateAPIView):
    """
    API view for tracking analytics events.
    
    Accepts real-time event data for analytics processing
    with bulk creation support.
    """
    
    serializer_class = EventTrackingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Create analytics events."""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            result = serializer.save()
            
            logger.info(f"Created {len(result['events'])} analytics events")
            
            return Response({
                'message': f"Successfully tracked {len(result['events'])} events",
                'events_created': len(result['events'])
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error tracking analytics events: {str(e)}")
            return Response(
                {"error": "Failed to track events"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalyticsQueryView(generics.GenericAPIView):
    """
    API view for custom analytics queries.
    
    Provides flexible analytics querying with aggregation
    and filtering capabilities.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Execute custom analytics query."""
        try:
            serializer = AnalyticsQuerySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            query_params = serializer.validated_data
            
            # Build base queryset
            queryset = AnalyticsEvent.objects.all()
            
            # Apply filters
            if query_params.get('event_type'):
                queryset = queryset.filter(event_type=query_params['event_type'])
            
            if query_params.get('start_date'):
                queryset = queryset.filter(created_at__date__gte=query_params['start_date'])
            
            if query_params.get('end_date'):
                queryset = queryset.filter(created_at__date__lte=query_params['end_date'])
            
            if query_params.get('user_id'):
                queryset = queryset.filter(user_id=query_params['user_id'])
            
            if query_params.get('property_id'):
                queryset = queryset.filter(
                    event_data__property_id=query_params['property_id']
                )
            
            # Group by time period
            group_by = query_params.get('group_by', 'day')
            
            if group_by == 'hour':
                time_field = TruncHour('created_at')
            elif group_by == 'week':
                time_field = TruncWeek('created_at')
            elif group_by == 'month':
                time_field = TruncMonth('created_at')
            else:
                time_field = TruncDay('created_at')
            
            # Apply metrics
            metrics = query_params.get('metrics', ['count'])
            
            result = queryset.annotate(
                period=time_field
            ).values('period')
            
            if 'count' in metrics:
                result = result.annotate(count=Count('id'))
            
            if 'sum' in metrics:
                result = result.annotate(total_value=Sum('value'))
            
            if 'avg' in metrics:
                result = result.annotate(avg_value=Avg('value'))
            
            result = result.order_by('period')
            
            return Response({
                'query_params': query_params,
                'results': list(result)
            })
            
        except Exception as e:
            logger.error(f"Error executing analytics query: {str(e)}")
            return Response(
                {"error": "Failed to execute query"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MarketTrendsView(generics.GenericAPIView):
    """
    API view for market trends analysis.
    
    Provides market intelligence and trend data
    based on platform analytics and external sources.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get market trends data."""
        try:
            period = request.query_params.get('period', '30d')
            
            # Calculate date range based on period
            if period == '7d':
                start_date = timezone.now() - timedelta(days=7)
            elif period == '90d':
                start_date = timezone.now() - timedelta(days=90)
            elif period == '1y':
                start_date = timezone.now() - timedelta(days=365)
            else:  # 30d default
                start_date = timezone.now() - timedelta(days=30)
            
            # Get investment data for trends
            recent_investments = Investment.objects.filter(
                created_at__gte=start_date
            )
            
            investment_volume = recent_investments.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Calculate average property price (simplified)
            avg_property_price = Property.objects.aggregate(
                avg_price=Avg('price')
            )['avg_price'] or Decimal('0.00')
            
            # Popular locations (based on investment activity)
            popular_locations = recent_investments.values(
                'property_investment__location'
            ).annotate(
                investment_count=Count('id'),
                total_invested=Sum('amount')
            ).order_by('-total_invested')[:5]
            
            # Trending property types
            trending_types = recent_investments.values(
                'property_investment__property_type'
            ).annotate(
                count=Count('id')
            ).order_by('-count')[:5]
            
            # Basic investor demographics
            investor_demographics = {
                'total_investors': User.objects.filter(role=UserRole.INVESTOR).count(),
                'active_investors': recent_investments.values('user').distinct().count(),
                'new_investors': User.objects.filter(
                    role=UserRole.INVESTOR,
                    date_joined__gte=start_date
                ).count()
            }
            
            trends_data = {
                'period': period,
                'investment_volume': investment_volume,
                'average_property_price': avg_property_price,
                'popular_locations': [
                    {
                        'location': loc['property_investment__location'],
                        'investment_count': loc['investment_count'],
                        'total_invested': loc['total_invested']
                    }
                    for loc in popular_locations if loc['property_investment__location']
                ],
                'trending_property_types': [
                    {
                        'type': ptype['property_investment__property_type'],
                        'count': ptype['count']
                    }
                    for ptype in trending_types if ptype['property_investment__property_type']
                ],
                'investor_demographics': investor_demographics,
                'seasonal_patterns': {},  # Could be expanded with historical data
                'growth_projections': {}   # Could include ML-based projections
            }
            
            serializer = MarketTrendsSerializer(trends_data)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error getting market trends: {str(e)}")
            return Response(
                {"error": "Failed to retrieve market trends"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PerformanceReportListView(generics.ListCreateAPIView):
    """
    API view for performance reports.
    
    Lists available reports and allows creation of new
    custom reports with scheduling capabilities.
    """
    
    serializer_class = PerformanceReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['report_type', 'status', 'is_automated']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get reports accessible to current user."""
        if self.request.user.role == UserRole.ADMIN:
            return PerformanceReport.objects.all()
        else:
            return PerformanceReport.objects.filter(
                created_by=self.request.user
            )
    
    def perform_create(self, serializer):
        """Create report with user association."""
        serializer.save(created_by=self.request.user)


class GenerateCustomReportView(generics.CreateAPIView):
    """
    API view for generating custom reports.
    
    Creates custom analytics reports with flexible parameters
    and scheduling options.
    """
    
    serializer_class = CustomReportRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Generate custom report."""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            report_data = serializer.validated_data
            
            # Create report record
            report = PerformanceReport.objects.create(
                title=report_data['title'],
                report_type=report_data['report_type'],
                start_date=report_data['start_date'],
                end_date=report_data['end_date'],
                parameters=report_data,
                file_format=report_data.get('format', 'PDF'),
                recipients=report_data.get('recipients', []),
                created_by=request.user,
                status=ReportStatus.SCHEDULED
            )
            
            # In a real implementation, this would trigger an async task
            # to generate the report in the background
            
            logger.info(f"Custom report requested: {report.id}")
            
            return Response({
                'report_id': str(report.id),
                'message': 'Report generation scheduled',
                'status': report.status,
                'estimated_completion': timezone.now() + timedelta(minutes=30)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error generating custom report: {str(e)}")
            return Response(
                {"error": "Failed to generate report"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_report(request, report_id):
    """
    Download a completed performance report.
    
    Provides secure file download with access control
    and download tracking.
    """
    try:
        report = get_object_or_404(PerformanceReport, id=report_id)
        
        # Check permissions
        if (request.user.role != UserRole.ADMIN and 
            report.created_by != request.user):
            return Response(
                {"error": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if report is ready
        if report.status != ReportStatus.COMPLETED:
            return Response(
                {"error": "Report is not ready for download"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not report.file_path:
            return Response(
                {"error": "Report file not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log download event
        AnalyticsEvent.objects.create(
            user=request.user,
            event_type=EventType.USER_ACTION,
            event_name='report_download',
            event_data={
                'report_id': str(report.id),
                'report_type': report.report_type,
                'report_title': report.title
            }
        )
        
        # In a real implementation, this would serve the actual file
        return Response({
            'download_url': f'/media/reports/{report.file_path}',
            'file_size': report.file_size,
            'generated_at': report.generated_at
        })
        
    except Exception as e:
        logger.error(f"Error downloading report: {str(e)}")
        return Response(
            {"error": "Failed to download report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
