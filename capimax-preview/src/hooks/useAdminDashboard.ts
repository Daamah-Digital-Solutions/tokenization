import { useState, useEffect, useCallback } from 'react';
import { 
  adminService, 
  type DashboardStats, 
  type PlatformMetrics,
  type SystemHealth,
  type SystemAlert,
  type FinancialMetrics,
  type PaginatedUsers,
  type PaginatedProperties,
  type UserFilters,
  type PropertyFilters
} from '../services';
import { webSocketService } from '../services';

export interface AdminDashboardState {
  dashboardStats: DashboardStats | null;
  platformMetrics: PlatformMetrics | null;
  systemHealth: SystemHealth | null;
  systemAlerts: SystemAlert[];
  financialMetrics: FinancialMetrics | null;
  users: PaginatedUsers | null;
  properties: PaginatedProperties | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseAdminDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
}

export function useAdminDashboard(options: UseAdminDashboardOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableWebSocket = true
  } = options;

  const [state, setState] = useState<AdminDashboardState>({
    dashboardStats: null,
    platformMetrics: null,
    systemHealth: null,
    systemAlerts: [],
    financialMetrics: null,
    users: null,
    properties: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const [loadingStates, setLoadingStates] = useState({
    stats: false,
    metrics: false,
    health: false,
    alerts: false,
    financial: false,
    users: false,
    properties: false
  });

  // Update loading state for specific section
  const updateLoadingState = useCallback((section: keyof typeof loadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [section]: isLoading }));
    
    // Update overall loading state
    setState(prev => ({
      ...prev,
      isLoading: isLoading || Object.values({ ...loadingStates, [section]: isLoading }).some(Boolean)
    }));
  }, [loadingStates]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load dashboard statistics
  const loadDashboardStats = useCallback(async () => {
    try {
      updateLoadingState('stats', true);
      clearError();
      
      const stats = await adminService.getDashboardStats();
      setState(prev => ({
        ...prev,
        dashboardStats: stats,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load dashboard statistics'
      }));
    } finally {
      updateLoadingState('stats', false);
    }
  }, [updateLoadingState, clearError]);

  // Load platform metrics
  const loadPlatformMetrics = useCallback(async (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
    try {
      updateLoadingState('metrics', true);
      clearError();
      
      const metrics = await adminService.getPlatformMetrics(period);
      setState(prev => ({
        ...prev,
        platformMetrics: metrics,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to load platform metrics:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load platform metrics'
      }));
    } finally {
      updateLoadingState('metrics', false);
    }
  }, [updateLoadingState, clearError]);

  // Load system health
  const loadSystemHealth = useCallback(async () => {
    try {
      updateLoadingState('health', true);
      clearError();
      
      const health = await adminService.getSystemHealth();
      setState(prev => ({
        ...prev,
        systemHealth: health,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to load system health:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load system health'
      }));
    } finally {
      updateLoadingState('health', false);
    }
  }, [updateLoadingState, clearError]);

  // Load system alerts
  const loadSystemAlerts = useCallback(async (filters: {
    status?: SystemAlert['status'];
    severity?: SystemAlert['severity'];
    limit?: number;
  } = {}) => {
    try {
      updateLoadingState('alerts', true);
      clearError();
      
      const alerts = await adminService.getSystemAlerts(filters);
      setState(prev => ({
        ...prev,
        systemAlerts: alerts,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to load system alerts:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load system alerts'
      }));
    } finally {
      updateLoadingState('alerts', false);
    }
  }, [updateLoadingState, clearError]);

  // Load financial metrics
  const loadFinancialMetrics = useCallback(async (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
    try {
      updateLoadingState('financial', true);
      clearError();
      
      const financial = await adminService.getFinancialDashboard(period);
      setState(prev => ({
        ...prev,
        financialMetrics: financial,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to load financial metrics:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load financial metrics'
      }));
    } finally {
      updateLoadingState('financial', false);
    }
  }, [updateLoadingState, clearError]);

  // Load users with filters
  const loadUsers = useCallback(async (filters: UserFilters = {}) => {
    try {
      updateLoadingState('users', true);
      clearError();
      
      const users = await adminService.getAllUsers(filters);
      setState(prev => ({
        ...prev,
        users,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to load users:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load users'
      }));
    } finally {
      updateLoadingState('users', false);
    }
  }, [updateLoadingState, clearError]);

  // Load properties with filters
  const loadProperties = useCallback(async (filters: PropertyFilters = {}) => {
    try {
      updateLoadingState('properties', true);
      clearError();
      
      const properties = await adminService.getAllProperties(filters);
      setState(prev => ({
        ...prev,
        properties,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to load properties:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load properties'
      }));
    } finally {
      updateLoadingState('properties', false);
    }
  }, [updateLoadingState, clearError]);

  // Load all overview data
  const loadOverviewData = useCallback(async () => {
    await Promise.allSettled([
      loadDashboardStats(),
      loadPlatformMetrics(),
      loadSystemHealth(),
      loadSystemAlerts({ limit: 10 })
    ]);
  }, [loadDashboardStats, loadPlatformMetrics, loadSystemHealth, loadSystemAlerts]);

  // Refresh specific data section
  const refreshData = useCallback(async (section: 'stats' | 'metrics' | 'health' | 'alerts' | 'financial' | 'users' | 'properties' | 'all') => {
    switch (section) {
      case 'stats':
        await loadDashboardStats();
        break;
      case 'metrics':
        await loadPlatformMetrics();
        break;
      case 'health':
        await loadSystemHealth();
        break;
      case 'alerts':
        await loadSystemAlerts({ limit: 10 });
        break;
      case 'financial':
        await loadFinancialMetrics();
        break;
      case 'users':
        await loadUsers();
        break;
      case 'properties':
        await loadProperties();
        break;
      case 'all':
        await loadOverviewData();
        break;
    }
  }, [loadDashboardStats, loadPlatformMetrics, loadSystemHealth, loadSystemAlerts, loadFinancialMetrics, loadUsers, loadProperties, loadOverviewData]);

  // WebSocket event handlers
  useEffect(() => {
    if (!enableWebSocket) return;

    const handleStatsUpdate = (data: any) => {
      console.log('Received stats update:', data);
      setState(prev => ({
        ...prev,
        dashboardStats: { ...prev.dashboardStats, ...data.stats },
        lastUpdated: new Date()
      }));
    };

    const handleSystemAlert = (alert: SystemAlert) => {
      console.log('Received system alert:', alert);
      setState(prev => ({
        ...prev,
        systemAlerts: [alert, ...prev.systemAlerts].slice(0, 10), // Keep only latest 10 alerts
        lastUpdated: new Date()
      }));
    };

    const handleUserUpdate = (data: any) => {
      console.log('Received user update:', data);
      // Optionally refresh users data or update specific user
      if (state.users) {
        loadUsers();
      }
    };

    const handlePropertyUpdate = (data: any) => {
      console.log('Received property update:', data);
      // Optionally refresh properties data or update specific property
      if (state.properties) {
        loadProperties();
      }
    };

    // Subscribe to admin-specific WebSocket events
    webSocketService.on('admin_stats_update', handleStatsUpdate);
    webSocketService.on('system_alert', handleSystemAlert);
    webSocketService.on('user_update', handleUserUpdate);
    webSocketService.on('property_update', handlePropertyUpdate);

    // Join admin room for real-time updates
    webSocketService.joinRoom('admin_dashboard');

    // Cleanup function
    return () => {
      webSocketService.off('admin_stats_update', handleStatsUpdate);
      webSocketService.off('system_alert', handleSystemAlert);
      webSocketService.off('user_update', handleUserUpdate);
      webSocketService.off('property_update', handlePropertyUpdate);
      webSocketService.leaveRoom('admin_dashboard');
    };
  }, [enableWebSocket, state.users, state.properties, loadUsers, loadProperties]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      // Only refresh if not currently loading
      if (!state.isLoading) {
        loadOverviewData();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, state.isLoading, loadOverviewData]);

  return {
    // State
    ...state,
    loadingStates,

    // Actions
    loadDashboardStats,
    loadPlatformMetrics,
    loadSystemHealth,
    loadSystemAlerts,
    loadFinancialMetrics,
    loadUsers,
    loadProperties,
    loadOverviewData,
    refreshData,
    clearError,

    // Convenience flags
    hasData: !!(state.dashboardStats || state.platformMetrics || state.systemHealth),
    isInitialLoad: !state.lastUpdated && state.isLoading,
    hasError: !!state.error
  };
}

