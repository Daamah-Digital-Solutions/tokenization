"""
Admin Panel Views for Capimax Real Estate Tokenization Platform.

This module contains views for admin panel operations including
property approval management and document handling.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, Http404
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta

from rest_framework import generics
from properties.models import Property, PropertyApproval, PropertyDocument, PropertyValuation
from properties.serializers import PropertyValuationSerializer
from payments.models import NovaSukukPayment
from payments.serializers import NovaSukukAdminSerializer
from investments.services import InvestmentProcessingService
from notifications.services import NotificationService
from core.permissions import IsAdminUser
from core.utils import create_success_response, create_error_response

User = get_user_model()


class PropertyApprovalListView(APIView):
    """
    List all property approvals with filtering and pagination.

    GET /api/v1/admin/property-approvals/
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            # Get query parameters
            status_filter = request.GET.get('status', 'all')
            search = request.GET.get('search', '')
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('page_size', 20)), 100)

            # Base queryset
            queryset = PropertyApproval.objects.select_related(
                'property', 'property__owner', 'reviewer'
            ).order_by('-submitted_at')

            # Apply status filter
            if status_filter != 'all':
                queryset = queryset.filter(status=status_filter)

            # Apply search filter
            if search:
                queryset = queryset.filter(
                    Q(property__title__icontains=search) |
                    Q(property__owner__first_name__icontains=search) |
                    Q(property__owner__last_name__icontains=search) |
                    Q(property__city__icontains=search)
                )

            # Pagination
            total_count = queryset.count()
            start = (page - 1) * page_size
            end = start + page_size
            approvals = queryset[start:end]

            # Serialize data
            approval_data = []
            for approval in approvals:
                approval_data.append({
                    'id': str(approval.property.id),
                    'property_id': str(approval.property.id),
                    'title': approval.property.title,
                    'owner': {
                        'id': str(approval.property.owner.id),
                        'name': f"{approval.property.owner.first_name} {approval.property.owner.last_name}",
                        'email': approval.property.owner.email
                    },
                    'category': approval.property.property_category,
                    'type': approval.property.property_type,
                    'location': f"{approval.property.city}, {approval.property.country}" if approval.property.city else approval.property.address or '',
                    'total_value': str(approval.property.total_value),
                    'status': approval.status,
                    'reviewer': {
                        'id': str(approval.reviewer.id),
                        'name': f"{approval.reviewer.first_name} {approval.reviewer.last_name}"
                    } if approval.reviewer else None,
                    'submitted_at': approval.submitted_at.isoformat() if approval.submitted_at else None,
                    'reviewed_at': approval.reviewed_at.isoformat() if approval.reviewed_at else None,
                    'review_notes': approval.review_notes,
                    'required_changes': approval.required_changes,
                    'documents_count': approval.property.documents.count(),
                    'images_count': approval.property.images.count()
                })

            return Response(create_success_response(
                data={
                    'approvals': approval_data,
                    'pagination': {
                        'page': page,
                        'page_size': page_size,
                        'total_count': total_count,
                        'total_pages': (total_count + page_size - 1) // page_size,
                        'has_next': end < total_count,
                        'has_previous': page > 1
                    }
                },
                message="Property approvals retrieved successfully"
            ))

        except ValueError as e:
            return Response(create_error_response(
                message="Invalid parameters provided",
                status_code=status.HTTP_400_BAD_REQUEST
            ), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(create_error_response(
                message="Failed to retrieve property approvals",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            ), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyApprovalDetailView(APIView):
    """
    Get detailed information about a specific property approval.

    GET /api/v1/admin/property-approvals/{property_id}/
    POST /api/v1/admin/property-approvals/{property_id}/
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, property_id):
        try:
            property_obj = get_object_or_404(Property, id=property_id)
            approval = get_object_or_404(PropertyApproval, property=property_obj)

            # Get property documents
            documents = []
            for doc in property_obj.documents.all():
                documents.append({
                    'id': str(doc.id),
                    'name': doc.name,
                    'document_type': doc.document_type,
                    'file_url': doc.document.url if doc.document else None,
                    'uploaded_at': doc.uploaded_at.isoformat(),
                    'size': doc.size
                })

            # Get property images
            images = []
            for img in property_obj.images.all():
                images.append({
                    'id': str(img.id),
                    'caption': img.caption,
                    'image_url': img.image.url if img.image else None,
                    'is_primary': img.is_primary,
                    'uploaded_at': img.uploaded_at.isoformat()
                })

            approval_data = {
                'property': {
                    'id': str(property_obj.id),
                    'title': property_obj.title,
                    'description': property_obj.description,
                    'category': property_obj.property_category,
                    'type': property_obj.property_type,
                    'location': f"{property_obj.city}, {property_obj.country}" if property_obj.city else property_obj.address or '',
                    'address': property_obj.address,
                    'total_value': str(property_obj.total_value),
                    'token_price': str(property_obj.token_price),
                    'total_tokens': property_obj.total_tokens,
                    'expected_annual_return': str(property_obj.expected_return),
                    'construction_completion_date': property_obj.expected_completion_date.isoformat() if property_obj.expected_completion_date else None,
                    'owner': {
                        'id': str(property_obj.owner.id),
                        'name': f"{property_obj.owner.first_name} {property_obj.owner.last_name}",
                        'email': property_obj.owner.email,
                        'phone': property_obj.owner.phone
                    },
                    'created_at': property_obj.created_at.isoformat(),
                    'updated_at': property_obj.updated_at.isoformat()
                },
                'approval': {
                    'status': approval.status,
                    'reviewer': {
                        'id': str(approval.reviewer.id),
                        'name': f"{approval.reviewer.first_name} {approval.reviewer.last_name}"
                    } if approval.reviewer else None,
                    'review_notes': approval.review_notes,
                    'required_changes': approval.required_changes,
                    'submitted_at': approval.submitted_at.isoformat() if approval.submitted_at else None,
                    'reviewed_at': approval.reviewed_at.isoformat() if approval.reviewed_at else None
                },
                'documents': documents,
                'images': images
            }

            return Response(create_success_response(
                data=approval_data,
                message="Property approval details retrieved successfully"
            ))

        except Exception as e:
            return Response(create_error_response(
                message="Failed to retrieve property approval details",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            ), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, property_id):
        """
        Process property approval (approve/reject/request changes).
        """
        try:
            property_obj = get_object_or_404(Property, id=property_id)
            approval = get_object_or_404(PropertyApproval, property=property_obj)

            action = request.data.get('action')
            review_notes = request.data.get('review_notes', '')
            required_changes = request.data.get('required_changes', '')

            if action not in ['approve', 'reject', 'request_changes']:
                return Response(create_error_response(
                    message="Invalid action. Must be 'approve', 'reject', or 'request_changes'",
                    status_code=status.HTTP_400_BAD_REQUEST
                ), status=status.HTTP_400_BAD_REQUEST)

            # Update approval record
            approval.reviewer = request.user
            approval.review_notes = review_notes
            approval.reviewed_at = timezone.now()

            if action == 'approve':
                approval.status = 'approved'
                property_obj.status = 'approved'

            elif action == 'reject':
                approval.status = 'rejected'
                property_obj.status = 'delisted'

            elif action == 'request_changes':
                approval.status = 'requires_changes'
                approval.required_changes = required_changes
                property_obj.status = 'draft'

            approval.save()
            property_obj.save()

            return Response(create_success_response(
                data={
                    'property_id': str(property_obj.id),
                    'new_status': approval.status,
                    'property_status': property_obj.status
                },
                message=f"Property {action.replace('_', ' ')}d successfully"
            ))

        except Exception as e:
            return Response(create_error_response(
                message="Failed to process property approval",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            ), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AssignReviewerView(APIView):
    """
    Assign a reviewer to a property approval.

    POST /api/v1/admin/property-approvals/{property_id}/assign/
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, property_id):
        try:
            property_obj = get_object_or_404(Property, id=property_id)
            approval = get_object_or_404(PropertyApproval, property=property_obj)

            reviewer_id = request.data.get('reviewer_id')
            if not reviewer_id:
                return Response(create_error_response(
                    message="Reviewer ID is required",
                    status_code=status.HTTP_400_BAD_REQUEST
                ), status=status.HTTP_400_BAD_REQUEST)

            reviewer = get_object_or_404(User, id=reviewer_id, role='admin')

            approval.reviewer = reviewer
            approval.status = 'under_review'
            approval.save()

            return Response(create_success_response(
                data={
                    'property_id': str(property_obj.id),
                    'reviewer': {
                        'id': str(reviewer.id),
                        'name': f"{reviewer.first_name} {reviewer.last_name}"
                    },
                    'status': approval.status
                },
                message="Reviewer assigned successfully"
            ))

        except Exception as e:
            return Response(create_error_response(
                message="Failed to assign reviewer",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            ), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ApprovalStatsView(APIView):
    """
    Get property approval statistics for admin dashboard.

    GET /api/v1/admin/property-approvals/stats/
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            # Get date range for filtering (default: last 30 days)
            days = int(request.GET.get('days', 30))
            start_date = timezone.now() - timedelta(days=days)

            # Basic counts
            total_approvals = PropertyApproval.objects.count()
            pending_approvals = PropertyApproval.objects.filter(status='pending').count()
            under_review = PropertyApproval.objects.filter(status='under_review').count()
            approved_count = PropertyApproval.objects.filter(status='approved').count()
            rejected_count = PropertyApproval.objects.filter(status='rejected').count()
            requires_changes = PropertyApproval.objects.filter(status='requires_changes').count()

            # Recent activity (last N days)
            recent_submissions = PropertyApproval.objects.filter(
                submitted_at__gte=start_date
            ).count()

            recent_reviews = PropertyApproval.objects.filter(
                reviewed_at__gte=start_date
            ).exclude(reviewed_at__isnull=True).count()

            # Average review time (in hours)
            completed_reviews = PropertyApproval.objects.filter(
                status__in=['approved', 'rejected'],
                submitted_at__isnull=False,
                reviewed_at__isnull=False
            )

            avg_review_time = 0
            if completed_reviews.exists():
                total_time = sum([
                    (review.reviewed_at - review.submitted_at).total_seconds()
                    for review in completed_reviews
                ])
                avg_review_time = total_time / completed_reviews.count() / 3600  # Convert to hours

            # Status breakdown
            status_breakdown = {
                'pending': pending_approvals,
                'under_review': under_review,
                'approved': approved_count,
                'rejected': rejected_count,
                'requires_changes': requires_changes
            }

            # Top reviewers (by number of reviews)
            top_reviewers = PropertyApproval.objects.filter(
                reviewer__isnull=False,
                reviewed_at__gte=start_date
            ).values(
                'reviewer__id',
                'reviewer__first_name',
                'reviewer__last_name'
            ).annotate(
                review_count=Count('id')
            ).order_by('-review_count')[:5]

            reviewer_stats = []
            for reviewer in top_reviewers:
                reviewer_stats.append({
                    'id': str(reviewer['reviewer__id']),
                    'name': f"{reviewer['reviewer__first_name']} {reviewer['reviewer__last_name']}",
                    'review_count': reviewer['review_count']
                })

            return Response(create_success_response(
                data={
                    'overview': {
                        'total_approvals': total_approvals,
                        'pending_approvals': pending_approvals,
                        'under_review': under_review,
                        'approved_count': approved_count,
                        'rejected_count': rejected_count,
                        'requires_changes': requires_changes,
                        'approval_rate': round((approved_count / max(total_approvals, 1)) * 100, 1)
                    },
                    'recent_activity': {
                        'days': days,
                        'recent_submissions': recent_submissions,
                        'recent_reviews': recent_reviews,
                        'avg_review_time_hours': round(avg_review_time, 1)
                    },
                    'status_breakdown': status_breakdown,
                    'top_reviewers': reviewer_stats
                },
                message="Approval statistics retrieved successfully"
            ))

        except ValueError:
            return Response(create_error_response(
                message="Invalid days parameter",
                status_code=status.HTTP_400_BAD_REQUEST
            ), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(create_error_response(
                message="Failed to retrieve approval statistics",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            ), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentDownloadView(APIView):
    """
    Download property documents (admin only).

    GET /api/v1/admin/documents/{document_id}/download/
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, document_id):
        try:
            document = get_object_or_404(PropertyDocument, id=document_id)

            if not document.document:
                raise Http404("Document file not found")

            # Serve the file
            response = HttpResponse(
                document.document.read(),
                content_type='application/octet-stream'
            )
            response['Content-Disposition'] = f'attachment; filename="{document.name}"'

            return response

        except Http404:
            return Response(create_error_response(
                message="Document not found",
                status_code=status.HTTP_404_NOT_FOUND
            ), status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(create_error_response(
                message="Failed to download document",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            ), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyValuationListView(generics.ListAPIView):
    """
    List all valuations for a property (admin only).

    GET /api/v1/admin/properties/{property_id}/valuations/
    """
    serializer_class = PropertyValuationSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        property_id = self.kwargs['property_id']
        return PropertyValuation.objects.filter(
            property_id=property_id
        ).order_by('-valuation_date')


class NovaSukukListView(generics.ListAPIView):
    """
    List all Nova Sukuk payments for admin review.

    GET /api/v1/admin/nova-sukuk/?status=pending
    """
    serializer_class = NovaSukukAdminSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = NovaSukukPayment.objects.select_related(
            'investment', 'investment__user', 'investment__property_investment',
            'reviewed_by'
        ).order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class NovaSukukReviewView(APIView):
    """
    Approve or reject a Nova Sukuk payment.

    POST /api/v1/admin/nova-sukuk/{id}/review/
    Body: { "action": "approve" | "reject", "review_note": "..." }
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            sukuk = NovaSukukPayment.objects.select_related(
                'investment', 'investment__user', 'investment__property_investment', 'payment'
            ).get(id=pk)
        except NovaSukukPayment.DoesNotExist:
            return Response(create_error_response(
                message="Nova Sukuk payment not found", status_code=404
            ), status=status.HTTP_404_NOT_FOUND)

        if sukuk.status != 'pending':
            return Response(create_error_response(
                message=f"Cannot review a payment with status '{sukuk.status}'", status_code=400
            ), status=status.HTTP_400_BAD_REQUEST)

        action_type = request.data.get('action')
        review_note = request.data.get('review_note', '')

        if action_type not in ('approve', 'reject'):
            return Response(create_error_response(
                message="Action must be 'approve' or 'reject'", status_code=400
            ), status=status.HTTP_400_BAD_REQUEST)

        sukuk.reviewed_by = request.user
        sukuk.reviewed_at = timezone.now()
        sukuk.review_note = review_note

        investment = sukuk.investment
        payment = sukuk.payment

        if action_type == 'approve':
            sukuk.status = 'approved'
            sukuk.save()

            if payment:
                payment.status = 'completed'
                payment.completed_at = timezone.now()
                payment.save(update_fields=['status', 'completed_at', 'updated_at'])

            InvestmentProcessingService.process_investment(investment, payment)

            NotificationService.create_notification(
                user=investment.user,
                title="Nova Sukuk Payment Approved",
                message=(
                    f"Your Nova Sukuk payment (Ref: {sukuk.sukuk_reference_number}) "
                    f"for {investment.property_investment.title} has been approved. "
                    f"Tokens have been allocated to your account."
                ),
                notification_type='payment',
                priority='high',
                send_email=True,
                send_real_time=True,
            )

            return Response(create_success_response(
                data=NovaSukukAdminSerializer(sukuk, context={'request': request}).data,
                message="Nova Sukuk payment approved and investment completed"
            ))

        else:  # reject
            sukuk.status = 'rejected'
            sukuk.save()

            investment.status = 'failed'
            investment.save(update_fields=['status', 'updated_at'])

            if payment:
                payment.status = 'failed'
                payment.save(update_fields=['status', 'updated_at'])

            NotificationService.create_notification(
                user=investment.user,
                title="Nova Sukuk Payment Rejected",
                message=(
                    f"Your Nova Sukuk payment (Ref: {sukuk.sukuk_reference_number}) "
                    f"has been rejected. Reason: {review_note or 'No reason provided.'}"
                ),
                notification_type='payment',
                priority='high',
                send_email=True,
                send_real_time=True,
            )

            return Response(create_success_response(
                data=NovaSukukAdminSerializer(sukuk, context={'request': request}).data,
                message="Nova Sukuk payment rejected"
            ))
