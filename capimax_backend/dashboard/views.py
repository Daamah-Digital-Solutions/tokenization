"""
Dashboard Views for Capimax Real Estate Tokenization Platform.

This module contains views for dashboard functionality including user statistics,
portfolio summaries, and real-time market data.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q, F, Max
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from accounts.models import User
from properties.models import Property, PropertyAnalytics
from investments.models import Investment, DividendPayment
from .serializers import DashboardStatsSerializer


class DashboardStatsView(APIView):
    """
    API endpoint for dashboard statistics overview.
    
    Returns comprehensive statistics about user's portfolio,
    performance metrics, and investment activity.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get dashboard statistics for the authenticated user."""
        user = request.user
        
        # Get user's investments
        user_investments = Investment.objects.filter(
            user=user, 
            status='completed'
        ).select_related('property_investment')
        
        if not user_investments.exists():
            # Return default stats for new users
            stats_data = {
                'total_invested': Decimal('0.00'),
                'current_portfolio_value': Decimal('0.00'),
                'total_roi': Decimal('0.00'),
                'roi_percentage': Decimal('0.00'),
                'monthly_dividends': Decimal('0.00'),
                'monthly_income_change': Decimal('0.00'),
                'properties_count': 0,
                'property_types': [],
                'average_investment_size': Decimal('0.00'),
                'ytd_return': Decimal('0.00'),
                'ytd_return_percentage': Decimal('0.00'),
                'best_performing_property': 'None',
                'worst_performing_property': 'None',
                'pending_investments': 0,
                'completed_investments_this_month': 0,
                'watchlist_count': 0,
            }
        else:
            # Calculate portfolio statistics
            total_invested = user_investments.aggregate(
                total=Sum('investment_amount')
            )['total'] or Decimal('0.00')
            
            # Calculate current portfolio value
            current_value = Decimal('0.00')
            for investment in user_investments:
                current_value += investment.current_value
            
            # Calculate ROI
            total_roi = current_value - total_invested
            roi_percentage = (total_roi / total_invested * 100) if total_invested > 0 else Decimal('0.00')
            
            # Calculate monthly dividends
            this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_month = (this_month - timedelta(days=1)).replace(day=1)
            
            monthly_dividends = DividendPayment.objects.filter(
                investment__user=user,
                payment_date__gte=this_month,
                status='paid'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            last_month_dividends = DividendPayment.objects.filter(
                investment__user=user,
                payment_date__gte=last_month,
                payment_date__lt=this_month,
                status='paid'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            monthly_income_change = Decimal('0.00')
            if last_month_dividends > 0:
                monthly_income_change = ((monthly_dividends - last_month_dividends) / last_month_dividends * 100)
            
            # Portfolio diversity
            properties_count = user_investments.values('property_investment').distinct().count()
            property_types = list(user_investments.values_list(
                'property_investment__property_type', flat=True
            ).distinct())
            
            average_investment_size = total_invested / user_investments.count() if user_investments.count() > 0 else Decimal('0.00')
            
            # YTD performance
            ytd_start = timezone.now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            ytd_investments = user_investments.filter(created_at__gte=ytd_start)
            ytd_invested = ytd_investments.aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')
            
            ytd_current_value = Decimal('0.00')
            for investment in ytd_investments:
                ytd_current_value += investment.current_value
            
            ytd_return = ytd_current_value - ytd_invested
            ytd_return_percentage = (ytd_return / ytd_invested * 100) if ytd_invested > 0 else Decimal('0.00')
            
            # Best and worst performing properties
            property_performance = {}
            for investment in user_investments:
                prop_roi = investment.current_value - investment.investment_amount
                prop_roi_pct = (prop_roi / investment.investment_amount * 100) if investment.investment_amount > 0 else Decimal('0.00')
                
                if investment.property_investment.title not in property_performance:
                    property_performance[investment.property_investment.title] = prop_roi_pct
            
            if property_performance:
                best_performing_property = max(property_performance, key=property_performance.get)
                worst_performing_property = min(property_performance, key=property_performance.get)
            else:
                best_performing_property = 'None'
                worst_performing_property = 'None'
            
            # Investment activity
            pending_investments = Investment.objects.filter(
                user=user,
                status__in=['pending', 'processing']
            ).count()
            
            completed_investments_this_month = Investment.objects.filter(
                user=user,
                status='completed',
                completed_at__gte=this_month
            ).count()
            
            # Watchlist count (using property subscriptions as proxy)
            from properties.models import PropertySubscription
            watchlist_count = PropertySubscription.objects.filter(user=user).count()
            
            stats_data = {
                'total_invested': total_invested,
                'current_portfolio_value': current_value,
                'total_roi': total_roi,
                'roi_percentage': roi_percentage,
                'monthly_dividends': monthly_dividends,
                'monthly_income_change': monthly_income_change,
                'properties_count': properties_count,
                'property_types': property_types,
                'average_investment_size': average_investment_size,
                'ytd_return': ytd_return,
                'ytd_return_percentage': ytd_return_percentage,
                'best_performing_property': best_performing_property,
                'worst_performing_property': worst_performing_property,
                'pending_investments': pending_investments,
                'completed_investments_this_month': completed_investments_this_month,
                'watchlist_count': watchlist_count,
            }
        
        serializer = DashboardStatsSerializer(stats_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PropertyOwnerActivityFeedView(APIView):
    """
    Activity feed for property owners showing recent activities across their properties.

    Provides a comprehensive feed of recent activities including:
    - New investments
    - Rental income distributions
    - Property updates
    - Document uploads
    - Property status changes
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get activity feed for property owner dashboard."""
        user = request.user

        # Check if user has property owner role
        if not (user.has_role('property_owner') or user.is_staff):
            return Response(
                {'detail': 'You must be a property owner to access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's properties
        user_properties = Property.objects.filter(owner=user)

        # Initialize activities list
        activities = []

        # Get recent investments (last 30 days)
        recent_date = timezone.now() - timedelta(days=30)
        recent_investments = Investment.objects.filter(
            property_investment__in=user_properties,
            status='completed',
            created_at__gte=recent_date
        ).select_related('user', 'property_investment').order_by('-created_at')[:20]

        for investment in recent_investments:
            activities.append({
                'id': f"investment_{investment.id}",
                'type': 'investment',
                'title': 'New Investment Received',
                'description': f"{investment.user.get_full_name()} invested ${investment.investment_amount:,.2f} in {investment.property_investment.title}",
                'details': {
                    'investor_name': investment.user.get_full_name(),
                    'investor_email': investment.user.email,
                    'property_title': investment.property_investment.title,
                    'property_id': str(investment.property_investment.id),
                    'investment_amount': float(investment.investment_amount),
                    'tokens_purchased': investment.token_amount,
                    'ownership_percentage': float(investment.ownership_percentage)
                },
                'timestamp': investment.created_at.isoformat(),
                'icon': 'dollar-sign',
                'color': 'success'
            })

        # Get recent rental distributions
        from properties.models import RentalIncomeDistribution
        recent_distributions = RentalIncomeDistribution.objects.filter(
            property__in=user_properties,
            distribution_date__gte=recent_date.date()
        ).select_related('property').order_by('-distribution_date')[:10]

        for distribution in recent_distributions:
            activities.append({
                'id': f"distribution_{distribution.id}",
                'type': 'rental_distribution',
                'title': 'Rental Income Distributed',
                'description': f"${distribution.total_rental_income:,.2f} rental income distributed for {distribution.property.title}",
                'details': {
                    'property_title': distribution.property.title,
                    'property_id': str(distribution.property.id),
                    'total_rental_income': float(distribution.total_rental_income),
                    'net_distribution_amount': float(distribution.net_distribution_amount),
                    'tokens_eligible': distribution.tokens_eligible,
                    'amount_per_token': float(distribution.amount_per_token),
                    'distribution_period': distribution.distribution_period
                },
                'timestamp': distribution.distribution_date.isoformat(),
                'icon': 'home',
                'color': 'primary'
            })

        # Get recent property updates
        from properties.models import PropertyUpdate
        recent_updates = PropertyUpdate.objects.filter(
            property__in=user_properties,
            created_at__gte=recent_date
        ).select_related('property').order_by('-created_at')[:15]

        for update in recent_updates:
            activities.append({
                'id': f"update_{update.id}",
                'type': 'property_update',
                'title': f'Property Update: {update.title}',
                'description': f"New {update.update_type} update posted for {update.property.title}",
                'details': {
                    'property_title': update.property.title,
                    'property_id': str(update.property.id),
                    'update_type': update.update_type,
                    'update_title': update.title,
                    'content_preview': update.content[:100] + '...' if len(update.content) > 100 else update.content
                },
                'timestamp': update.created_at.isoformat(),
                'icon': 'bell',
                'color': 'info'
            })

        # Get recent document uploads
        from properties.models import PropertyDocument
        recent_documents = PropertyDocument.objects.filter(
            property__in=user_properties,
            uploaded_at__gte=recent_date
        ).select_related('property').order_by('-uploaded_at')[:10]

        for document in recent_documents:
            activities.append({
                'id': f"document_{document.id}",
                'type': 'document_upload',
                'title': 'Document Uploaded',
                'description': f"New {document.document_type} document uploaded for {document.property.title}",
                'details': {
                    'property_title': document.property.title,
                    'property_id': str(document.property.id),
                    'document_name': document.name,
                    'document_type': document.document_type,
                    'file_size_mb': round(document.size / (1024 * 1024), 2)
                },
                'timestamp': document.uploaded_at.isoformat(),
                'icon': 'file-text',
                'color': 'secondary'
            })

        # Get recent property status changes (from approval records)
        from properties.models import PropertyApproval
        recent_approvals = PropertyApproval.objects.filter(
            property__in=user_properties,
            reviewed_at__gte=recent_date
        ).select_related('property', 'reviewer').order_by('-reviewed_at')[:10]

        for approval in recent_approvals:
            status_mapping = {
                'approved': {'title': 'Property Approved', 'color': 'success', 'icon': 'check-circle'},
                'rejected': {'title': 'Property Rejected', 'color': 'danger', 'icon': 'x-circle'},
                'requires_changes': {'title': 'Changes Required', 'color': 'warning', 'icon': 'edit'},
                'under_review': {'title': 'Under Review', 'color': 'info', 'icon': 'clock'}
            }

            status_info = status_mapping.get(approval.status, {
                'title': 'Status Updated', 'color': 'secondary', 'icon': 'info'
            })

            activities.append({
                'id': f"approval_{approval.id}",
                'type': 'status_change',
                'title': status_info['title'],
                'description': f"{approval.property.title} status changed to {approval.get_status_display()}",
                'details': {
                    'property_title': approval.property.title,
                    'property_id': str(approval.property.id),
                    'new_status': approval.status,
                    'reviewer_name': approval.reviewer.get_full_name() if approval.reviewer else 'System',
                    'review_notes': approval.review_notes or 'No notes provided',
                    'required_changes': approval.required_changes or None
                },
                'timestamp': approval.reviewed_at.isoformat() if approval.reviewed_at else approval.submitted_at.isoformat(),
                'icon': status_info['icon'],
                'color': status_info['color']
            })

        # Get recent property subscriptions (new followers)
        from properties.models import PropertySubscription
        recent_subscriptions = PropertySubscription.objects.filter(
            property__in=user_properties,
            subscribed_at__gte=recent_date
        ).select_related('user', 'property').order_by('-subscribed_at')[:15]

        for subscription in recent_subscriptions:
            activities.append({
                'id': f"subscription_{subscription.id}",
                'type': 'new_subscriber',
                'title': 'New Property Follower',
                'description': f"{subscription.user.get_full_name()} subscribed to updates for {subscription.property.title}",
                'details': {
                    'subscriber_name': subscription.user.get_full_name(),
                    'subscriber_email': subscription.user.email,
                    'property_title': subscription.property.title,
                    'property_id': str(subscription.property.id)
                },
                'timestamp': subscription.subscribed_at.isoformat(),
                'icon': 'user-plus',
                'color': 'info'
            })

        # Get installment payments
        from properties.models import InstallmentPayment
        recent_installments = InstallmentPayment.objects.filter(
            property_investment__in=user_properties,
            updated_at__gte=recent_date,
            payments_made__gt=0
        ).select_related('investor', 'property_investment').order_by('-updated_at')[:10]

        for installment in recent_installments:
            activities.append({
                'id': f"installment_{installment.id}",
                'type': 'installment_payment',
                'title': 'Installment Payment Received',
                'description': f"{installment.investor.get_full_name()} made payment #{installment.payments_made} for {installment.property_investment.title}",
                'details': {
                    'investor_name': installment.investor.get_full_name(),
                    'property_title': installment.property_investment.title,
                    'property_id': str(installment.property_investment.id),
                    'payment_number': installment.payments_made,
                    'total_payments': installment.total_installments,
                    'completion_percentage': float(installment.completion_percentage),
                    'tokens_released': installment.tokens_released,
                    'amount_paid': float(installment.total_amount_paid)
                },
                'timestamp': installment.updated_at.isoformat(),
                'icon': 'credit-card',
                'color': 'success'
            })

        # Sort all activities by timestamp (most recent first)
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        # Limit to most recent 50 activities
        activities = activities[:50]

        # Add pagination info
        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))
        start_index = (page - 1) * page_size
        end_index = start_index + page_size

        paginated_activities = activities[start_index:end_index]

        # Generate activity summary
        activity_counts = {}
        for activity in activities:
            activity_type = activity['type']
            activity_counts[activity_type] = activity_counts.get(activity_type, 0) + 1

        # Calculate key metrics for the activity period
        total_new_investments = sum(1 for a in activities if a['type'] == 'investment')
        total_investment_amount = sum(
            a['details']['investment_amount'] for a in activities
            if a['type'] == 'investment'
        )
        total_rental_distributed = sum(
            a['details']['total_rental_income'] for a in activities
            if a['type'] == 'rental_distribution'
        )
        new_subscribers = sum(1 for a in activities if a['type'] == 'new_subscriber')

        return Response({
            'activities': paginated_activities,
            'pagination': {
                'current_page': page,
                'page_size': page_size,
                'total_activities': len(activities),
                'total_pages': (len(activities) + page_size - 1) // page_size,
                'has_next': end_index < len(activities),
                'has_previous': page > 1
            },
            'summary': {
                'total_activities': len(activities),
                'activity_counts': activity_counts,
                'period_metrics': {
                    'new_investments_count': total_new_investments,
                    'total_investment_amount': total_investment_amount,
                    'total_rental_distributed': total_rental_distributed,
                    'new_subscribers': new_subscribers,
                    'properties_with_activity': user_properties.count()
                }
            }
        })
