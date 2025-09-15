import { apiClient, ApiError } from '../api/ApiClient';
import type { APIResponse } from '../api/types';

// Admin Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  pendingKYC: number;
  platformVolume: number;
  platformVolumeChange: number;
  activeProperties: number;
  completedProperties: number;
  platformRevenue: number;
  revenueChange: number;
  dailyActiveUsers: number;
  monthlyTransactionVolume: number;
  successRate: number;
}

export interface PlatformMetrics {
  transactionVolume: ChartDataPoint[];
  userGrowth: ChartDataPoint[];
  propertyDistribution: ChartDataPoint[];
  revenueMetrics: ChartDataPoint[];
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// User Management Types
export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'investor' | 'property_owner' | 'broker' | 'admin';
  status?: 'active' | 'inactive';
  kycStatus?: 'pending' | 'verified' | 'rejected';
  sortBy?: 'createdAt' | 'firstName' | 'lastName' | 'email';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedUsers {
  users: AdminUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'investor' | 'property_owner' | 'broker' | 'admin';
  isActive: boolean;
  kycStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  lastLoginAt?: string;
  totalInvestments?: number;
  propertiesOwned?: number;
  isSuspended: boolean;
  suspendedUntil?: string;
  suspensionReason?: string;
  profilePicture?: string;
  phoneNumber?: string;
  address?: {
    street: string;
    city: string;
    country: string;
    zipCode: string;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  category: 'AUTH' | 'PROFILE' | 'INVESTMENT' | 'PAYMENT' | 'KYC' | 'PROPERTY' | 'SYSTEM';
}

export interface AdminNote {
  id: string;
  userId: string;
  adminId: string;
  adminName: string;
  title?: string;
  content: string;
  noteType: 'GENERAL' | 'COMPLIANCE' | 'RISK_ASSESSMENT' | 'SUPPORT' | 'INVESTIGATION' | 'APPROVAL' | 'WARNING' | 'FOLLOW_UP';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  visibility: 'PRIVATE' | 'ADMIN_ONLY' | 'COMPLIANCE_TEAM' | 'SUPPORT_TEAM' | 'ALL_STAFF';
  isConfidential: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Property Management Types
export interface PropertyFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending_approval' | 'active' | 'inactive' | 'rejected' | 'completed';
  type?: 'residential' | 'commercial' | 'construction' | 'land';
  sortBy?: 'createdAt' | 'title' | 'targetAmount' | 'raisedAmount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedProperties {
  properties: AdminProperty[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminProperty {
  id: string;
  title: string;
  description: string;
  location: string;
  propertyType: 'residential' | 'commercial' | 'construction' | 'land';
  targetAmount: number;
  raisedAmount: number;
  minInvestment: number;
  expectedReturn: number;
  status: 'pending_approval' | 'active' | 'inactive' | 'rejected' | 'completed';
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  images: string[];
  documents: string[];
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  fundingDeadline?: string;
  investors: number;
  tokensIssued: number;
  fundingProgress: number;
}

// Financial Management Types
export interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueChange: number;
  totalFees: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
  totalCommissions: number;
  pendingCommissions: number;
  transactionVolume: number;
  transactionCount: number;
  averageTransactionAmount: number;
  revenueByMonth: ChartDataPoint[];
  feesByCategory: ChartDataPoint[];
  transactionTrends: ChartDataPoint[];
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  userId?: string;
  propertyId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaginatedTransactions {
  transactions: AdminTransaction[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminTransaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  status: string;
  userId: string;
  userName: string;
  userEmail: string;
  propertyId?: string;
  propertyTitle?: string;
  paymentMethod: string;
  paymentReference?: string;
  blockchain?: {
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: number;
    gasFee?: number;
  };
  metadata?: any;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  fee: number;
  netAmount: number;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  notes?: string;
  processedBy?: string;
  processedAt?: string;
  paymentReference?: string;
}

// System Health Types
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  version: string;
  timestamp: string;
  metrics: {
    apiResponseTime: number;
    databaseConnectionTime: number;
    redisResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    blockchain: ServiceHealth;
    paymentGateways: {
      stripe: ServiceHealth;
      paypal: ServiceHealth;
    };
    emailService: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  responseTime?: number;
  lastChecked: string;
  message?: string;
}

export interface SystemAlert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  source: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
  metadata?: any;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

// System Analytics Types
export interface SystemAnalytics {
  period: '7d' | '30d' | '90d' | '1y';
  userGrowth: ChartDataPoint[];
  transactionTrends: ChartDataPoint[];
  revenueGrowth: ChartDataPoint[];
  propertyMetrics: ChartDataPoint[];
  geographicDistribution: {
    country: string;
    users: number;
    percentage: number;
  }[];
  userTypeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  averageInvestmentAmount: number;
  completionRates: {
    kyc: number;
    investment: number;
    propertyFunding: number;
  };
}

export class AdminService {
  private readonly basePath = '/admin';

  /**
   * Dashboard & Analytics Methods
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<DashboardStats>(`${this.basePath}/dashboard`);
      return response;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw new ApiError('DASHBOARD_FETCH_FAILED', 'Failed to load dashboard statistics');
    }
  }

  async getPlatformMetrics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<PlatformMetrics> {
    try {
      const response = await apiClient.get<PlatformMetrics>(`${this.basePath}/analytics`, { period });
      return response;
    } catch (error) {
      console.error('Failed to fetch platform metrics:', error);
      throw new ApiError('METRICS_FETCH_FAILED', 'Failed to load platform metrics');
    }
  }

  async getSystemAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<SystemAnalytics> {
    try {
      const response = await apiClient.get<SystemAnalytics>(`${this.basePath}/analytics`, { period });
      return response;
    } catch (error) {
      console.error('Failed to fetch system analytics:', error);
      throw new ApiError('ANALYTICS_FETCH_FAILED', 'Failed to load system analytics');
    }
  }

  /**
   * User Management Methods
   */
  async getAllUsers(filters: UserFilters = {}): Promise<PaginatedUsers> {
    try {
      const response = await apiClient.get<PaginatedUsers>(`${this.basePath}/users`, filters);
      return response;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw new ApiError('USERS_FETCH_FAILED', 'Failed to load users');
    }
  }

  async getUserActivity(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const response = await apiClient.get<UserActivity[]>(`${this.basePath}/users/${userId}/activity`, { limit });
      return response;
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
      throw new ApiError('USER_ACTIVITY_FETCH_FAILED', 'Failed to load user activity');
    }
  }

  async getUserNotes(userId: string): Promise<AdminNote[]> {
    try {
      const response = await apiClient.get<AdminNote[]>(`${this.basePath}/users/${userId}/notes`);
      return response;
    } catch (error) {
      console.error('Failed to fetch user notes:', error);
      throw new ApiError('USER_NOTES_FETCH_FAILED', 'Failed to load user notes');
    }
  }

  async addUserNote(userId: string, noteData: {
    title?: string;
    content: string;
    noteType?: AdminNote['noteType'];
    priority?: AdminNote['priority'];
    visibility?: AdminNote['visibility'];
    isConfidential?: boolean;
    tags?: string[];
  }): Promise<AdminNote> {
    try {
      const response = await apiClient.post<AdminNote>(`${this.basePath}/users/${userId}/notes`, noteData);
      return response;
    } catch (error) {
      console.error('Failed to add user note:', error);
      throw new ApiError('USER_NOTE_ADD_FAILED', 'Failed to add user note');
    }
  }

  async updateUser(userId: string, updates: {
    role?: AdminUser['role'];
    isActive?: boolean;
    kycStatus?: AdminUser['kycStatus'];
    notes?: string;
  }): Promise<AdminUser> {
    try {
      const response = await apiClient.put<AdminUser>(`${this.basePath}/users/${userId}`, updates);
      return response;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw new ApiError('USER_UPDATE_FAILED', 'Failed to update user');
    }
  }

  async suspendUser(userId: string, reason: string, duration?: number): Promise<void> {
    try {
      await apiClient.post<void>(`${this.basePath}/users/${userId}/suspend`, { reason, duration });
    } catch (error) {
      console.error('Failed to suspend user:', error);
      throw new ApiError('USER_SUSPEND_FAILED', 'Failed to suspend user');
    }
  }

  async unsuspendUser(userId: string, notes?: string): Promise<void> {
    try {
      await apiClient.post<void>(`${this.basePath}/users/${userId}/unsuspend`, { notes });
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
      throw new ApiError('USER_UNSUSPEND_FAILED', 'Failed to unsuspend user');
    }
  }

  async forceVerifyUser(userId: string, notes?: string): Promise<void> {
    try {
      await apiClient.post<void>(`${this.basePath}/users/${userId}/verify`, { notes });
    } catch (error) {
      console.error('Failed to verify user:', error);
      throw new ApiError('USER_VERIFY_FAILED', 'Failed to verify user');
    }
  }

  async getUserInvestments(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const response = await apiClient.get(`${this.basePath}/users/${userId}/investments`, { page, limit });
      return response;
    } catch (error) {
      console.error('Failed to fetch user investments:', error);
      throw new ApiError('USER_INVESTMENTS_FETCH_FAILED', 'Failed to load user investments');
    }
  }

  async getUserTransactions(userId: string, page: number = 1, limit: number = 20, type?: string): Promise<any> {
    try {
      const response = await apiClient.get(`${this.basePath}/users/${userId}/transactions`, { page, limit, type });
      return response;
    } catch (error) {
      console.error('Failed to fetch user transactions:', error);
      throw new ApiError('USER_TRANSACTIONS_FETCH_FAILED', 'Failed to load user transactions');
    }
  }

  /**
   * Property Management Methods
   */
  async getAllProperties(filters: PropertyFilters = {}): Promise<PaginatedProperties> {
    try {
      const response = await apiClient.get<PaginatedProperties>(`${this.basePath}/properties`, filters);
      return response;
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      throw new ApiError('PROPERTIES_FETCH_FAILED', 'Failed to load properties');
    }
  }

  async approveProperty(propertyId: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/properties/${propertyId}/status`, { status: 'active' });
    } catch (error) {
      console.error('Failed to approve property:', error);
      throw new ApiError('PROPERTY_APPROVE_FAILED', 'Failed to approve property');
    }
  }

  async rejectProperty(propertyId: string, rejectionReason: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/properties/${propertyId}/status`, { 
        status: 'rejected', 
        rejectionReason 
      });
    } catch (error) {
      console.error('Failed to reject property:', error);
      throw new ApiError('PROPERTY_REJECT_FAILED', 'Failed to reject property');
    }
  }

  /**
   * Financial Management Methods
   */
  async getFinancialDashboard(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<FinancialMetrics> {
    try {
      const response = await apiClient.get<FinancialMetrics>(`${this.basePath}/financial/dashboard`, { period });
      return response;
    } catch (error) {
      console.error('Failed to fetch financial dashboard:', error);
      throw new ApiError('FINANCIAL_DASHBOARD_FETCH_FAILED', 'Failed to load financial dashboard');
    }
  }

  async getDetailedTransactions(filters: TransactionFilters = {}): Promise<PaginatedTransactions> {
    try {
      const response = await apiClient.get<PaginatedTransactions>(`${this.basePath}/financial/transactions`, filters);
      return response;
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw new ApiError('TRANSACTIONS_FETCH_FAILED', 'Failed to load transactions');
    }
  }

  async getPendingWithdrawals(page: number = 1, limit: number = 20): Promise<WithdrawalRequest[]> {
    try {
      const response = await apiClient.get<WithdrawalRequest[]>(`${this.basePath}/financial/withdrawals`, { page, limit });
      return response;
    } catch (error) {
      console.error('Failed to fetch pending withdrawals:', error);
      throw new ApiError('WITHDRAWALS_FETCH_FAILED', 'Failed to load pending withdrawals');
    }
  }

  async approveWithdrawal(withdrawalId: string, notes?: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/financial/withdrawals/${withdrawalId}/approve`, { notes });
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
      throw new ApiError('WITHDRAWAL_APPROVE_FAILED', 'Failed to approve withdrawal');
    }
  }

  async rejectWithdrawal(withdrawalId: string, reason: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/financial/withdrawals/${withdrawalId}/reject`, { reason });
    } catch (error) {
      console.error('Failed to reject withdrawal:', error);
      throw new ApiError('WITHDRAWAL_REJECT_FAILED', 'Failed to reject withdrawal');
    }
  }

