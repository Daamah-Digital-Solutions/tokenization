import { apiClient } from '../api/ApiClient';
import type { User, UserLoginData, UserRegistrationData } from '../api/types';

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface LoginResponse extends AuthResponse {}

export interface RegisterResponse extends AuthResponse {}

export interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  code: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: UserRegistrationData & { confirm_password?: string; roles?: string[] }): Promise<RegisterResponse> {
    try {
      // Add confirm_password which Django backend requires
      const registrationData = {
        ...userData,
        confirm_password: userData.password,  // Use same password for confirmation
        roles: userData.roles  // Pass roles array for multi-role support
      };
      const response = await apiClient.post<any>('/auth/register/', registrationData);
      
      // Backend returns data already unwrapped by ApiClient (from data.data)
      // The ApiClient extracts the data field, so response is the content of data.data
      // Map backend user format to frontend User interface
      const backendUser = response.user;
      
      // Handle case where backend might not return user data properly
      if (!backendUser) {
        throw new Error('Invalid response from server');
      }
      
      const mappedUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        first_name: backendUser.first_name || '',
        last_name: backendUser.last_name || '',
        role: backendUser.role,
        phone: backendUser.phone || '',
        country: backendUser.country || '',
        date_of_birth: backendUser.date_of_birth || '',
        address: backendUser.address || '',
        city: backendUser.city || '',
        state: backendUser.state || '',
        postal_code: backendUser.postal_code || '',
        kyc_status: backendUser.kyc_status || 'not_started',
        is_verified: backendUser.is_verified || false,
        wallet_address: backendUser.wallet_address || '',
        created_at: new Date(backendUser.created_at || Date.now()),
        updated_at: new Date(backendUser.updated_at || Date.now())
      };
      
      const authResponse: RegisterResponse = {
        user: mappedUser,
        token: response.access || response.token || '',
        refreshToken: response.refresh
      };
      
      // Store the auth token
      console.log('🔐 Storing auth token:', authResponse.token ? 'Token present' : 'No token');
      apiClient.setAuthToken(authResponse.token);

      // Verify token was stored
      const isAuthenticated = apiClient.isAuthenticated();
      console.log('✅ Token stored, isAuthenticated:', isAuthenticated);

      return authResponse;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(loginData: UserLoginData): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<any>('/auth/login/', loginData);
      
      // Backend returns { user, tokens } already unwrapped by ApiClient
      // Map backend user format to frontend User interface
      const backendUser = response.user;
      
      // Handle case where backend might not return user data properly
      if (!backendUser) {
        throw new Error('Invalid response from server');
      }
      
      const mappedUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        first_name: backendUser.first_name || '',
        last_name: backendUser.last_name || '',
        role: backendUser.role,
        phone: backendUser.phone || '',
        country: backendUser.country || '',
        date_of_birth: backendUser.date_of_birth || '',
        address: backendUser.address || '',
        city: backendUser.city || '',
        state: backendUser.state || '',
        postal_code: backendUser.postal_code || '',
        kyc_status: backendUser.kyc_status || 'not_started',
        is_verified: backendUser.is_verified || false,
        wallet_address: backendUser.wallet_address || '',
        created_at: new Date(backendUser.created_at || Date.now()),
        updated_at: new Date(backendUser.updated_at || Date.now())
      };
      
      const authResponse: LoginResponse = {
        user: mappedUser,
        token: response.access || response.token || '',
        refreshToken: response.refresh
      };
      
      // Store the auth token
      console.log('🔐 Storing auth token:', authResponse.token ? 'Token present' : 'No token');
      apiClient.setAuthToken(authResponse.token);
      
      // Verify token was stored
      console.log('✅ Token stored, isAuthenticated:', apiClient.isAuthenticated());
      
      return authResponse;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local logout even if server request fails
    } finally {
      // Always clear local token
      apiClient.clearAuthToken();
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User> {
    try {
      console.log('🔄 AuthService: Using UPDATED endpoint /auth/profile/');
      const response = await apiClient.get<any>('/auth/profile/');
      // Backend wraps response in create_success_response() which puts data in response.data
      const backendUser = response.data || response.user || response;
      
      // Map backend user format to frontend User interface
      const mappedUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        first_name: backendUser.firstName || backendUser.first_name,
        last_name: backendUser.lastName || backendUser.last_name,
        role: backendUser.role,
        phone: backendUser.phone,
        country: backendUser.country || '',
        date_of_birth: backendUser.dateOfBirth || backendUser.date_of_birth,
        address: backendUser.address,
        city: backendUser.city,
        state: backendUser.state,
        postal_code: backendUser.postalCode || backendUser.postal_code,
        kyc_status: backendUser.kycStatus || backendUser.kyc_status,
        is_verified: backendUser.isVerified || backendUser.is_verified || false,
        wallet_address: backendUser.walletAddress || backendUser.wallet_address,
        created_at: new Date(backendUser.createdAt || backendUser.created_at),
        updated_at: new Date(backendUser.updatedAt || backendUser.updated_at)
      };
      
      return mappedUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await apiClient.post<any>('/auth/refresh', {
        refreshToken
      });
      
      // Backend returns response.data with tokens
      const tokenResponse: RefreshTokenResponse = {
        token: response.access || response.token,
        refreshToken: response.refresh
      };
      
      // Update stored token
      apiClient.setAuthToken(tokenResponse.token);
      
      return tokenResponse;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear invalid token
      apiClient.clearAuthToken();
      throw error;
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/password/reset-request', data);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(data: PasswordReset): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/password/reset', data);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/password/change', data);
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Setup two-factor authentication
   */
  static async setupTwoFactor(): Promise<TwoFactorSetup> {
    try {
      return await apiClient.post<TwoFactorSetup>('/auth/2fa/setup');
    } catch (error) {
      console.error('2FA setup failed:', error);
      throw error;
    }
  }

  /**
   * Verify and enable two-factor authentication
   */
  static async verifyTwoFactor(data: TwoFactorVerification): Promise<{ success: boolean; backupCodes: string[] }> {
    try {
      return await apiClient.post('/auth/2fa/verify', data);
    } catch (error) {
      console.error('2FA verification failed:', error);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   */
  static async disableTwoFactor(data: TwoFactorVerification): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/2fa/disable', data);
    } catch (error) {
      console.error('2FA disable failed:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateBackupCodes(): Promise<{ backupCodes: string[] }> {
    try {
      return await apiClient.post('/auth/2fa/backup-codes/generate');
    } catch (error) {
      console.error('Backup codes generation failed:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/email/verify', { token });
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/email/resend-verification');
    } catch (error) {
      console.error('Resend email verification failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  /**
   * Get stored auth token
   */
  static getAuthToken(): string | null {
    return apiClient.getAuthToken();
  }

  /**
   * Validate current session
   */
  static async validateSession(): Promise<boolean> {
    try {
      if (!this.isAuthenticated()) {
        return false;
      }

      // Try to get current user to validate token
      await this.getCurrentUser();
      return true;
    } catch (error) {
      // Token is invalid, clear it
      apiClient.clearAuthToken();
      return false;
    }
  }
}

export default AuthService;