"""
WebSocket consumers for real-time communication.
"""

import json
import logging
from typing import Dict, Any
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from notifications.models import Notification, SystemAlert
from properties.models import Property
from investments.models import Investment

User = get_user_model()
logger = logging.getLogger(__name__)


class BaseConsumer(AsyncWebsocketConsumer):
    """
    Base WebSocket consumer with common functionality.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope.get("user")
        
        if not self.user or not self.user.is_authenticated:
            logger.warning("Unauthenticated WebSocket connection attempt")
            await self.close(code=4001)
            return
        
        await self.accept()
        logger.info(f"WebSocket connected for user: {self.user.email}")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        logger.info(f"WebSocket disconnected for user: {self.user.email if hasattr(self, 'user') else 'Unknown'}")
    
    async def send_json_safe(self, content: Dict[str, Any]):
        """Safely send JSON data to WebSocket."""
        try:
            await self.send(text_data=json.dumps(content))
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {str(e)}")
    
    async def send_error(self, error_message: str, error_code: str = "GENERAL_ERROR"):
        """Send error message to client."""
        await self.send_json_safe({
            'type': 'error',
            'error_code': error_code,
            'message': error_message
        })


class NotificationConsumer(BaseConsumer):
    """
    Consumer for user-specific notifications.
    Handles: /ws/notifications/
    """
    
    async def connect(self):
        """Handle connection and join user notification group."""
        await super().connect()
        
        if hasattr(self, 'user') and self.user.is_authenticated:
            self.notification_group_name = f"notifications_{self.user.id}"
            
            # Join notification group
            await self.channel_layer.group_add(
                self.notification_group_name,
                self.channel_name
            )
            
            # Send initial unread count
            unread_count = await self.get_unread_notification_count()
            await self.send_json_safe({
                'type': 'notification_count',
                'unread_count': unread_count
            })
    
    async def disconnect(self, close_code):
        """Handle disconnection and leave notification group."""
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )
        await super().disconnect(close_code)
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'mark_notification_read':
                await self.handle_mark_notification_read(data)
            elif message_type == 'mark_all_read':
                await self.handle_mark_all_read()
            elif message_type == 'get_notifications':
                await self.handle_get_notifications(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error handling notification message: {str(e)}")
            await self.send_error("Internal server error")
    
    async def handle_mark_notification_read(self, data):
        """Mark a notification as read."""
        notification_id = data.get('notification_id')
        if not notification_id:
            await self.send_error("notification_id is required")
            return
        
        success = await self.mark_notification_read(notification_id)
        if success:
            unread_count = await self.get_unread_notification_count()
            await self.send_json_safe({
                'type': 'notification_marked_read',
                'notification_id': notification_id,
                'unread_count': unread_count
            })
        else:
            await self.send_error("Failed to mark notification as read")
    
    async def handle_mark_all_read(self):
        """Mark all notifications as read."""
        count = await self.mark_all_notifications_read()
        await self.send_json_safe({
            'type': 'all_notifications_marked_read',
            'count': count,
            'unread_count': 0
        })
    
    async def handle_get_notifications(self, data):
        """Get user notifications with pagination."""
        page = data.get('page', 1)
        limit = data.get('limit', 20)
        
        notifications = await self.get_user_notifications(page, limit)
        await self.send_json_safe({
            'type': 'notifications_list',
            'notifications': notifications['results'],
            'has_next': notifications['has_next'],
            'has_previous': notifications['has_previous'],
            'page': page
        })
    
    # Group message handlers
    async def notification_message(self, event):
        """Handle notification broadcast to group."""
        await self.send_json_safe({
            'type': 'new_notification',
            'notification': event['notification'],
            'unread_count': event.get('unread_count')
        })
    
    async def notification_count_update(self, event):
        """Handle notification count update."""
        await self.send_json_safe({
            'type': 'notification_count',
            'unread_count': event['unread_count']
        })
    
    # Database operations
    @database_sync_to_async
    def get_unread_notification_count(self):
        """Get unread notification count for user."""
        return self.user.notifications.filter(is_read=False).count()
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark specific notification as read."""
        try:
            notification = self.user.notifications.get(id=notification_id)
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False
    
    @database_sync_to_async
    def mark_all_notifications_read(self):
        """Mark all user notifications as read."""
        from django.utils import timezone
        count = self.user.notifications.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return count
    
    @database_sync_to_async
    def get_user_notifications(self, page=1, limit=20):
        """Get paginated user notifications."""
        from django.core.paginator import Paginator
        
        notifications = self.user.notifications.select_related('content_type').all()
        paginator = Paginator(notifications, limit)
        page_obj = paginator.get_page(page)
        
        results = []
        for notification in page_obj:
            results.append({
                'id': str(notification.id),
                'title': notification.title,
                'message': notification.message,
                'notification_type': notification.notification_type,
                'priority': notification.priority,
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat(),
                'action_url': notification.action_url,
                'action_label': notification.action_label,
            })
        
        return {
            'results': results,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'total_count': paginator.count
        }


