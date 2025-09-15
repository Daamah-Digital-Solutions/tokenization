"""
Django Admin configuration for accounts app.

Provides admin interface for user management, authentication tokens,
and session tracking.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, PasswordResetToken, EmailVerificationToken, UserSession


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User admin with role-based filtering and comprehensive user management.
    """
    
    list_display = (
        'email', 'first_name', 'last_name', 'role', 'is_verified',
        'two_factor_enabled', 'is_active', 'is_suspended', 'created_at'
    )
    list_filter = (
        'role', 'is_verified', 'two_factor_enabled', 'is_active', 
        'is_suspended', 'is_staff', 'is_superuser', 'created_at'
    )
    search_fields = ('email', 'first_name', 'last_name', 'phone')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'phone', 'date_of_birth')
        }),
        ('Address', {
            'fields': ('country', 'city', 'state', 'address', 'postal_code'),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Security', {
            'fields': (
                'is_verified', 'two_factor_enabled', 'wallet_address',
                'last_login_ip', 'login_attempts'
            ),
            'classes': ('collapse',)
        }),
        ('Suspension', {
            'fields': ('is_suspended', 'suspension_reason'),
            'classes': ('collapse',)
        }),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2', 'first_name', 'last_name',
                'role', 'country'
            ),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related()


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """
    Admin interface for password reset tokens.
    """
    
    list_display = ('user', 'token', 'expires_at', 'used', 'created_at')
    list_filter = ('used', 'expires_at', 'created_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('token', 'created_at')
    ordering = ('-created_at',)
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    """
    Admin interface for email verification tokens.
    """
    
    list_display = ('user', 'token', 'expires_at', 'verified', 'created_at')
    list_filter = ('verified', 'expires_at', 'created_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('token', 'created_at')
    ordering = ('-created_at',)
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """
    Admin interface for user sessions.
    """
    
    list_display = (
        'user', 'session_key_short', 'ip_address', 'is_active',
        'created_at', 'last_activity'
    )
    list_filter = ('is_active', 'created_at', 'last_activity')
    search_fields = ('user__email', 'ip_address', 'session_key')
    readonly_fields = ('session_key', 'created_at', 'last_activity')
    ordering = ('-last_activity',)
    
    def session_key_short(self, obj):
        """Display shortened session key for readability."""
        return f"{obj.session_key[:8]}...{obj.session_key[-8:]}"
    session_key_short.short_description = 'Session Key'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')


# Customize admin site headers
admin.site.site_header = "Capimax Real Estate Tokenization Admin"
admin.site.site_title = "Capimax Admin Portal"
admin.site.index_title = "Welcome to Capimax Administration"
