"""
Property Views for Capimax Real Estate Tokenization Platform.

This module contains API views for property management including CRUD operations,
filtering, searching, analytics, and file uploads.
"""

from django.shortcuts import get_object_or_404
from django.db import models, transaction
from django.db.models import Q, F, Sum, Avg, Count, Max, Min
from django.utils import timezone
from django.core.files.base import ContentFile
from django.http import Http404
from rest_framework import generics, status, permissions, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, Any, List
import logging

from core.permissions import IsOwnerOrReadOnly, AdminOrReadOnly
from core.utils import get_client_ip, CustomPagination
from core.services.email_service import EmailService
from .models import (
    Property, PropertyImage, PropertyDocument, PropertyUpdate,
    PropertySubscription, PropertyReview, PropertyValuation,
    PropertyAnalytics, PropertyViewLog, PropertyApproval,
    PropertyMarketData, PropertyStatus, PropertyType, InstallmentPayment,
    RentalIncomeDistribution
)
from .serializers import (
    PropertyListSerializer, PropertyDetailSerializer,
    PropertyCreateUpdateSerializer, PropertyImageSerializer,
    PropertyDocumentSerializer, PropertyDocumentListSerializer,
    PropertyUpdateSerializer,
    PropertySubscriptionSerializer, PropertyReviewSerializer,
    PropertyValuationSerializer, PropertyAnalyticsSerializer,
    PropertySearchSerializer, InstallmentPaymentSerializer,
    InstallmentPaymentCreateSerializer, InstallmentPaymentUpdateSerializer,
    RentalIncomeDistributionSerializer, RentalIncomeDistributionDetailSerializer
)
from investments.models import Investment

logger = logging.getLogger(__name__)


class PropertyFilterBackend(DjangoFilterBackend):
    """Custom filter backend for properties with advanced filtering."""
    
    def filter_queryset(self, request, queryset, view):
        """Apply custom filters to the property queryset."""
        # Basic filtering
        queryset = super().filter_queryset(request, queryset, view)
        
        # Search functionality
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(city__icontains=search) |
                Q(address__icontains=search)
            )
        
        # Property type filtering
        property_types = request.query_params.getlist('property_type')
        if property_types:
            queryset = queryset.filter(property_type__in=property_types)
        
        # Status filtering
        statuses = request.query_params.getlist('status')
        if statuses:
            queryset = queryset.filter(status__in=statuses)
        
        # Price range filtering
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(total_value__gte=Decimal(min_price))
        if max_price:
            queryset = queryset.filter(total_value__lte=Decimal(max_price))
        
        # Token price range
        min_token_price = request.query_params.get('min_token_price')
        max_token_price = request.query_params.get('max_token_price')
        if min_token_price:
            queryset = queryset.filter(token_price__gte=Decimal(min_token_price))
        if max_token_price:
            queryset = queryset.filter(token_price__lte=Decimal(max_token_price))
        
        # Return range filtering
        min_return = request.query_params.get('min_return')
        max_return = request.query_params.get('max_return')
        if min_return:
            queryset = queryset.filter(expected_return__gte=Decimal(min_return))
        if max_return:
            queryset = queryset.filter(expected_return__lte=Decimal(max_return))
        
        # Location filtering
        city = request.query_params.get('city')
        country = request.query_params.get('country')
        if city:
            queryset = queryset.filter(city__icontains=city)
        if country:
            queryset = queryset.filter(country__icontains=country)
        
        # Featured properties
        featured = request.query_params.get('featured')
        if featured and featured.lower() in ['true', '1']:
            queryset = queryset.filter(featured=True)
        
        # Available tokens filter
        available_tokens = request.query_params.get('available_tokens')
        if available_tokens and available_tokens.lower() in ['true', '1']:
            queryset = queryset.filter(tokens_sold__lt=F('total_tokens'))
        
        # Funding percentage range
        min_funding = request.query_params.get('min_funding_percentage')
        max_funding = request.query_params.get('max_funding_percentage')
        if min_funding or max_funding:
            # Annotate with funding percentage
            queryset = queryset.annotate(
                funding_percentage_calc=models.Case(
                    models.When(total_tokens=0, then=0),
                    default=(F('tokens_sold') * 100.0 / F('total_tokens')),
                    output_field=models.DecimalField(max_digits=5, decimal_places=2)
                )
            )
            if min_funding:
                queryset = queryset.filter(funding_percentage_calc__gte=Decimal(min_funding))
            if max_funding:
                queryset = queryset.filter(funding_percentage_calc__lte=Decimal(max_funding))
        
        return queryset


