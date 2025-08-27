import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/database';
import { NotificationType } from '../types';
import { User } from './User';

export interface NotificationAttributes {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  isSent: boolean;
  isPush: boolean;
  isEmail: boolean;
  isSMS: boolean;
  isInApp: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  expiresAt?: Date;
  readAt?: Date;
  sentAt?: Date;
  emailSentAt?: Date;
  pushSentAt?: Date;
  smsSentAt?: Date;
  deliveryStatus?: 'pending' | 'delivered' | 'failed' | 'bounced';
  failureReason?: string;
  clickCount: number;
  lastClickedAt?: Date;
  metadata?: any;
  templateId?: string;
  templateData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes,
  'id' | 'data' | 'isRead' | 'isSent' | 'isPush' | 'isEmail' | 'isSMS' | 'isInApp' |
  'priority' | 'category' | 'actionUrl' | 'actionText' | 'imageUrl' | 'expiresAt' |
  'readAt' | 'sentAt' | 'emailSentAt' | 'pushSentAt' | 'smsSentAt' | 'deliveryStatus' |
  'failureReason' | 'clickCount' | 'lastClickedAt' | 'metadata' | 'templateId' |
  'templateData' | 'createdAt' | 'updatedAt'> {}

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public userId!: string;
  public type!: NotificationType;
  public title!: string;
  public message!: string;
  public data?: any;
  public isRead!: boolean;
  public isSent!: boolean;
  public isPush!: boolean;
  public isEmail!: boolean;
  public isSMS!: boolean;
  public isInApp!: boolean;
  public priority!: 'low' | 'medium' | 'high' | 'urgent';
  public category?: string;
  public actionUrl?: string;
  public actionText?: string;
  public imageUrl?: string;
  public expiresAt?: Date;
  public readAt?: Date;
  public sentAt?: Date;
  public emailSentAt?: Date;
  public pushSentAt?: Date;
  public smsSentAt?: Date;
  public deliveryStatus?: 'pending' | 'delivered' | 'failed' | 'bounced';
  public failureReason?: string;
  public clickCount!: number;
  public lastClickedAt?: Date;
  public metadata?: any;
  public templateId?: string;
  public templateData?: any;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public user?: User;

  // Virtual fields
  public get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  public get age(): number {
    return Math.floor((new Date().getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  public get hasAction(): boolean {
    return !!(this.actionUrl && this.actionText);
  }

  public get deliveryChannels(): string[] {
    const channels: string[] = [];
    if (this.isInApp) channels.push('in-app');
    if (this.isEmail) channels.push('email');
    if (this.isPush) channels.push('push');
    if (this.isSMS) channels.push('sms');
    return channels;
  }

  public get priorityIcon(): string {
    const icons = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
    };
    return icons[this.priority] || '⚪';
  }

  // Instance methods
  public async markAsRead(): Promise<void> {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
      await this.save();
    }
  }

  public async markAsUnread(): Promise<void> {
    this.isRead = false;
    this.readAt = undefined;
    await this.save();
  }

  public async markAsSent(channel?: string): Promise<void> {
    this.isSent = true;
    this.sentAt = new Date();
    this.deliveryStatus = 'delivered';
    
    if (channel) {
      const timestamp = new Date();
      switch (channel) {
        case 'email':
          this.emailSentAt = timestamp;
          break;
        case 'push':
          this.pushSentAt = timestamp;
          break;
        case 'sms':
          this.smsSentAt = timestamp;
          break;
      }
    }
    
    await this.save();
  }

  public async markAsDelivered(channel?: string): Promise<void> {
    this.deliveryStatus = 'delivered';
    if (channel) {
      await this.markAsSent(channel);
    }
    await this.save();
  }

  public async markAsFailed(reason?: string, channel?: string): Promise<void> {
    this.deliveryStatus = 'failed';
    this.failureReason = reason;
    await this.save();
  }

  public async recordClick(): Promise<void> {
    this.clickCount += 1;
    this.lastClickedAt = new Date();
    await this.save();
  }

  public async updateMetadata(newMetadata: any): Promise<void> {
    this.metadata = { ...this.metadata, ...newMetadata };
    await this.save();
  }

  public getDisplayData(): {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: string;
    isRead: boolean;
    hasAction: boolean;
    actionUrl?: string;
    actionText?: string;
    imageUrl?: string;
    createdAt: Date;
    age: number;
    priorityIcon: string;
  } {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      message: this.message,
      priority: this.priority,
      isRead: this.isRead,
      hasAction: this.hasAction,
      actionUrl: this.actionUrl,
      actionText: this.actionText,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      age: this.age,
      priorityIcon: this.priorityIcon
    };
  }

  // Static methods
  public static async findByUserId(
    userId: string, 
    options: {
      unreadOnly?: boolean;
      type?: NotificationType;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const where: any = { userId };
    
    if (options.unreadOnly) where.isRead = false;
    if (options.type) where.type = options.type;
    if (options.priority) where.priority = options.priority;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 20,
      offset: options.offset || 0
    });

    // Get unread count
    const unreadCount = await Notification.count({
      where: { userId, isRead: false }
    });

