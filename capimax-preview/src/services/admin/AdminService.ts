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

/**
 * AdminService — frontend wrapper for admin-only backend routes.
 *
 * Backend status (P1 audit, 2026-05):
 *   - `/admin/property-approvals/*` is real (admin_panel app)
 *   - `/admin/nova-sukuk/*` is real
 *   - `/kyc/admin/*` is real (under the KYC app, not /admin/)
 *   - `/broker/admin/*` is real (broker app)
 *   - Most other endpoints assumed by the admin dashboard (a unified
 *     `/admin/dashboard`, `/admin/users`, `/admin/financial/*`,
 *     `/admin/system/*`) are PHANTOM — no backend route exists.
 *
 * For phantom methods this service throws an explicit Error so the UI
 * surfaces a clear failure mode instead of staring at a permanent
 * loading spinner or rendering stale data.
 */
const NOT_IMPLEMENTED = (method: string, hint?: string): never => {
  const detail = hint ? ` Use ${hint} instead.` : '';
  throw new Error(`AdminService.${method} is not implemented on the backend yet.${detail}`);
};

export class AdminService {
  private readonly basePath = '/admin';

  /**
   * Dashboard & Analytics Methods.
   *
   * No unified admin dashboard endpoint exists. The closest real data
   * lives in the analytics app — see `/analytics/dashboard/`. The shapes
   * differ, though, so we throw here and ask callers to compose their
   * own aggregate from individual endpoints.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return NOT_IMPLEMENTED('getDashboardStats', 'analytics endpoints + property approval stats');
  }

  async getPlatformMetrics(_period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<PlatformMetrics> {
    return NOT_IMPLEMENTED('getPlatformMetrics', '/analytics/dashboard/');
  }

  async getSystemAnalytics(_period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<SystemAnalytics> {
    return NOT_IMPLEMENTED('getSystemAnalytics', '/analytics/dashboard/');
  }

  /**
   * User Management Methods.
   *
   * Backend has no `/admin/users/*` surface — user management is
   * handled exclusively through the Django admin site for now. All
   * methods here throw so the UI surfaces a clear gap.
   */
  async getAllUsers(_filters: UserFilters = {}): Promise<PaginatedUsers> {
    return NOT_IMPLEMENTED('getAllUsers', 'Django admin site or building a dedicated /admin/users endpoint');
  }

  async getUserActivity(_userId: string, _limit: number = 50): Promise<UserActivity[]> {
    return NOT_IMPLEMENTED('getUserActivity');
  }

  async getUserNotes(_userId: string): Promise<AdminNote[]> {
    return NOT_IMPLEMENTED('getUserNotes');
  }

  async addUserNote(_userId: string, _noteData: {
    title?: string;
    content: string;
    noteType?: AdminNote['noteType'];
    priority?: AdminNote['priority'];
    visibility?: AdminNote['visibility'];
    isConfidential?: boolean;
    tags?: string[];
  }): Promise<AdminNote> {
    return NOT_IMPLEMENTED('addUserNote');
  }

  async updateUser(_userId: string, _updates: {
    role?: AdminUser['role'];
    isActive?: boolean;
    kycStatus?: AdminUser['kycStatus'];
    notes?: string;
  }): Promise<AdminUser> {
    return NOT_IMPLEMENTED('updateUser');
  }

  async suspendUser(_userId: string, _reason: string, _duration?: number): Promise<void> {
    return NOT_IMPLEMENTED('suspendUser');
  }

  async unsuspendUser(_userId: string, _notes?: string): Promise<void> {
    return NOT_IMPLEMENTED('unsuspendUser');
  }

  async forceVerifyUser(_userId: string, _notes?: string): Promise<void> {
    return NOT_IMPLEMENTED('forceVerifyUser', '/kyc/admin/approve/<id>/');
  }

  async getUserInvestments(_userId: string, _page: number = 1, _limit: number = 20): Promise<any> {
    return NOT_IMPLEMENTED('getUserInvestments');
  }

  async getUserTransactions(_userId: string, _page: number = 1, _limit: number = 20, _type?: string): Promise<any> {
    return NOT_IMPLEMENTED('getUserTransactions');
  }

  /**
   * Property Management Methods.
   *
   * `getAllProperties` repoints to the real property-approvals queue.
   * approve/reject go through `/properties/<id>/approve/` which is the
   * canonical approval endpoint (in the properties app, not admin_panel).
   */
  async getAllProperties(filters: PropertyFilters = {}): Promise<PaginatedProperties> {
    try {
      return await apiClient.get<PaginatedProperties>(
        `${this.basePath}/property-approvals/`,
        filters
      );
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      throw new ApiError('PROPERTIES_FETCH_FAILED', 'Failed to load properties');
    }
  }

  async approveProperty(propertyId: string): Promise<void> {
    try {
      await apiClient.post<void>(`/properties/${propertyId}/approve/`, { decision: 'approved' });
    } catch (error) {
      console.error('Failed to approve property:', error);
      throw new ApiError('PROPERTY_APPROVE_FAILED', 'Failed to approve property');
    }
  }

  async rejectProperty(propertyId: string, rejectionReason: string): Promise<void> {
    try {
      await apiClient.post<void>(`/properties/${propertyId}/approve/`, {
        decision: 'rejected',
        rejection_reason: rejectionReason,
      });
    } catch (error) {
      console.error('Failed to reject property:', error);
      throw new ApiError('PROPERTY_REJECT_FAILED', 'Failed to reject property');
    }
  }