class PropertyViewSet(ModelViewSet):
    """
    ViewSet for property CRUD operations with advanced filtering and search.
    
    Provides:
    - List properties with filtering and pagination
    - Retrieve property details with all related data
    - Create new properties (authenticated users)
    - Update properties (owners and admins)
    - Delete properties (owners and admins)
    - Special actions for analytics, subscriptions, etc.
    """
    
    queryset = Property.objects.all().select_related('owner').prefetch_related(
        'images', 'documents', 'updates', 'reviews', 'valuations',
        'construction_milestones', 'analytics'
    )
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filter_backends = [PropertyFilterBackend, filters.OrderingFilter]
    ordering_fields = [
        'created_at', 'updated_at', 'total_value', 'token_price',
        'expected_return', 'rental_yield', 'funding_percentage', 'title'
    ]
    ordering = ['-created_at']
    pagination_class = CustomPagination
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return PropertyListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PropertyCreateUpdateSerializer
        else:
            return PropertyDetailSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        queryset = super().get_queryset()
        user = self.request.user
        
        if self.action == 'list':
            # For listing, only show approved and active properties to non-owners
            if user.is_authenticated and (user.is_staff or user.is_superuser):
                return queryset  # Admins see all properties
            elif user.is_authenticated:
                # Authenticated users see their own properties plus public ones
                return queryset.filter(
                    Q(owner=user) |
                    Q(status__in=[PropertyStatus.APPROVED, PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED])
                )
            else:
                # Anonymous users only see public properties
                return queryset.filter(
                    status__in=[PropertyStatus.APPROVED, PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED]
                )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new property."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            property_obj = serializer.save()

            # Create analytics record
            PropertyAnalytics.objects.create(property=property_obj)

            # Create approval record
            PropertyApproval.objects.create(
                property=property_obj,
                status='pending'
            )

            # Send property submission email to the property owner
            try:
                property_details = {
                    'title': property_obj.title,
                    'location': property_obj.location,
                    'property_type': property_obj.property_type,
                    'estimated_value': str(property_obj.total_value),
                    'square_footage': str(property_obj.square_footage) if property_obj.square_footage else 'N/A',
                    'expected_yield': f"{property_obj.expected_return}%" if property_obj.expected_return else 'N/A',
                    'submission_id': str(property_obj.id),
                    'id': property_obj.id
                }

                EmailService.send_property_submission_email(
                    user=property_obj.owner,
                    property_details=property_details
                )
                logger.info(f"Property submission email sent for property {property_obj.id}")
            except Exception as e:
                logger.error(f"Failed to send property submission email for property {property_obj.id}: {str(e)}")
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            PropertyDetailSerializer(property_obj, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve property details and log the view."""
        property_obj = self.get_object()
        
        # Log the view for analytics
        self._log_property_view(request, property_obj)
        
        serializer = self.get_serializer(property_obj)
        return Response(serializer.data)
    
    def _log_property_view(self, request, property_obj):
        """Log property view for analytics."""
        try:
            PropertyViewLog.objects.create(
                property=property_obj,
                user=request.user if request.user.is_authenticated else None,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referrer=request.META.get('HTTP_REFERER', ''),
                session_key=request.session.session_key or ''
            )
            
            # Update analytics
            analytics, _ = PropertyAnalytics.objects.get_or_create(property=property_obj)
            analytics.total_views = F('total_views') + 1
            analytics.save(update_fields=['total_views'])
            
        except Exception as e:
            logger.warning(f"Failed to log property view: {e}")
    
    @swagger_auto_schema(
        method='post',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'subscribe': openapi.Schema(type=openapi.TYPE_BOOLEAN)
            }
        )
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def subscribe(self, request, pk=None):
        """Subscribe or unsubscribe from property updates."""
        property_obj = self.get_object()
        subscribe = request.data.get('subscribe', True)
        
        if subscribe:
            subscription, created = PropertySubscription.objects.get_or_create(
                user=request.user,
                property=property_obj
            )
            if created:
                # Update analytics
                analytics, _ = PropertyAnalytics.objects.get_or_create(property=property_obj)
                analytics.total_subscriptions = F('total_subscriptions') + 1
                analytics.save(update_fields=['total_subscriptions'])
            
            return Response({
                'message': 'Successfully subscribed to property updates',
                'subscribed': True
            })
        else:
            deleted_count = PropertySubscription.objects.filter(
                user=request.user,
                property=property_obj
            ).delete()[0]
            
            if deleted_count > 0:
                # Update analytics
                analytics, _ = PropertyAnalytics.objects.get_or_create(property=property_obj)
                analytics.total_subscriptions = F('total_subscriptions') - 1
                analytics.save(update_fields=['total_subscriptions'])
            
            return Response({
                'message': 'Successfully unsubscribed from property updates',
                'subscribed': False
            })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get property analytics and performance data."""
        property_obj = self.get_object()
        
        # Check permissions
        if not (request.user == property_obj.owner or request.user.is_staff):
            return Response(
                {'detail': 'You do not have permission to view analytics for this property.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        analytics_data = self._generate_property_analytics(property_obj)
        serializer = PropertyAnalyticsSerializer(analytics_data)
        return Response(serializer.data)
    
    def _generate_property_analytics(self, property_obj) -> Dict[str, Any]:
        """Generate comprehensive analytics for a property."""
        # Investment analytics
        investments = Investment.objects.filter(
            property_investment=property_obj,
            status='completed'
        )

        total_investment = investments.aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0.00')

        investor_count = investments.values('user').distinct().count()

        average_investment = investments.aggregate(
            avg=Avg('investment_amount')
        )['avg'] or Decimal('0.00')
        
        # Funding velocity (tokens sold per day)
        if property_obj.created_at:
            days_since_creation = (timezone.now() - property_obj.created_at).days or 1
            funding_velocity = property_obj.tokens_sold / days_since_creation
        else:
            funding_velocity = 0
        
        # Get analytics record
        analytics, _ = PropertyAnalytics.objects.get_or_create(property=property_obj)
        
        # Monthly investment data
        monthly_data = self._get_monthly_investment_data(property_obj)
        
        # Investor demographics
        demographics = self._get_investor_demographics(investments)
        
        # Performance metrics
        performance_metrics = self._get_performance_metrics(property_obj)
        
        # Construction progress
        construction_progress = None
        milestones = property_obj.construction_milestones.all()
        if milestones.exists():
            total_progress = sum(
                milestone.progress_percentage for milestone in milestones
            )
            construction_progress = total_progress / milestones.count()
        
        # ROI projection
        roi_projection = None
        if property_obj.expected_return and property_obj.rental_yield:
            roi_projection = (property_obj.expected_return + property_obj.rental_yield) / 2
        
        return {
            'total_investment': total_investment,
            'investor_count': investor_count,
            'average_investment': average_investment,
            'funding_velocity': Decimal(str(funding_velocity)),
            'views_count': analytics.total_views,
            'subscriptions_count': analytics.total_subscriptions,
            'construction_progress': construction_progress,
            'roi_projection': roi_projection,
            'monthly_investment_data': monthly_data,
            'investor_demographics': demographics,
            'performance_metrics': performance_metrics
        }
    
    def _get_monthly_investment_data(self, property_obj) -> List[Dict]:
        """Get monthly investment data for the last 12 months."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)
        
        monthly_data = []
        current_date = start_date.replace(day=1)
        
        while current_date <= end_date:
            next_month = current_date + timedelta(days=32)
            next_month = next_month.replace(day=1)
            
            month_investments = Investment.objects.filter(
                property_investment=property_obj,
                status='completed',
                created_at__date__gte=current_date,
                created_at__date__lt=next_month
            ).aggregate(
                total=Sum('investment_amount'),
                count=Count('id')
            )
            
            monthly_data.append({
                'month': current_date.strftime('%Y-%m'),
                'investment_amount': month_investments['total'] or 0,
                'investment_count': month_investments['count'] or 0
            })
            
            current_date = next_month
        
        return monthly_data
    
    def _get_investor_demographics(self, investments) -> Dict[str, Any]:
        """Get investor demographics data."""
        # This is a simplified version - in production you might want more detailed demographics
        investor_countries = investments.select_related('user').values(
            'user__country'
        ).annotate(
            count=Count('user', distinct=True)
        ).order_by('-count')[:5]
        
        return {
            'top_countries': [
                {'country': item['user__country'] or 'Unknown', 'count': item['count']}
                for item in investor_countries
            ],
            'total_investors': investments.values('user').distinct().count()
        }
    
    def _get_performance_metrics(self, property_obj) -> Dict[str, Any]:
        """Get property performance metrics."""
        # Get latest valuation
        latest_valuation = property_obj.valuations.first()
        
        # Calculate appreciation if we have multiple valuations
        appreciation_rate = None
        if property_obj.valuations.count() >= 2:
            oldest_valuation = property_obj.valuations.last()
            if oldest_valuation and latest_valuation:
                time_diff = (latest_valuation.valuation_date - oldest_valuation.valuation_date).days
                if time_diff > 0:
                    value_diff = latest_valuation.current_value - oldest_valuation.current_value
                    appreciation_rate = (value_diff / oldest_valuation.current_value) * 365 / time_diff * 100
        
        return {
            'current_valuation': latest_valuation.current_value if latest_valuation else property_obj.total_value,
            'original_value': property_obj.total_value,
            'appreciation_rate': float(appreciation_rate) if appreciation_rate else None,
            'funding_percentage': float(property_obj.funding_percentage),
            'tokens_sold': property_obj.tokens_sold,
            'tokens_available': property_obj.tokens_available
        }
    
    @action(detail=True, methods=['get'])
    def investors(self, request, pk=None):
        """Get list of property investors."""
        property_obj = self.get_object()
        
        # Check permissions - only owner and admins can see investor list
        if not (request.user == property_obj.owner or request.user.is_staff):
            return Response(
                {'detail': 'You do not have permission to view investors for this property.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        investments = Investment.objects.filter(
            property_investment=property_obj,
            status='completed'
        ).select_related('user').order_by('-created_at')

        investors_data = []
        for investment in investments:
            investors_data.append({
                'investor_id': investment.user.id,
                'investor_email': investment.user.email,
                'investor_name': f"{investment.user.first_name} {investment.user.last_name}".strip(),
                'tokens_owned': investment.token_amount,
                'investment_amount': investment.investment_amount,
                'investment_date': investment.created_at,
                'ownership_percentage': (investment.token_amount / property_obj.total_tokens) * 100
            })
        
        return Response({
            'investors': investors_data,
            'total_investors': len(set(inv['investor_id'] for inv in investors_data)),
            'total_investment': sum(inv['investment_amount'] for inv in investors_data)
        })
    
    @action(detail=True, methods=['get'])
    def investments(self, request, pk=None):
        """Get investment history for the property."""
        property_obj = self.get_object()
        
        investments = Investment.objects.filter(
            property_investment=property_obj,
            status='completed'
        ).select_related('user').order_by('-created_at')

        # Paginate the results
        page = self.paginate_queryset(investments)
        if page is not None:
            investments_data = [
                {
                    'id': inv.id,
                    'investor_email': inv.user.email,
                    'tokens_purchased': inv.token_amount,
                    'amount': inv.investment_amount,
                    'investment_date': inv.created_at,
                    'payment_method': inv.payment_method
                }
                for inv in page
            ]
            return self.get_paginated_response(investments_data)

        investments_data = [
            {
                'id': inv.id,
                'investor_email': inv.user.email,
                'tokens_purchased': inv.token_amount,
                'amount': inv.investment_amount,
                'investment_date': inv.created_at,
                'payment_method': inv.payment_method
            }
            for inv in investments
        ]
        
        return Response(investments_data)
    
    @swagger_auto_schema(
        method='post',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=[],
            properties={}
        )
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        """Submit property for approval."""
        property_obj = self.get_object()
        
        # Check if user is the owner
        if request.user != property_obj.owner:
            return Response(
                {'detail': 'Only property owner can submit for approval.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if property is in draft status
        if property_obj.status != PropertyStatus.DRAFT:
            return Response(
                {'detail': 'Only draft properties can be submitted for approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update property status
        property_obj.status = PropertyStatus.PENDING_APPROVAL
        property_obj.save(update_fields=['status'])
        
        # Update approval record
        approval, _ = PropertyApproval.objects.get_or_create(property=property_obj)
        approval.status = 'pending'
        approval.submitted_at = timezone.now()
        approval.save(update_fields=['status', 'submitted_at'])
        
        return Response({
            'message': 'Property submitted for approval successfully',
            'status': property_obj.status
        })
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured properties."""
        featured_properties = self.get_queryset().filter(
            featured=True,
            status__in=[PropertyStatus.APPROVED, PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED]
        ).order_by('-created_at')[:10]
        
        serializer = PropertyListSerializer(
            featured_properties, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Get trending properties based on recent activity."""
        # Properties with most recent investments or views
        trending_properties = self.get_queryset().filter(
            status__in=[PropertyStatus.APPROVED, PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED]
        ).annotate(
            recent_investments=Count(
                'investments',
                filter=Q(investments__created_at__gte=timezone.now() - timedelta(days=7))
            ),
            recent_views=Count(
                'view_logs',
                filter=Q(view_logs__viewed_at__gte=timezone.now() - timedelta(days=7))
            )
        ).order_by('-recent_investments', '-recent_views')[:10]
        
        serializer = PropertyListSerializer(
            trending_properties, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)


class PropertyImageUploadView(APIView):
    """
    Upload images for a property.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'property_id',
                openapi.IN_PATH,
                description="Property ID",
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['image'],
            properties={
                'image': openapi.Schema(type=openapi.TYPE_FILE),
                'caption': openapi.Schema(type=openapi.TYPE_STRING),
                'is_primary': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'order': openapi.Schema(type=openapi.TYPE_INTEGER)
            }
        )
    )
    def post(self, request, property_id):
        """Upload an image for the property."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not (request.user == property_obj.owner or request.user.is_staff):
            return Response(
                {'detail': 'You do not have permission to upload images for this property.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # If this is set as primary, unset other primary images
        is_primary = request.data.get('is_primary', False)
        if is_primary:
            PropertyImage.objects.filter(property=property_obj, is_primary=True).update(
                is_primary=False
            )
        
        # Create the image record
        image_data = {
            'image': request.FILES.get('image'),
            'caption': request.data.get('caption', ''),
            'is_primary': is_primary,
            'order': request.data.get('order', 0)
        }
        
        serializer = PropertyImageSerializer(data=image_data, context={'request': request})
        if serializer.is_valid():
            image = serializer.save(property=property_obj)
            return Response(
                PropertyImageSerializer(image, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PropertyDocumentUploadView(APIView):
    """
    Upload documents for a property.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'property_id',
                openapi.IN_PATH,
                description="Property ID",
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['document', 'name', 'document_type'],
            properties={
                'document': openapi.Schema(type=openapi.TYPE_FILE),
                'name': openapi.Schema(type=openapi.TYPE_STRING),
                'document_type': openapi.Schema(type=openapi.TYPE_STRING),
                'description': openapi.Schema(type=openapi.TYPE_STRING)
            }
        )
    )
    def post(self, request, property_id):
        """Upload a document for the property."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not (request.user == property_obj.owner or request.user.is_staff):
            return Response(
                {'detail': 'You do not have permission to upload documents for this property.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get file and calculate size
        document_file = request.FILES.get('document')
        if not document_file:
            return Response(
                {'detail': 'Document file is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document_data = {
            'document': document_file,
            'name': request.data.get('name'),
            'document_type': request.data.get('document_type'),
            'description': request.data.get('description', ''),
            'size': document_file.size
        }
        
        serializer = PropertyDocumentSerializer(data=document_data, context={'request': request})
        if serializer.is_valid():
            document = serializer.save(property=property_obj)
            return Response(
                PropertyDocumentSerializer(document, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PropertyReviewCreateView(generics.CreateAPIView):
    """
    Create a review for a property.
    """
    
    serializer_class = PropertyReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create a review for the property by the current user."""
        property_id = self.kwargs['property_id']
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            raise Http404("Property not found")
        
        # Check if user already reviewed this property
        if PropertyReview.objects.filter(
            property=property_obj,
            user=self.request.user
        ).exists():
            raise serializers.ValidationError(
                "You have already reviewed this property."
            )
        
        serializer.save(property=property_obj, user=self.request.user)


