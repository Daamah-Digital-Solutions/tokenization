"""
Django admin configuration for Properties app.
"""

from django.contrib import admin
from .models import (
    Property, PropertyImage, PropertyDocument, PropertyUpdate,
    PropertySubscription, PropertyReview, PropertyValuation,
    PropertyAnalytics, PropertyViewLog, PropertyApproval,
    PropertyMarketData
)


class PropertyImageInline(admin.TabularInline):
    """Inline admin for property images."""
    model = PropertyImage
    extra = 1
    fields = ['image', 'caption', 'is_primary', 'order']


class PropertyDocumentInline(admin.TabularInline):
    """Inline admin for property documents."""
    model = PropertyDocument
    extra = 0
    fields = ['name', 'document', 'document_type', 'description']
    readonly_fields = ['size']


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """Admin interface for Property model."""
    
    list_display = [
        'title', 'property_type', 'status', 'city', 'country',
        'total_value', 'token_price', 'tokens_sold', 'funding_percentage',
        'featured', 'created_at'
    ]
    
    list_filter = [
        'property_type', 'status', 'featured', 'country', 'created_at'
    ]
    
    search_fields = ['title', 'description', 'city', 'address', 'owner__email']
    
    readonly_fields = [
        'id', 'tokens_available', 'funding_percentage', 'is_fully_funded',
        'can_accept_investments', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'property_type', 'status', 'owner')
        }),
        ('Financial Details', {
            'fields': (
                'total_value', 'token_price', 'total_tokens', 'tokens_sold',
                'expected_return', 'rental_yield', 'minimum_investment'
            )
        }),
        ('Property Details', {
            'fields': (
                'property_size', 'year_built', 'address', 'city', 'state', 'country',
                'latitude', 'longitude'
            )
        }),
        ('Platform Settings', {
            'fields': ('featured', 'smart_contract_address')
        }),
        ('SPV (Special Purpose Vehicle)', {
            'fields': (
                'spv_company_name', 'spv_registration_number',
                'spv_bank_account_number', 'spv_bank_name',
                'spv_establishment_date'
            ),
            'description': 'Legal entity details for this property. Fill after SPV is legally established.',
        }),
        ('Computed Fields', {
            'fields': (
                'tokens_available', 'funding_percentage', 'is_fully_funded',
                'can_accept_investments'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [PropertyImageInline, PropertyDocumentInline]


@admin.register(PropertyAnalytics)
class PropertyAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for PropertyAnalytics model."""
    
    list_display = [
        'property', 'total_views', 'unique_views', 'total_subscriptions',
        'conversion_rate', 'last_updated'
    ]
    readonly_fields = ['last_updated', 'created_at']
    search_fields = ['property__title']


@admin.register(PropertyApproval)
class PropertyApprovalAdmin(admin.ModelAdmin):
    """Admin interface for PropertyApproval model."""
    
    list_display = [
        'property', 'status', 'reviewer', 'submitted_at', 'reviewed_at'
    ]
    list_filter = ['status', 'submitted_at', 'reviewed_at']
    search_fields = ['property__title', 'reviewer__email']
    readonly_fields = ['submitted_at']
