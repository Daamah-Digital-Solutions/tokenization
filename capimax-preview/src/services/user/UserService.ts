import { apiClient } from '../api/ApiClient';
import type { 
  User, 
  UserProfileData, 
  Notification,
  Transaction,
  Investment
} from '../api/types';

export class UserService {
  /**
   * Get user profile
   */
  static async getProfile(userId?: string): Promise<User> {
    try {
      const endpoint = userId ? `/users/${userId}` : '/users/profile';
      return await apiClient.get<User>(endpoint);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(profileData: UserProfileData): Promise<User> {
    try {
      return await apiClient.put<User>('/users/profile', profileData);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Upload profile avatar
   */
  static async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      return await apiClient.uploadFile<{ avatar_url: string }>('/users/avatar', formData);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(password: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete('/users/account', {
        data: { password }
      });
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getNotifications(page = 1, limit = 20): Promise<{
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get('/users/notifications', { page, limit });
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(notificationId: string): Promise<{ message: string }> {
    try {
      return await apiClient.put(`/users/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsRead(): Promise<{ message: string }> {
    try {
      return await apiClient.put('/users/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get user investment portfolio
   */
  static async getPortfolio(): Promise<{
    investments: Investment[];
    total_invested: number;
    current_value: number;
    total_return: number;
    return_percentage: number;
  }> {
    try {
      return await apiClient.get('/users/portfolio');
    } catch (error) {
      console.error('Failed to get portfolio:', error);
      throw error;
    }
  }

  /**
   * Get user transaction history
   */
  static async getTransactionHistory(page = 1, limit = 20): Promise<{
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get('/users/transactions', { page, limit });
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw error;
    }
  }

  /**
   * Get user dashboard statistics
   */
  static async getDashboardStats(): Promise<{
    total_invested: number;
    current_value: number;
    total_return: number;
    return_percentage: number;
    properties_count: number;
    pending_investments: number;
    completed_investments: number;
    monthly_dividends: number;
  }> {
    try {
      return await apiClient.get('/users/dashboard/stats');
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    investment_updates: boolean;
    kyc_updates: boolean;
    property_updates: boolean;
    dividend_notifications: boolean;
    marketing_emails: boolean;
  }): Promise<{ message: string }> {
    try {
      return await apiClient.put('/users/preferences/notifications', preferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(): Promise<{
    email_notifications: boolean;
    push_notifications: boolean;
    investment_updates: boolean;
    kyc_updates: boolean;
    property_updates: boolean;
    dividend_notifications: boolean;
    marketing_emails: boolean;
  }> {
    try {
      return await apiClient.get('/users/preferences/notifications');
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update wallet address
   */
  static async updateWalletAddress(walletAddress: string): Promise<User> {
    try {
      return await apiClient.put<User>('/users/wallet', { wallet_address: walletAddress });
    } catch (error) {
      console.error('Failed to update wallet address:', error);
      throw error;
    }
  }

  /**
   * Verify wallet ownership
   */
  static async verifyWallet(signature: string, message: string): Promise<{ verified: boolean }> {
    try {
      return await apiClient.post('/users/wallet/verify', { signature, message });
    } catch (error) {
      console.error('Failed to verify wallet:', error);
      throw error;
    }
  }

  /**
   * Get user activity feed
   */
  static async getActivityFeed(page = 1, limit = 20): Promise<{
    activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      metadata?: any;
      created_at: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get('/users/activity', { page, limit });
    } catch (error) {
      console.error('Failed to get activity feed:', error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  static async exportUserData(): Promise<{ download_url: string }> {
    try {
      return await apiClient.post('/users/export');
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Request account verification
   */
  static async requestVerification(): Promise<{ message: string }> {
    try {
      return await apiClient.post('/users/verification/request');
    } catch (error) {
      console.error('Failed to request verification:', error);
      throw error;
    }
  }

  /**
   * Get verification status
   */
  static async getVerificationStatus(): Promise<{
    is_verified: boolean;
    verification_level: string;
    kyc_status: string;
    required_documents: string[];
    pending_documents: string[];
  }> {
    try {
      return await apiClient.get('/users/verification/status');
    } catch (error) {
      console.error('Failed to get verification status:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: {
    language: string;
    currency: string;
    timezone: string;
    theme: string;
    dashboard_layout: string;
  }): Promise<{ message: string }> {
    try {
      return await apiClient.put('/users/preferences', preferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences(): Promise<{
    language: string;
    currency: string;
    timezone: string;
    theme: string;
    dashboard_layout: string;
  }> {
    try {
      return await apiClient.get('/users/preferences');
    } catch (error) {
      console.error('Failed to get preferences:', error);
      throw error;
    }
  }
}

export default UserService;