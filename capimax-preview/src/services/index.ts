// API Client
export { apiClient, ApiClient, ApiError } from './api/ApiClient';
export * from './api/types';

// Authentication
export { AuthService } from './auth/AuthService';
export type {
  AuthResponse,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  PasswordResetRequest,
  PasswordReset,
  ChangePasswordRequest,
  TwoFactorSetup,
  TwoFactorVerification
} from './auth/AuthService';

// User Management
export { UserService } from './user/UserService';
export { KYCService } from './user/KYCService';
export type {
  KYCStatusResponse,
  LivenessCheckData,
  AddressVerificationData
} from './user/KYCService';

// Property Management
export { PropertyService } from './property/PropertyService';
export type {
  PropertySearchResult,
  PropertyAnalytics,
  PropertyDocuments,
  PropertyUpdate
} from './property/PropertyService';

// Investment Management
export { InvestmentService } from './investment/InvestmentService';
export type {
  InvestmentCalculation,
  InvestmentSimulation,
  PortfolioSummary,
  InvestmentTransaction
} from './investment/InvestmentService';

// Payment Processing
export { PaymentService } from './payment/PaymentService';
export type {
  PaymentMethodInfo,
  PaymentEstimate,
  CryptoQuote,
  BankAccount,
  WithdrawalRequest
} from './payment/PaymentService';

// Broker Services
export { BrokerService } from './broker/BrokerService';
export type {
  BrokerStats,
  ReferralClient,
  CommissionTier,
  ReferralLink,
  MarketingMaterial
} from './broker/BrokerService';

// Construction Management
export { ConstructionService } from './construction/ConstructionService';
export type {
  ConstructionProject,
  MilestoneUpdate,
  ConstructionReport,
  QualityInspection,
  InstallmentSchedule
} from './construction/ConstructionService';

// Marketplace Services
export { marketplaceService, MarketplaceService } from './marketplace/MarketplaceService';
export type {
  SecondaryMarketListing,
  MarketplaceFilters,
  CreateListingRequest,
  PurchaseRequest,
  BidRequest,
  MarketplaceBid,
  MarketplaceStats,
  MarketplaceActivity
} from './marketplace/MarketplaceService';

// Admin Management
export { adminService, AdminService } from './admin/AdminService';
export type {
  DashboardStats,
  PlatformMetrics,
  ChartDataPoint,
  UserFilters,
  PaginatedUsers,
  AdminUser,
  UserActivity,
  AdminNote,
  PropertyFilters,
  PaginatedProperties,
  AdminProperty,
  FinancialMetrics,
  TransactionFilters,
  PaginatedTransactions,
  AdminTransaction,
  SystemHealth,
  ServiceHealth,
  SystemAlert,
  SystemAnalytics
} from './admin/AdminService';

// WebSocket & Real-time
export { webSocketService, WebSocketService, NotificationService } from './websocket/WebSocketService';
export type {
  WebSocketConfig,
  WebSocketMessage,
  NotificationHandler,
  WebSocketStatus
} from './websocket/WebSocketService';

// Import the instances we need for ServiceUtils
import { apiClient } from './api/ApiClient';
import { webSocketService } from './websocket/WebSocketService';

// Utility functions for services
export const ServiceUtils = {
  /**
   * Initialize all services with authentication token
   */
  initializeWithAuth: (token: string) => {
    apiClient.setAuthToken(token);
    webSocketService.setAuthToken(token);
  },

  /**
   * Clear all authentication and disconnect services
   */
  clearAuth: () => {
    apiClient.clearAuthToken();
    webSocketService.disconnect();
  },

  /**
   * Check if services are authenticated
   */
  isAuthenticated: () => {
    return apiClient.isAuthenticated();
  },

  /**
   * Connect WebSocket with current auth
   */
  connectWebSocket: () => {
    if (apiClient.isAuthenticated()) {
      webSocketService.setAuthToken(apiClient.getAuthToken()!);
      webSocketService.connect();
    }
  },

  /**
   * Health check for all services
   */
  healthCheck: async () => {
    try {
      const apiHealth = await apiClient.healthCheck();
      const wsStatus = webSocketService.getStatus();
      
      return {
        api: {
          ...apiHealth,
          status: 'healthy'
        },
        websocket: {
          status: wsStatus === 'connected' ? 'healthy' : 'unhealthy',
          connection_status: wsStatus
        }
      };
    } catch (error) {
      return {
        api: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        websocket: {
          status: webSocketService.getStatus() === 'connected' ? 'healthy' : 'unhealthy',
          connection_status: webSocketService.getStatus()
        }
      };
    }
  }
};

// Export default configuration
export const DEFAULT_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws',
  REQUEST_TIMEOUT: 30000,
  WEBSOCKET_RECONNECT_INTERVAL: 3000,
  WEBSOCKET_MAX_RECONNECT_ATTEMPTS: 5,
  WEBSOCKET_HEARTBEAT_INTERVAL: 30000
};

// Service initialization helper
export const initializeServices = (config: Partial<typeof DEFAULT_CONFIG> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Initialize API client with custom base URL if provided
  if (config.API_BASE_URL && config.API_BASE_URL !== DEFAULT_CONFIG.API_BASE_URL) {
    // Note: ApiClient is already instantiated as singleton, 
    // this would require refactoring to support dynamic base URLs
    console.warn('Dynamic API base URL changes require service restart');
  }

  // WebSocket service configuration would be set here if needed

  return {
    apiClient,
    webSocketService,
    config: finalConfig
  };
};