import axios, { type AxiosRequestConfig } from 'axios';
import type { APIResponse } from './types';

export class ApiClient {
  private client: any;
  private authToken: string | null = null;

  // Getter to access the raw axios client when needed
  public get rawClient() {
    return this.client;
  }

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadStoredToken();
  }

  private setupInterceptors(): void {
    // Public endpoints that should not include auth token
    const publicEndpoints = [
      '/auth/register/',
      '/auth/login/',
      '/auth/password/reset/',
      '/auth/password/reset/confirm/',
      '/auth/check-email/'
    ];

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Check if this is a public endpoint
        const isPublicEndpoint = publicEndpoints.some(endpoint =>
          config.url?.includes(endpoint)
        );

        // Only add auth token for non-public endpoints
        if (this.authToken && !isPublicEndpoint) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add request timestamp for monitoring
        (config as any).metadata = { requestStartTime: new Date().getTime() };
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response: any) => {
        // Log response time for monitoring
        const requestStartTime = (response.config as any).metadata?.requestStartTime;
        if (requestStartTime) {
          const responseTime = new Date().getTime() - requestStartTime;
          console.debug(`API Request to ${response.config.url} took ${responseTime}ms`);
        }

        // Check if the response indicates success
        if (response.data && !response.data.success && response.data.error) {
          throw new ApiError(response.data.error.code, response.data.error.message, response.data.error.details);
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle network errors
        if (!error.response) {
          throw new ApiError(
            'NETWORK_ERROR',
            'Network connection failed. Please check your internet connection.',
            { originalError: error.message }
          );
        }

        // Handle 401 Unauthorized
        if (error.response.status === 401) {
          this.clearAuthToken();
          
          // Don't retry login/register requests
          if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
            throw new ApiError(
              'AUTH_FAILED',
              error.response.data?.error?.message || 'Authentication failed',
              error.response.data?.error?.details
            );
          }

          // Redirect to login for other protected routes
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          
          throw new ApiError('AUTH_REQUIRED', 'Authentication required. Please login again.');
        }

        // Handle 403 Forbidden
        if (error.response.status === 403) {
          throw new ApiError(
            'ACCESS_DENIED',
            'Access denied. You do not have permission to perform this action.',
            error.response.data?.error?.details
          );
        }

        // Handle 409 Conflict (Duplicate Resource)
        if (error.response.status === 409) {
          const message = error.response.data?.error || 
                         error.response.data?.message || 
                         'This resource already exists';
          throw new ApiError(
            'DUPLICATE_RESOURCE',
            message,
            error.response.data?.error?.details
          );
        }

        // Handle 422 Validation Errors
        if (error.response.status === 422) {
          throw new ApiError(
            'VALIDATION_ERROR',
            'Validation failed',
            error.response.data?.error?.details || error.response.data?.errors
          );
        }

        // Handle 429 Rate Limiting
        if (error.response.status === 429) {
          throw new ApiError(
            'RATE_LIMIT_EXCEEDED',
            'Too many requests. Please try again later.',
            { retryAfter: error.response.headers['retry-after'] }
          );
        }

        // Handle 500+ server errors
        if (error.response.status >= 500) {
          throw new ApiError(
            'SERVER_ERROR',
            'Server error occurred. Please try again later.',
            { status: error.response.status }
          );
        }

        // Handle other HTTP errors
        const errorMessage = error.response.data?.error?.message || 
                           error.response.data?.message || 
                           `HTTP ${error.response.status} Error`;
        
        throw new ApiError(
          error.response.data?.error?.code || 'HTTP_ERROR',
          errorMessage,
          error.response.data?.error?.details
        );
      }
    );
  }

  private loadStoredToken(): void {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('📦 Loading stored token:', token ? `Present (${token.length} chars)` : 'Not found');
      if (token) {
        this.authToken = token;
      }
    } catch (error) {
      console.warn('Failed to load stored auth token:', error);
    }
  }

  public setAuthToken(token: string): void {
    console.log('💾 Setting auth token:', token ? `Present (${token.length} chars)` : 'Empty token');
    this.authToken = token;
    try {
      localStorage.setItem('auth_token', token);
      console.log('✅ Token saved to localStorage');
    } catch (error) {
      console.warn('Failed to store auth token:', error);
    }
  }

  public clearAuthToken(): void {
    this.authToken = null;
    try {
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.warn('Failed to clear stored auth token:', error);
    }
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // Generic HTTP methods
  public async get<T = any>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<APIResponse<T>>(endpoint, {
      params,
      ...config,
    });
    return response.data.data!;
  }

  public async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<APIResponse<T>>(endpoint, data, config);
    return response.data.data!;
  }

  public async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<APIResponse<T>>(endpoint, data, config);
    return response.data.data!;
  }

  public async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<APIResponse<T>>(endpoint, data, config);
    return response.data.data!;
  }

  public async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<APIResponse<T>>(endpoint, config);
    return response.data.data!;
  }

  // Multipart form data upload
  public async uploadFile<T = any>(
    endpoint: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<APIResponse<T>>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
    return response.data.data!;
  }

  // Health check
  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new ApiError('HEALTH_CHECK_FAILED', 'API health check failed', error);
    }
  }

  // Get client instance for custom requests
  public getClient(): any {
    return this.client;
  }
}

// Custom error class
class ApiError extends Error {
  public code: string;
  public details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export the error class for use in components
export { ApiError };