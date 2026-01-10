"""
Email Service for CapiMax Investment Platform

This service handles all email notifications using HTML templates
and the configured SMTP settings.
"""

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class EmailService:
    """
    Centralized email service for sending templated emails.

    Handles HTML email templates with fallback text versions
    and provides methods for all email types in the platform.
    """

    @staticmethod
    def _send_templated_email(
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        from_email: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List] = None
    ) -> bool:
        """
        Send a templated email with HTML content.

        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Template name without extension (e.g., 'welcome_verification')
            context: Template context variables
            from_email: Sender email (uses DEFAULT_FROM_EMAIL if None)
            cc: CC recipients
            bcc: BCC recipients
            attachments: List of attachments

        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            # Use default from email if not specified
            if not from_email:
                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@capimaxinvestment.com')

            # Render HTML template
            html_content = render_to_string(f'emails/{template_name}.html', context)

            # Create email message with UTF-8 encoding
            email = EmailMultiAlternatives(
                subject=subject,
                body=f"Please view this email in HTML format.",  # Fallback text
                from_email=from_email,
                to=[to_email],
                cc=cc or [],
                bcc=bcc or []
            )

            # Set encoding to UTF-8 to handle Unicode characters
            email.encoding = 'utf-8'

            # Attach HTML content with UTF-8 encoding
            email.attach_alternative(html_content, "text/html")

            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    email.attach(*attachment)

            # Send email
            email.send()

            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def send_welcome_verification_email(user, verification_url: str, verification_code: Optional[str] = None) -> bool:
        """
        Send welcome and email verification email to new users.

        Args:
            user: User object
            verification_url: URL for email verification
            verification_code: Optional verification code

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'verification_url': verification_url,
            'verification_code': verification_code,
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject="Welcome to CapiMax - Verify Your Email",
            template_name='welcome_verification',
            context=context
        )

    @staticmethod
    def send_password_reset_email(user, reset_url: str, request_info: Dict[str, Any]) -> bool:
        """
        Send password reset email.

        Args:
            user: User object
            reset_url: Password reset URL
            request_info: Dictionary containing request details (ip, user_agent, etc.)

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'reset_url': reset_url,
            'request_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': request_info.get('ip_address', 'Unknown'),
            'user_agent': request_info.get('user_agent', 'Unknown Browser'),
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject="Reset Your CapiMax Password",
            template_name='password_reset',
            context=context
        )

    @staticmethod
    def send_password_changed_email(user, change_info: Dict[str, Any]) -> bool:
        """
        Send password change confirmation email.

        Args:
            user: User object
            change_info: Dictionary containing change details

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'change_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': change_info.get('ip_address', 'Unknown'),
            'user_agent': change_info.get('user_agent', 'Unknown Browser'),
            'location': change_info.get('location', 'Unknown Location'),
            'dashboard_url': change_info.get('dashboard_url', '#'),
            'security_settings_url': change_info.get('security_settings_url', '#'),
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject="CapiMax Password Changed Successfully",
            template_name='password_changed',
            context=context
        )

    @staticmethod
    def send_security_alert_email(user, alert_info: Dict[str, Any]) -> bool:
        """
        Send security alert email for suspicious activities.

        Args:
            user: User object
            alert_info: Dictionary containing alert details

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'alert_type': alert_info.get('alert_type', 'Security Alert'),
            'alert_message': alert_info.get('message', 'Suspicious activity detected'),
            'event_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': alert_info.get('ip_address', 'Unknown'),
            'user_agent': alert_info.get('user_agent', 'Unknown Browser'),
            'location': alert_info.get('location', 'Unknown Location'),
            'recommended_actions': alert_info.get('recommended_actions', []),
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject=f"CapiMax Security Alert - {alert_info.get('alert_type', 'Account Activity')}",
            template_name='security_alert',
            context=context
        )

    @staticmethod
    def send_investment_confirmation_email(user, investment_details: Dict[str, Any]) -> bool:
        """
        Send investment confirmation email.

        Args:
            user: User object
            investment_details: Dictionary containing investment details

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'investment': investment_details,
            'confirmation_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject=f"Investment Confirmation - {investment_details.get('property_name', 'Property Investment')}",
            template_name='investment_confirmation',
            context=context
        )

    @staticmethod
    def send_funds_notification_email(user, transaction_details: Dict[str, Any]) -> bool:
        """
        Send funds deposit/withdrawal notification email.

        Args:
            user: User object
            transaction_details: Dictionary containing transaction details

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'transaction': transaction_details,
            'transaction_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'current_year': timezone.now().year,
        }

        transaction_type = transaction_details.get('type', 'Transaction')
        subject = f"CapiMax {transaction_type} Confirmation - ${transaction_details.get('amount', '0')}"

        return EmailService._send_templated_email(
            to_email=user.email,
            subject=subject,
            template_name='funds_notification',
            context=context
        )

    @staticmethod
    def send_dividend_notification_email(user, dividend_details: Dict[str, Any]) -> bool:
        """
        Send dividend distribution notification email.

        Args:
            user: User object
            dividend_details: Dictionary containing dividend details

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'dividend': dividend_details,
            'distribution_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject=f"Dividend Payment Received - ${dividend_details.get('amount', '0')}",
            template_name='dividend_notification',
            context=context
        )

    @staticmethod
    def send_property_submission_email(user, property_details: Dict[str, Any]) -> bool:
        """
        Send property submission confirmation email.

        Args:
            user: User object (property owner)
            property_details: Dictionary containing property details

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'property': property_details,
            'submission_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject=f"Property Submission Received - {property_details.get('title', 'Your Property')}",
            template_name='property_submission',
            context=context
        )

    @staticmethod
    def send_property_status_update_email(user, property_details: Dict[str, Any], status_update: Dict[str, Any]) -> bool:
        """
        Send property status update email.

        Args:
            user: User object (property owner)
            property_details: Dictionary containing property details
            status_update: Dictionary containing status change details

        Returns:
            bool: Success status
        """
        context = {
            'user': user,
            'property': property_details,
            'status_update': status_update,
            'update_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'current_year': timezone.now().year,
        }

        return EmailService._send_templated_email(
            to_email=user.email,
            subject=f"Property Status Update - {property_details.get('title', 'Your Property')}",
            template_name='property_status_update',
            context=context
        )

    @staticmethod
    def send_kyc_status_update_email(user, status: str, message: str, dashboard_url: str = None) -> bool:
        """
        Send KYC status update notification email.

        Args:
            user: User object
            status: New KYC status ('approved', 'rejected', 'pending_review')
            message: Detailed message about the status update
            dashboard_url: URL to user dashboard (optional)

        Returns:
            bool: Success status
        """
        status_display_map = {
            'approved': 'Approved ✅',
            'rejected': 'Requires Review ⚠️',
            'pending_review': 'Under Review 🔍',
            'not_verified': 'Not Started 📋'
        }

        status_colors = {
            'approved': '#10b981',   # Green
            'rejected': '#ef4444',   # Red
            'pending_review': '#3b82f6',  # Blue
            'not_verified': '#f59e0b'     # Yellow
        }

        # Create contextual action button
        if status == 'approved':
            action_text = 'Access Your Dashboard'
            action_url = dashboard_url or '/dashboard'
        elif status == 'rejected':
            action_text = 'Resubmit Documents'
            action_url = dashboard_url + '/kyc' if dashboard_url else '/kyc'
        else:  # pending_review or other states
            action_text = 'Check Status'
            action_url = dashboard_url + '/kyc' if dashboard_url else '/kyc'

        context = {
            'user': user,
            'status': status,
            'status_display': status_display_map.get(status, status.title()),
            'status_color': status_colors.get(status, '#6b7280'),
            'message': message,
            'action_text': action_text,
            'action_url': action_url,
            'dashboard_url': dashboard_url or '/dashboard',
            'update_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'current_year': timezone.now().year,
        }

        # Set subject based on status
        subject_map = {
            'approved': 'Identity Verification Approved - Welcome to CapiMax!',
            'rejected': 'Identity Verification Requires Additional Information',
            'pending_review': 'Identity Verification Under Review',
            'not_verified': 'Identity Verification Required'
        }

        subject = subject_map.get(status, 'Identity Verification Status Update')

        return EmailService._send_templated_email(
            to_email=user.email,
            subject=subject,
            template_name='kyc_status_update',
            context=context
        )


def get_request_info(request) -> Dict[str, Any]:
    """
    Extract request information for email context.

    Args:
        request: Django request object

    Returns:
        Dict containing request details
    """
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    return {
        'ip_address': get_client_ip(request),
        'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown Browser'),
    }