  /**
   * Financial Management Methods.
   *
   * No `/admin/financial/*` surface exists. Withdrawal admin happens via
   * the investments app — see `/withdrawals/<id>/` PATCH for state
   * transitions (admin-only) — but the shape differs from this class's
   * WithdrawalRequest type. Throwing forces callers to migrate.
   */
  async getFinancialDashboard(_period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<FinancialMetrics> {
    return NOT_IMPLEMENTED('getFinancialDashboard', '/analytics/dashboard/ + dividend summary');
  }

  async getDetailedTransactions(_filters: TransactionFilters = {}): Promise<PaginatedTransactions> {
    return NOT_IMPLEMENTED('getDetailedTransactions', '/transactions/ with admin scope');
  }

  async getPendingWithdrawals(_page: number = 1, _limit: number = 20): Promise<WithdrawalRequest[]> {
    return NOT_IMPLEMENTED('getPendingWithdrawals', '/withdrawals/?status=pending');
  }

  async approveWithdrawal(_withdrawalId: string, _notes?: string): Promise<void> {
    return NOT_IMPLEMENTED('approveWithdrawal', 'PATCH /withdrawals/<id>/ {status:"completed"}');
  }

  async rejectWithdrawal(_withdrawalId: string, _reason: string): Promise<void> {
    return NOT_IMPLEMENTED('rejectWithdrawal', 'PATCH /withdrawals/<id>/ {status:"cancelled"}');
  }

  /**
   * System Management Methods.
   *
   * Backend exposes Prometheus metrics at `/metrics` and ships a Grafana
   * dashboard for ops, but there is no JSON `/admin/system/*` surface
   * for the SPA. These calls are aspirational — throw rather than 404.
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return NOT_IMPLEMENTED('getSystemHealth', 'Prometheus + Grafana dashboards');
  }

  async getSystemAlerts(_filters: {
    status?: SystemAlert['status'];
    severity?: SystemAlert['severity'];
    limit?: number;
  } = {}): Promise<SystemAlert[]> {
    try {
      // System-alerts is real under notifications — admins post alerts there.
      const response = await apiClient.get<SystemAlert[]>('/notifications/admin/system-alerts/', _filters);
      return response;
    } catch (error) {
      console.error('Failed to fetch system alerts:', error);
      throw new ApiError('SYSTEM_ALERTS_FETCH_FAILED', 'Failed to load system alerts');
    }
  }

  async acknowledgeAlert(_alertId: string): Promise<void> {
    return NOT_IMPLEMENTED('acknowledgeAlert', '/notifications/admin/system-alerts/<id>/resolve/');
  }

  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    try {
      await apiClient.post(`/notifications/admin/system-alerts/${alertId}/resolve/`, { resolution });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw new ApiError('ALERT_RESOLVE_FAILED', 'Failed to resolve alert');
    }
  }

  async getSystemPerformance(_period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<any> {
    return NOT_IMPLEMENTED('getSystemPerformance', 'Prometheus query API');
  }

  async getSystemLogs(_filters: {
    level?: 'error' | 'warn' | 'info' | 'debug' | 'admin' | 'all';
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    return NOT_IMPLEMENTED('getSystemLogs', 'log aggregation tool (not exposed to SPA)');
  }

  /**
   * KYC Management Methods.
   *
   * Repoint to the real KYC admin endpoints — under `/kyc/admin/`, not
   * `/admin/kyc/`.
   */
  async getPendingKYCReviews(page: number = 1, limit: number = 20): Promise<any> {
    try {
      return await apiClient.get('/kyc/admin/pending/', { page, page_size: limit });
    } catch (error) {
      console.error('Failed to fetch pending KYC reviews:', error);
      throw new ApiError('KYC_PENDING_FETCH_FAILED', 'Failed to load pending KYC reviews');
    }
  }

  async reviewKYCDocument(documentId: string, status: 'verified' | 'rejected', notes?: string): Promise<void> {
    try {
      // The backend exposes per-document approve/reject actions rather
      // than a single review endpoint with a status field.
      const action = status === 'verified' ? 'approve' : 'reject';
      await apiClient.post(`/kyc/documents/${documentId}/${action}/`, { notes });
    } catch (error) {
      console.error('Failed to review KYC document:', error);
      throw new ApiError('KYC_REVIEW_FAILED', 'Failed to review KYC document');
    }
  }

  /**
   * Commission Management Methods.
   *
   * Repoint to the broker admin commission endpoints under `/broker/admin/`.
   */
  async getPendingCommissionRequests(page: number = 1, limit: number = 20): Promise<any> {
    try {
      return await apiClient.get('/broker/admin/commissions/', {
        page,
        page_size: limit,
        status: 'pending',
      });
    } catch (error) {
      console.error('Failed to fetch pending commission requests:', error);
      throw new ApiError('COMMISSIONS_FETCH_FAILED', 'Failed to load pending commission requests');
    }
  }

  async processCommissionRequest(
    requestId: string,
    approved: boolean,
    _paymentReference?: string,
    _processingNotes?: string
  ): Promise<void> {
    if (!approved) {
      // Backend has no reject endpoint — only approve. Surface that gap.
      return NOT_IMPLEMENTED('processCommissionRequest (reject branch)');
    }
    try {
      await apiClient.post(`/broker/admin/commissions/${requestId}/approve/`);
    } catch (error) {
      console.error('Failed to process commission request:', error);
      throw new ApiError('COMMISSION_PROCESS_FAILED', 'Failed to process commission request');
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;