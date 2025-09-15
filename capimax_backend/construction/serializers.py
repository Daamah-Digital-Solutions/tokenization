"""
Construction Milestone Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for construction milestone management,
progress tracking, and milestone-related operations.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ConstructionMilestone, MilestoneUpdate, MilestoneImage,
    MilestoneDocument, MilestoneStatus, MilestoneCategory
)

User = get_user_model()


class MilestoneImageSerializer(serializers.ModelSerializer):
    """Serializer for milestone images."""
    
    image_url = serializers.SerializerMethodField()
    uploaded_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = MilestoneImage
        fields = [
            'id', 'image', 'image_url', 'caption', 'taken_at',
            'uploaded_by'
        ]
        read_only_fields = ['id', 'taken_at', 'uploaded_by']
    
    def get_image_url(self, obj):
        """Get the full URL for the image."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None


class MilestoneDocumentSerializer(serializers.ModelSerializer):
    """Serializer for milestone documents."""
    
    document_url = serializers.SerializerMethodField()
    uploaded_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = MilestoneDocument
        fields = [
            'id', 'name', 'document', 'document_url', 'document_type',
            'description', 'size', 'uploaded_by', 'uploaded_at'
        ]
        read_only_fields = ['id', 'size', 'uploaded_by', 'uploaded_at']
    
    def get_document_url(self, obj):
        """Get the full URL for the document."""
        if obj.document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.url)
        return None


class MilestoneUpdateSerializer(serializers.ModelSerializer):
    """Serializer for milestone updates."""
    
    author = serializers.StringRelatedField(read_only=True)
    author_name = serializers.SerializerMethodField()
    
    class Meta:
        model = MilestoneUpdate
        fields = [
            'id', 'title', 'description', 'progress_change',
            'author', 'author_name', 'created_at'
        ]
        read_only_fields = ['id', 'author', 'created_at']
    
    def get_author_name(self, obj):
        """Get author's display name."""
        if obj.author.first_name or obj.author.last_name:
            return f"{obj.author.first_name} {obj.author.last_name}".strip()
        return obj.author.email.split('@')[0]
    
    def create(self, validated_data):
        """Create milestone update and update milestone progress."""
        milestone = validated_data['milestone']
        progress_change = validated_data['progress_change']
        
        # Update milestone progress
        new_progress = milestone.progress_percentage + progress_change
        new_progress = max(0, min(100, new_progress))  # Clamp between 0-100
        milestone.progress_percentage = new_progress
        milestone.save(update_fields=['progress_percentage'])
        
        return super().create(validated_data)


class ConstructionMilestoneListSerializer(serializers.ModelSerializer):
    """Serializer for milestone list view with limited fields."""
    
    inspector_name = serializers.SerializerMethodField()
    is_delayed = serializers.ReadOnlyField()
    days_delayed = serializers.ReadOnlyField()
    updates_count = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ConstructionMilestone
        fields = [
            'id', 'title', 'description', 'category', 'status',
            'planned_start_date', 'planned_completion_date',
            'actual_start_date', 'actual_completion_date',
            'progress_percentage', 'estimated_cost', 'actual_cost',
            'contractor', 'inspector_name', 'order',
            'is_delayed', 'days_delayed', 'updates_count',
            'images_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_delayed', 'days_delayed', 'updates_count',
            'images_count', 'created_at', 'updated_at'
        ]
    
    def get_inspector_name(self, obj):
        """Get inspector's display name."""
        if obj.inspector:
            if obj.inspector.first_name or obj.inspector.last_name:
                return f"{obj.inspector.first_name} {obj.inspector.last_name}".strip()
            return obj.inspector.email.split('@')[0]
        return None
    
    def get_updates_count(self, obj):
        """Get number of updates for this milestone."""
        return obj.updates.count()
    
    def get_images_count(self, obj):
        """Get number of images for this milestone."""
        return obj.images.count()


class ConstructionMilestoneDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed milestone view with all related data."""
    
    updates = MilestoneUpdateSerializer(many=True, read_only=True)
    images = MilestoneImageSerializer(many=True, read_only=True)
    documents = MilestoneDocumentSerializer(many=True, read_only=True)
    inspector_name = serializers.SerializerMethodField()
    is_delayed = serializers.ReadOnlyField()
    days_delayed = serializers.ReadOnlyField()
    property_title = serializers.CharField(source='property_obj.title', read_only=True)
    
    class Meta:
        model = ConstructionMilestone
        fields = [
            'id', 'property_obj', 'property_title', 'title', 'description',
            'category', 'status', 'planned_start_date', 'planned_completion_date',
            'actual_start_date', 'actual_completion_date', 'progress_percentage',
            'estimated_cost', 'actual_cost', 'contractor', 'inspector',
            'inspector_name', 'inspection_date', 'inspection_notes',
            'order', 'is_delayed', 'days_delayed', 'updates', 'images',
            'documents', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'property_title', 'is_delayed', 'days_delayed',
            'created_at', 'updated_at'
        ]
    
    def get_inspector_name(self, obj):
        """Get inspector's display name."""
        if obj.inspector:
            if obj.inspector.first_name or obj.inspector.last_name:
                return f"{obj.inspector.first_name} {obj.inspector.last_name}".strip()
            return obj.inspector.email.split('@')[0]
        return None


class ConstructionMilestoneCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating milestones."""
    
    class Meta:
        model = ConstructionMilestone
        fields = [
            'title', 'description', 'category', 'planned_start_date',
            'planned_completion_date', 'estimated_cost', 'contractor',
            'order'
        ]
    
    def validate(self, attrs):
        """Validate milestone data."""
        planned_start = attrs.get('planned_start_date')
        planned_end = attrs.get('planned_completion_date')
        
        if planned_start and planned_end and planned_start >= planned_end:
            raise serializers.ValidationError(
                "Planned completion date must be after planned start date"
            )
        
        return attrs


class MilestoneVerificationSerializer(serializers.Serializer):
    """Serializer for milestone verification by inspectors."""
    
    status = serializers.ChoiceField(
        choices=[
            ('completed', 'Completed'),
            ('verified', 'Verified'),
            ('delayed', 'Delayed'),
        ]
    )
    inspection_notes = serializers.CharField(required=False, allow_blank=True)
    actual_completion_date = serializers.DateField(required=False)
    actual_cost = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False
    )
    
    def validate(self, attrs):
        """Validate verification data."""
        status = attrs.get('status')
        
        if status in ['completed', 'verified'] and not attrs.get('actual_completion_date'):
            raise serializers.ValidationError(
                "Actual completion date is required for completed/verified milestones"
            )
        
        return attrs


class ConstructionProgressSerializer(serializers.Serializer):
    """Serializer for overall construction progress data."""
    
    property_id = serializers.UUIDField()
    property_title = serializers.CharField()
    total_milestones = serializers.IntegerField()
    completed_milestones = serializers.IntegerField()
    overall_progress = serializers.DecimalField(max_digits=5, decimal_places=2)
    estimated_completion_date = serializers.DateField(allow_null=True)
    total_estimated_cost = serializers.DecimalField(max_digits=15, decimal_places=2, allow_null=True)
    total_actual_cost = serializers.DecimalField(max_digits=15, decimal_places=2, allow_null=True)
    delayed_milestones = serializers.IntegerField()
    milestone_categories = serializers.DictField()
    upcoming_milestones = serializers.ListField()