// Hook for managing individual admin actions
export function useAdminActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const executeAction = useCallback(async <T>(
    action: () => Promise<T>,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await action();
      
      if (successMessage) {
        console.log(successMessage);
        // Here you would typically show a success notification
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Admin action failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // User management actions
  const suspendUser = useCallback((userId: string, reason: string, duration?: number) => {
    return executeAction(
      () => adminService.suspendUser(userId, reason, duration),
      'User suspended successfully'
    );
  }, [executeAction]);

  const unsuspendUser = useCallback((userId: string, notes?: string) => {
    return executeAction(
      () => adminService.unsuspendUser(userId, notes),
      'User unsuspended successfully'
    );
  }, [executeAction]);

  const verifyUser = useCallback((userId: string, notes?: string) => {
    return executeAction(
      () => adminService.forceVerifyUser(userId, notes),
      'User verified successfully'
    );
  }, [executeAction]);

  const addUserNote = useCallback((userId: string, noteData: any) => {
    return executeAction(
      () => adminService.addUserNote(userId, noteData),
      'Note added successfully'
    );
  }, [executeAction]);

  // Property management actions
  const approveProperty = useCallback((propertyId: string) => {
    return executeAction(
      () => adminService.approveProperty(propertyId),
      'Property approved successfully'
    );
  }, [executeAction]);

  const rejectProperty = useCallback((propertyId: string, reason: string) => {
    return executeAction(
      () => adminService.rejectProperty(propertyId, reason),
      'Property rejected successfully'
    );
  }, [executeAction]);

  // Financial management actions
  const approveWithdrawal = useCallback((withdrawalId: string, notes?: string) => {
    return executeAction(
      () => adminService.approveWithdrawal(withdrawalId, notes),
      'Withdrawal approved successfully'
    );
  }, [executeAction]);

  const rejectWithdrawal = useCallback((withdrawalId: string, reason: string) => {
    return executeAction(
      () => adminService.rejectWithdrawal(withdrawalId, reason),
      'Withdrawal rejected successfully'
    );
  }, [executeAction]);

  // System management actions
  const acknowledgeAlert = useCallback((alertId: string) => {
    return executeAction(
      () => adminService.acknowledgeAlert(alertId),
      'Alert acknowledged successfully'
    );
  }, [executeAction]);

  const resolveAlert = useCallback((alertId: string, resolution: string) => {
    return executeAction(
      () => adminService.resolveAlert(alertId, resolution),
      'Alert resolved successfully'
    );
  }, [executeAction]);

  return {
    loading,
    error,
    clearError,
    executeAction,
    
    // User actions
    suspendUser,
    unsuspendUser,
    verifyUser,
    addUserNote,
    
    // Property actions
    approveProperty,
    rejectProperty,
    
    // Financial actions
    approveWithdrawal,
    rejectWithdrawal,
    
    // System actions
    acknowledgeAlert,
    resolveAlert
  };
}