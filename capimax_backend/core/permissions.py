"""
Custom Permission Classes for Capimax Backend.

Provides role-based and action-based permissions for the REST API
based on user roles and verification status.
"""

from rest_framework import permissions
from rest_framework.permissions import BasePermission
from accounts.models import UserRole


class IsOwnerOrReadOnly(BasePermission):
    """
    Permission to only allow owners of an object to edit it.
    Read permissions are allowed to any authenticated user.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only to the owner of the object
        return obj.user == request.user


class IsVerifiedUser(BasePermission):
    """
    Permission to only allow verified users to access the view.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_verified
        )


class IsInvestorUser(BasePermission):
    """
    Permission to only allow users with investor role.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.INVESTOR and
            request.user.is_verified
        )


class IsPropertyOwnerUser(BasePermission):
    """
    Permission to only allow users with property owner role.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.PROPERTY_OWNER and
            request.user.is_verified
        )


class IsBrokerUser(BasePermission):
    """
    Permission to only allow users with broker role.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.BROKER and
            request.user.is_verified
        )


class IsAdminUser(BasePermission):
    """
    Permission to only allow users with admin role.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )


class IsNotSuspended(BasePermission):
    """
    Permission to block suspended users from ALL actions.
    This should be added to permission_classes for financial endpoints.
    """
    message = "Your account has been suspended. Please contact support."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True  # Let other permissions handle auth

        # Check if user is suspended
        if getattr(request.user, 'is_suspended', False):
            return False

        return True


class IsKYCApproved(BasePermission):
    """
    Permission to only allow users with approved KYC status.
    Required for financial transactions like investments.
    """
    message = "KYC verification required. Please complete your identity verification before investing."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user has KYC profile and it's approved
        kyc_profile = getattr(request.user, 'kyc_profile', None)
        if not kyc_profile:
            return False

        # Check if KYC status is approved
        return kyc_profile.status == 'approved'


class CanInvest(BasePermission):
    """
    Permission for users who can make investments.
    Allows investors and brokers who are verified.
    NOTE: This checks basic eligibility. Use with IsKYCApproved for financial actions.
    """

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.can_invest()
        )


class CanInvestWithKYC(BasePermission):
    """
    Combined permission for investment actions.
    Checks: authenticated + not suspended + can invest + KYC approved.
    Use this for investment creation endpoints.
    """
    message = "You are not eligible to invest. Please ensure your account is verified and KYC is approved."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Check suspension
        if getattr(user, 'is_suspended', False):
            self.message = "Your account has been suspended. Please contact support."
            return False

        # Check basic investment eligibility
        if not user.can_invest():
            self.message = "Your account is not eligible to invest."
            return False

        # Check KYC approval
        kyc_profile = getattr(user, 'kyc_profile', None)
        if not kyc_profile:
            self.message = "Please complete your KYC verification before investing."
            return False

        if kyc_profile.status != 'approved':
            status_messages = {
                'pending': "Your KYC is pending review. Please wait for approval.",
                'in_review': "Your KYC is being reviewed. Please wait for approval.",
                'rejected': "Your KYC was rejected. Please resubmit your documents.",
            }
            self.message = status_messages.get(
                kyc_profile.status,
                "KYC verification required before investing."
            )
            return False

        return True


class CanListProperties(BasePermission):
    """
    Permission for users who can list properties.
    Only allows verified property owners.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.can_list_properties()
        )


class IsPropertyOwner(BasePermission):
    """
    Permission to check if user owns a specific property.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if the user owns the property
        return obj.owner == request.user


class CanViewInvestments(BasePermission):
    """
    Permission to view investment data.
    Allows users to view their own investments, and admins to view all.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_verified
        )
    
    def has_object_permission(self, request, view, obj):
        # Users can view their own investments, admins can view all
        return (
            obj.user == request.user or
            request.user.role == UserRole.ADMIN
        )


class CanManageKYC(BasePermission):
    """
    Permission for KYC management.
    Users can manage their own KYC, admins can manage all.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated
        )
    
    def has_object_permission(self, request, view, obj):
        # Users can manage their own KYC, admins can manage all
        return (
            obj.user == request.user or
            request.user.role == UserRole.ADMIN
        )


class CanViewPayments(BasePermission):
    """
    Permission to view payment data.
    Users can view their own payments, admins can view all.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated
        )
    
    def has_object_permission(self, request, view, obj):
        # Users can view their own payments, admins can view all
        return (
            obj.user == request.user or
            request.user.role == UserRole.ADMIN
        )


class CanManageConstructionMilestones(BasePermission):
    """
    Permission to manage construction milestones.
    Property owners can manage their property milestones, admins can manage all.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role == UserRole.PROPERTY_OWNER or
                request.user.role == UserRole.ADMIN
            )
        )
    
    def has_object_permission(self, request, view, obj):
        # Property owners can manage their property milestones, admins can manage all
        return (
            obj.property.owner == request.user or
            request.user.role == UserRole.ADMIN
        )


class CanManageBrokerData(BasePermission):
    """
    Permission to manage broker-specific data.
    Brokers can manage their own data, admins can manage all.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role == UserRole.BROKER or
                request.user.role == UserRole.ADMIN
            )
        )
    
    def has_object_permission(self, request, view, obj):
        # Brokers can manage their own data, admins can manage all
        return (
            obj.broker == request.user or
            request.user.role == UserRole.ADMIN
        )


class DynamicRolePermission(BasePermission):
    """
    Dynamic permission class that checks permissions based on view configuration.
    
    Usage in views:
    required_roles = [UserRole.ADMIN, UserRole.PROPERTY_OWNER]
    required_verification = True
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if view requires specific roles
        required_roles = getattr(view, 'required_roles', None)
        if required_roles:
            if request.user.role not in required_roles:
                return False
        
        # Check if view requires verification
        required_verification = getattr(view, 'required_verification', False)
        if required_verification and not request.user.is_verified:
            return False
        
        return True


class ReadOnlyOrAuthenticated(BasePermission):
    """
    Permission to allow read-only access to anonymous users,
    but require authentication for write operations.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return bool(
            request.user and
            request.user.is_authenticated
        )


class AdminOrReadOnly(BasePermission):
    """
    Permission to allow read access to any user,
    but write access only to admin users.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Permission to allow access to owners of objects or admin users.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated
        )
    
    def has_object_permission(self, request, view, obj):
        # Admin users can access all objects
        if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
            return True
        elif hasattr(request.user, 'role') and request.user.role == UserRole.ADMIN:
            return True
        elif request.user.is_staff:
            return True
        
        # Check if the user owns the object (via user field)
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if the user owns the object (via owner field)
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # Check if the user owns the object (via investor field)
        if hasattr(obj, 'investor'):
            return obj.investor == request.user
        
        # Check if the user owns the object (via recipient field)
        if hasattr(obj, 'recipient'):
            return obj.recipient == request.user
        
        return False


# Updated IsAdminUser to be more flexible
class IsAdminUserFlexible(BasePermission):
    """
    Permission to only allow admin users with flexible admin checking.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check multiple possible admin indicators
        if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
            return True
        elif hasattr(request.user, 'role') and request.user.role == UserRole.ADMIN:
            return True
        elif request.user.is_staff:
            return True
        
        return False