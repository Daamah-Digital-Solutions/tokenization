import axios, { type AxiosRequestConfig } from 'axios';
import type { APIResponse } from './types';

/**
 * ApiClient — central HTTP client for the CapimaxRT frontend.
 *
 * Auth model (Phase 5):
 *  - Tokens live in httpOnly cookies set by the backend on login.
 *  - The frontend NEVER reads, writes, or stores access/refresh tokens.
 *  - All requests use `withCredentials: true` so the cookies travel.
 *  - The CSRF token is read from a non-httpOnly `csrftoken` cookie and
 *    sent back in the `X-CSRFToken` header on state-changing requests.
 *  - On a 401 we attempt one silent refresh by calling
 *    `/auth/token/refresh/` (which itself uses the refresh cookie). The
 *    original request is retried once. A second 401 redirects to /login.
 *
 * `isAuthenticated()` is now an authoritative call: the legacy
 * synchronous version returns `false` only when the cookie has been
 * explicitly cleared by `clearAuthToken()` (used by logout).
 */

const CSRF_COOKIE_NAME = 'csrftoken';
const AUTH_FLAG_KEY = 'auth_flag'; // non-sensitive flag — just remembers if we have a session

const PUBLIC_ENDPOINTS = [
  '/auth/register/',
  '/auth/login/',
  '/auth/password/reset/',
  '/auth/password/reset/confirm/',
  '/auth/check-email/',
  '/auth/token/refresh/',
];

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export class ApiClient {
  private client: any;
  private isRefreshing = false;
  private pendingRetryQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    config: AxiosRequestConfig;
  }> = [];

  public get rawClient() {
    return this.client;
  }

  constructor(
    baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      withCredentials: true, // critical — httpOnly cookies must travel
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.setupInterceptors();
  }

  // -------------------------------------------------------------------
  // Interceptors
  // -------------------------------------------------------------------

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: any) => {
        // CSRF token for state-changing requests
        const method = (config.method || 'get').toLowerCase();
        if (['post', 'put', 'patch', 'delete'].includes(method)) {
          const csrf = getCookie(CSRF_COOKIE_NAME);
          if (csrf) {
            config.headers = config.headers || {};
            config.headers['X-CSRFToken'] = csrf;
          }
        }

        // When the payload is FormData, we MUST let the browser set
        // Content-Type itself so it can append the
        // `boundary=----WebKitFormBoundary…` parameter needed to parse
        // multipart bodies. Our axios instance has a default
        // `Content-Type: application/json` that otherwise leaks through
        // — the backend then rejects the request with
        // "Unsupported media type 'application/json'" even though we're
        // posting a file. Deleting the header here is the canonical fix
        // (the same problem hits anyone who creates an axios instance
        // with a default JSON content-type).
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
          if (config.headers && 'Content-Type' in config.headers) {
            delete config.headers['Content-Type'];
          }
          // axios uses a separate `common` headers bucket; clear it too
          if (config.headers?.common?.['Content-Type']) {
            delete config.headers.common['Content-Type'];
          }
          if (config.headers?.post?.['Content-Type']) {
            delete config.headers.post['Content-Type'];
          }
        }

        config.metadata = { requestStartTime: Date.now() };
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: any) => {
        const requestStart = response.config?.metadata?.requestStartTime;
        if (requestStart && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug(
            `API ${response.config.url} took ${Date.now() - requestStart}ms`
          );
        }
        if (response.data && response.data.success === false && response.data.error) {
          throw new ApiError(
            response.data.error.code,
            response.data.error.message,
            response.data.error.details
          );
        }
        return response;
      },
      async (error: any) => {
        const originalRequest = error.config || {};

        if (!error.response) {
          throw new ApiError(
            'NETWORK_ERROR',
            'Network connection failed. Please check your internet connection.',
            { originalError: error.message }
          );
        }

        // ---- 401: try a single silent refresh and retry ----
        if (
          error.response.status === 401 &&
          !originalRequest._retried &&
          !this.isPublicEndpoint(originalRequest.url)
        ) {
          originalRequest._retried = true;
          try {
            await this.silentRefresh();
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearAuthToken();
            if (
              typeof window !== 'undefined' &&
              !this.isPublicEndpoint(originalRequest.url)
            ) {
              window.location.href = '/login';
            }
            throw new ApiError(
              'AUTH_REQUIRED',
              'Authentication required. Please login again.'
            );
          }
        }

        if (error.response.status === 401) {
          if (
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/register')
          ) {
            throw new ApiError(
              'AUTH_FAILED',
              error.response.data?.error?.message || 'Authentication failed',
              error.response.data?.error?.details
            );
          }
          throw new ApiError(
            'AUTH_REQUIRED',
            'Authentication required. Please login again.'
          );
        }

        if (error.response.status === 403) {
          throw new ApiError(
            'ACCESS_DENIED',
            'Access denied. You do not have permission to perform this action.',
            error.response.data?.error?.details
          );
        }

        if (error.response.status === 409) {
          const message =
            error.response.data?.error?.message ||
            error.response.data?.error ||
            error.response.data?.message ||
            'This resource already exists';
          throw new ApiError(
            'DUPLICATE_RESOURCE',
            message,
            error.response.data?.error?.details
          );
        }

        if (error.response.status === 422) {
          throw new ApiError(
            'VALIDATION_ERROR',
            'Validation failed',
            error.response.data?.error?.details || error.response.data?.errors
          );
        }

        if (error.response.status === 429) {
          throw new ApiError(
            'RATE_LIMIT_EXCEEDED',
            'Too many requests. Please try again later.',
            { retryAfter: error.response.headers['retry-after'] }
          );
        }

        if (error.response.status >= 500) {
          const serverMessage =
            error.response.data?.error?.message ||
            error.response.data?.message ||
            error.response.data?.detail ||
            'Server error occurred. Please try again later.';
          throw new ApiError('SERVER_ERROR', serverMessage, {
            status: error.response.status,
            details: error.response.data?.error?.details,
          });
        }

        const errorMessage =
          error.response.data?.error?.message ||
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

  // -------------------------------------------------------------------
  // Silent refresh
  // -------------------------------------------------------------------

  private async silentRefresh(): Promise<void> {
    if (this.isRefreshing) {
      // Coalesce concurrent refreshes
      return new Promise((resolve, reject) => {
        this.pendingRetryQueue.push({ resolve, reject, config: {} });
      });
    }
    this.isRefreshing = true;
    try {
      await axios.post(
        `${this.client.defaults.baseURL}/auth/token/refresh/`,
        {},
        { withCredentials: true }
      );
      // Notify queued callers
      this.pendingRetryQueue.forEach(({ resolve }) => resolve(undefined));
      this.pendingRetryQueue = [];
    } catch (err) {
      this.pendingRetryQueue.forEach(({ reject }) => reject(err));
      this.pendingRetryQueue = [];
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }

  private isPublicEndpoint(url?: string): boolean {
    if (!url) return false;
    return PUBLIC_ENDPOINTS.some((p) => url.includes(p));
  }

  // -------------------------------------------------------------------
  // Auth surface — kept for backward compatibility with call sites
  // -------------------------------------------------------------------

  /**
   * @deprecated Tokens are now in httpOnly cookies. This setter only
   * records an "authenticated" flag in localStorage for the SPA to
   * detect logged-in state without an extra round trip.
   */
  public setAuthToken(_token: string): void {
    try {
      localStorage.setItem(AUTH_FLAG_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  public clearAuthToken(): void {
    try {
      localStorage.removeItem(AUTH_FLAG_KEY);
    } catch {
      /* ignore */
    }
  }

  /**
   * @deprecated The access token is httpOnly and cannot be read from JS.
   * Returns null. Use `isAuthenticated()` to test login state.
   */
  public getAuthToken(): string | null {
    return null;
  }

  public isAuthenticated(): boolean {
    try {
      return !!localStorage.getItem(AUTH_FLAG_KEY);
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------
  // HTTP methods
  // -------------------------------------------------------------------

  /**
   * Unwrap the response body.
   *
   * The backend is inconsistent: some views wrap their response in
   * `create_success_response(data=...)` (returns `{ success, data, ... }`),
   * others — particularly default DRF ModelViewSet actions — return the
   * serialized payload directly. Callers shouldn't have to know which is
   * which, so we prefer `body.data` when the envelope looks present and
   * fall back to the raw body otherwise.
   *
   * Detection rule: if the body has BOTH a `success` boolean and a `data`
   * key, treat it as the wrapped envelope. Otherwise return the body
   * verbatim — that way DRF lists (`{count, results}`) and DRF objects
   * survive untouched.
   */
  private unwrap<T = any>(body: any): T {
    if (
      body &&
      typeof body === 'object' &&
      'success' in body &&
      'data' in body
    ) {
      return body.data as T;
    }
    return body as T;
  }

  public async get<T = any>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<APIResponse<T>>(endpoint, {
      params,
      ...config,
    });
    return this.unwrap<T>(response.data);
  }

  public async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<APIResponse<T>>(endpoint, data, config);
    return this.unwrap<T>(response.data);
  }

  public async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<APIResponse<T>>(endpoint, data, config);
    return this.unwrap<T>(response.data);
  }

  public async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<APIResponse<T>>(endpoint, data, config);
    return this.unwrap<T>(response.data);
  }

  public async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<APIResponse<T>>(endpoint, config);
    return this.unwrap<T>(response.data);
  }

  public async uploadFile<T = any>(
    endpoint: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Don't set Content-Type manually — the request interceptor strips
    // any pre-set Content-Type when the body is FormData, so the browser
    // can append the multipart boundary parameter itself. Setting it to
    // a literal "multipart/form-data" without a boundary (as this method
    // used to) produced unparseable requests on the backend.
    const response = await this.client.post<APIResponse<T>>(endpoint, formData, config);
    return this.unwrap<T>(response.data);
  }

  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new ApiError('HEALTH_CHECK_FAILED', 'API health check failed', error);
    }
  }

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
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ApiError);
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

export const apiClient = new ApiClient();
export { ApiError };
