/**
 * UserService — backed by the REAL CapimaxRT backend endpoints.
 *
 * History: an earlier version of this file pointed at a non-existent
 * `/users/*` prefix. Every call silently 404'd in production. This rewrite
 * routes each method to the actual backend path. Methods with no backend
 * implementation are kept (callers exist) but throw a clear error rather
 * than silently failing.
 *
 * Backend endpoint mapping:
 *
 *   Profile           GET/PUT     /auth/profile/
 *   Stats             GET         /auth/stats/
 *   Notifications     GET/...     /notifications/  (use NotificationService.ts)
 *   Portfolio         GET         /portfolio/summary/
 *   Transactions      GET         /transactions/   (investment-level)
 *   Wallet balance    GET         /payments/wallet/
 *   KYC status        GET         /kyc/status/
 *
 * NB: ApiClient already prepends `/api/v1`. Paths here MUST NOT include it.
 */

import { apiClient } from '../api/ApiClient';
import type {
  User,
  UserProfileData,
  Notification,
  Transaction,
  Investment,
} from '../api/types';

export class UserService {
  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------

  /** GET /auth/profile/ — get the authenticated user's profile. */
  static async getProfile(_userId?: string): Promise<User> {
    // The backend exposes only the authenticated user's profile.
    // Looking up by id is an admin-only operation and not supported here.
    try {
      return await apiClient.get<User>('/auth/profile/');
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /** PUT /auth/profile/ — update the authenticated user's profile. */
  static async updateProfile(profileData: UserProfileData): Promise<User> {
    try {
      const backendUser = await apiClient.put<any>('/auth/profile/', profileData);
      // Normalize the response the same way AuthService.getCurrentUser does so
      // downstream consumers (DashboardPage, etc.) can rely on Date objects
      // for `created_at` / `updated_at`. Without this normalization, a save
      // mutation replaces the Date with an ISO string in AuthContext state
      // and any caller that does `user.created_at.toISOString()` crashes the
      // dashboard until a full page reload re-hydrates from getCurrentUser.
      const mappedUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        first_name: backendUser.first_name ?? '',
        last_name: backendUser.last_name ?? '',
        role: backendUser.role,
        phone: backendUser.phone ?? '',
        country: backendUser.country ?? '',
        date_of_birth: backendUser.date_of_birth ?? '',
        address: backendUser.address ?? '',
        city: backendUser.city ?? '',
        state: backendUser.state ?? '',
        postal_code: backendUser.postal_code ?? '',
        kyc_status: backendUser.kyc_status ?? 'not_started',
        is_verified: Boolean(backendUser.is_verified),
        wallet_address: backendUser.wallet_address ?? '',
        created_at: new Date(backendUser.created_at ?? Date.now()),
        updated_at: new Date(backendUser.updated_at ?? Date.now()),
      } as User;
      return mappedUser;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * @deprecated Avatar upload is not implemented on the backend. Either add a
   * backend endpoint (e.g. POST /auth/profile/avatar/) or use the profile PUT
   * with a base64-encoded image field once the User model supports one.
   */
  static async uploadAvatar(_file: File): Promise<{ avatar_url: string }> {
    throw new Error(
      'Avatar upload is not yet implemented on the backend.'
    );
  }

  /**
   * @deprecated Account self-deletion is not implemented on the backend.
   * Until added, route the user to support for account closure.
   */
  static async deleteAccount(_password: string): Promise<{ message: string }> {
    throw new Error(
      'Account deletion is not implemented. Please contact support.'
    );
  }

  // -------------------------------------------------------------------------
  // Notifications — thin pass-through to the real notifications API.
  // -------------------------------------------------------------------------

  /** GET /notifications/ — paginated list. */
  static async getNotifications(page = 1, limit = 20): Promise<{
    notifications: Notification[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      return await apiClient.get('/notifications/', { page, page_size: limit });
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  /** POST /notifications/<id>/mark-read/ — mark a single notification read. */
  static async markNotificationRead(notificationId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/notifications/${notificationId}/mark-read/`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /** POST /notifications/mark-all-read/ — mark every unread notification read. */
  static async markAllNotificationsRead(): Promise<{ message: string }> {
    try {
      return await apiClient.post('/notifications/mark-all-read/');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Portfolio / transactions — investment-level.
  // -------------------------------------------------------------------------

  /** GET /portfolio/summary/ — investment portfolio summary. */
  static async getPortfolio(): Promise<{
    investments: Investment[];
    total_invested: number;
    current_value: number;
    total_return: number;
    return_percentage: number;
  }> {
    try {
      return await apiClient.get('/portfolio/summary/');
    } catch (error) {
      console.error('Failed to get portfolio:', error);
      throw error;
    }
  }

  /** GET /transactions/ — investment transaction history. */
  static async getTransactionHistory(page = 1, limit = 20): Promise<{
    transactions: Transaction[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      return await apiClient.get('/transactions/', { page, page_size: limit });
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw error;
    }
  }

  /** GET /dashboard/stats/ — top-level dashboard statistics for the user. */
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
      return await apiClient.get('/dashboard/stats/');
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Notification preferences — backed by /notifications/preferences/.
  // -------------------------------------------------------------------------

  /** PUT /notifications/preferences/ */
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
      return await apiClient.put('/notifications/preferences/', preferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /** GET /notifications/preferences/ */
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
      return await apiClient.get('/notifications/preferences/');
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Wallet — blockchain wallet address management.
  // -------------------------------------------------------------------------

  /** PUT /auth/profile/ — update wallet_address on the user profile. */
  static async updateWalletAddress(walletAddress: string): Promise<User> {
    try {
      return await apiClient.put<User>('/auth/profile/', {
        wallet_address: walletAddress,
      });
    } catch (error) {
      console.error('Failed to update wallet address:', error);
      throw error;
    }
  }

  /**
   * @deprecated On-chain wallet signature verification is not yet implemented
   * on the backend. The wallet address can be set on the profile, but
   * cryptographic ownership proofs are not yet validated server-side.
   */
  static async verifyWallet(_signature: string, _message: string): Promise<{ verified: boolean }> {
    throw new Error(
      'Wallet signature verification is not yet implemented on the backend.'
    );
  }

  // -------------------------------------------------------------------------
  // Verification (KYC) — thin façade over the real /kyc/ endpoints.
  // -------------------------------------------------------------------------

  /** GET /kyc/status/ — current KYC status for the user. */
  static async getVerificationStatus(): Promise<{
    is_verified: boolean;
    verification_level: string;
    kyc_status: string;
    required_documents: string[];
    pending_documents: string[];
  }> {
    try {
      return await apiClient.get('/kyc/status/');
    } catch (error) {
      console.error('Failed to get verification status:', error);
      throw error;
    }
  }

  /** POST /kyc/submit/ — submit the KYC profile for review. */
  static async requestVerification(): Promise<{ message: string }> {
    try {
      return await apiClient.post('/kyc/submit/');
    } catch (error) {
      console.error('Failed to request verification:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Activity / data export / preferences — not yet implemented.
  // -------------------------------------------------------------------------

  /**
   * @deprecated Activity feed endpoint is not implemented on the backend.
   * Re-use /transactions/ or build a dedicated /activity/ view.
   */
  static async getActivityFeed(_page = 1, _limit = 20): Promise<never> {
    throw new Error('Activity feed is not yet implemented on the backend.');
  }

  /** @deprecated GDPR data export is not implemented on the backend. */
  static async exportUserData(): Promise<never> {
    throw new Error('User data export is not yet implemented on the backend.');
  }

  /**
   * @deprecated UI preferences (theme, language, currency) are stored client-side
   * only. Re-implement on top of the User model once added server-side.
   */
  static async updatePreferences(_preferences: {
    language: string;
    currency: string;
    timezone: string;
    theme: string;
    dashboard_layout: string;
  }): Promise<{ message: string }> {
    throw new Error('User preferences are not yet stored on the backend.');
  }

  /** @deprecated See updatePreferences. */
  static async getPreferences(): Promise<never> {
    throw new Error('User preferences are not yet stored on the backend.');
  }
}

export default UserService;