class PropertyUpdateCreateView(generics.CreateAPIView):
    """
    Create an update for a property (property owners only).
    """
    
    serializer_class = PropertyUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create an update for the property."""
        property_id = self.kwargs['property_id']
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            raise Http404("Property not found")
        
        # Check if user is the owner or admin
        if not (self.request.user == property_obj.owner or self.request.user.is_staff):
            raise permissions.PermissionDenied(
                "Only property owner or admin can create updates."
            )
        
        serializer.save(property=property_obj)


class PropertyValuationCreateView(generics.CreateAPIView):
    """
    Create a valuation for a property (property owners and admins only).
    """
    
    serializer_class = PropertyValuationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def perform_create(self, serializer):
        """Create a valuation for the property."""
        property_id = self.kwargs['property_id']
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            raise Http404("Property not found")
        
        # Check if user is the owner or admin
        if not (self.request.user == property_obj.owner or self.request.user.is_staff):
            raise permissions.PermissionDenied(
                "Only property owner or admin can create valuations."
            )
        
        serializer.save(property=property_obj)


class PropertyApprovalView(APIView):
    """
    Admin-only view for approving or rejecting properties.
    """
    
    permission_classes = [permissions.IsAdminUser]
    
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'property_id',
                openapi.IN_PATH,
                description="Property ID",
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['action'],
            properties={
                'action': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=['approve', 'reject', 'request_changes']
                ),
                'review_notes': openapi.Schema(type=openapi.TYPE_STRING),
                'required_changes': openapi.Schema(type=openapi.TYPE_STRING)
            }
        )
    )
    def post(self, request, property_id):
        """Approve, reject, or request changes for a property."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action')
        review_notes = request.data.get('review_notes', '')
        required_changes = request.data.get('required_changes', '')
        
        if action not in ['approve', 'reject', 'request_changes']:
            return Response(
                {'detail': 'Invalid action. Must be approve, reject, or request_changes.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create approval record
        approval, _ = PropertyApproval.objects.get_or_create(property=property_obj)
        approval.reviewer = request.user
        approval.review_notes = review_notes
        approval.reviewed_at = timezone.now()
        
        with transaction.atomic():
            if action == 'approve':
                property_obj.status = PropertyStatus.APPROVED
                approval.status = 'approved'
                approval.approved_at = timezone.now()
                
            elif action == 'reject':
                property_obj.status = PropertyStatus.DELISTED
                approval.status = 'rejected'
                
            elif action == 'request_changes':
                property_obj.status = PropertyStatus.DRAFT
                approval.status = 'requires_changes'
                approval.required_changes = required_changes
            
            property_obj.save(update_fields=['status'])
            approval.save()
        
        return Response({
            'message': f'Property {action}d successfully',
            'status': property_obj.status,
            'approval_status': approval.status
        })


class PropertySearchView(generics.ListAPIView):
    """
    Advanced property search with multiple filters and full-text search.
    """
    
    serializer_class = PropertyListSerializer
    pagination_class = CustomPagination
    filter_backends = [PropertyFilterBackend, filters.OrderingFilter]
    ordering_fields = [
        'created_at', 'updated_at', 'total_value', 'token_price',
        'expected_return', 'rental_yield', 'title'
    ]
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get properties based on search filters."""
        queryset = Property.objects.filter(
            status__in=[PropertyStatus.APPROVED, PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED]
        ).select_related('owner').prefetch_related('images', 'reviews')
        
        return queryset
    
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('search', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('property_type', openapi.IN_QUERY, type=openapi.TYPE_ARRAY, items=openapi.Items(type=openapi.TYPE_STRING)),
            openapi.Parameter('min_price', openapi.IN_QUERY, type=openapi.TYPE_NUMBER),
            openapi.Parameter('max_price', openapi.IN_QUERY, type=openapi.TYPE_NUMBER),
            openapi.Parameter('min_return', openapi.IN_QUERY, type=openapi.TYPE_NUMBER),
            openapi.Parameter('max_return', openapi.IN_QUERY, type=openapi.TYPE_NUMBER),
            openapi.Parameter('city', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('country', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('featured', openapi.IN_QUERY, type=openapi.TYPE_BOOLEAN),
            openapi.Parameter('available_tokens', openapi.IN_QUERY, type=openapi.TYPE_BOOLEAN),
        ]
    )
    def get(self, request, *args, **kwargs):
        """Search properties with advanced filters."""
        return super().get(request, *args, **kwargs)


class PropertyAnalyticsView(APIView):
    """
    API endpoint for property-specific analytics and performance metrics.
    
    Provides detailed analytics for a specific property including
    performance metrics, investor data, and market comparison.
    """
    
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get(self, request, property_id):
        """Get analytics for a specific property."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'error': 'Property not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get property investments
        investments = Investment.objects.filter(
            property_investment=property_obj,
            status='completed'
        )
        
        # Calculate metrics
        total_invested = investments.aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0.00')
        
        # Current property value (use latest valuation or original value)
        current_value = property_obj.total_value
        latest_valuation = property_obj.valuations.first()
        if latest_valuation:
            current_value = latest_valuation.current_value
        
        appreciation = current_value - property_obj.total_value
        appreciation_percentage = (appreciation / property_obj.total_value * 100) if property_obj.total_value > 0 else Decimal('0.00')
        
        # Investment stats
        total_investors = investments.values('user').distinct().count()
        average_investment = investments.aggregate(
            avg=Avg('investment_amount')
        )['avg'] or Decimal('0.00')
        
        # Dividend data
        from investments.models import DividendPayment
        dividends = DividendPayment.objects.filter(
            investment__property_investment=property_obj,
            status='paid'
        )
        total_dividends = dividends.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        dividend_yield = Decimal('0.00')
        if total_invested > 0:
            dividend_yield = (total_dividends / total_invested * 100)
        
        # Performance timeline (mock data for now)
        performance_timeline = []
        base_date = timezone.now() - timedelta(days=365)
        for i in range(12):  # Monthly data for past year
            month_date = base_date + timedelta(days=30 * i)
            # Mock appreciation over time
            month_value = property_obj.total_value * (1 + (appreciation_percentage / 100) * (i / 12))
            performance_timeline.append({
                'date': month_date.isoformat(),
                'value': float(month_value),
                'appreciation': float(month_value - property_obj.total_value),
                'appreciation_percentage': float((month_value - property_obj.total_value) / property_obj.total_value * 100) if property_obj.total_value > 0 else 0
            })
        
        # Market comparison (simplified)
        market_comparison = {
            'property_roi': float(appreciation_percentage),
            'market_average_roi': 7.5,
            'property_yield': float(dividend_yield),
            'market_average_yield': 5.2,
            'performance_vs_market': 'outperforming' if appreciation_percentage > Decimal('7.5') else 'underperforming'
        }
        
        analytics_data = {
            'property_id': property_obj.id,
            'property_title': property_obj.title,
            'total_invested': total_invested,
            'current_value': current_value,
            'appreciation': appreciation,
            'appreciation_percentage': appreciation_percentage,
            'total_investors': total_investors,
            'total_tokens_sold': property_obj.tokens_sold,
            'funding_percentage': property_obj.funding_percentage,
            'average_investment_size': average_investment,
            'total_dividends_paid': total_dividends,
            'dividend_yield': dividend_yield,
            'last_dividend_date': dividends.first().payment_date if dividends.exists() else None,
            'next_dividend_date': timezone.now() + timedelta(days=90),  # Mock next dividend
            'performance_timeline': performance_timeline,
            'market_comparison': market_comparison,
        }
        
        return Response(analytics_data)


class MarketInsightsView(APIView):
    """
    API endpoint for market insights and trends.
    
    Provides market overview, trending properties, performance metrics,
    and investment opportunities.
    """
    
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get(self, request):
        """Get market insights and trends."""
        # Market overview stats
        total_properties = Property.objects.filter(
            status__in=[PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED, PropertyStatus.SOLD_OUT]
        ).count()
        
        total_market_value = Property.objects.filter(
            status__in=[PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED, PropertyStatus.SOLD_OUT]
        ).aggregate(total=Sum('total_value'))['total'] or Decimal('0.00')
        
        # Count unique investors
        total_investors = Investment.objects.filter(
            status='completed'
        ).values('user').distinct().count()
        
        # Calculate average ROI (simplified)
        average_roi = Property.objects.filter(
            expected_return__isnull=False
        ).aggregate(avg=Avg('expected_return'))['avg'] or Decimal('0.00')
        
        # Trending properties (based on recent views and investments)
        trending_properties = []
        recent_date = timezone.now() - timedelta(days=1)
        
        # Get properties with recent activity
        properties_with_activity = Property.objects.filter(
            status__in=[PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED],
            investments__created_at__gte=recent_date
        ).annotate(
            recent_investments=Count('investments', filter=Q(investments__created_at__gte=recent_date)),
            view_count=Count('view_logs', filter=Q(view_logs__viewed_at__gte=recent_date))
        ).order_by('-recent_investments', '-view_count')[:5]
        
        for i, prop in enumerate(properties_with_activity):
            # Get primary image
            primary_image = prop.images.filter(is_primary=True).first()
            image_url = None
            if primary_image:
                image_url = request.build_absolute_uri(primary_image.image.url)
            
            trending_properties.append({
                'id': prop.id,
                'title': prop.title,
                'property_type': prop.property_type,
                'city': prop.city,
                'country': prop.country,
                'image_url': image_url,
                'token_price': prop.token_price,
                'total_value': prop.total_value,
                'funding_percentage': prop.funding_percentage,
                'expected_return': prop.expected_return,
                'view_count_24h': getattr(prop, 'view_count', 0),
                'investment_count_24h': getattr(prop, 'recent_investments', 0),
                'trending_score': float((getattr(prop, 'recent_investments', 0) * 2) + getattr(prop, 'view_count', 0) * 0.1),
            })
        
        # Market performance (mock data)
        market_performance_30d = Decimal('2.3')  # 2.3% growth in 30 days
        
        # Top performing cities (mock data based on properties)
        city_performance = Property.objects.filter(
            status__in=[PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED]
        ).values('city', 'country').annotate(
            avg_return=Avg('expected_return'),
            property_count=Count('id')
        ).filter(property_count__gte=2).order_by('-avg_return')[:5]
        
        top_performing_cities = []
        for city_data in city_performance:
            top_performing_cities.append({
                'city': city_data['city'],
                'country': city_data['country'],
                'average_return': float(city_data['avg_return'] or 0),
                'property_count': city_data['property_count'],
                'growth_30d': float(Decimal('1.5') + (city_data['property_count'] * Decimal('0.3')))  # Mock growth
            })
        
        # Investment opportunities
        new_listings = Property.objects.filter(
            status=PropertyStatus.ACTIVE,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        fully_funded_properties = Property.objects.filter(
            status=PropertyStatus.SOLD_OUT
        ).count()
        
        # Market alerts (mock data)
        market_alerts = [
            {
                'id': 1,
                'type': 'price_increase',
                'title': 'Property Values Rising in Downtown Area',
                'message': 'Commercial properties in downtown areas have seen a 15% increase this quarter.',
                'date': timezone.now() - timedelta(days=2),
                'severity': 'info'
            },
            {
                'id': 2,
                'type': 'new_opportunity',
                'title': 'New Luxury Residential Project Available',
                'message': 'Premium residential project with expected 12% annual return now accepting investments.',
                'date': timezone.now() - timedelta(days=1),
                'severity': 'success'
            }
        ]
        
        # Price alerts for user (if authenticated)
        price_alerts = []
        if request.user.is_authenticated:
            # Get user's property subscriptions for price alerts
            user_subscriptions = PropertySubscription.objects.filter(user=request.user)[:3]
            for sub in user_subscriptions:
                price_alerts.append({
                    'property_id': sub.property.id,
                    'property_title': sub.property.title,
                    'alert_type': 'price_drop',
                    'message': f'{sub.property.title} token price dropped by 5%',
                    'date': timezone.now() - timedelta(hours=6),
                })
        
        insights_data = {
            'total_properties': total_properties,
            'total_market_value': total_market_value,
            'total_investors': total_investors,
            'average_roi': average_roi,
            'trending_properties': trending_properties,
            'market_performance_30d': market_performance_30d,
            'top_performing_cities': top_performing_cities,
            'new_listings': new_listings,
            'fully_funded_properties': fully_funded_properties,
            'market_alerts': market_alerts,
            'price_alerts': price_alerts,
        }
        
        return Response(insights_data)


class InstallmentPaymentViewSet(ModelViewSet):
    """
    ViewSet for managing installment payment plans.
    
    Provides CRUD operations for installment payments with additional
    actions for payment processing and status management.
    """
    
    serializer_class = InstallmentPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['property_investment', 'status', 'frequency', 'graduated_release']
    ordering_fields = ['created_at', 'next_payment_date', 'completion_percentage', 'total_investment_amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get installment payments for the current user."""
        # Handle schema generation for drf-yasg
        if getattr(self, 'swagger_fake_view', False):
            return InstallmentPayment.objects.none()
        return InstallmentPayment.objects.filter(
            investor=self.request.user
        ).select_related('property_investment', 'investor').order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return InstallmentPaymentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InstallmentPaymentUpdateSerializer
        return InstallmentPaymentSerializer
    
    @swagger_auto_schema(
        operation_description="Create a new installment payment plan",
        request_body=InstallmentPaymentCreateSerializer,
        responses={
            201: InstallmentPaymentSerializer,
            400: "Validation error"
        }
    )
    def create(self, request, *args, **kwargs):
        """Create a new installment payment plan."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if user already has an active installment plan for this property
        property_id = serializer.validated_data['property_investment'].id
        existing_plan = InstallmentPayment.objects.filter(
            investor=request.user,
            property_investment_id=property_id,
            status__in=['pending', 'processing']
        ).first()
        
        if existing_plan:
            return Response(
                {'detail': 'You already have an active installment plan for this property'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        installment_plan = serializer.save()
        response_serializer = InstallmentPaymentSerializer(installment_plan, context={'request': request})
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_description="Get installment payments by property",
        manual_parameters=[
            openapi.Parameter(
                'property_id',
                openapi.IN_PATH,
                description="Property ID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID
            )
        ]
    )
    @action(detail=False, methods=['get'], url_path='by-property/(?P<property_id>[^/.]+)')
    def by_property(self, request, property_id=None):
        """Get all installment payments for a specific property."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        installments = self.get_queryset().filter(property=property_obj)
        page = self.paginate_queryset(installments)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(installments, many=True)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_description="Process a payment for an installment plan",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['amount', 'payment_method'],
            properties={
                'amount': openapi.Schema(
                    type=openapi.TYPE_NUMBER,
                    description="Payment amount"
                ),
                'payment_method': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Payment method used"
                ),
                'transaction_id': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="External transaction ID"
                )
            }
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'message': openapi.Schema(type=openapi.TYPE_STRING),
                    'tokens_released': openapi.Schema(type=openapi.TYPE_NUMBER),
                    'payment_number': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'remaining_payments': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'completion_percentage': openapi.Schema(type=openapi.TYPE_NUMBER)
                }
            ),
            400: "Payment error"
        }
    )
    @action(detail=True, methods=['post'], url_path='process-payment')
    def process_payment(self, request, pk=None):
        """Process a payment for the installment plan."""
        installment = self.get_object()
        
        # Validate that the user owns this installment plan
        if installment.investor != request.user:
            return Response(
                {'detail': 'You can only process payments for your own installment plans'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        transaction_id = request.data.get('transaction_id')
        
        if not amount or not payment_method:
            return Response(
                {'detail': 'Amount and payment method are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process the payment
        success, message, tokens_released = installment.process_payment(amount)
        
        if success:
            # Log the payment processing
            logger.info(
                f"Payment processed for installment {installment.id}: "
                f"${amount} by user {request.user.id}, "
                f"tokens released: {tokens_released}"
            )
            
            return Response({
                'success': True,
                'message': message,
                'tokens_released': float(tokens_released),
                'payment_number': installment.payments_made,
                'remaining_payments': installment.remaining_payments,
                'completion_percentage': float(installment.completion_percentage),
                'transaction_id': transaction_id
            })
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_description="Calculate payment schedule for an installment plan"
    )
    @action(detail=True, methods=['get'], url_path='payment-schedule')
    def payment_schedule(self, request, pk=None):
        """Get the complete payment schedule for the installment plan."""
        installment = self.get_object()
        
        # Validate that the user owns this installment plan
        if installment.investor != request.user:
            return Response(
                {'detail': 'You can only view schedules for your own installment plans'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        schedule = []
        current_date = installment.next_payment_date
        
        for payment_num in range(installment.payments_made + 1, installment.total_installments + 1):
            tokens_for_payment = float(installment.tokens_per_payment) if installment.graduated_release else 0
            if payment_num == installment.total_installments and not installment.graduated_release:
                tokens_for_payment = float(installment.tokens_pending_release)
            
            schedule.append({
                'payment_number': payment_num,
                'due_date': current_date,
                'amount': float(installment.installment_amount),
                'tokens_to_release': tokens_for_payment,
                'status': 'pending'
            })
            
            current_date = installment.calculate_next_payment_date(current_date)
        
        return Response({
            'installment_id': str(installment.id),
            'total_payments': installment.total_installments,
            'payments_completed': installment.payments_made,
            'remaining_payments': installment.remaining_payments,
            'schedule': schedule
        })
    
    @swagger_auto_schema(
        operation_description="Cancel an installment payment plan"
    )
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancel an installment payment plan."""
        installment = self.get_object()
        
        # Validate that the user owns this installment plan
        if installment.investor != request.user:
            return Response(
                {'detail': 'You can only cancel your own installment plans'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if plan can be cancelled
        if installment.status in ['completed', 'cancelled', 'refunded']:
            return Response(
                {'detail': f'Cannot cancel installment plan with status: {installment.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status to cancelled
        installment.status = 'cancelled'
        installment.save()
        
        # Log the cancellation
        logger.info(
            f"Installment plan {installment.id} cancelled by user {request.user.id}"
        )
        
        return Response({
            'success': True,
            'message': 'Installment plan cancelled successfully'
        })
    
    @swagger_auto_schema(
        operation_description="Get installment payment statistics"
    )
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """Get installment payment statistics for the current user."""
        installments = self.get_queryset()
        
        total_plans = installments.count()
        active_plans = installments.filter(status__in=['pending', 'processing']).count()
        completed_plans = installments.filter(status='completed').count()
        total_invested = installments.aggregate(
            total=Sum('total_amount_paid')
        )['total'] or Decimal('0.00')
        total_tokens_owned = installments.aggregate(
            tokens=Sum('tokens_released')
        )['tokens'] or 0
        
        # Calculate average completion percentage
        avg_completion = installments.aggregate(
            avg=Avg('payments_made') * 100 / Avg('total_installments')
        )
        avg_completion_percentage = avg_completion['avg'] or 0
        
        return Response({
            'total_installment_plans': total_plans,
            'active_plans': active_plans,
            'completed_plans': completed_plans,
            'total_amount_invested': float(total_invested),
            'total_tokens_owned_via_installments': total_tokens_owned,
            'average_completion_percentage': float(avg_completion_percentage),
            'cancelled_plans': installments.filter(status='cancelled').count(),
            'properties_with_installments': installments.values('property').distinct().count()
        })


class RentalIncomeDistributionViewSet(ModelViewSet):
    """
    ViewSet for managing rental income distributions.
    
    Provides read-only access to rental income distributions with
    filtering, searching, and detailed analytics.
    """
    
    serializer_class = RentalIncomeDistributionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['property', 'distribution_period']
    ordering_fields = ['distribution_date', 'total_rental_income', 'net_distribution_amount']
    ordering = ['-distribution_date']
    
    def get_queryset(self):
        """Get rental distributions for properties the user has invested in."""
        # Handle schema generation for drf-yasg
        if getattr(self, 'swagger_fake_view', False):
            return RentalIncomeDistribution.objects.none()

        from investments.models import Investment

        # Get all properties the user has invested in
        user_property_investments = Investment.objects.filter(
            user=self.request.user,
            status='active',
            investment_amount__gt=0  # Changed from token_count__gt=0 as token_count doesn't exist
        ).values_list('property_id', flat=True)

        return RentalIncomeDistribution.objects.filter(
            property_id__in=user_property_investments
        ).select_related('property').order_by('-distribution_date')
    
    @swagger_auto_schema(
        operation_description="Get rental income distributions by property"
    )
    @action(detail=False, methods=['get'], url_path='by-property/(?P<property_id>[^/.]+)')
    def by_property(self, request, property_id=None):
        """Get all rental income distributions for a specific property."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has investment in this property
        from investments.models import Investment
        user_investment = Investment.objects.filter(
            user=request.user,
            property=property_obj,
            status='active'
        ).first()
        
        if not user_investment and not request.user.is_staff:
            return Response(
                {'detail': 'You can only view distributions for properties you have invested in'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        distributions = RentalIncomeDistribution.objects.filter(
            property=property_obj
        ).order_by('-distribution_date')
        
        page = self.paginate_queryset(distributions)
        if page is not None:
            # Calculate user-specific amounts if they have an investment
            distribution_data = []
            for distribution in page:
                user_amount = Decimal('0.00')
                user_tokens = 0
                if user_investment:
                    user_tokens = user_investment.token_count
                    user_amount = distribution.amount_per_token * Decimal(user_tokens)
                
                distribution_data.append({
                    'id': str(distribution.id),
                    'property_id': str(distribution.property.id),
                    'property_title': distribution.property.title,
                    'distribution_period': distribution.distribution_period,
                    'distribution_date': distribution.distribution_date,
                    'total_rental_income': distribution.total_rental_income,
                    'platform_fee': distribution.platform_fee,
                    'net_distribution_amount': distribution.net_distribution_amount,
                    'tokens_eligible': distribution.tokens_eligible,
                    'amount_per_token': distribution.amount_per_token,
                    'user_token_count': user_tokens,
                    'user_distribution_amount': user_amount,
                    'notes': distribution.notes
                })
            
            return self.get_paginated_response(distribution_data)
        
        return Response([])
    
    @swagger_auto_schema(
        operation_description="Get rental income statistics for user"
    )
    @action(detail=False, methods=['get'], url_path='user-statistics')
    def user_statistics(self, request):
        """Get rental income statistics for the current user."""
        from investments.models import Investment
        from payments.models import WalletTransaction
        
        # Get user's active investments
        user_investments = Investment.objects.filter(
            user=request.user,
            status='active',
            token_count__gt=0
        ).select_related('property')
        
        if not user_investments.exists():
            return Response({
                'total_properties_with_rental_income': 0,
                'total_tokens_earning_income': 0,
                'total_rental_income_received': '0.00',
                'average_monthly_income': '0.00',
                'properties': []
            })
        
        # Get all rental distributions for user's properties
        property_ids = [inv.property.id for inv in user_investments]
        distributions = RentalIncomeDistribution.objects.filter(
            property_id__in=property_ids
        ).order_by('-distribution_date')
        
        # Calculate total rental income received
        total_received = Decimal('0.00')
        monthly_incomes = []
        property_stats = {}
        
        for distribution in distributions:
            # Find user's investment for this property
            user_investment = next(
                (inv for inv in user_investments if inv.property.id == distribution.property.id),
                None
            )
            
            if user_investment:
                user_amount = distribution.amount_per_token * Decimal(user_investment.token_count)
                total_received += user_amount
                monthly_incomes.append(user_amount)
                
                # Track per-property stats
                prop_id = str(distribution.property.id)
                if prop_id not in property_stats:
                    property_stats[prop_id] = {
                        'property_title': distribution.property.title,
                        'token_count': user_investment.token_count,
                        'total_received': Decimal('0.00'),
                        'distribution_count': 0,
                        'last_distribution': None
                    }
                
                property_stats[prop_id]['total_received'] += user_amount
                property_stats[prop_id]['distribution_count'] += 1
                if not property_stats[prop_id]['last_distribution'] or distribution.distribution_date > property_stats[prop_id]['last_distribution']:
                    property_stats[prop_id]['last_distribution'] = distribution.distribution_date
        
        # Calculate averages
        avg_monthly = total_received / Decimal(len(monthly_incomes)) if monthly_incomes else Decimal('0.00')
        total_tokens = sum(inv.token_count for inv in user_investments)
        
        return Response({
            'total_properties_with_rental_income': len([p for p in user_investments if p.property.rental_income_active]),
            'total_tokens_earning_income': total_tokens,
            'total_rental_income_received': str(total_received),
            'average_monthly_income': str(avg_monthly),
            'distribution_count': len(monthly_incomes),
            'properties': [
                {
                    'property_id': prop_id,
                    'property_title': stats['property_title'],
                    'token_count': stats['token_count'],
                    'total_received': str(stats['total_received']),
                    'distribution_count': stats['distribution_count'],
                    'average_per_distribution': str(stats['total_received'] / Decimal(stats['distribution_count'])) if stats['distribution_count'] > 0 else '0.00',
                    'last_distribution': stats['last_distribution']
                }
                for prop_id, stats in property_stats.items()
            ]
        })
    
    @swagger_auto_schema(
        operation_description="Get rental income report for a specific period"
    )
    @action(detail=False, methods=['get'], url_path='period-report/(?P<period>[^/.]+)')
    def period_report(self, request, period=None):
        """Get comprehensive rental income report for a specific period."""
        if not period:
            return Response(
                {'detail': 'Period parameter is required in YYYY-MM format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from core.services.rental_income_service import RentalIncomeService
        from investments.models import Investment
        
        # Get user's properties (for regular users) or all properties (for admins)
        if request.user.is_staff:
            property_ids = None  # Get all properties
        else:
            user_investments = Investment.objects.filter(
                user=request.user,
                status='active',
                token_count__gt=0
            ).values_list('property_id', flat=True)
            property_ids = list(user_investments)
        
        service = RentalIncomeService()
        report = service.generate_distribution_report(
            period=period,
            property_ids=property_ids
        )
        
        # For non-admin users, filter report to show only their relevant data
        if not request.user.is_staff and 'distribution_details' in report:
            user_property_ids = set(str(pid) for pid in property_ids)
            report['distribution_details'] = [
                detail for detail in report['distribution_details']
                if detail['property_id'] in user_property_ids
            ]
        
        return Response(report)


class RentalIncomeManagementView(APIView):
    """
    Admin-only view for managing rental income collection and distribution.
    
    Provides endpoints for triggering automated processes, updating income data,
    and managing distribution schedules.
    """
    
    permission_classes = [permissions.IsAdminUser]
    
    @swagger_auto_schema(
        operation_description="Trigger monthly rental income distribution",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'target_month': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Month to process in YYYY-MM format (optional)"
                ),
                'property_ids': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Items(type=openapi.TYPE_STRING),
                    description="Specific property IDs to process (optional)"
                )
            }
        )
    )
    @action(detail=False, methods=['post'], url_path='trigger-distribution')
    def trigger_distribution(self, request):
        """Trigger monthly rental income distribution process."""
        from core.tasks import distribute_monthly_rental_income
        
        target_month = request.data.get('target_month')
        property_ids = request.data.get('property_ids')
        
        # Validate target_month format if provided
        if target_month:
            try:
                from datetime import datetime
                datetime.strptime(target_month, '%Y-%m')
            except ValueError:
                return Response(
                    {'detail': 'Invalid target_month format. Use YYYY-MM'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Trigger the Celery task
        task = distribute_monthly_rental_income.delay(
            target_month=target_month,
            property_ids=property_ids
        )
        
        return Response({
            'task_id': task.id,
            'message': 'Monthly rental income distribution task started',
            'target_month': target_month or 'previous month',
            'property_count': len(property_ids) if property_ids else 'all eligible properties'
        })
    
    @swagger_auto_schema(
        operation_description="Trigger rental income collection from external systems"
    )
    @action(detail=False, methods=['post'], url_path='collect-income')
    def collect_income(self, request):
        """Trigger rental income collection from property management systems."""
        from core.tasks import collect_rental_income
        
        property_ids = request.data.get('property_ids')
        
        # Trigger the Celery task
        task = collect_rental_income.delay(property_ids=property_ids)
        
        return Response({
            'task_id': task.id,
            'message': 'Rental income collection task started',
            'property_count': len(property_ids) if property_ids else 'all active properties'
        })
    
    @swagger_auto_schema(
        operation_description="Update property rental income information",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['property_id', 'monthly_income'],
            properties={
                'property_id': openapi.Schema(type=openapi.TYPE_STRING),
                'monthly_income': openapi.Schema(type=openapi.TYPE_STRING),
                'occupancy_rate': openapi.Schema(type=openapi.TYPE_STRING),
                'effective_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE)
            }
        )
    )
    @action(detail=False, methods=['post'], url_path='update-property-income')
    def update_property_income(self, request):
        """Update rental income information for a specific property."""
        from core.tasks import update_property_rental_income
        
        property_id = request.data.get('property_id')
        monthly_income = request.data.get('monthly_income')
        occupancy_rate = request.data.get('occupancy_rate')
        effective_date = request.data.get('effective_date')
        
        if not property_id or not monthly_income:
            return Response(
                {'detail': 'property_id and monthly_income are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate property exists
        try:
            Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Trigger the update task
        task = update_property_rental_income.delay(
            property_id=property_id,
            monthly_income=monthly_income,
            occupancy_rate=occupancy_rate,
            effective_date=effective_date
        )
        
        return Response({
            'task_id': task.id,
            'message': f'Property rental income update task started for property {property_id}',
            'monthly_income': monthly_income,
            'occupancy_rate': occupancy_rate
        })
    
    @swagger_auto_schema(
        operation_description="Generate rental income report"
    )
    @action(detail=False, methods=['get'], url_path='generate-report/(?P<period>[^/.]+)')
    def generate_report(self, request, period=None):
        """Generate comprehensive rental income report for administrators."""
        if not period:
            return Response(
                {'detail': 'Period parameter is required in YYYY-MM format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from core.tasks import generate_rental_distribution_report
        
        property_ids = request.query_params.getlist('property_ids')
        send_to_admins = request.query_params.get('send_to_admins', 'true').lower() == 'true'
        
        # Trigger the report generation task
        task = generate_rental_distribution_report.delay(
            period=period,
            property_ids=property_ids if property_ids else None,
            send_to_admins=send_to_admins
        )
        
        return Response({
            'task_id': task.id,
            'message': f'Rental distribution report generation started for period {period}',
            'period': period,
            'send_to_admins': send_to_admins
        })
    
    def post(self, request):
        """Handle POST requests for rental income management actions."""
        action = request.data.get('action')
        
        if action == 'trigger_distribution':
            return self.trigger_distribution(request)
        elif action == 'collect_income':
            return self.collect_income(request)
        elif action == 'update_property_income':
            return self.update_property_income(request)
        else:
            return Response(
                {'detail': 'Invalid action. Available actions: trigger_distribution, collect_income, update_property_income'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PropertyApprovalStatusView(APIView):
    """
    Get property approval status for property owners.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, property_id):
        """Get approval status for a specific property."""
        try:
            property_obj = Property.objects.get(id=property_id)

            # Check if user owns this property
            if property_obj.owner != request.user:
                return Response(
                    {'detail': 'You do not have permission to view this property.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            try:
                approval = PropertyApproval.objects.select_related('reviewer').get(property=property_obj)
                serializer = PropertyApprovalSerializer(approval)
                return Response(serializer.data)
            except PropertyApproval.DoesNotExist:
                return Response(
                    {'detail': 'Property has not been submitted for approval.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


class SubmitPropertyForApprovalView(APIView):
    """
    Submit a property for approval process.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, property_id):
        """Submit property for approval."""
        try:
            property_obj = Property.objects.get(id=property_id)

            # Check if user owns this property
            if property_obj.owner != request.user:
                return Response(
                    {'detail': 'You do not have permission to submit this property.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if property is in draft status
            if property_obj.status != PropertyStatus.DRAFT:
                return Response(
                    {'detail': 'Only draft properties can be submitted for approval.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create or update approval record
            approval, created = PropertyApproval.objects.get_or_create(
                property=property_obj,
                defaults={
                    'status': 'pending',
                    'submitted_at': timezone.now()
                }
            )

            if not created:
                approval.status = 'pending'
                approval.submitted_at = timezone.now()
                approval.save()

            # Update property status
            property_obj.status = PropertyStatus.PENDING_APPROVAL
            property_obj.save(update_fields=['status'])

            return Response({
                'message': 'Property submitted for approval successfully.',
                'approval_id': approval.id,
                'status': approval.status
            })

        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


# Property Owner Dashboard API Views
class PropertyOwnerDashboardView(APIView):
    """
    Comprehensive Property Owner Dashboard API.

    Provides all endpoints needed for the property owner dashboard
    with real database calculations and analytics.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get owned properties for the authenticated property owner."""
        user = request.user

        # Check if user has property owner role
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get properties owned by the user
        properties = Property.objects.filter(owner=user).select_related(
            'owner'
        ).prefetch_related(
            'images', 'investments', 'valuations', 'rental_distributions'
        ).order_by('-created_at')

        # Build property data with real calculations
        properties_data = []
        for prop in properties:
            # Calculate funding metrics
            funding_amount = prop.tokens_sold * prop.token_price
            funding_percentage = prop.funding_percentage

            # Get latest valuation
            latest_valuation = prop.valuations.first()
            current_value = latest_valuation.current_value if latest_valuation else prop.total_value

            # Calculate total revenue from this property
            total_revenue = prop.rental_distributions.aggregate(
                total=Sum('total_rental_income')
            )['total'] or Decimal('0.00')

            # Get investor count
            investor_count = prop.investments.filter(
                status='completed'
            ).values('user').distinct().count()

            # Get primary image
            primary_image = prop.images.filter(is_primary=True).first()
            image_url = None
            if primary_image:
                image_url = request.build_absolute_uri(primary_image.image.url)

            properties_data.append({
                'id': str(prop.id),
                'title': prop.title,
                'location': f"{prop.city}, {prop.country}",
                'property_type': prop.property_type,
                'status': prop.status,
                'total_value': str(prop.total_value),
                'current_value': str(current_value),
                'funding_amount': str(funding_amount),
                'funding_percentage': float(funding_percentage),
                'total_tokens': prop.total_tokens,
                'tokens_sold': prop.tokens_sold,
                'tokens_available': prop.tokens_available,
                'token_price': str(prop.token_price),
                'expected_return': str(prop.expected_return) if prop.expected_return else None,
                'rental_yield': str(prop.rental_yield) if prop.rental_yield else None,
                'investor_count': investor_count,
                'total_revenue': str(total_revenue),
                'monthly_rental_income': str(prop.monthly_rental_income) if prop.monthly_rental_income else None,
                'occupancy_rate': str(prop.occupancy_rate),
                'construction_progress': str(prop.construction_progress),
                'image_url': image_url,
                'created_at': prop.created_at.isoformat(),
                'updated_at': prop.updated_at.isoformat()
            })

        return Response({
            'properties': properties_data,
            'total_properties': len(properties_data),
            'total_value': str(sum(Decimal(p['total_value']) for p in properties_data)),
            'total_funding': str(sum(Decimal(p['funding_amount']) for p in properties_data)),
            'average_funding_percentage': sum(p['funding_percentage'] for p in properties_data) / len(properties_data) if properties_data else 0
        })


class PropertyOwnerRevenueAnalyticsView(APIView):
    """Revenue analytics for property owner dashboard charts."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get monthly revenue analytics data."""
        user = request.user

        # Check permissions
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get date range (last 12 months)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Generate monthly revenue data
        monthly_data = []
        current_date = start_date.replace(day=1)

        while current_date <= end_date:
            next_month = current_date + timedelta(days=32)
            next_month = next_month.replace(day=1)

            # Get rental income for this month
            month_rental_income = RentalIncomeDistribution.objects.filter(
                property__in=user_properties,
                distribution_date__gte=current_date,
                distribution_date__lt=next_month
            ).aggregate(total=Sum('total_rental_income'))['total'] or Decimal('0.00')

            # Get investment income (new investments) for this month
            month_investment_income = Investment.objects.filter(
                property_investment__in=user_properties,
                status='completed',
                created_at__date__gte=current_date,
                created_at__date__lt=next_month
            ).aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')

            # Calculate platform fees (estimated 5% of rental income)
            platform_fees = month_rental_income * Decimal('0.05')

            monthly_data.append({
                'month': current_date.strftime('%Y-%m'),
                'rental_income': float(month_rental_income),
                'investment_income': float(month_investment_income),
                'total_revenue': float(month_rental_income + month_investment_income),
                'platform_fees': float(platform_fees),
                'net_revenue': float(month_rental_income + month_investment_income - platform_fees)
            })

            current_date = next_month

        # Calculate totals and growth
        total_rental = sum(m['rental_income'] for m in monthly_data)
        total_investment = sum(m['investment_income'] for m in monthly_data)
        total_revenue = sum(m['total_revenue'] for m in monthly_data)

        # Calculate month-over-month growth
        current_month_revenue = monthly_data[-1]['total_revenue'] if monthly_data else 0
        previous_month_revenue = monthly_data[-2]['total_revenue'] if len(monthly_data) > 1 else 0

        revenue_growth = 0
        if previous_month_revenue > 0:
            revenue_growth = ((current_month_revenue - previous_month_revenue) / previous_month_revenue) * 100

        return Response({
            'monthly_data': monthly_data,
            'summary': {
                'total_rental_income': total_rental,
                'total_investment_income': total_investment,
                'total_revenue': total_revenue,
                'average_monthly_revenue': total_revenue / 12 if total_revenue > 0 else 0,
                'revenue_growth_percentage': revenue_growth
            }
        })


class PropertyOwnerTokenizationAnalyticsView(APIView):
    """Tokenization analytics showing token sales progression."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get token sales progression data."""
        user = request.user

        # Check permissions
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Generate tokenization progress data
        tokenization_data = []
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)
        current_date = start_date

        while current_date <= end_date:
            # Calculate cumulative tokens sold up to this date
            cumulative_tokens = Investment.objects.filter(
                property_investment__in=user_properties,
                status='completed',
                created_at__date__lte=current_date
            ).aggregate(total=Sum('token_amount'))['total'] or 0

            # Calculate cumulative funding amount
            cumulative_funding = Investment.objects.filter(
                property_investment__in=user_properties,
                status='completed',
                created_at__date__lte=current_date
            ).aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')

            # Count active properties at this date
            active_properties = user_properties.filter(
                created_at__date__lte=current_date,
                status__in=[PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED, PropertyStatus.SOLD_OUT]
            ).count()

            tokenization_data.append({
                'date': current_date.isoformat(),
                'cumulative_tokens_sold': cumulative_tokens,
                'cumulative_funding': float(cumulative_funding),
                'active_properties': active_properties
            })

            current_date += timedelta(days=7)  # Weekly data points

        # Calculate total tokens across all properties
        total_tokens = user_properties.aggregate(total=Sum('total_tokens'))['total'] or 0
        total_tokens_sold = user_properties.aggregate(total=Sum('tokens_sold'))['total'] or 0
        total_funding_target = user_properties.aggregate(total=Sum('total_value'))['total'] or Decimal('0.00')
        current_funding = user_properties.aggregate(
            total=Sum(F('tokens_sold') * F('token_price'))
        )['total'] or Decimal('0.00')

        # Calculate funding velocity (tokens sold per day over last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_tokens = Investment.objects.filter(
            property_investment__in=user_properties,
            status='completed',
            created_at__gte=thirty_days_ago
        ).aggregate(total=Sum('token_amount'))['total'] or 0

        funding_velocity = recent_tokens / 30  # tokens per day

        return Response({
            'progression_data': tokenization_data,
            'summary': {
                'total_tokens': total_tokens,
                'total_tokens_sold': total_tokens_sold,
                'total_funding_target': str(total_funding_target),
                'current_funding': str(current_funding),
                'overall_funding_percentage': float((current_funding / total_funding_target * 100)) if total_funding_target > 0 else 0,
                'funding_velocity_daily': funding_velocity,
                'estimated_completion_days': int((total_tokens - total_tokens_sold) / funding_velocity) if funding_velocity > 0 else None
            }
        })


class PropertyOwnerRevenueStatsView(APIView):
    """Revenue distribution statistics for property owner dashboard."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get revenue distribution statistics."""
        user = request.user

        # Check permissions
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Calculate revenue by property type
        revenue_by_type = {}
        for prop in user_properties:
            property_type = prop.property_type
            if property_type not in revenue_by_type:
                revenue_by_type[property_type] = {
                    'rental_income': Decimal('0.00'),
                    'investment_income': Decimal('0.00'),
                    'property_count': 0
                }

            # Rental income
            rental_income = prop.rental_distributions.aggregate(
                total=Sum('total_rental_income')
            )['total'] or Decimal('0.00')

            # Investment income
            investment_income = prop.investments.filter(
                status='completed'
            ).aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')

            revenue_by_type[property_type]['rental_income'] += rental_income
            revenue_by_type[property_type]['investment_income'] += investment_income
            revenue_by_type[property_type]['property_count'] += 1

        # Format for frontend
        revenue_distribution = []
        for prop_type, data in revenue_by_type.items():
            total_revenue = data['rental_income'] + data['investment_income']
            revenue_distribution.append({
                'property_type': prop_type,
                'rental_income': float(data['rental_income']),
                'investment_income': float(data['investment_income']),
                'total_revenue': float(total_revenue),
                'property_count': data['property_count']
            })

        # Calculate revenue by location
        revenue_by_location = {}
        for prop in user_properties:
            location = f"{prop.city}, {prop.country}"
            if location not in revenue_by_location:
                revenue_by_location[location] = Decimal('0.00')

            prop_revenue = (prop.rental_distributions.aggregate(
                total=Sum('total_rental_income')
            )['total'] or Decimal('0.00')) + (prop.investments.filter(
                status='completed'
            ).aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00'))

            revenue_by_location[location] += prop_revenue

        location_distribution = [
            {
                'location': location,
                'revenue': float(revenue),
                'percentage': float((revenue / sum(revenue_by_location.values()) * 100)) if sum(revenue_by_location.values()) > 0 else 0
            }
            for location, revenue in revenue_by_location.items()
        ]

        # Calculate monthly performance metrics
        this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month = (this_month - timedelta(days=1)).replace(day=1)

        current_month_revenue = RentalIncomeDistribution.objects.filter(
            property__in=user_properties,
            distribution_date__gte=this_month
        ).aggregate(total=Sum('total_rental_income'))['total'] or Decimal('0.00')

        last_month_revenue = RentalIncomeDistribution.objects.filter(
            property__in=user_properties,
            distribution_date__gte=last_month,
            distribution_date__lt=this_month
        ).aggregate(total=Sum('total_rental_income'))['total'] or Decimal('0.00')

        month_over_month_change = 0
        if last_month_revenue > 0:
            month_over_month_change = float((current_month_revenue - last_month_revenue) / last_month_revenue * 100)

        return Response({
            'revenue_by_property_type': revenue_distribution,
            'revenue_by_location': location_distribution,
            'monthly_performance': {
                'current_month_revenue': float(current_month_revenue),
                'last_month_revenue': float(last_month_revenue),
                'month_over_month_change': month_over_month_change
            },
            'total_revenue': float(sum(d['total_revenue'] for d in revenue_distribution))
        })


class PropertyOwnerInvestorsView(APIView):
    """Top investors across property owner's properties."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get top investors across all owned properties."""
        user = request.user

        # Check permissions
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Get all investments in user's properties
        investments = Investment.objects.filter(
            property_investment__in=user_properties,
            status='completed'
        ).select_related('user', 'property_investment')

        # Aggregate by investor
        investor_data = {}
        for investment in investments:
            investor_id = str(investment.user.id)
            if investor_id not in investor_data:
                investor_data[investor_id] = {
                    'investor_id': investor_id,
                    'investor_name': f"{investment.user.first_name} {investment.user.last_name}".strip(),
                    'investor_email': investment.user.email,
                    'total_invested': Decimal('0.00'),
                    'total_tokens': 0,
                    'properties_invested': set(),
                    'investment_count': 0,
                    'first_investment_date': investment.created_at,
                    'last_investment_date': investment.created_at,
                    'country': investment.user.country
                }

            investor_data[investor_id]['total_invested'] += investment.investment_amount
            investor_data[investor_id]['total_tokens'] += investment.token_amount
            investor_data[investor_id]['properties_invested'].add(str(investment.property_investment.id))
            investor_data[investor_id]['investment_count'] += 1

            if investment.created_at < investor_data[investor_id]['first_investment_date']:
                investor_data[investor_id]['first_investment_date'] = investment.created_at
            if investment.created_at > investor_data[investor_id]['last_investment_date']:
                investor_data[investor_id]['last_investment_date'] = investment.created_at

        # Convert to list and format
        top_investors = []
        for investor_id, data in investor_data.items():
            top_investors.append({
                'investor_id': data['investor_id'],
                'investor_name': data['investor_name'],
                'investor_email': data['investor_email'],
                'total_invested': float(data['total_invested']),
                'total_tokens': data['total_tokens'],
                'properties_count': len(data['properties_invested']),
                'investment_count': data['investment_count'],
                'average_investment': float(data['total_invested'] / data['investment_count']),
                'first_investment_date': data['first_investment_date'].isoformat(),
                'last_investment_date': data['last_investment_date'].isoformat(),
                'country': data['country'],
                'investor_since_days': (timezone.now() - data['first_investment_date']).days
            })

        # Sort by total invested amount
        top_investors.sort(key=lambda x: x['total_invested'], reverse=True)

        # Get top 20 investors
        top_investors = top_investors[:20]

        # Calculate summary statistics
        total_investors = len(investor_data)
        total_investment_amount = sum(d['total_invested'] for d in investor_data.values())
        average_investment_per_investor = total_investment_amount / total_investors if total_investors > 0 else 0

        return Response({
            'top_investors': top_investors,
            'summary': {
                'total_unique_investors': total_investors,
                'total_investment_amount': float(total_investment_amount),
                'average_investment_per_investor': float(average_investment_per_investor),
                'top_investor_contribution': float(top_investors[0]['total_invested']) if top_investors else 0,
                'top_investor_percentage': float((top_investors[0]['total_invested'] / total_investment_amount * 100)) if top_investors and total_investment_amount > 0 else 0
            }
        })


class PropertyOwnerInvestorAnalyticsView(APIView):
    """Investor segmentation and analytics data."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get investor segmentation and analytics."""
        user = request.user

        # Check permissions
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Get all investments
        investments = Investment.objects.filter(
            property_investment__in=user_properties,
            status='completed'
        ).select_related('user')

        # Investor segmentation by investment amount
        segmentation = {
            'whale': [],  # > $50,000
            'large': [],  # $10,000 - $50,000
            'medium': [],  # $1,000 - $10,000
            'small': []   # < $1,000
        }

        investor_amounts = {}
        for investment in investments:
            user_id = str(investment.user.id)
            if user_id not in investor_amounts:
                investor_amounts[user_id] = {
                    'user': investment.user,
                    'total_amount': Decimal('0.00')
                }
            investor_amounts[user_id]['total_amount'] += investment.investment_amount

        for user_id, data in investor_amounts.items():
            amount = float(data['total_amount'])
            investor_info = {
                'investor_id': user_id,
                'name': f"{data['user'].first_name} {data['user'].last_name}".strip(),
                'email': data['user'].email,
                'total_invested': amount,
                'country': data['user'].country
            }

            if amount >= 50000:
                segmentation['whale'].append(investor_info)
            elif amount >= 10000:
                segmentation['large'].append(investor_info)
            elif amount >= 1000:
                segmentation['medium'].append(investor_info)
            else:
                segmentation['small'].append(investor_info)

        # Geographic distribution
        country_stats = {}
        for investment in investments:
            country = investment.user.country or 'Unknown'
            if country not in country_stats:
                country_stats[country] = {
                    'investor_count': set(),
                    'total_invested': Decimal('0.00'),
                    'investment_count': 0
                }

            country_stats[country]['investor_count'].add(str(investment.user.id))
            country_stats[country]['total_invested'] += investment.investment_amount
            country_stats[country]['investment_count'] += 1

        geographic_distribution = []
        for country, stats in country_stats.items():
            geographic_distribution.append({
                'country': country,
                'unique_investors': len(stats['investor_count']),
                'total_invested': float(stats['total_invested']),
                'investment_count': stats['investment_count'],
                'average_investment': float(stats['total_invested'] / len(stats['investor_count']))
            })

        geographic_distribution.sort(key=lambda x: x['total_invested'], reverse=True)

        # Investment timing analysis
        monthly_new_investors = []
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)
        current_date = start_date.replace(day=1)

        seen_investors = set()
        while current_date <= end_date:
            next_month = current_date + timedelta(days=32)
            next_month = next_month.replace(day=1)

            month_investments = investments.filter(
                created_at__date__gte=current_date,
                created_at__date__lt=next_month
            )

            new_investors_this_month = 0
            for inv in month_investments:
                if str(inv.user.id) not in seen_investors:
                    new_investors_this_month += 1
                    seen_investors.add(str(inv.user.id))

            monthly_new_investors.append({
                'month': current_date.strftime('%Y-%m'),
                'new_investors': new_investors_this_month,
                'total_cumulative': len(seen_investors)
            })

            current_date = next_month

        return Response({
            'investor_segmentation': {
                'whale_investors': {
                    'count': len(segmentation['whale']),
                    'investors': segmentation['whale'][:5],  # Top 5
                    'total_invested': sum(inv['total_invested'] for inv in segmentation['whale'])
                },
                'large_investors': {
                    'count': len(segmentation['large']),
                    'investors': segmentation['large'][:5],
                    'total_invested': sum(inv['total_invested'] for inv in segmentation['large'])
                },
                'medium_investors': {
                    'count': len(segmentation['medium']),
                    'total_invested': sum(inv['total_invested'] for inv in segmentation['medium'])
                },
                'small_investors': {
                    'count': len(segmentation['small']),
                    'total_invested': sum(inv['total_invested'] for inv in segmentation['small'])
                }
            },
            'geographic_distribution': geographic_distribution,
            'investor_acquisition': monthly_new_investors,
            'summary': {
                'total_unique_investors': len(investor_amounts),
                'average_investment_per_investor': float(sum(d['total_amount'] for d in investor_amounts.values()) / len(investor_amounts)) if investor_amounts else 0,
                'top_countries_count': len(geographic_distribution),
                'investor_retention_rate': 85.5  # Mock data - would need more complex calculation
            }
        })


class PropertyOwnerInvestmentMetricsView(APIView):
    """Investment performance metrics for property owner dashboard."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get comprehensive investment performance metrics."""
        user = request.user

        # Check permissions
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Portfolio performance metrics
        total_property_value = user_properties.aggregate(
            total=Sum('total_value')
        )['total'] or Decimal('0.00')

        total_funding_raised = Investment.objects.filter(
            property_investment__in=user_properties,
            status='completed'
        ).aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')

        total_tokens_sold = user_properties.aggregate(
            total=Sum('tokens_sold')
        )['total'] or 0

        total_tokens_available = user_properties.aggregate(
            total=Sum('total_tokens')
        )['total'] or 0

        # Calculate average funding percentage
        avg_funding_percentage = 0
        if user_properties.exists():
            funding_percentages = [prop.funding_percentage for prop in user_properties]
            avg_funding_percentage = sum(funding_percentages) / len(funding_percentages)

        # Revenue metrics
        total_rental_revenue = RentalIncomeDistribution.objects.filter(
            property__in=user_properties
        ).aggregate(total=Sum('total_rental_income'))['total'] or Decimal('0.00')

        # Calculate ROI for investors (property performance)
        property_performance = []
        for prop in user_properties:
            # Get latest valuation
            latest_valuation = prop.valuations.first()
            current_value = latest_valuation.current_value if latest_valuation else prop.total_value

            # Calculate appreciation
            appreciation = current_value - prop.total_value
            appreciation_percentage = float((appreciation / prop.total_value * 100)) if prop.total_value > 0 else 0

            # Total returns (appreciation + rental income)
            prop_rental_income = prop.rental_distributions.aggregate(
                total=Sum('total_rental_income')
            )['total'] or Decimal('0.00')

            total_returns = appreciation + prop_rental_income
            total_return_percentage = float((total_returns / prop.total_value * 100)) if prop.total_value > 0 else 0

            property_performance.append({
                'property_id': str(prop.id),
                'property_title': prop.title,
                'original_value': float(prop.total_value),
                'current_value': float(current_value),
                'appreciation': float(appreciation),
                'appreciation_percentage': appreciation_percentage,
                'rental_income': float(prop_rental_income),
                'total_returns': float(total_returns),
                'total_return_percentage': total_return_percentage,
                'funding_percentage': float(prop.funding_percentage),
                'investor_count': prop.investments.filter(status='completed').values('user').distinct().count()
            })

        # Best and worst performing properties
        property_performance.sort(key=lambda x: x['total_return_percentage'], reverse=True)
        best_performing = property_performance[0] if property_performance else None
        worst_performing = property_performance[-1] if property_performance else None

        # Time-based performance
        ytd_start = timezone.now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        ytd_funding = Investment.objects.filter(
            property_investment__in=user_properties,
            status='completed',
            created_at__gte=ytd_start
        ).aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')

        ytd_rental_income = RentalIncomeDistribution.objects.filter(
            property__in=user_properties,
            distribution_date__gte=ytd_start.date()
        ).aggregate(total=Sum('total_rental_income'))['total'] or Decimal('0.00')

        # Monthly trending data
        monthly_metrics = []
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)
        current_date = start_date.replace(day=1)

        while current_date <= end_date:
            next_month = current_date + timedelta(days=32)
            next_month = next_month.replace(day=1)

            month_funding = Investment.objects.filter(
                property_investment__in=user_properties,
                status='completed',
                created_at__date__gte=current_date,
                created_at__date__lt=next_month
            ).aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')

            month_rental = RentalIncomeDistribution.objects.filter(
                property__in=user_properties,
                distribution_date__gte=current_date,
                distribution_date__lt=next_month
            ).aggregate(total=Sum('total_rental_income'))['total'] or Decimal('0.00')

            monthly_metrics.append({
                'month': current_date.strftime('%Y-%m'),
                'funding_raised': float(month_funding),
                'rental_income': float(month_rental),
                'total_revenue': float(month_funding + month_rental)
            })

            current_date = next_month

        return Response({
            'portfolio_overview': {
                'total_property_value': float(total_property_value),
                'total_funding_raised': float(total_funding_raised),
                'funding_percentage': float((total_funding_raised / total_property_value * 100)) if total_property_value > 0 else 0,
                'total_tokens_sold': total_tokens_sold,
                'total_tokens_available': total_tokens_available,
                'average_funding_percentage': float(avg_funding_percentage),
                'total_rental_revenue': float(total_rental_revenue),
                'property_count': user_properties.count()
            },
            'performance_metrics': {
                'ytd_funding': float(ytd_funding),
                'ytd_rental_income': float(ytd_rental_income),
                'ytd_total_revenue': float(ytd_funding + ytd_rental_income),
                'average_property_roi': sum(p['total_return_percentage'] for p in property_performance) / len(property_performance) if property_performance else 0,
                'best_performing_property': best_performing,
                'worst_performing_property': worst_performing
            },
            'property_performance': property_performance,
            'monthly_trends': monthly_metrics
        })


class PropertyOwnerDocumentsView(APIView):
    """Documents across all owner's properties."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get all documents for owner's properties."""
        user = request.user

        # Check permissions
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Get all documents for these properties
        documents = PropertyDocument.objects.filter(
            property__in=user_properties
        ).select_related('property').order_by('-uploaded_at')

        # Paginate if needed
        from django.core.paginator import Paginator
        page_number = request.query_params.get('page', 1)
        page_size = int(request.query_params.get('page_size', 20))

        paginator = Paginator(documents, page_size)
        page_obj = paginator.get_page(page_number)

        # Format documents data
        documents_data = []
        for doc in page_obj:
            documents_data.append({
                'id': str(doc.id),
                'name': doc.name,
                'document_type': doc.document_type,
                'description': doc.description,
                'size': doc.size,
                'uploaded_at': doc.uploaded_at.isoformat(),
                'download_url': request.build_absolute_uri(doc.document.url),
                'property': {
                    'id': str(doc.property.id),
                    'title': doc.property.title,
                    'location': f"{doc.property.city}, {doc.property.country}"
                }
            })

        # Group by document type for summary
        document_types = {}
        for doc in documents:
            doc_type = doc.document_type
            if doc_type not in document_types:
                document_types[doc_type] = {
                    'count': 0,
                    'total_size': 0
                }
            document_types[doc_type]['count'] += 1
            document_types[doc_type]['total_size'] += doc.size

        document_type_summary = [
            {
                'document_type': doc_type,
                'count': data['count'],
                'total_size_mb': round(data['total_size'] / (1024 * 1024), 2)
            }
            for doc_type, data in document_types.items()
        ]

        return Response({
            'documents': documents_data,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_documents': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            },
            'summary': {
                'total_documents': documents.count(),
                'total_size_mb': round(sum(doc.size for doc in documents) / (1024 * 1024), 2),
                'document_types': document_type_summary,
                'properties_with_documents': user_properties.filter(documents__isnull=False).distinct().count()
            }
        })


# =============================================================================
# DATA ROOM VIEWS
# =============================================================================

class DataRoomDocumentListView(generics.ListAPIView):
    """
    List all documents in a property's Data Room.

    Access control:
    - Public documents: accessible to everyone
    - Investor documents: accessible to verified investors of the property
    - All documents: accessible to property owner and admins
    """

    serializer_class = PropertyDocumentListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        property_id = self.kwargs.get('property_id')
        property_obj = get_object_or_404(Property, pk=property_id)

        # Base queryset: only latest versions
        queryset = PropertyDocument.objects.filter(
            property=property_obj,
            is_latest=True
        )

        user = self.request.user

        # Admin or property owner sees all documents
        if user.is_authenticated:
            if user.is_staff or (hasattr(property_obj, 'owner') and property_obj.owner == user):
                return queryset.order_by('document_type', '-uploaded_at')

            # Check if user is an investor in this property
            is_investor = Investment.objects.filter(
                user=user,
                property=property_obj
            ).exists()

            if is_investor:
                # Investors see investor_access documents
                return queryset.filter(investor_access=True).order_by('document_type', '-uploaded_at')

        # Anonymous users or non-investors see only public documents
        return queryset.filter(is_public=True).order_by('document_type', '-uploaded_at')


class DataRoomDocumentUploadView(generics.CreateAPIView):
    """
    Upload a document to a property's Data Room.

    Only property owners and admins can upload documents.
    Automatically handles version control.
    """

    serializer_class = PropertyDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return PropertyDocument.objects.all()

    def perform_create(self, serializer):
        property_id = self.kwargs.get('property_id')
        property_obj = get_object_or_404(Property, pk=property_id)

        # Check permission: only owner or admin
        user = self.request.user
        if not user.is_staff:
            if hasattr(property_obj, 'owner') and property_obj.owner != user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You don't have permission to upload documents to this property.")

        serializer.save(
            property=property_obj,
            uploaded_by=user
        )


class DataRoomDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a document from the Data Room.

    Access follows the same rules as list view.
    Only property owners and admins can update/delete.
    """

    serializer_class = PropertyDocumentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        property_id = self.kwargs.get('property_id')
        return PropertyDocument.objects.filter(property_id=property_id)

    def get_object(self):
        queryset = self.get_queryset()
        document_id = self.kwargs.get('document_id')
        obj = get_object_or_404(queryset, pk=document_id)

        # Check access permissions
        user = self.request.user
        property_obj = obj.property

        # Admin or property owner has full access
        if user.is_authenticated:
            if user.is_staff or (hasattr(property_obj, 'owner') and property_obj.owner == user):
                return obj

            # Investors can access investor_access documents
            is_investor = Investment.objects.filter(
                user=user,
                property=property_obj
            ).exists()

            if is_investor and obj.investor_access:
                return obj

        # Anonymous users can only access public documents
        if obj.is_public:
            return obj

        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("You don't have permission to access this document.")

    def perform_update(self, serializer):
        # Only allow admin or owner to update
        user = self.request.user
        property_obj = self.get_object().property

        if not user.is_staff:
            if hasattr(property_obj, 'owner') and property_obj.owner != user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You don't have permission to update this document.")

        serializer.save()

    def perform_destroy(self, instance):
        # Only allow admin or owner to delete
        user = self.request.user
        property_obj = instance.property

        if not user.is_staff:
            if hasattr(property_obj, 'owner') and property_obj.owner != user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You don't have permission to delete this document.")

        instance.delete()


class DataRoomDocumentVersionsView(generics.ListAPIView):
    """
    List all versions of a specific document.

    Shows version history for audit purposes.
    """

    serializer_class = PropertyDocumentListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        property_id = self.kwargs.get('property_id')
        document_name = self.request.query_params.get('name')

        if not document_name:
            return PropertyDocument.objects.none()

        # Get all versions of this document
        return PropertyDocument.objects.filter(
            property_id=property_id,
            name=document_name
        ).order_by('-version')
