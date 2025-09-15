"""
Custom Exception Handlers for Capimax Backend.

Provides standardized error responses and exception handling
for the REST API across all applications.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    
    Returns standardized JSON error responses with proper status codes
    and detailed error information for debugging.
    """
    
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Get request information for logging
    request = context.get('request')
    request_path = request.path if request else 'Unknown'
    request_method = request.method if request else 'Unknown'
    
    if response is not None:
        # Handle standard REST framework exceptions
        custom_response_data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': get_error_message(response.data),
                'details': response.data if isinstance(response.data, dict) else {},
                'path': request_path,
                'method': request_method,
            }
        }
        
        # Log the error
        log_exception(exc, custom_response_data, request)
        
        response.data = custom_response_data
        
    else:
        # Handle exceptions not handled by REST framework
        if isinstance(exc, Http404):
            custom_response_data = {
                'success': False,
                'error': {
                    'code': status.HTTP_404_NOT_FOUND,
                    'message': 'Resource not found',
                    'details': {'detail': str(exc)},
                    'path': request_path,
                    'method': request_method,
                }
            }
            response = Response(custom_response_data, status=status.HTTP_404_NOT_FOUND)
            
        elif isinstance(exc, DjangoValidationError):
            custom_response_data = {
                'success': False,
                'error': {
                    'code': status.HTTP_400_BAD_REQUEST,
                    'message': 'Validation error',
                    'details': {'validation_errors': exc.message_dict if hasattr(exc, 'message_dict') else [str(exc)]},
                    'path': request_path,
                    'method': request_method,
                }
            }
            response = Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
            
        elif isinstance(exc, IntegrityError):
            custom_response_data = {
                'success': False,
                'error': {
                    'code': status.HTTP_400_BAD_REQUEST,
                    'message': 'Database integrity error',
                    'details': {'detail': 'The operation violates database constraints'},
                    'path': request_path,
                    'method': request_method,
                }
            }
            response = Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
            
        else:
            # Handle unexpected exceptions
            custom_response_data = {
                'success': False,
                'error': {
                    'code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'message': 'Internal server error',
                    'details': {'detail': 'An unexpected error occurred'},
                    'path': request_path,
                    'method': request_method,
                }
            }
            response = Response(custom_response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        # Log the error
        log_exception(exc, custom_response_data, request)
    
    return response


def get_error_message(error_data):
    """
    Extract a user-friendly error message from error data.
    
    Args:
        error_data: Error data from the exception
        
    Returns:
        str: User-friendly error message
    """
    if isinstance(error_data, dict):
        if 'detail' in error_data:
            return str(error_data['detail'])
        elif 'non_field_errors' in error_data:
            return str(error_data['non_field_errors'][0])
        else:
            # Get first error message from any field
            for key, value in error_data.items():
                if isinstance(value, list) and value:
                    return f"{key}: {str(value[0])}"
                elif isinstance(value, str):
                    return f"{key}: {value}"
    elif isinstance(error_data, list) and error_data:
        return str(error_data[0])
    elif isinstance(error_data, str):
        return error_data
    
    return "An error occurred"


def log_exception(exc, response_data, request):
    """
    Log exception details for monitoring and debugging.
    
    Args:
        exc: The exception that occurred
        response_data: The response data being returned
        request: The request object
    """
    user_info = "Anonymous"
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user_info = f"User {request.user.id} ({request.user.email})"
    
    logger.error(
        f"Exception occurred: {exc.__class__.__name__}: {str(exc)} | "
        f"Path: {response_data['error']['path']} | "
        f"Method: {response_data['error']['method']} | "
        f"User: {user_info} | "
        f"Status: {response_data['error']['code']}",
        exc_info=True
    )


class CapimaxAPIException(Exception):
    """Base exception class for Capimax API exceptions."""
    
    def __init__(self, message, status_code=status.HTTP_400_BAD_REQUEST, details=None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class InsufficientFundsException(CapimaxAPIException):
    """Exception raised when user has insufficient funds for an operation."""
    
    def __init__(self, required_amount, available_amount):
        message = f"Insufficient funds. Required: ${required_amount}, Available: ${available_amount}"
        details = {
            'required_amount': str(required_amount),
            'available_amount': str(available_amount),
        }
        super().__init__(message, status.HTTP_402_PAYMENT_REQUIRED, details)


class KYCNotCompletedException(CapimaxAPIException):
    """Exception raised when KYC verification is required but not completed."""
    
    def __init__(self):
        message = "KYC verification is required to perform this action"
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class PropertyNotAvailableException(CapimaxAPIException):
    """Exception raised when property is not available for investment."""
    
    def __init__(self, property_id, reason="Property is not available"):
        message = f"Property {property_id} is not available: {reason}"
        details = {'property_id': str(property_id), 'reason': reason}
        super().__init__(message, status.HTTP_409_CONFLICT, details)


class TokensExceedAvailableException(CapimaxAPIException):
    """Exception raised when requested tokens exceed available tokens."""
    
    def __init__(self, requested_tokens, available_tokens):
        message = f"Requested tokens ({requested_tokens}) exceed available tokens ({available_tokens})"
        details = {
            'requested_tokens': requested_tokens,
            'available_tokens': available_tokens,
        }
        super().__init__(message, status.HTTP_409_CONFLICT, details)


class PaymentProcessingException(CapimaxAPIException):
    """Exception raised when payment processing fails."""
    
    def __init__(self, reason, payment_method=None):
        message = f"Payment processing failed: {reason}"
        details = {'reason': reason}
        if payment_method:
            details['payment_method'] = payment_method
        super().__init__(message, status.HTTP_402_PAYMENT_REQUIRED, details)


class BlockchainException(CapimaxAPIException):
    """Exception raised when blockchain operations fail."""
    
    def __init__(self, operation, reason):
        message = f"Blockchain operation '{operation}' failed: {reason}"
        details = {'operation': operation, 'reason': reason}
        super().__init__(message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


class InvestmentError(CapimaxAPIException):
    """Exception raised during investment processing."""
    
    def __init__(self, message, details=None):
        super().__init__(message, status.HTTP_400_BAD_REQUEST, details)