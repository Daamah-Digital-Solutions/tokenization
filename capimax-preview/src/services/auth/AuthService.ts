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
  new_password: string;
  confirm_password: string;
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

export interface GoogleAuthResponse {
  requires_profile_completion: boolean;
  is_new_user?: boolean;
  user: {
    email: string;
    first_name: string;
    last_name: string;
    google_id: string;
  };
  tokens?: {
    access: string;
    refresh: string;
  };
}

export interface GoogleProfileCompletionData {
  email: string;
  google_id: string;
  phone_number: string;
  date_of_birth?: string;
  country: string;
  city: string;
  roles: string[];
  agree_to_terms: boolean;
  agree_to_privacy: boolean;
  agree_to_marketing?: boolean;
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

      // For registration, the backend should NOT return tokens until email is verified
      // Only store token if it exists (for backward compatibility)
      if (authResponse.token) {
        console.log('🔐 Registration returned token (unexpected) - storing it');
        apiClient.setAuthToken(authResponse.token);
      } else {
        console.log('✅ Registration successful - no token returned (user must verify email)');
        // Ensure no old tokens are stored
        apiClient.clearAuthToken();
      }

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
      await apiClient.post('/auth/logout/');
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
      const response = await apiClient.get<any>('/auth/profile/');
      // ApiClient.unwrap has already stripped the envelope when present.
      // Fall through to `response.user` (legacy) or the raw response.
      const backendUser = response?.user ?? response ?? {};

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
      };

      return mappedUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token.
   *
   * The backend reads the refresh token from the httpOnly `refresh_token`
   * cookie and writes a new access cookie on success — the SPA never sees
   * the raw refresh value. We accept (and ignore) the legacy `refreshToken`
   * argument so existing call sites keep type-checking; once those are
   * migrated to the no-arg form we can drop it.
   */
  static async refreshToken(_refreshToken?: string): Promise<RefreshTokenResponse> {
    try {
      const response = await apiClient.post<any>('/auth/token/refresh/');

      const tokenResponse: RefreshTokenResponse = {
        token: response?.access || response?.token || '',
        refreshToken: response?.refresh,
      };

      // Cookie-auth keeps the access token in an httpOnly cookie. We only
      // update local storage if the backend echoed a body token (legacy).
      if (tokenResponse.token) {
        apiClient.setAuthToken(tokenResponse.token);
      }

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
      return await apiClient.post('/auth/password/reset/', data);
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
      return await apiClient.post('/auth/password/reset/confirm/', data);
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
      return await apiClient.post('/auth/password/change/', data);
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
      return await apiClient.post<TwoFactorSetup>('/auth/2fa/setup/');
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
      return await apiClient.post('/auth/2fa/verify/', data);
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
      return await apiClient.post('/auth/2fa/disable/', data);
    } catch (error) {
      console.error('2FA disable failed:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes.
   *
   * Not implemented on the backend yet — the current 2FA setup endpoint
   * already issues backup codes once. Throw rather than silently 404 so
   * the UI surfaces the gap instead of pretending it worked.
   */
  static async generateBackupCodes(): Promise<{ backupCodes: string[] }> {
    throw new Error(
      'Backup code regeneration is not yet supported. Re-run 2FA setup to get a fresh set.'
    );
  }

  /**
   * Verify email address with link-based token (legacy method)
   */
  static async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/email/verify/', { token });
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify email address with 6-digit code and auto-login
   */
  static async verifyEmailCode(email: string, code: string): Promise<AuthResponse> {
    try {
      console.log('🔍 Attempting email verification for:', email, 'with code:', code);
      const response = await apiClient.post<any>('/auth/email/verify/', {
        email,
        code
      });
      console.log('📧 Email verification response:', response);

      // ApiClient.post() returns response.data.data, so response is already the data object
      // It contains { user, tokens }
      const backendUser = response.user;

      // Handle case where backend might not return user data properly
      if (!backendUser) {
        console.error('❌ No user data in response:', { response, backendUser });
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
        is_verified: backendUser.is_verified || true, // Should be true after email verification
        wallet_address: backendUser.wallet_address || '',
        created_at: new Date(backendUser.created_at || Date.now()),
        updated_at: new Date(backendUser.updated_at || Date.now())
      };

      const authResponse: AuthResponse = {
        user: mappedUser,
        token: response.tokens?.access || response.access || response.token || '',
        refreshToken: response.tokens?.refresh || response.refresh
      };

      // Store the auth token for auto-login
      console.log('🔐 Email verification successful - storing auth token');
      apiClient.setAuthToken(authResponse.token);

      return authResponse;
    } catch (error) {
      console.error('❌ Email code verification failed:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Re-throw ApiError with better structure preservation
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Email verification failed');
      }
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(): Promise<{ message: string }> {
    try {
      return await apiClient.post('/auth/email/resend-verification/');
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

  /**
   * Authenticate with Google ID token
   * @param idToken - Google ID token from Google Sign-In
   */
  static async googleAuth(idToken: string): Promise<GoogleAuthResponse> {
    try {
      console.log('🔐 Initiating Google authentication...');
      const response = await apiClient.post<any>('/auth/google/auth/', {
        id_token: idToken
      });

      console.log('📧 Google auth response:', response);

      // If user has complete profile and tokens, store the token
      if (response.tokens?.access) {
        console.log('🔐 Google auth successful - storing auth token');
        apiClient.setAuthToken(response.tokens.access);
      }

      return response as GoogleAuthResponse;
    } catch (error) {
      console.error('❌ Google authentication failed:', error);
      throw error;
    }
  }

  /**
   * Complete profile for Google-authenticated users
   * @param profileData - Profile completion data
   */
  static async completeGoogleProfile(profileData: GoogleProfileCompletionData): Promise<LoginResponse> {
    try {
      console.log('🔐 Completing Google profile...');
      const response = await apiClient.post<any>('/auth/google/complete-profile/', profileData);

      console.log('📧 Profile completion response:', response);

      // Map backend user format to frontend User interface
      const backendUser = response.user;

      if (!backendUser) {
        throw new Error('Invalid response from server');
      }

      const mappedUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        first_name: backendUser.first_name || '',
        last_name: backendUser.last_name || '',
        role: backendUser.role,
        phone: backendUser.phone || backendUser.phone_number || '',
        country: backendUser.country || '',
        date_of_birth: backendUser.date_of_birth || '',
        address: backendUser.address || '',
        city: backendUser.city || '',
        state: backendUser.state || '',
        postal_code: backendUser.postal_code || '',
        kyc_status: backendUser.kyc_status || 'not_started',
        is_verified: backendUser.is_verified || true,
        wallet_address: backendUser.wallet_address || '',
        created_at: new Date(backendUser.created_at || Date.now()),
        updated_at: new Date(backendUser.updated_at || Date.now())
      };

      const authResponse: LoginResponse = {
        user: mappedUser,
        token: response.tokens?.access || '',
        refreshToken: response.tokens?.refresh
      };

      // Store the auth token
      if (authResponse.token) {
        console.log('🔐 Profile completed - storing auth token');
        apiClient.setAuthToken(authResponse.token);
      }

      return authResponse;
    } catch (error) {
      console.error('❌ Google profile completion failed:', error);
      throw error;
    }
  }
}

export default AuthService;