/**
 * Global Error Handler Service
 *
 * Centralized error handling for the application, including:
 * - API error standardization
 * - User-friendly error messages
 * - Error logging and reporting
 * - Network error detection
 * - Authentication error handling
 */

import { toast } from 'react-hot-toast';

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  source?: string;
  statusCode?: number;
  requestId?: string;
}

export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 100;

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason, 'UNHANDLED_PROMISE');
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(event.error, 'GLOBAL_ERROR');
    });

    // Handle network status changes
    window.addEventListener('online', () => {
      toast.success('Connection restored');
    });

    window.addEventListener('offline', () => {
      toast.error('Connection lost. Please check your internet connection.');
    });
  }

  /**
   * Main error handler
   */
  handleError(error: any, source: string = 'UNKNOWN'): ErrorDetails {
    const errorDetails = this.normalizeError(error, source);

    // Log error
    this.logError(errorDetails);

    // Show user-friendly message
    this.showUserMessage(errorDetails);

    // Report to error service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportToService(errorDetails);
    }

    return errorDetails;
  }

  /**
   * Normalize various error types into standard format
   */
  private normalizeError(error: any, source: string): ErrorDetails {
    // API error response
    if (error?.response) {
      const response = error.response;
      const data = response.data;

      return {
        code: data?.error?.code || `HTTP_${response.status}`,
        message: data?.error?.message || data?.message || this.getHttpErrorMessage(response.status),
        details: data?.error?.details || data,
        timestamp: new Date(),
        source,
        statusCode: response.status,
        requestId: response.headers?.['x-request-id']
      };
    }

    // Network error
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('Network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection.',
        details: error,
        timestamp: new Date(),
        source
      };
    }

    // Timeout error
    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Request timed out. Please try again.',
        details: error,
        timestamp: new Date(),
        source
      };
    }

    // Authentication error
    if (error?.status === 401 || error?.code === 'AUTH_FAILED') {
      return {
        code: 'AUTH_FAILED',
        message: 'Authentication failed. Please login again.',
        details: error,
        timestamp: new Date(),
        source,
        statusCode: 401
      };
    }

    // Permission error
    if (error?.status === 403 || error?.code === 'PERMISSION_DENIED') {
      return {
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action.',
        details: error,
        timestamp: new Date(),
        source,
        statusCode: 403
      };
    }

    // Validation error
    if (error?.status === 400 || error?.code === 'VALIDATION_ERROR') {
      return {
        code: 'VALIDATION_ERROR',
        message: error?.message || 'Invalid input. Please check your data.',
        details: error?.errors || error,
        timestamp: new Date(),
        source,
        statusCode: 400
      };
    }

    // Default error
    return {
      code: error?.code || 'UNKNOWN_ERROR',
      message: error?.message || 'An unexpected error occurred',
      details: error,
      timestamp: new Date(),
      source
    };
  }

  /**
   * Get user-friendly HTTP error message
   */
  private getHttpErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Authentication required. Please login.',
      403: 'Access denied. You do not have permission.',
      404: 'Resource not found.',
      405: 'Method not allowed.',
      408: 'Request timeout. Please try again.',
      409: 'Conflict. The resource already exists.',
      422: 'Validation failed. Please check your input.',
      429: 'Too many requests. Please slow down.',
      500: 'Server error. Please try again later.',
      502: 'Bad gateway. Service temporarily unavailable.',
      503: 'Service unavailable. Please try again later.',
      504: 'Gateway timeout. Please try again.'
    };

    return messages[status] || `Error ${status} occurred`;
  }

  /**
   * Show user-friendly error message
   */
  private showUserMessage(error: ErrorDetails) {
    // Don't show toast for certain errors that are handled elsewhere
    const silentCodes = ['AUTH_REDIRECT', 'CANCELLED'];
    if (silentCodes.includes(error.code)) {
      return;
    }

    // Critical errors
    const criticalCodes = ['AUTH_FAILED', 'PERMISSION_DENIED', 'SERVER_ERROR'];
    if (criticalCodes.includes(error.code)) {
      toast.error(error.message, {
        duration: 5000,
        icon: '🚨'
      });
      return;
    }

    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      toast.error(error.message, {
        duration: 4000,
        icon: '🌐'
      });
      return;
    }

    // Validation errors
    if (error.code === 'VALIDATION_ERROR') {
      const message = this.formatValidationErrors(error.details);
      toast.error(message || error.message, {
        duration: 4000,
        icon: '⚠️'
      });
      return;
    }

    // Default error message
    toast.error(error.message, {
      duration: 3000
    });
  }

  /**
   * Format validation errors for display
   */
  private formatValidationErrors(errors: any): string {
    if (!errors) return '';

    if (typeof errors === 'string') return errors;

    if (Array.isArray(errors)) {
      return errors.join(', ');
    }

    if (typeof errors === 'object') {
      const messages = [];
      for (const [field, error] of Object.entries(errors)) {
        if (Array.isArray(error)) {
          messages.push(`${field}: ${error.join(', ')}`);
        } else if (typeof error === 'string') {
          messages.push(`${field}: ${error}`);
        }
      }
      return messages.join('; ');
    }

    return '';
  }

  /**
   * Log error to internal log
   */
  private logError(error: ErrorDetails) {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔴 Error: ${error.code}`);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Source:', error.source);
      console.error('Timestamp:', error.timestamp);
      console.groupEnd();
    }
  }

  /**
   * Report error to external service (Sentry, LogRocket, etc.)
   */
  private reportToService(error: ErrorDetails) {
    // Integration with error reporting service
    // Example: Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(error.message), {
        tags: {
          code: error.code,
          source: error.source,
          statusCode: error.statusCode?.toString()
        },
        extra: error.details
      });
    }
  }

  /**
   * Get error log
   */
  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Handle API error response
   */
  handleApiError(error: any): never {
    const errorDetails = this.handleError(error, 'API_ERROR');

    // Special handling for auth errors
    if (errorDetails.statusCode === 401) {
      // Trigger logout or token refresh
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    throw new Error(errorDetails.message);
  }

  /**
   * Create user-friendly error for specific scenarios
   */
  createUserError(scenario: string, details?: any): Error {
    const messages: Record<string, string> = {
      'investment.insufficient_funds': 'Insufficient funds for this investment',
      'investment.property_sold_out': 'This property is no longer available',
      'investment.minimum_not_met': 'Investment amount is below the minimum requirement',
      'kyc.verification_pending': 'Your KYC verification is still pending',
      'kyc.verification_failed': 'KYC verification failed. Please update your documents',
      'payment.card_declined': 'Your card was declined. Please try another payment method',
      'payment.insufficient_balance': 'Insufficient wallet balance',
      'network.offline': 'You are currently offline. Please check your connection',
      'auth.session_expired': 'Your session has expired. Please login again',
      'auth.invalid_credentials': 'Invalid email or password',
      'auth.account_locked': 'Your account has been locked. Please contact support'
    };

    const message = messages[scenario] || 'An error occurred';
    const error = new Error(message);
    (error as any).scenario = scenario;
    (error as any).details = details;

    return error;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandlerService.getInstance();

// Export helper function for easy error handling
export const handleError = (error: any, source?: string) => {
  return errorHandler.handleError(error, source);
};

// Export helper for API errors
export const handleApiError = (error: any) => {
  return errorHandler.handleApiError(error);
};