    return {
      notifications: rows,
      total: count,
      unreadCount
    };
  }

  public static async getUnreadCount(userId: string): Promise<number> {
    return Notification.count({
      where: { userId, isRead: false }
    });
  }

  public static async markAllAsRead(userId: string): Promise<number> {
    const [updatedCount] = await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId, isRead: false } }
    );
    
    return updatedCount;
  }

  public static async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const deletedCount = await Notification.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate },
        isRead: true
      }
    });
    
    return deletedCount;
  }

  public static async createInvestmentNotification(
    userId: string,
    propertyName: string,
    tokenAmount: number,
    investmentAmount: number
  ): Promise<Notification> {
    return Notification.create({
      userId,
      type: NotificationType.INVESTMENT_CONFIRMED,
      title: 'Investment Confirmed! 🎉',
      message: `Your investment of ${tokenAmount} tokens (${investmentAmount.toLocaleString()}) in ${propertyName} has been confirmed.`,
      priority: 'high',
      isInApp: true,
      isPush: true,
      isEmail: true,
      category: 'investment',
      data: {
        propertyName,
        tokenAmount,
        investmentAmount
      },
      actionUrl: '/dashboard/investments',
      actionText: 'View Investment',
      clickCount: 0
    });
  }

  public static async createKYCNotification(
    userId: string,
    status: 'approved' | 'rejected',
    message?: string
  ): Promise<Notification> {
    const isApproved = status === 'approved';
    
    return Notification.create({
      userId,
      type: isApproved ? NotificationType.KYC_APPROVED : NotificationType.KYC_REJECTED,
      title: isApproved ? 'KYC Approved! ✅' : 'KYC Review Required ❌',
      message: message || (isApproved ? 
        'Your identity verification has been approved. You can now invest in properties!' : 
        'Your identity verification needs additional review. Please check the requirements.'),
      priority: 'high',
      isInApp: true,
      isPush: true,
      isEmail: true,
      category: 'kyc',
      actionUrl: '/dashboard/kyc',
      actionText: isApproved ? 'Start Investing' : 'Review KYC',
      clickCount: 0
    });
  }

  public static async createDividendNotification(
    userId: string,
    propertyName: string,
    amount: number,
    currency: string
  ): Promise<Notification> {
    return Notification.create({
      userId,
      type: NotificationType.DIVIDEND_RECEIVED,
      title: 'Dividend Received! 💰',
      message: `You received ${amount.toLocaleString()} ${currency} in dividends from ${propertyName}.`,
      priority: 'medium',
      isInApp: true,
      isPush: true,
      isEmail: true,
      category: 'dividend',
      data: {
        propertyName,
        amount,
        currency
      },
      actionUrl: '/dashboard/transactions',
      actionText: 'View Transaction',
      clickCount: 0
    });
  }

  public static async createNewPropertyNotification(
    userId: string,
    propertyId: string,
    propertyName: string,
    tokenPrice: number
  ): Promise<Notification> {
    return Notification.create({
      userId,
      type: NotificationType.NEW_PROPERTY,
      title: 'New Investment Opportunity! 🏠',
      message: `${propertyName} is now available for investment starting at ${tokenPrice.toLocaleString()}.`,
      priority: 'medium',
      isInApp: true,
      isPush: true,
      category: 'property',
      data: {
        propertyId,
        propertyName,
        tokenPrice
      },
      actionUrl: `/properties/${propertyId}`,
      actionText: 'View Property',
      clickCount: 0
    });
  }

  public static async getNotificationStats(userId?: string): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    sentNotifications: number;
    clickedNotifications: number;
    avgClickRate: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<string, number>;
    deliveryStats: {
      pending: number;
      delivered: number;
      failed: number;
      bounced: number;
    };
  }> {
    const whereClause = userId ? { userId } : {};
    
    const notifications = await Notification.findAll({ where: whereClause });
    
    const totalNotifications = notifications.length;
    const unreadNotifications = notifications.filter(n => !n.isRead).length;
    const sentNotifications = notifications.filter(n => n.isSent).length;
    const clickedNotifications = notifications.filter(n => n.clickCount > 0).length;
    const avgClickRate = sentNotifications > 0 ? (clickedNotifications / sentNotifications) * 100 : 0;

    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);

    const byPriority = notifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deliveryStats = notifications.reduce((acc, n) => {
      const status = n.deliveryStatus || 'pending';
      acc[status as keyof typeof acc] = (acc[status as keyof typeof acc] || 0) + 1;
      return acc;
    }, { pending: 0, delivered: 0, failed: 0, bounced: 0 });

    return {
      totalNotifications,
      unreadNotifications,
      sentNotifications,
      clickedNotifications,
      avgClickRate,
      byType,
      byPriority,
      deliveryStats
    };
  }
}

// Initialize the model
Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(...Object.values(NotificationType)),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 1000]
      }
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read'
    },
    isSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_sent'
    },
    isPush: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_push'
    },
    isEmail: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email'
    },
    isSMS: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_sms'
    },
    isInApp: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_in_app'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    actionUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'action_url'
    },
    actionText: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'action_text'
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'image_url'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at'
    },
    emailSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_sent_at'
    },
    pushSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'push_sent_at'
    },
    smsSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sms_sent_at'
    },
    deliveryStatus: {
      type: DataTypes.ENUM('pending', 'delivered', 'failed', 'bounced'),
      defaultValue: 'pending',
      field: 'delivery_status'
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'failure_reason'
    },
    clickCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'click_count'
    },
    lastClickedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_clicked_at'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    templateId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'template_id'
    },
    templateData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'template_data'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['is_read']
      },
      {
        fields: ['is_sent']
      },
      {
        fields: ['delivery_status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['expires_at']
      }
    ]
  }
);

// Define associations
Notification.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  onDelete: 'CASCADE'
});