  /**
   * System Management Methods
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await apiClient.get<SystemHealth>(`${this.basePath}/system/health`);
      return response;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw new ApiError('SYSTEM_HEALTH_FETCH_FAILED', 'Failed to load system health');
    }
  }

  async getSystemAlerts(filters: {
    status?: SystemAlert['status'];
    severity?: SystemAlert['severity'];
    limit?: number;
  } = {}): Promise<SystemAlert[]> {
    try {
      const response = await apiClient.get<SystemAlert[]>(`${this.basePath}/system/alerts`, filters);
      return response;
    } catch (error) {
      console.error('Failed to fetch system alerts:', error);
      throw new ApiError('SYSTEM_ALERTS_FETCH_FAILED', 'Failed to load system alerts');
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/system/alerts/${alertId}/acknowledge`);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw new ApiError('ALERT_ACKNOWLEDGE_FAILED', 'Failed to acknowledge alert');
    }
  }

  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/system/alerts/${alertId}/resolve`, { resolution });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw new ApiError('ALERT_RESOLVE_FAILED', 'Failed to resolve alert');
    }
  }

  async getSystemPerformance(period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<any> {
    try {
      const response = await apiClient.get(`${this.basePath}/system/performance`, { period });
      return response;
    } catch (error) {
      console.error('Failed to fetch system performance:', error);
      throw new ApiError('SYSTEM_PERFORMANCE_FETCH_FAILED', 'Failed to load system performance');
    }
  }

  async getSystemLogs(filters: {
    level?: 'error' | 'warn' | 'info' | 'debug' | 'admin' | 'all';
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    try {
      const response = await apiClient.get(`${this.basePath}/system/logs`, filters);
      return response;
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
      throw new ApiError('SYSTEM_LOGS_FETCH_FAILED', 'Failed to load system logs');
    }
  }

  /**
   * KYC Management Methods
   */
  async getPendingKYCReviews(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const response = await apiClient.get(`${this.basePath}/kyc/pending`, { page, limit });
      return response;
    } catch (error) {
      console.error('Failed to fetch pending KYC reviews:', error);
      throw new ApiError('KYC_PENDING_FETCH_FAILED', 'Failed to load pending KYC reviews');
    }
  }

  async reviewKYCDocument(documentId: string, status: 'verified' | 'rejected', notes?: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/kyc/${documentId}/review`, { status, notes });
    } catch (error) {
      console.error('Failed to review KYC document:', error);
      throw new ApiError('KYC_REVIEW_FAILED', 'Failed to review KYC document');
    }
  }

  /**
   * Commission Management Methods
   */
  async getPendingCommissionRequests(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const response = await apiClient.get(`${this.basePath}/commissions/pending`, { page, limit });
      return response;
    } catch (error) {
      console.error('Failed to fetch pending commission requests:', error);
      throw new ApiError('COMMISSIONS_FETCH_FAILED', 'Failed to load pending commission requests');
    }
  }

  async processCommissionRequest(
    requestId: string, 
    approved: boolean, 
    paymentReference?: string, 
    processingNotes?: string
  ): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/commissions/${requestId}/process`, {
        approved,
        paymentReference,
        processingNotes
      });
    } catch (error) {
      console.error('Failed to process commission request:', error);
      throw new ApiError('COMMISSION_PROCESS_FAILED', 'Failed to process commission request');
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;