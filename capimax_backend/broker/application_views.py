"""
Broker Application Views for Capimax Real Estate Tokenization Platform.

Additional views for handling broker application submissions and management.
"""

from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import Http404
from datetime import timedelta
import logging

from core.permissions import IsAdminUser
from .models import BrokerApplication, BrokerProfile, BrokerApplicationStatus, BrokerVerificationStatus
from .serializers import (
    BrokerApplicationSerializer, BrokerApplicationStatusSerializer,
    AdminBrokerApplicationSerializer
)

logger = logging.getLogger(__name__)


class BrokerApplicationCreateView(generics.CreateAPIView):
    """
    API view for submitting broker applications.

    Allows users to submit broker applications without authentication.
    Applications are stored for admin review and approval.
    """

    serializer_class = BrokerApplicationSerializer
    permission_classes = [permissions.AllowAny]  # Allow anonymous submissions
    parser_classes = [MultiPartParser, FormParser]  # Support file uploads

    def create(self, request, *args, **kwargs):
        """Create broker application with file upload support."""
        try:
            response = super().create(request, *args, **kwargs)

            # Send confirmation email
            application = BrokerApplication.objects.get(id=response.data['id'])
            self.send_application_confirmation_email(application)

            logger.info(f"Broker application submitted: {application.email}")

            return Response({
                'message': 'Application submitted successfully',
                'application_id': str(application.id),
                'status': application.application_status,
                'email': application.email
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating broker application: {str(e)}")
            return Response(
                {'error': 'Failed to submit application'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def send_application_confirmation_email(self, application):
        """Send confirmation email to applicant."""
        try:
            # Import email service if available
            from core.services.email_service import EmailService

            subject = 'Broker Application Received - Capimax'
            message = f"""
            Dear {application.get_full_name()},

            Thank you for your interest in joining the Capimax Broker Partner Program!

            We have received your application and it is currently under review. Our team will carefully evaluate your credentials and experience.

            Application Details:
            - Application ID: {application.id}
            - Submitted: {application.created_at.strftime('%B %d, %Y at %I:%M %p')}
            - Status: {application.get_application_status_display()}

            You can check your application status at any time by visiting our broker portal with your application ID.

            Next Steps:
            1. Our team will review your application within 2-3 business days
            2. You will receive an email notification with our decision
            3. If approved, we will provide you with your broker account credentials

            If you have any questions, please don't hesitate to contact our support team.

            Best regards,
            The Capimax Team
            """

            EmailService.send_email(
                to_email=application.email,
                subject=subject,
                message=message
            )

        except ImportError:
            logger.warning("Email service not available - skipping confirmation email")
        except Exception as e:
            logger.error(f"Error sending confirmation email: {str(e)}")


class BrokerApplicationStatusView(generics.RetrieveAPIView):
    """
    API view for checking broker application status.

    Allows applicants to check their application status using
    their application ID or email address.
    """

    serializer_class = BrokerApplicationStatusSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

    def get_queryset(self):
        """Get broker applications."""
        return BrokerApplication.objects.all()

    def get_object(self):
        """Get application by ID or email."""
        lookup_value = self.kwargs.get('id')

        # Try to get by ID first
        try:
            return BrokerApplication.objects.get(id=lookup_value)
        except (BrokerApplication.DoesNotExist, ValueError):
            # If not a valid UUID, try email lookup
            email = self.request.query_params.get('email')
            if email:
                return get_object_or_404(BrokerApplication, email=email)

        raise Http404("Application not found")


# Admin views for broker application management

class AdminBrokerApplicationListView(generics.ListAPIView):
    """
    Admin view for listing all broker applications.

    Provides comprehensive application list with filtering
    and search capabilities for admin review.
    """

    serializer_class = AdminBrokerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = BrokerApplication.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['application_status', 'experience_level', 'country']
    search_fields = ['first_name', 'last_name', 'email', 'current_company']
    ordering_fields = ['created_at', 'reviewed_at', 'first_name', 'last_name']
    ordering = ['-created_at']


class AdminBrokerApplicationDetailView(generics.RetrieveUpdateAPIView):
    """
    Admin view for broker application details and review.

    Allows admins to view full application details and
    update review status with notes.
    """

    serializer_class = AdminBrokerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = BrokerApplication.objects.all()
    lookup_field = 'id'


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def approve_broker_application(request, application_id):
    """
    Approve broker application and create user account.

    Creates a new user account and BrokerProfile for approved applications
    with automated email notifications.
    """
    try:
        application = get_object_or_404(BrokerApplication, id=application_id)

        if application.application_status != BrokerApplicationStatus.PENDING:
            return Response(
                {'error': 'Application is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user account
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Generate a temporary password
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

        # Create user
        user = User.objects.create_user(
            email=application.email,
            first_name=application.first_name,
            last_name=application.last_name,
            password=temp_password,
            role='broker',
            is_verified=False  # They'll need to verify their email
        )

        # Create broker profile
        broker_profile = BrokerProfile.objects.create(
            user=user,
            license_number=application.license_number or f'PENDING-{user.id}',
            license_state='TBD',
            license_expiry=timezone.now().date() + timedelta(days=365),
            company_name=application.current_company or '',
            bio=application.referral_strategy,
            experience_years=0 if application.experience_level == '0-1' else
                           3 if application.experience_level == '2-5' else
                           7 if application.experience_level == '5-10' else 10,
            verification_status=BrokerVerificationStatus.PENDING
        )

        # Update application
        application.approve(request.user)
        application.associated_user = user
        application.save()

        # Send approval email
        send_approval_email(application, user, temp_password)

        logger.info(f"Broker application approved: {application.email} -> User ID: {user.id}")

        return Response({
            'message': 'Application approved successfully',
            'application_id': str(application.id),
            'user_id': str(user.id),
            'broker_profile_id': str(broker_profile.id),
            'status': application.application_status
        })

    except Exception as e:
        logger.error(f"Error approving broker application: {str(e)}")
        return Response(
            {'error': 'Failed to approve application'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def reject_broker_application(request, application_id):
    """
    Reject broker application with reason.

    Updates application status to rejected and sends
    notification email to applicant.
    """
    try:
        application = get_object_or_404(BrokerApplication, id=application_id)

        if application.application_status != BrokerApplicationStatus.PENDING:
            return Response(
                {'error': 'Application is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', 'Application does not meet our current requirements.')

        # Update application
        application.reject(request.user, reason)

        # Send rejection email
        send_rejection_email(application, reason)

        logger.info(f"Broker application rejected: {application.email}")

        return Response({
            'message': 'Application rejected',
            'application_id': str(application.id),
            'status': application.application_status,
            'reason': reason
        })

    except Exception as e:
        logger.error(f"Error rejecting broker application: {str(e)}")
        return Response(
            {'error': 'Failed to reject application'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def send_approval_email(application, user, temp_password):
    """Send approval email with login credentials."""
    try:
        from core.services.email_service import EmailService

        subject = 'Broker Application Approved - Welcome to Capimax!'
        message = f"""
        Dear {application.get_full_name()},

        Congratulations! Your application to join the Capimax Broker Partner Program has been approved!

        Your Account Details:
        - Email: {user.email}
        - Temporary Password: {temp_password}
        - Broker ID: {user.broker_profile.id}

        Next Steps:
        1. Log in to your broker dashboard at: [BROKER_PORTAL_URL]
        2. Change your temporary password immediately
        3. Complete your profile verification
        4. Review our broker resources and marketing materials

        As a Capimax broker partner, you now have access to:
        - Commission tracking and payments
        - Referral code generation
        - Marketing materials and resources
        - Performance analytics and reporting

        For security reasons, please change your password upon first login.

        Welcome to the team!

        Best regards,
        The Capimax Team
        """

        EmailService.send_email(
            to_email=application.email,
            subject=subject,
            message=message
        )

    except ImportError:
        logger.warning("Email service not available - skipping approval email")
    except Exception as e:
        logger.error(f"Error sending approval email: {str(e)}")


def send_rejection_email(application, reason):
    """Send rejection email with reason."""
    try:
        from core.services.email_service import EmailService

        subject = 'Broker Application Update - Capimax'
        message = f"""
        Dear {application.get_full_name()},

        Thank you for your interest in the Capimax Broker Partner Program.

        After careful review, we regret to inform you that we cannot approve your application at this time.

        Reason: {reason}

        This decision is based on our current requirements and business needs. We encourage you to reapply in the future as our program evolves.

        If you have any questions about this decision, please feel free to contact our support team.

        Thank you for your interest in Capimax.

        Best regards,
        The Capimax Team
        """

        EmailService.send_email(
            to_email=application.email,
            subject=subject,
            message=message
        )

    except ImportError:
        logger.warning("Email service not available - skipping rejection email")
    except Exception as e:
        logger.error(f"Error sending rejection email: {str(e)}")