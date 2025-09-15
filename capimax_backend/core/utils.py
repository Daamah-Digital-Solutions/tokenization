"""
Core Utilities for Capimax Backend.

Common utility functions used across different apps including
response formatting, validation helpers, and data processing.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from decimal import Decimal, ROUND_HALF_UP
import secrets
import string
import hashlib
import hmac
from typing import Dict, Any, Optional, List


class CustomPagination(PageNumberPagination):
    """
    Custom pagination class with configurable page size and detailed metadata.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        """Return paginated response with additional metadata."""
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'page_size': self.get_page_size(self.request),
            'results': data
        })


def create_success_response(data: Any = None, message: str = "Success", status_code: int = 200) -> Dict[str, Any]:
    """
    Create a standardized success response format.
    
    Args:
        data: Response data to include
        message: Success message
        status_code: HTTP status code
        
    Returns:
        Dict containing standardized success response
    """
    response = {
        'success': True,
        'message': message,
        'status_code': status_code,
    }
    
    if data is not None:
        response['data'] = data
        
    return response


def create_error_response(message: str, status_code: int = 400, details: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Create a standardized error response format.
    
    Args:
        message: Error message
        status_code: HTTP status code
        details: Additional error details
        
    Returns:
        Dict containing standardized error response
    """
    response = {
        'success': False,
        'error': {
            'message': message,
            'status_code': status_code,
        }
    }
    
    if details:
        response['error']['details'] = details
        
    return response


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.
    
    Args:
        length: Length of the token to generate
        
    Returns:
        Secure random token string
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_referral_code(user_id: str) -> str:
    """
    Generate a unique referral code for a user.
    
    Args:
        user_id: User ID to generate code for
        
    Returns:
        Unique referral code
    """
    # Use first 8 characters of user ID + random string
    random_part = generate_secure_token(8)
    return f"{str(user_id)[:8].upper()}{random_part.upper()}"


def calculate_commission(amount: Decimal, rate: Decimal) -> Decimal:
    """
    Calculate commission amount based on investment amount and rate.
    
    Args:
        amount: Investment amount
        rate: Commission rate (e.g., 0.025 for 2.5%)
        
    Returns:
        Commission amount rounded to 2 decimal places
    """
    commission = amount * rate
    return commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_token_price(total_value: Decimal, total_tokens: int) -> Decimal:
    """
    Calculate price per token based on total property value and token count.
    
    Args:
        total_value: Total property value
        total_tokens: Total number of tokens
        
    Returns:
        Price per token rounded to 2 decimal places
    """
    if total_tokens <= 0:
        raise ValueError("Total tokens must be greater than 0")
    
    price_per_token = total_value / Decimal(total_tokens)
    return price_per_token.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_ownership_percentage(tokens_owned: int, total_tokens: int) -> Decimal:
    """
    Calculate ownership percentage based on tokens owned.
    
    Args:
        tokens_owned: Number of tokens owned by user
        total_tokens: Total number of tokens in the property
        
    Returns:
        Ownership percentage as decimal (e.g., 0.05 for 5%)
    """
    if total_tokens <= 0:
        raise ValueError("Total tokens must be greater than 0")
    
    percentage = Decimal(tokens_owned) / Decimal(total_tokens)
    return percentage.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)


def validate_investment_amount(amount: Decimal, token_price: Decimal, min_investment: Decimal = None) -> bool:
    """
    Validate if investment amount meets minimum requirements.
    
    Args:
        amount: Investment amount to validate
        token_price: Price per token
        min_investment: Minimum investment amount
        
    Returns:
        True if amount is valid
        
    Raises:
        ValueError: If amount is invalid
    """
    if amount <= 0:
        raise ValueError("Investment amount must be greater than 0")
    
    if min_investment and amount < min_investment:
        raise ValueError(f"Investment amount must be at least ${min_investment}")
    
    # Check if amount allows purchase of at least 1 token
    if amount < token_price:
        raise ValueError(f"Investment amount must be at least ${token_price} (price of 1 token)")
    
    return True


def calculate_tokens_for_amount(amount: Decimal, token_price: Decimal) -> int:
    """
    Calculate how many tokens can be purchased with given amount.
    
    Args:
        amount: Investment amount
        token_price: Price per token
        
    Returns:
        Number of tokens that can be purchased
    """
    if token_price <= 0:
        raise ValueError("Token price must be greater than 0")
    
    tokens = int(amount / token_price)
    return tokens


def format_currency(amount: Decimal, currency: str = 'USD') -> str:
    """
    Format currency amount for display.
    
    Args:
        amount: Amount to format
        currency: Currency code
        
    Returns:
        Formatted currency string
    """
    if currency == 'USD':
        return f"${amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency}"


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify webhook signature using HMAC.
    
    Args:
        payload: Raw webhook payload
        signature: Signature from webhook headers
        secret: Webhook secret key
        
    Returns:
        True if signature is valid
    """
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Remove 'sha256=' prefix if present
    if signature.startswith('sha256='):
        signature = signature[7:]
    
    return hmac.compare_digest(expected_signature, signature)


def send_notification_email(
    to_email: str,
    subject: str,
    message: str,
    from_email: str = None,
    html_message: str = None
) -> bool:
    """
    Send notification email to user.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        message: Plain text message
        from_email: Sender email (optional)
        html_message: HTML message (optional)
        
    Returns:
        True if email sent successfully
    """
    try:
        if from_email is None:
            from_email = settings.DEFAULT_FROM_EMAIL
        
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        # Log the error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def paginate_queryset(queryset, page_size: int = 20, page: int = 1) -> Dict[str, Any]:
    """
    Manually paginate a queryset and return pagination info.
    
    Args:
        queryset: Django queryset to paginate
        page_size: Items per page
        page: Page number (1-based)
        
    Returns:
        Dict with paginated data and pagination info
    """
    total_items = queryset.count()
    total_pages = (total_items + page_size - 1) // page_size
    
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    
    items = list(queryset[start_index:end_index])
    
    return {
        'items': items,
        'pagination': {
            'current_page': page,
            'page_size': page_size,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_previous': page > 1,
            'next_page': page + 1 if page < total_pages else None,
            'previous_page': page - 1 if page > 1 else None,
        }
    }


def clean_phone_number(phone: str) -> str:
    """
    Clean and format phone number.
    
    Args:
        phone: Raw phone number string
        
    Returns:
        Cleaned phone number
    """
    if not phone:
        return ""
    
    # Remove all non-digit characters except +
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
    
    return cleaned


def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """
    Validate file extension against allowed extensions.
    
    Args:
        filename: Name of the file
        allowed_extensions: List of allowed extensions (e.g., ['pdf', 'jpg'])
        
    Returns:
        True if extension is allowed
    """
    if not filename or '.' not in filename:
        return False
    
    extension = filename.lower().split('.')[-1]
    return extension in [ext.lower() for ext in allowed_extensions]


def get_client_ip(request) -> str:
    """
    Get client IP address from request.
    
    Args:
        request: Django request object
        
    Returns:
        Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def is_within_business_hours(dt=None, timezone_name='UTC') -> bool:
    """
    Check if given datetime is within business hours (9 AM - 5 PM).
    
    Args:
        dt: Datetime to check (defaults to now)
        timezone_name: Timezone name
        
    Returns:
        True if within business hours
    """
    if dt is None:
        dt = timezone.now()
    
    # Simple business hours check (9 AM - 5 PM)
    hour = dt.hour
    weekday = dt.weekday()  # Monday = 0, Sunday = 6
    
    # Monday to Friday, 9 AM to 5 PM
    return 0 <= weekday <= 4 and 9 <= hour < 17


def generate_backup_codes(count: int = 8) -> List[str]:
    """
    Generate backup codes for 2FA recovery.
    
    Args:
        count: Number of backup codes to generate
        
    Returns:
        List of backup codes
    """
    codes = []
    for _ in range(count):
        # Generate 8-digit codes
        code = ''.join(secrets.choice(string.digits) for _ in range(8))
        # Add hyphen in middle for readability
        formatted_code = f"{code[:4]}-{code[4:]}"
        codes.append(formatted_code)
    
    return codes