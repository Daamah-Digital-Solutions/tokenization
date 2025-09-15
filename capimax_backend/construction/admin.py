"""
Django admin configuration for Construction app.
"""

from django.contrib import admin
from .models import (
    ConstructionMilestone, MilestoneUpdate, MilestoneImage,
    MilestoneDocument
)


@admin.register(ConstructionMilestone)
class ConstructionMilestoneAdmin(admin.ModelAdmin):
    """Admin interface for ConstructionMilestone model."""
    
    list_display = [
        'title', 'property_obj', 'category', 'status', 'progress_percentage',
        'planned_start_date', 'planned_completion_date', 'is_delayed'
    ]
    
    list_filter = [
        'category', 'status', 'planned_start_date', 'planned_completion_date'
    ]
    
    search_fields = ['title', 'description', 'property_obj__title', 'contractor']
    
    readonly_fields = ['id', 'is_delayed', 'days_delayed', 'created_at', 'updated_at']
