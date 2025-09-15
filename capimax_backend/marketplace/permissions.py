"""
Marketplace Permissions for Capimax Real Estate Tokenization Platform.

This module contains custom permission classes for marketplace operations,
ensuring proper access control and security for trading activities.
"""

from rest_framework import permissions
from django.utils import timezone


class MarketplacePermissions(permissions.BasePermission):
    """
    Custom permission class for marketplace operations.
    
    Handles role-based access control for market listings,
    orders, transactions, and related marketplace activities.
    """
    
    def has_permission(self, request, view):
        """
        Check if user has permission to access marketplace endpoints.
        """
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Check if user account is verified and not suspended
        if not request.user.is_verified:
            return False
        
        if hasattr(request.user, 'is_suspended') and request.user.is_suspended:
            return False
        
        # All verified users can view marketplace data
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For creating/modifying operations, check specific permissions
        return self._has_trading_permission(request.user, view)
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission to access specific marketplace objects.
        """
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Safe methods (GET, HEAD, OPTIONS) - allow if user can access endpoint
        if request.method in permissions.SAFE_METHODS:
            return self.has_permission(request, view)
        
        # For object-specific permissions, delegate to specific handlers
        if hasattr(obj, 'seller') and hasattr(obj, 'buyer'):
            # Trade transactions - users can only see their own
            return obj.buyer == request.user or obj.seller == request.user
        elif hasattr(obj, 'seller'):
            # Market listings - users can only modify their own
            return obj.seller == request.user
        elif hasattr(obj, 'buyer'):
            # Trade orders - users can only modify their own
            return obj.buyer == request.user
        elif hasattr(obj, 'transaction'):
            # Escrow accounts - users can only access if involved in transaction
            return (obj.transaction.buyer == request.user or 
                   obj.transaction.seller == request.user)
        
        return False
    
    def _has_trading_permission(self, user, view):
        """
        Check if user has permission to perform trading operations.
        """
        # Investors and brokers can trade
        if hasattr(user, 'role'):
            if user.role in ['investor', 'broker']:
                return True
            
            # Property owners can create sell listings for their properties
            if user.role == 'property_owner' and view.action == 'create':
                return True
        
        return False


class CanCreateListingPermission(permissions.BasePermission):
    """
    Permission to check if user can create market listings.
    """
    
    def has_permission(self, request, view):
        """Check if user can create a market listing."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff:
            return True
        
        # Check if user is verified
        if not request.user.is_verified:
            return False
        
        # Check if user has required role
        if hasattr(request.user, 'role'):
            # Investors, brokers, and property owners can create listings
            return user.role in ['investor', 'broker', 'property_owner']
        
        return True  # Default allow for verified users


class CanPlaceOrderPermission(permissions.BasePermission):
    """
    Permission to check if user can place trade orders.
    """
    
    def has_permission(self, request, view):
        """Check if user can place a trade order."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff:
            return True
        
        # Check if user is verified
        if not request.user.is_verified:
            return False
        
        # Check if user account is not suspended
        if hasattr(request.user, 'is_suspended') and request.user.is_suspended:
            return False
        
        # Check KYC completion for high-value trades
        # This would integrate with KYC verification status
        # For now, assume verified users have completed basic KYC
        
        return True


class CanViewAnalyticsPermission(permissions.BasePermission):
    """
    Permission to check if user can view market analytics.
    """
    
    def has_permission(self, request, view):
        """Check if user can view analytics data."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # All authenticated users can view basic analytics
        return True


class CanManageTradingPairsPermission(permissions.BasePermission):
    """
    Permission to manage trading pairs - Admin only.
    """
    
    def has_permission(self, request, view):
        """Check if user can manage trading pairs."""
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.is_staff or request.user.is_superuser))


class EscrowPermission(permissions.BasePermission):
    """
    Custom permission for escrow operations.
    """
    
    def has_permission(self, request, view):
        """Check basic escrow access permission."""
        return (request.user and 
                request.user.is_authenticated and 
                request.user.is_verified)
    
    def has_object_permission(self, request, view, obj):
        """Check object-level escrow permissions."""
        if request.user.is_staff:
            return True
        
        # Users can only access escrow for their own transactions
        return (obj.transaction.buyer == request.user or 
                obj.transaction.seller == request.user)


class TradingVolumePermission(permissions.BasePermission):
    """
    Permission based on user's trading volume and tier.
    """
    
    def has_permission(self, request, view):
        """Check if user meets volume requirements for certain operations."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff:
            return True
        
        # This would check user's trading volume and tier
        # For high-value operations or advanced features
        # Implementation would depend on business requirements
        
        return True


class PropertyOwnershipPermission(permissions.BasePermission):
    """
    Permission to verify property ownership for sell listings.
    """
    
    def has_permission(self, request, view):
        """Basic permission check."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check if user owns tokens for the property they're trying to sell."""
        if request.user.is_staff:
            return True
        
        # For sell listings, verify user actually owns the tokens
        # This would integrate with the investment tracking system
        # to verify token ownership before allowing sell orders
        
        if hasattr(obj, 'listing_type') and obj.listing_type == 'sell':
            # Check if user has sufficient token balance
            # Implementation would query the investments model
            # to verify ownership
            pass
        
        return True


class RateLimitPermission(permissions.BasePermission):
    """
    Permission to enforce rate limiting on trading operations.
    """
    
    def has_permission(self, request, view):
        """Check rate limiting for trading operations."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff:
            return True
        
        # Implement rate limiting logic
        # This would check number of orders/listings created
        # in a specific time window
        
        from django.core.cache import cache
        from django.utils import timezone
        
        # Example rate limiting implementation
        cache_key = f"marketplace_rate_limit_{request.user.id}"
        now = timezone.now()
        
        # Get user's recent activity from cache
        recent_activity = cache.get(cache_key, [])
        
        # Filter to last hour
        one_hour_ago = now - timezone.timedelta(hours=1)
        recent_activity = [
            timestamp for timestamp in recent_activity 
            if timestamp > one_hour_ago
        ]
        
        # Check if under rate limit (e.g., 50 operations per hour)
        if len(recent_activity) >= 50:
            return False
        
        # Add current timestamp and update cache
        recent_activity.append(now)
        cache.set(cache_key, recent_activity, 3600)  # 1 hour TTL
        
        return True


class MarketHoursPermission(permissions.BasePermission):
    """
    Permission to check if trading is allowed during current hours.
    """
    
    def has_permission(self, request, view):
        """Check if trading is allowed during current market hours."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin users can always trade
        if request.user.is_staff:
            return True
        
        # For regular users, check market hours
        # This could implement business hours, maintenance windows, etc.
        
        # Example: Allow trading 24/7 for crypto-style markets
        # Or implement traditional market hours if needed
        
        return True  # Allow 24/7 trading for now


class SuspensionCheckPermission(permissions.BasePermission):
    """
    Permission to check if user account is suspended.
    """
    
    def has_permission(self, request, view):
        """Check if user account is not suspended."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff:
            return True
        
        # Check suspension status
        if hasattr(request.user, 'is_suspended') and request.user.is_suspended:
            return False
        
        return True