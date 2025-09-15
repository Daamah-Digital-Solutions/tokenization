import React, { useEffect, useCallback } from 'react';
import { webSocketService, NotificationService } from '../../../services';
import type { SystemAlert } from '../../../services';

interface AdminWebSocketManagerProps {
  onStatsUpdate?: (stats: any) => void;
  onUserUpdate?: (user: any) => void;
  onPropertyUpdate?: (property: any) => void;
  onSystemAlert?: (alert: SystemAlert) => void;
  onTransactionUpdate?: (transaction: any) => void;
  onFinancialUpdate?: (financial: any) => void;
  children: React.ReactNode;
}

export const AdminWebSocketManager: React.FC<AdminWebSocketManagerProps> = ({
  onStatsUpdate,
  onUserUpdate,
  onPropertyUpdate,
  onSystemAlert,
  onTransactionUpdate,
  onFinancialUpdate,
  children
}) => {
  // Handle dashboard statistics updates
  const handleStatsUpdate = useCallback((data: any) => {
    console.log('Admin: Received stats update', data);
    if (onStatsUpdate) {
      onStatsUpdate(data);
    }
  }, [onStatsUpdate]);

  // Handle user-related updates
  const handleUserUpdate = useCallback((data: any) => {
    console.log('Admin: Received user update', data);
    if (onUserUpdate) {
      onUserUpdate(data);
    }
  }, [onUserUpdate]);

  // Handle property updates
  const handlePropertyUpdate = useCallback((data: any) => {
    console.log('Admin: Received property update', data);
    if (onPropertyUpdate) {
      onPropertyUpdate(data);
    }
  }, [onPropertyUpdate]);

  // Handle system alerts
  const handleSystemAlert = useCallback((alert: SystemAlert) => {
    console.log('Admin: Received system alert', alert);
    
    // Show browser notification for critical alerts
    if (alert.severity === 'CRITICAL' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Critical System Alert: ${alert.title}`, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id
      });
    }
    
    if (onSystemAlert) {
      onSystemAlert(alert);
    }
  }, [onSystemAlert]);

  // Handle transaction updates
  const handleTransactionUpdate = useCallback((data: any) => {
    console.log('Admin: Received transaction update', data);
    if (onTransactionUpdate) {
      onTransactionUpdate(data);
    }
  }, [onTransactionUpdate]);

  // Handle financial updates
  const handleFinancialUpdate = useCallback((data: any) => {
    console.log('Admin: Received financial update', data);
    if (onFinancialUpdate) {
      onFinancialUpdate(data);
    }
  }, [onFinancialUpdate]);

  // Handle WebSocket connection status
  const handleConnectionStatus = useCallback((status: string) => {
    console.log('Admin WebSocket status:', status);
    
    // You could show a notification banner here for connection status
    if (status === 'connected') {
      console.log('Admin dashboard connected to real-time updates');
    } else if (status === 'error' || status === 'disconnected') {
      console.log('Admin dashboard disconnected from real-time updates');
    }
  }, []);

  // Set up WebSocket subscriptions on mount
  useEffect(() => {
    // Connect to WebSocket if not already connected
    if (!webSocketService.isSocketConnected()) {
      webSocketService.connect();
    }

    // Request browser notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to admin-specific events
    webSocketService.on('admin_stats_update', handleStatsUpdate);
    webSocketService.on('admin_user_update', handleUserUpdate);
    webSocketService.on('admin_property_update', handlePropertyUpdate);
    webSocketService.on('system_alert', handleSystemAlert);
    webSocketService.on('admin_transaction_update', handleTransactionUpdate);
    webSocketService.on('admin_financial_update', handleFinancialUpdate);

    // Subscribe to connection status changes
    webSocketService.onStatusChange(handleConnectionStatus);

    // Join admin-specific rooms for targeted notifications
    webSocketService.joinRoom('admin_dashboard');
    webSocketService.joinRoom('admin_alerts');
    webSocketService.joinRoom('admin_stats');

    // Cleanup function
    return () => {
      webSocketService.off('admin_stats_update', handleStatsUpdate);
      webSocketService.off('admin_user_update', handleUserUpdate);
      webSocketService.off('admin_property_update', handlePropertyUpdate);
      webSocketService.off('system_alert', handleSystemAlert);
      webSocketService.off('admin_transaction_update', handleTransactionUpdate);
      webSocketService.off('admin_financial_update', handleFinancialUpdate);
      webSocketService.offStatusChange(handleConnectionStatus);

      // Leave admin rooms
      webSocketService.leaveRoom('admin_dashboard');
      webSocketService.leaveRoom('admin_alerts');
      webSocketService.leaveRoom('admin_stats');
    };
  }, [
    handleStatsUpdate,
    handleUserUpdate,
    handlePropertyUpdate,
    handleSystemAlert,
    handleTransactionUpdate,
    handleFinancialUpdate,
    handleConnectionStatus
  ]);

  // Subscribe to general notification service
  useEffect(() => {
    const handleGeneralNotification = (notification: any) => {
      console.log('Admin: Received general notification', notification);
      
      // Handle specific notification types that are relevant to admins
      switch (notification.type) {
        case 'USER_REGISTRATION':
          handleUserUpdate({ type: 'new_user', user: notification.data });
          break;
        case 'KYC_SUBMISSION':
          handleUserUpdate({ type: 'kyc_update', user: notification.data });
          break;
        case 'PROPERTY_SUBMISSION':
          handlePropertyUpdate({ type: 'new_property', property: notification.data });
          break;
        case 'LARGE_TRANSACTION':
          handleTransactionUpdate({ type: 'large_transaction', transaction: notification.data });
          break;
        case 'WITHDRAWAL_REQUEST':
          handleFinancialUpdate({ type: 'withdrawal_request', withdrawal: notification.data });
          break;
        case 'SYSTEM_ERROR':
          handleSystemAlert({
            id: notification.id || Date.now().toString(),
            type: 'SYSTEM_ERROR',
            severity: 'HIGH' as const,
            title: 'System Error Detected',
            message: notification.message || 'An error occurred in the system',
            source: 'SYSTEM',
            status: 'ACTIVE' as const,
            createdAt: new Date().toISOString()
          });
          break;
      }
    };

    NotificationService.subscribe(handleGeneralNotification);

    return () => {
      NotificationService.unsubscribe(handleGeneralNotification);
    };
  }, [handleUserUpdate, handlePropertyUpdate, handleTransactionUpdate, handleFinancialUpdate, handleSystemAlert]);

  return <>{children}</>;
};

export default AdminWebSocketManager;