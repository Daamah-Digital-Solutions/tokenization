"""
Construction Milestone Views for Capimax Real Estate Tokenization Platform.

This module contains API views for construction milestone management,
progress tracking, and milestone-related operations.
"""

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Avg, Sum, Count, Max, Min
from django.utils import timezone
from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from datetime import datetime, timedelta
from typing import Dict, Any
import logging

from core.permissions import IsOwnerOrReadOnly, AdminOrReadOnly
from core.utils import CustomPagination
from properties.models import Property
from .models import (
    ConstructionMilestone, MilestoneUpdate, MilestoneImage,
    MilestoneDocument, MilestoneStatus, MilestoneCategory
)
from .serializers import (
    ConstructionMilestoneListSerializer, ConstructionMilestoneDetailSerializer,
    ConstructionMilestoneCreateUpdateSerializer, MilestoneUpdateSerializer,
    MilestoneImageSerializer, MilestoneDocumentSerializer,
    MilestoneVerificationSerializer, ConstructionProgressSerializer
)

logger = logging.getLogger(__name__)


class ConstructionMilestoneViewSet(ModelViewSet):
    """
    ViewSet for construction milestone CRUD operations.
    
    Provides:
    - List milestones for a property
    - Retrieve milestone details with all related data
    - Create new milestones (property owners and admins)
    - Update milestones (property owners and admins)
    - Delete milestones (property owners and admins)
    - Special actions for verification, updates, etc.
    """
    
    serializer_class = ConstructionMilestoneListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'planned_start_date', 'planned_completion_date', 'created_at']
    ordering = ['order', 'planned_start_date']
    pagination_class = CustomPagination
    
    def get_queryset(self):
        """Filter queryset based on property."""
        property_id = self.kwargs.get('property_id')
        if property_id:
            return ConstructionMilestone.objects.filter(
                property_id=property_id
            ).select_related('property', 'inspector').prefetch_related(
                'updates', 'images', 'documents'
            )
        return ConstructionMilestone.objects.none()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ConstructionMilestoneListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ConstructionMilestoneCreateUpdateSerializer
        else:
            return ConstructionMilestoneDetailSerializer
    
    def check_property_permissions(self, property_obj, user):
        """Check if user has permissions for the property."""
        return user == property_obj.owner or user.is_staff or user.is_superuser
    
    def create(self, request, *args, **kwargs):
        """Create a new milestone for the property."""
        property_id = self.kwargs.get('property_id')
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not self.check_property_permissions(property_obj, request.user):
            return Response(
                {'detail': 'You do not have permission to create milestones for this property.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        milestone = serializer.save(property_obj=property_obj)
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            ConstructionMilestoneDetailSerializer(milestone, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """Update a milestone."""
        milestone = self.get_object()
        
        # Check permissions
        if not self.check_property_permissions(milestone.property_obj, request.user):
            return Response(
                {'detail': 'You do not have permission to update this milestone.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a milestone."""
        milestone = self.get_object()
        
        # Check permissions
        if not self.check_property_permissions(milestone.property_obj, request.user):
            return Response(
                {'detail': 'You do not have permission to delete this milestone.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @swagger_auto_schema(
        method='post',
        request_body=MilestoneVerificationSerializer
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def verify(self, request, property_id=None, pk=None):
        """Verify a milestone (inspectors and admins only)."""
        milestone = self.get_object()
        
        # Check if user can verify milestones (inspector, admin, or property owner)
        if not (request.user.is_staff or 
                request.user == milestone.property_obj.owner or
                milestone.inspector == request.user):
            return Response(
                {'detail': 'You do not have permission to verify this milestone.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = MilestoneVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update milestone
        milestone.status = serializer.validated_data['status']
        milestone.inspection_notes = serializer.validated_data.get('inspection_notes', '')
        milestone.inspector = request.user
        milestone.inspection_date = timezone.now()
        
        if serializer.validated_data.get('actual_completion_date'):
            milestone.actual_completion_date = serializer.validated_data['actual_completion_date']
        
        if serializer.validated_data.get('actual_cost'):
            milestone.actual_cost = serializer.validated_data['actual_cost']
        
        # Set progress to 100% if verified or completed
        if milestone.status in ['completed', 'verified']:
            milestone.progress_percentage = 100
        
        milestone.save()
        
        return Response({
            'message': f'Milestone {milestone.status} successfully',
            'milestone': ConstructionMilestoneDetailSerializer(
                milestone, context={'request': request}
            ).data
        })


class MilestoneUpdateCreateView(generics.CreateAPIView):
    """
    Create updates for construction milestones.
    """
    
    serializer_class = MilestoneUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create an update for the milestone."""
        property_id = self.kwargs['property_id']
        milestone_id = self.kwargs['milestone_id']
        
        try:
            milestone = ConstructionMilestone.objects.get(
                id=milestone_id,
                property_id=property_id
            )
        except ConstructionMilestone.DoesNotExist:
            return Response(
                {'detail': 'Milestone not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not (self.request.user == milestone.property_obj.owner or 
                self.request.user.is_staff or
                milestone.inspector == self.request.user):
            return Response(
                {'detail': 'You do not have permission to create updates for this milestone.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer.save(milestone=milestone, author=self.request.user)


class MilestoneImageUploadView(APIView):
    """
    Upload images for construction milestones.
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
            openapi.Parameter(
                'milestone_id',
                openapi.IN_PATH,
                description="Milestone ID",
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['image'],
            properties={
                'image': openapi.Schema(type=openapi.TYPE_FILE),
                'caption': openapi.Schema(type=openapi.TYPE_STRING)
            }
        )
    )
    def post(self, request, property_id, milestone_id):
        """Upload an image for the milestone."""
        try:
            milestone = ConstructionMilestone.objects.get(
                id=milestone_id,
                property_id=property_id
            )
        except ConstructionMilestone.DoesNotExist:
            return Response(
                {'detail': 'Milestone not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not (request.user == milestone.property_obj.owner or 
                request.user.is_staff or
                milestone.inspector == request.user):
            return Response(
                {'detail': 'You do not have permission to upload images for this milestone.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        image_data = {
            'image': request.FILES.get('image'),
            'caption': request.data.get('caption', '')
        }
        
        serializer = MilestoneImageSerializer(data=image_data, context={'request': request})
        if serializer.is_valid():
            image = serializer.save(milestone=milestone, uploaded_by=request.user)
            return Response(
                MilestoneImageSerializer(image, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MilestoneDocumentUploadView(APIView):
    """
    Upload documents for construction milestones.
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
            openapi.Parameter(
                'milestone_id',
                openapi.IN_PATH,
                description="Milestone ID",
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
    def post(self, request, property_id, milestone_id):
        """Upload a document for the milestone."""
        try:
            milestone = ConstructionMilestone.objects.get(
                id=milestone_id,
                property_id=property_id
            )
        except ConstructionMilestone.DoesNotExist:
            return Response(
                {'detail': 'Milestone not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not (request.user == milestone.property_obj.owner or 
                request.user.is_staff or
                milestone.inspector == request.user):
            return Response(
                {'detail': 'You do not have permission to upload documents for this milestone.'},
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
        
        serializer = MilestoneDocumentSerializer(data=document_data, context={'request': request})
        if serializer.is_valid():
            document = serializer.save(milestone=milestone, uploaded_by=request.user)
            return Response(
                MilestoneDocumentSerializer(document, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConstructionProgressView(APIView):
    """
    Get construction progress overview for a property.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, property_id):
        """Get construction progress data for the property."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'detail': 'Property not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all milestones for the property
        milestones = ConstructionMilestone.objects.filter(property_obj=property_obj)
        
        if not milestones.exists():
            return Response({
                'property_id': property_obj.id,
                'property_title': property_obj.title,
                'total_milestones': 0,
                'completed_milestones': 0,
                'overall_progress': 0,
                'estimated_completion_date': None,
                'total_estimated_cost': None,
                'total_actual_cost': None,
                'delayed_milestones': 0,
                'milestone_categories': {},
                'upcoming_milestones': []
            })
        
        # Calculate progress metrics
        total_milestones = milestones.count()
        completed_milestones = milestones.filter(
            status__in=['completed', 'verified']
        ).count()
        
        # Overall progress (average of all milestone progress)
        overall_progress = milestones.aggregate(
            avg_progress=Avg('progress_percentage')
        )['avg_progress'] or 0
        
        # Cost analysis
        total_estimated_cost = milestones.aggregate(
            total=Sum('estimated_cost')
        )['total']
        
        total_actual_cost = milestones.filter(
            actual_cost__isnull=False
        ).aggregate(
            total=Sum('actual_cost')
        )['total']
        
        # Delayed milestones
        delayed_milestones = sum(1 for m in milestones if m.is_delayed)
        
        # Estimated completion date (latest planned completion date)
        estimated_completion_date = milestones.aggregate(
            latest=Max('planned_completion_date')
        )['latest']
        
        # Milestone categories breakdown
        milestone_categories = {}
        for category in MilestoneCategory:
            category_milestones = milestones.filter(category=category.value)
            if category_milestones.exists():
                milestone_categories[category.label] = {
                    'total': category_milestones.count(),
                    'completed': category_milestones.filter(
                        status__in=['completed', 'verified']
                    ).count(),
                    'progress': category_milestones.aggregate(
                        avg_progress=Avg('progress_percentage')
                    )['avg_progress'] or 0
                }
        
        # Upcoming milestones (next 5 planned milestones)
        upcoming_milestones = []
        next_milestones = milestones.filter(
            status__in=['pending', 'in_progress'],
            planned_start_date__gte=timezone.now().date()
        ).order_by('planned_start_date')[:5]
        
        for milestone in next_milestones:
            upcoming_milestones.append({
                'id': milestone.id,
                'title': milestone.title,
                'category': milestone.get_category_display(),
                'planned_start_date': milestone.planned_start_date,
                'planned_completion_date': milestone.planned_completion_date,
                'progress_percentage': milestone.progress_percentage
            })
        
        progress_data = {
            'property_id': property_obj.id,
            'property_title': property_obj.title,
            'total_milestones': total_milestones,
            'completed_milestones': completed_milestones,
            'overall_progress': round(overall_progress, 2),
            'estimated_completion_date': estimated_completion_date,
            'total_estimated_cost': total_estimated_cost,
            'total_actual_cost': total_actual_cost,
            'delayed_milestones': delayed_milestones,
            'milestone_categories': milestone_categories,
            'upcoming_milestones': upcoming_milestones
        }
        
        serializer = ConstructionProgressSerializer(progress_data)
        return Response(serializer.data)
