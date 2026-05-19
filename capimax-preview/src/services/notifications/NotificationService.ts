/**
 * NotificationService — frontend wrapper for backend `/notifications/`.
 *
 * Distinct from `NotificationContext` (transient toast UI). This service
 * talks to the Django `notifications` app for persisted notifications
 * tied to a user account: investment status changes, dividend payouts,
 * KYC results, system alerts, etc.
 *
 * Backend reference: `capimax_backend/notifications/urls.py`.
 *
 * Endpoint summary (all under `/notifications/`):
 *   - GET    /                       list user notifications
 *   - POST   /                       (admin) create a notification
 *   - POST   /mark-read/             mark a set as read (ids in body)
 *   - POST   /mark-all-read/         mark all as read
 *   - GET    /unread-count/          unread total
 *   - GET    /stats/                 notification stats
 *   - GET    /preferences/           user preferences (channel toggles)
 *   - PUT    /preferences/           update preferences
 *   - GET    /<uuid>/                single notification
 *   - POST   /<uuid>/mark-read/      mark one as read
 *   - GET    /system-alerts/         active alerts visible to the user
 */

import { apiClient } from '../api/ApiClient';

export type NotificationCategory =
  | 'investment'
  | 'payment'
  | 'dividend'
  | 'kyc'
  | 'property'
  | 'marketplace'
  | 'broker'
  | 'system'
  | 'security'
  | 'announcement';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface BackendNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  is_read: boolean;
  action_url?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  digest_frequency: 'instant' | 'daily' | 'weekly' | 'never';
  category_overrides?: Partial<Record<NotificationCategory, boolean>>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_category: Partial<Record<NotificationCategory, number>>;
  by_priority: Partial<Record<NotificationPriority, number>>;
}

export interface PaginatedNotifications {
  results: BackendNotification[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  starts_at: string;
  ends_at?: string | null;
  is_active: boolean;
}

class NotificationService {
  private readonly base = '/notifications';

  async list(params: {
    page?: number;
    page_size?: number;
    unread_only?: boolean;
    category?: NotificationCategory;
  } = {}): Promise<PaginatedNotifications> {
    const query: any = {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
    };
    if (params.unread_only) query.is_read = 'false';
    if (params.category) query.category = params.category;
    return apiClient.get<PaginatedNotifications>(`${this.base}/`, query);
  }

  async getUnreadCount(): Promise<{ unread: number }> {
    return apiClient.get(`${this.base}/unread-count/`);
  }

  async getStats(): Promise<NotificationStats> {
    return apiClient.get(`${this.base}/stats/`);
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    return apiClient.post(`${this.base}/${notificationId}/mark-read/`);
  }

  /**
   * Mark a batch of notifications as read. Backend accepts `{ ids: [...] }`.
   */
  async markManyAsRead(notificationIds: string[]): Promise<{ marked: number }> {
    return apiClient.post(`${this.base}/mark-read/`, { ids: notificationIds });
  }

  async markAllAsRead(): Promise<{ marked: number }> {
    return apiClient.post(`${this.base}/mark-all-read/`);
  }

  async getPreferences(): Promise<NotificationPreferences> {
    return apiClient.get(`${this.base}/preferences/`);
  }

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return apiClient.put(`${this.base}/preferences/`, prefs);
  }

  /**
   * System alerts visible to the current user. Distinct from notifications:
   * these are platform-wide banners (maintenance windows, outages).
   */
  async getActiveSystemAlerts(): Promise<SystemAlert[]> {
    const res: any = await apiClient.get(`${this.base}/system-alerts/`);
    return res?.results ?? res ?? [];
  }
}

export const notificationService = new NotificationService();
export default notificationService;