class AdminConsumer(BaseConsumer):
    """
    Consumer for admin system monitoring.
    Handles: /ws/admin/
    """
    
    async def connect(self):
        """Handle connection and verify admin permissions."""
        await super().connect()
        
        if not hasattr(self, 'user') or not self.user.is_authenticated:
            return
        
        if not (self.user.is_staff or self.user.user_type == 'admin'):
            logger.warning(f"Non-admin user attempted admin WebSocket connection: {self.user.email}")
            await self.close(code=4003)
            return
        
        # Join admin monitoring group
        await self.channel_layer.group_add(
            "admin_monitoring",
            self.channel_name
        )
        
        # Send initial system status
        await self.send_initial_system_status()
    
    async def disconnect(self, close_code):
        """Handle disconnection and leave admin group."""
        await self.channel_layer.group_discard(
            "admin_monitoring",
            self.channel_name
        )
        await super().disconnect(close_code)
    
    async def receive(self, text_data):
        """Handle incoming admin messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_system_alerts':
                await self.handle_get_system_alerts(data)
            elif message_type == 'resolve_alert':
                await self.handle_resolve_alert(data)
            elif message_type == 'create_system_alert':
                await self.handle_create_system_alert(data)
            elif message_type == 'get_user_activity':
                await self.handle_get_user_activity(data)
            else:
                await self.send_error(f"Unknown admin message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error handling admin message: {str(e)}")
            await self.send_error("Internal server error")
    
    async def handle_get_system_alerts(self, data):
        """Get active system alerts."""
        alerts = await self.get_active_system_alerts()
        await self.send_json_safe({
            'type': 'system_alerts',
            'alerts': alerts
        })
    
    async def handle_resolve_alert(self, data):
        """Resolve a system alert."""
        alert_id = data.get('alert_id')
        if not alert_id:
            await self.send_error("alert_id is required")
            return
        
        success = await self.resolve_system_alert(alert_id)
        if success:
            await self.send_json_safe({
                'type': 'alert_resolved',
                'alert_id': alert_id
            })
            
            # Broadcast to all admin clients
            await self.channel_layer.group_send(
                "admin_monitoring",
                {
                    'type': 'alert_resolved_broadcast',
                    'alert_id': alert_id,
                    'resolved_by': self.user.email
                }
            )
        else:
            await self.send_error("Failed to resolve alert")
    
    async def handle_create_system_alert(self, data):
        """Create a new system alert."""
        required_fields = ['title', 'message', 'alert_type', 'category']
        if not all(field in data for field in required_fields):
            await self.send_error("Missing required fields for system alert")
            return
        
        alert_data = {
            'title': data['title'],
            'message': data['message'],
            'alert_type': data['alert_type'],
            'category': data['category'],
            'is_public': data.get('is_public', False),
            'target_user_types': data.get('target_user_types', [])
        }
        
        alert = await self.create_system_alert(alert_data)
        if alert:
            await self.send_json_safe({
                'type': 'alert_created',
                'alert': alert
            })
            
            # Broadcast to all admin clients
            await self.channel_layer.group_send(
                "admin_monitoring",
                {
                    'type': 'new_system_alert',
                    'alert': alert
                }
            )
    
    async def handle_get_user_activity(self, data):
        """Get recent user activity."""
        activity = await self.get_recent_user_activity()
        await self.send_json_safe({
            'type': 'user_activity',
            'activity': activity
        })
    
    async def send_initial_system_status(self):
        """Send initial system status to admin."""
        status = await self.get_system_status()
        await self.send_json_safe({
            'type': 'system_status',
            'status': status
        })
    
    # Group message handlers
    async def new_system_alert(self, event):
        """Handle new system alert broadcast."""
        await self.send_json_safe({
            'type': 'new_system_alert',
            'alert': event['alert']
        })
    
    async def alert_resolved_broadcast(self, event):
        """Handle alert resolution broadcast."""
        await self.send_json_safe({
            'type': 'alert_resolved',
            'alert_id': event['alert_id'],
            'resolved_by': event['resolved_by']
        })
    
    async def system_metrics_update(self, event):
        """Handle system metrics update."""
        await self.send_json_safe({
            'type': 'system_metrics',
            'metrics': event['metrics']
        })
    
    # Database operations
    @database_sync_to_async
    def get_active_system_alerts(self):
        """Get active system alerts."""
        alerts = SystemAlert.objects.filter(
            is_active=True,
            is_resolved=False
        ).order_by('-created_at')[:50]
        
        return [
            {
                'id': str(alert.id),
                'title': alert.title,
                'message': alert.message,
                'alert_type': alert.alert_type,
                'category': alert.category,
                'is_public': alert.is_public,
                'created_at': alert.created_at.isoformat(),
                'metadata': alert.metadata
            }
            for alert in alerts
        ]
    
    @database_sync_to_async
    def resolve_system_alert(self, alert_id):
        """Resolve a system alert."""
        try:
            alert = SystemAlert.objects.get(id=alert_id)
            alert.resolve(resolved_by=self.user)
            return True
        except SystemAlert.DoesNotExist:
            return False
    
    @database_sync_to_async
    def create_system_alert(self, alert_data):
        """Create a new system alert."""
        try:
            alert = SystemAlert.objects.create(**alert_data)
            return {
                'id': str(alert.id),
                'title': alert.title,
                'message': alert.message,
                'alert_type': alert.alert_type,
                'category': alert.category,
                'created_at': alert.created_at.isoformat()
            }
        except Exception as e:
            logger.error(f"Error creating system alert: {str(e)}")
            return None
    
    @database_sync_to_async
    def get_system_status(self):
        """Get overall system status."""
        from django.db import connection
        
        # Basic system metrics
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM accounts_user WHERE is_active = 1")
                active_users = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM investments_investment WHERE status = 'active'")
                active_investments = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM payments_payment WHERE status = 'completed' AND created_at >= datetime('now', '-24 hours')")
                payments_24h = cursor.fetchone()[0]
                
            return {
                'active_users': active_users,
                'active_investments': active_investments,
                'payments_24h': payments_24h,
                'system_health': 'healthy',
                'last_updated': timezone.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting system status: {str(e)}")
            return {
                'system_health': 'error',
                'error': str(e),
                'last_updated': timezone.now().isoformat()
            }
    
    @database_sync_to_async
    def get_recent_user_activity(self):
        """Get recent user activity."""
        # This would typically integrate with an activity logging system
        return {
            'recent_logins': [],
            'recent_investments': [],
            'recent_registrations': []
        }


class PropertyConsumer(BaseConsumer):
    """
    Consumer for property-specific updates.
    Handles: /ws/property/{property_id}/
    """
    
    async def connect(self):
        """Handle connection and join property group."""
        await super().connect()
        
        if not hasattr(self, 'user') or not self.user.is_authenticated:
            return
        
        self.property_id = self.scope['url_route']['kwargs']['property_id']
        self.property_group_name = f"property_{self.property_id}"
        
        # Verify user has access to this property
        has_access = await self.verify_property_access()
        if not has_access:
            await self.close(code=4003)
            return
        
        # Join property group
        await self.channel_layer.group_add(
            self.property_group_name,
            self.channel_name
        )
        
        # Send initial property data
        property_data = await self.get_property_data()
        if property_data:
            await self.send_json_safe({
                'type': 'property_data',
                'property': property_data
            })
    
    async def disconnect(self, close_code):
        """Handle disconnection."""
        if hasattr(self, 'property_group_name'):
            await self.channel_layer.group_discard(
                self.property_group_name,
                self.channel_name
            )
        await super().disconnect(close_code)
    
    # Group message handlers
    async def property_update(self, event):
        """Handle property update broadcast."""
        await self.send_json_safe({
            'type': 'property_update',
            'update_type': event['update_type'],
            'data': event['data']
        })
    
    async def investment_update(self, event):
        """Handle investment update for this property."""
        await self.send_json_safe({
            'type': 'investment_update',
            'investment_data': event['investment_data']
        })
    
    async def construction_update(self, event):
        """Handle construction progress update."""
        await self.send_json_safe({
            'type': 'construction_update',
            'progress_data': event['progress_data']
        })
    
    # Database operations
    @database_sync_to_async
    def verify_property_access(self):
        """Verify user has access to this property."""
        try:
            property_obj = Property.objects.get(id=self.property_id)
            
            # Allow access if:
            # - User is admin/staff
            # - User has invested in this property
            # - Property is publicly viewable
            if self.user.is_staff or self.user.user_type == 'admin':
                return True
            
            if hasattr(self.user, 'investments') and self.user.investments.filter(property=property_obj).exists():
                return True
            
            if property_obj.is_public:
                return True
            
            return False
        except Property.DoesNotExist:
            return False
    
    @database_sync_to_async
    def get_property_data(self):
        """Get property data for WebSocket."""
        try:
            property_obj = Property.objects.select_related('construction_progress').get(id=self.property_id)
            
            return {
                'id': str(property_obj.id),
                'title': property_obj.title,
                'status': property_obj.status,
                'total_tokens': property_obj.total_tokens,
                'available_tokens': property_obj.available_tokens,
                'token_price': str(property_obj.token_price),
                'funding_progress': property_obj.funding_progress,
                'construction_progress': getattr(property_obj, 'construction_progress', {})
            }
        except Property.DoesNotExist:
            return None


class InvestmentConsumer(BaseConsumer):
    """
    Consumer for investment-specific updates.
    Handles: /ws/investment/{investment_id}/
    """
    
    async def connect(self):
        """Handle connection and join investment group."""
        await super().connect()
        
        if not hasattr(self, 'user') or not self.user.is_authenticated:
            return
        
        self.investment_id = self.scope['url_route']['kwargs']['investment_id']
        self.investment_group_name = f"investment_{self.investment_id}"
        
        # Verify user owns this investment
        owns_investment = await self.verify_investment_ownership()
        if not owns_investment:
            await self.close(code=4003)
            return
        
        # Join investment group
        await self.channel_layer.group_add(
            self.investment_group_name,
            self.channel_name
        )
        
        # Send initial investment data
        investment_data = await self.get_investment_data()
        if investment_data:
            await self.send_json_safe({
                'type': 'investment_data',
                'investment': investment_data
            })
    
    async def disconnect(self, close_code):
        """Handle disconnection."""
        if hasattr(self, 'investment_group_name'):
            await self.channel_layer.group_discard(
                self.investment_group_name,
                self.channel_name
            )
        await super().disconnect(close_code)
    
    # Group message handlers
    async def investment_status_update(self, event):
        """Handle investment status update."""
        await self.send_json_safe({
            'type': 'investment_status_update',
            'status': event['status'],
            'data': event['data']
        })
    
    async def payment_update(self, event):
        """Handle payment update for this investment."""
        await self.send_json_safe({
            'type': 'payment_update',
            'payment_data': event['payment_data']
        })
    
    async def dividend_update(self, event):
        """Handle dividend update."""
        await self.send_json_safe({
            'type': 'dividend_update',
            'dividend_data': event['dividend_data']
        })
    
    # Database operations
    @database_sync_to_async
    def verify_investment_ownership(self):
        """Verify user owns this investment."""
        try:
            investment = Investment.objects.get(id=self.investment_id, investor=self.user)
            return True
        except Investment.DoesNotExist:
            return False
    
    @database_sync_to_async
    def get_investment_data(self):
        """Get investment data for WebSocket."""
        try:
            investment = Investment.objects.select_related('property', 'payment').get(
                id=self.investment_id, 
                investor=self.user
            )
            
            return {
                'id': str(investment.id),
                'property_id': str(investment.property.id),
                'amount': str(investment.amount),
                'tokens_allocated': investment.tokens_allocated,
                'status': investment.status,
                'created_at': investment.created_at.isoformat(),
                'payment_status': investment.payment.status if investment.payment else 'pending'
            }
        except Investment.DoesNotExist:
            return None