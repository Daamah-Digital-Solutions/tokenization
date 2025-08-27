import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { SocketService } from '../config/socket';
import { NotificationType } from '../types';
import logger, { LoggerService } from '../utils/logger';
import { EmailService } from './EmailService';

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  channels?: {
    inApp?: boolean;
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  expiresAt?: Date;
}

export class NotificationService {
  /**
   * Send a notification through multiple channels
   */
  static async sendNotification(notificationData: NotificationData): Promise<Notification> {
    try {
      // Get user details
      const user = await User.findByPk(notificationData.userId);
      if (!user) {
        throw new Error(`User not found: ${notificationData.userId}`);
      }

      // Set default channels if not specified
      const channels = notificationData.channels || {
        inApp: true,
        email: false,
        push: false,
        sms: false
      };

      // Create notification in database
      const notification = await Notification.create({
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        priority: notificationData.priority || 'medium',
        isInApp: channels.inApp || false,
        isEmail: channels.email || false,
        isPush: channels.push || false,
        isSMS: channels.sms || false,
        actionUrl: notificationData.actionUrl,
        actionText: notificationData.actionText,
        imageUrl: notificationData.imageUrl,
        expiresAt: notificationData.expiresAt,
        clickCount: 0
      });

      // Send through different channels
      const deliveryPromises: Promise<any>[] = [];

      // In-app notification (real-time via Socket.IO)
      if (channels.inApp) {
        deliveryPromises.push(this.sendInAppNotification(user, notification));
      }

      // Email notification
      if (channels.email) {
        deliveryPromises.push(this.sendEmailNotification(user, notification));
      }

      // Push notification (placeholder for future implementation)
      if (channels.push) {
        deliveryPromises.push(this.sendPushNotification(user, notification));
      }

      // SMS notification (placeholder for future implementation)
      if (channels.sms) {
        deliveryPromises.push(this.sendSMSNotification(user, notification));
      }

      // Wait for all delivery attempts
      await Promise.allSettled(deliveryPromises);

      // Mark as sent
      await notification.markAsSent();

      LoggerService.logUserAction(user.id, 'notification_sent', {
        notificationId: notification.id,
        type: notificationData.type,
        channels: Object.keys(channels).filter(key => channels[key as keyof typeof channels])
      });

      return notification;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send in-app notification via Socket.IO
   */
  private static async sendInAppNotification(user: User, notification: Notification): Promise<void> {
    try {
      SocketService.emitToUser(user.id, 'notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        imageUrl: notification.imageUrl,
        createdAt: notification.createdAt
      });
    } catch (error) {
      logger.error('Failed to send in-app notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(user: User, notification: Notification): Promise<void> {
    try {
      // For now, we'll use a generic email template
      // In production, you'd have specific templates for each notification type
      const success = await EmailService.sendGenericNotification(
        user.email,
        user.firstName,
        notification.title,
        notification.message,
        notification.actionUrl,
        notification.actionText
      );

      if (success) {
        await notification.markAsSent('email');
      } else {
        await notification.markAsFailed('Email delivery failed', 'email');
      }
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      await notification.markAsFailed(`Email error: ${error}`, 'email');
    }
  }

  /**
   * Send push notification (placeholder)
   */
  private static async sendPushNotification(user: User, notification: Notification): Promise<void> {
    try {
      // Placeholder for push notification implementation
      // You would integrate with services like:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNs)
      // - OneSignal
      // - Pusher
      
      logger.info('Push notification would be sent here', {
        userId: user.id,
        notificationId: notification.id
      });

      await notification.markAsSent('push');
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      await notification.markAsFailed(`Push error: ${error}`, 'push');
    }
  }

  /**
   * Send SMS notification (placeholder)
   */
  private static async sendSMSNotification(user: User, notification: Notification): Promise<void> {
    try {
      // Placeholder for SMS implementation
      // You would integrate with services like:
      // - Twilio
      // - AWS SNS
      // - Plivo
      // - MessageBird
      
      if (!user.phone) {
        throw new Error('User has no phone number');
      }

      logger.info('SMS notification would be sent here', {
        userId: user.id,
        phone: user.phone,
        notificationId: notification.id
      });

      await notification.markAsSent('sms');
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      await notification.markAsFailed(`SMS error: ${error}`, 'sms');
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      type?: NotificationType;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return Notification.findByUserId(userId, options);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        return false;
      }

      await notification.markAsRead();
      
      // Emit real-time update
      SocketService.emitToUser(userId, 'notification:read', {
        notificationId,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const updatedCount = await Notification.markAllAsRead(userId);
      
      // Emit real-time update
      SocketService.emitToUser(userId, 'notification:all_read', {
        count: updatedCount,
        timestamp: new Date()
      });

      return updatedCount;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Record notification click
   */
  static async recordClick(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        return false;
      }

      await notification.recordClick();
      await notification.markAsRead(); // Auto-mark as read when clicked

      LoggerService.logUserAction(userId, 'notification_clicked', {
        notificationId,
        type: notification.type
      });

      return true;
    } catch (error) {
      logger.error('Failed to record notification click:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return Notification.getUnreadCount(userId);
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const deletedCount = await Notification.deleteOldNotifications(daysOld);
      logger.info(`Cleaned up ${deletedCount} old notifications`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }

  // Convenience methods for common notification types

  /**
   * Send investment confirmation notification
   */
  static async sendInvestmentConfirmation(
    userId: string,
    propertyName: string,
    tokenAmount: number,
    investmentAmount: number
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      type: NotificationType.INVESTMENT_CONFIRMED,
      title: 'Investment Confirmed! 🎉',
      message: `Your investment of ${tokenAmount} tokens ($${investmentAmount.toLocaleString()}) in ${propertyName} has been confirmed.`,
      priority: 'high',
      channels: { inApp: true, email: true, push: true },
      data: { propertyName, tokenAmount, investmentAmount },
      actionUrl: '/dashboard/investments',
      actionText: 'View Investment'
    });
  }

  /**
   * Send KYC status notification
   */
  static async sendKYCStatusUpdate(
    userId: string,
    status: 'approved' | 'rejected',
    message?: string
  ): Promise<Notification> {
    const isApproved = status === 'approved';
    
    return this.sendNotification({
      userId,
      type: isApproved ? NotificationType.KYC_APPROVED : NotificationType.KYC_REJECTED,
      title: isApproved ? 'KYC Approved! ✅' : 'KYC Review Required ❌',
      message: message || (isApproved ? 
        'Your identity verification has been approved. You can now invest in properties!' : 
        'Your identity verification needs additional review. Please check the requirements.'),
      priority: 'high',
      channels: { inApp: true, email: true, push: true },
      actionUrl: '/dashboard/kyc',
      actionText: isApproved ? 'Start Investing' : 'Review KYC'
    });
  }

  /**
   * Send dividend received notification
   */
  static async sendDividendReceived(
    userId: string,
    propertyName: string,
    amount: number,
    currency: string
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      type: NotificationType.DIVIDEND_RECEIVED,
      title: 'Dividend Received! 💰',
      message: `You received $${amount.toLocaleString()} ${currency} in dividends from ${propertyName}.`,
      priority: 'medium',
      channels: { inApp: true, email: true, push: true },
      data: { propertyName, amount, currency },
      actionUrl: '/dashboard/transactions',
      actionText: 'View Transaction'
    });
  }

  /**
   * Send new property available notification
   */
  static async sendNewPropertyAvailable(
    userId: string,
    propertyId: string,
    propertyName: string,
    tokenPrice: number
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      type: NotificationType.NEW_PROPERTY,
      title: 'New Investment Opportunity! 🏠',
      message: `${propertyName} is now available for investment starting at $${tokenPrice.toLocaleString()}.`,
      priority: 'medium',
      channels: { inApp: true, push: true },
      data: { propertyId, propertyName, tokenPrice },
      actionUrl: `/properties/${propertyId}`,
      actionText: 'View Property'
    });
  }

  /**
   * Send payment confirmation notification
   */
  static async sendPaymentConfirmation(
    userId: string,
    amount: number,
    currency: string,
    transactionHash?: string
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Payment Confirmed! ✅',
      message: `Your payment of $${amount.toLocaleString()} ${currency} has been processed successfully.`,
      priority: 'medium',
      channels: { inApp: true, email: true },
      data: { amount, currency, transactionHash },
      actionUrl: '/dashboard/transactions',
      actionText: 'View Transaction'
    });
  }

  /**
   * Send payment failed notification
   */
  static async sendPaymentFailed(
    userId: string,
    amount: number,
    currency: string,
    reason: string
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_FAILED,
      title: 'Payment Failed ❌',
      message: `Your payment of $${amount.toLocaleString()} ${currency} failed. Reason: ${reason}`,
      priority: 'high',
      channels: { inApp: true, email: true, push: true },
      data: { amount, currency, reason },
      actionUrl: '/dashboard/payments',
      actionText: 'Retry Payment'
    });
  }
}

// Add the missing method to EmailService
declare module './EmailService' {
  namespace EmailService {
    function sendGenericNotification(
      email: string,
      firstName: string,
      title: string,
      message: string,
      actionUrl?: string,
      actionText?: string
    ): Promise<boolean>;
  }
}

// Extend EmailService with generic notification method
(EmailService as any).sendGenericNotification = async function(
  email: string,
  firstName: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<boolean> {
  const template = {
    subject: title,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 20px; background: #f9fafb; }
          .button { 
            display: inline-block; 
            background: #10b981; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>${message}</p>
            ${actionUrl && actionText ? `
              <div style="text-align: center;">
                <a href="${actionUrl}" class="button">${actionText}</a>
              </div>
            ` : ''}
            <p>Best regards,<br>The Capimax Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Capimax. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ${title}
      
      Hello ${firstName},
      
      ${message}
      
      ${actionUrl ? `Visit: ${actionUrl}` : ''}
      
      Best regards,
      The Capimax Team
    `
  };

  return (EmailService as any).sendEmail(email, template);
};