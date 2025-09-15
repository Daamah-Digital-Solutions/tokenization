import React, { useState, useEffect } from 'react';
import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';
import { useAdminDashboard, useAdminActions } from '../../../hooks/useAdminDashboard';
import type { AdminUser, AdminProperty, SystemAlert } from '../../../services';
import { UserDetailModal, PropertyDetailModal } from './modals';
import AdminWebSocketManager from './AdminWebSocketManager';

// Helper function to convert dashboard stats to StatItem format
const formatDashboardStats = (stats: any): StatItem[] => {
  if (!stats) return [];
  
  return [
    {
      id: 'total-users',
      label: 'Total Users',
      value: stats.totalUsers?.toLocaleString() || '0',
      change: `+${stats.totalUsers - stats.verifiedUsers || 0}`,
      changeType: 'positive' as const,
      icon: '👥',
      description: 'Registered users'
    },
    {
      id: 'platform-volume',
      label: 'Platform Volume',
      value: `$${(stats.platformVolume / 1000000).toFixed(1)}M` || '$0',
      change: `${stats.platformVolumeChange > 0 ? '+' : ''}${stats.platformVolumeChange?.toFixed(1)}%` || '0%',
      changeType: (stats.platformVolumeChange >= 0 ? 'positive' : 'negative') as const,
      icon: '💰',
      description: 'Total transaction volume'
    },
    {
      id: 'active-properties',
      label: 'Active Properties',
      value: stats.activeProperties?.toLocaleString() || '0',
      change: `+${stats.activeProperties - stats.completedProperties || 0}`,
      changeType: 'positive' as const,
      icon: '🏢',
      description: 'Properties on platform'
    },
    {
      id: 'platform-revenue',
      label: 'Platform Revenue',
      value: `$${stats.platformRevenue?.toLocaleString() || '0'}`,
      change: `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange?.toFixed(1)}%` || '0%',
      changeType: (stats.revenueChange >= 0 ? 'positive' : 'negative') as const,
      icon: '📈',
      description: 'Monthly platform fees'
    }
  ];
};

// Helper function to convert system alerts to activity items
const formatSystemAlerts = (alerts: SystemAlert[]): ActivityItem[] => {
  return alerts.slice(0, 5).map(alert => ({
    id: alert.id,
    type: alert.severity === 'CRITICAL' ? 'error' : 'system',
    title: alert.title,
    description: alert.message,
    timestamp: alert.createdAt,
    status: alert.status === 'ACTIVE' ? 'pending' : 'completed'
  }));
};

// Loading component for data sections
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-2 border-primary-200 border-t-primary-600 ${sizeClasses[size]}`}></div>
    </div>
  );
};

// Error display component
const ErrorDisplay: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="flex items-center justify-center p-6">
    <div className="text-center">
      <span className="text-2xl mb-2 block">⚠️</span>
      <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);


const PlatformMetrics: React.FC<{ metrics: any; isLoading: boolean; error?: string | null; onRetry?: () => void }> = ({ 
  metrics, 
  isLoading, 
  error, 
  onRetry 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 h-80">
          <LoadingSpinner size="lg" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 h-80">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 h-80">
          <ErrorDisplay error={error} onRetry={onRetry} />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 h-80">
          <ErrorDisplay error={error} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart
        data={metrics?.transactionVolume || []}
        title="Platform Transaction Volume"
        type="area"
        color="#3b82f6"
      />
      <PerformanceChart
        data={metrics?.userGrowth || []}
        title="User Growth"
        type="line"
        color="#10b981"
      />
    </div>
  );
};

const UserManagement: React.FC<{ 
  users: AdminUser[] | null; 
  isLoading: boolean; 
  error?: string | null; 
  onRetry?: () => void;
  onUserAction?: (userId: string, action: string) => void;
}> = ({ users, isLoading, error, onRetry, onUserAction }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">User Management</h3>
        </div>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">User Management</h3>
        </div>
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  const userList = users || [];
  const pendingKYC = userList.filter(user => user.kycStatus === 'pending').length;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            User Management
          </h3>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded-full">
              {pendingKYC} Pending KYC
            </span>
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              View All
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {userList.slice(0, 6).map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.kycStatus === 'verified'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : user.kycStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.kycStatus}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    {user.email} • {user.role.replace('_', ' ')}
                    {user.isSuspended && <span className="text-red-500 ml-2">(Suspended)</span>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-right">
                  <p className="text-neutral-500 dark:text-slate-400">Joined</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {user.totalInvestment && (
                  <div className="text-right">
                    <p className="text-neutral-500 dark:text-slate-400">Investment</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      ${user.totalInvestment.toLocaleString()}
                    </p>
                  </div>
                )}
                {user.propertiesOwned && (
                  <div className="text-right">
                    <p className="text-neutral-500 dark:text-slate-400">Properties</p>
                    <p className="font-semibold text-neutral-900 dark:text-slate-100">
                      {user.propertiesOwned}
                    </p>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => onUserAction?.(user.id, 'review')}
                    className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors"
                  >
                    Review
                  </button>
                  {user.kycStatus === 'pending' && (
                    <button 
                      onClick={() => onUserAction?.(user.id, 'verify')}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      Verify
                    </button>
                  )}
                  {user.isSuspended ? (
                    <button 
                      onClick={() => onUserAction?.(user.id, 'unsuspend')}
                      className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors"
                    >
                      Unsuspend
                    </button>
                  ) : (
                    <button 
                      onClick={() => onUserAction?.(user.id, 'suspend')}
                      className="px-3 py-1 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-xs font-medium rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      Actions
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PropertyApproval: React.FC<{ 
  properties: AdminProperty[] | null; 
  isLoading: boolean; 
  error?: string | null; 
  onRetry?: () => void;
  onPropertyAction?: (propertyId: string, action: string, reason?: string) => void;
}> = ({ properties, isLoading, error, onRetry, onPropertyAction }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Property Approval Queue</h3>
        </div>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Property Approval Queue</h3>
        </div>
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  const propertyList = properties || [];
  const pendingProperties = propertyList.filter(p => p.status === 'pending_approval').length;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Property Approval Queue
          </h3>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium rounded-full">
            {pendingProperties} Pending Review
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {propertyList.slice(0, 5).map((property) => (
            <div
              key={property.id}
              className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🏢</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-slate-100">
                      {property.title}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      {property.location} • by {property.ownerName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    property.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : property.status === 'approved'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : property.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Target Amount</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${property.targetAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Submitted</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {new Date(property.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Tokens</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {property.tokensIssued?.toLocaleString() || 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Funding</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {property.fundingProgress}%
                  </p>
                </div>
              </div>

              {property.status === 'pending_approval' && (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => onPropertyAction?.(property.id, 'approve')}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => {
                      const reason = prompt('Please provide a rejection reason:');
                      if (reason) {
                        onPropertyAction?.(property.id, 'reject', reason);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => onPropertyAction?.(property.id, 'details')}
                    className="px-4 py-2 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-sm font-medium rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors"
                  >
                    Review Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TransactionMonitoring: React.FC<{ 
  transactions: any[] | null; 
  isLoading: boolean; 
  error?: string | null; 
  onRetry?: () => void;
}> = ({ transactions, isLoading, error, onRetry }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Recent Transactions</h3>
        </div>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Recent Transactions</h3>
        </div>
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  const recentTransactions = transactions?.slice(0, 5) || [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          Recent Transactions
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <span className="text-sm">
                    {transaction.type === 'Investment' ? '📈' : transaction.type === 'Withdrawal' ? '📉' : '💰'}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                    {transaction.type} {transaction.propertyTitle ? `- ${transaction.propertyTitle}` : ''}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    {transaction.userName || transaction.userEmail} • {new Date(transaction.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-neutral-900 dark:text-slate-100">
                  ${transaction.amount?.toLocaleString() || '0'}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  transaction.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SystemHealthComponent: React.FC<{ 
  health: any | null; 
  isLoading: boolean; 
  error?: string | null; 
  onRetry?: () => void;
}> = ({ health, isLoading, error, onRetry }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">System Health</h3>
        </div>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">System Health</h3>
        </div>
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  const getStatusFromValue = (value: number, thresholds: { warning: number; error: number }) => {
    if (value <= thresholds.warning) return 'excellent';
    if (value <= thresholds.error) return 'good';
    return 'warning';
  };

  const systemMetrics = health ? [
    { 
      label: 'API Response Time', 
      value: `${health.metrics?.apiResponseTime || 0}ms`, 
      status: getStatusFromValue(health.metrics?.apiResponseTime || 0, { warning: 200, error: 500 }), 
      target: '<500ms' 
    },
    { 
      label: 'System Uptime', 
      value: `${((health.uptime || 0) / 86400).toFixed(2)} days`, 
      status: 'excellent', 
      target: '>99.9%' 
    },
    { 
      label: 'Database Response', 
      value: `${health.metrics?.databaseConnectionTime || 0}ms`, 
      status: getStatusFromValue(health.metrics?.databaseConnectionTime || 0, { warning: 100, error: 1000 }), 
      target: '<1s' 
    },
    { 
      label: 'Active Connections', 
      value: (health.metrics?.activeConnections || 0).toLocaleString(), 
      status: getStatusFromValue(health.metrics?.activeConnections || 0, { warning: 1000, error: 2000 }), 
      target: '<2000' 
    },
    { 
      label: 'Error Rate', 
      value: `${(health.metrics?.errorRate || 0).toFixed(2)}%`, 
      status: getStatusFromValue(health.metrics?.errorRate || 0, { warning: 0.05, error: 0.1 }), 
      target: '<0.1%' 
    },
    { 
      label: 'Memory Usage', 
      value: `${(health.metrics?.memoryUsage || 0).toFixed(1)}%`, 
      status: getStatusFromValue(health.metrics?.memoryUsage || 0, { warning: 70, error: 90 }), 
      target: '<90%' 
    }
  ] : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          System Health
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemMetrics.map((metric) => (
            <div key={metric.label} className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                  {metric.label}
                </h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-1">
                {metric.value}
              </p>
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Target: {metric.target}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  // Modal state management
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<AdminProperty | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);

  // Initialize admin dashboard data and actions
  const {
    dashboardStats,
    platformMetrics,
    systemHealth,
    systemAlerts,
    financialMetrics,
    users,
    properties,
    isLoading,
    error,
    loadingStates,
    loadOverviewData,
    loadUsers,
    loadProperties,
    loadFinancialMetrics,
    refreshData,
    clearError,
    systemAlerts: currentAlerts,
    dashboardStats: currentStats
  } = useAdminDashboard();

  // Local state for real-time updates
  const [realtimeAlerts, setRealtimeAlerts] = useState<SystemAlert[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<any>(null);

  const {
    loading: actionLoading,
    error: actionError,
    clearError: clearActionError,
    suspendUser,
    unsuspendUser,
    verifyUser,
    approveProperty,
    rejectProperty,
    acknowledgeAlert,
    resolveAlert
  } = useAdminActions();

  // Load initial data on component mount
  useEffect(() => {
    if (currentView === 'overview') {
      loadOverviewData();
    } else if (currentView === 'users') {
      loadUsers();
    } else if (currentView === 'properties-admin') {
      loadProperties({ status: 'pending_approval' });
    } else if (currentView === 'financial') {
      loadFinancialMetrics();
    }
  }, [currentView, loadOverviewData, loadUsers, loadProperties, loadFinancialMetrics]);

  // Handle user actions
  const handleUserAction = async (userId: string, action: string) => {
    clearActionError();
    
    try {
      switch (action) {
        case 'review':
          const user = users?.users?.find(u => u.id === userId);
          if (user) {
            setSelectedUser(user);
            setIsUserModalOpen(true);
          }
          break;
        case 'verify':
          await verifyUser(userId, 'Admin verification');
          await refreshData('users');
          break;
        case 'suspend':
          const reason = prompt('Please provide suspension reason:');
          if (reason) {
            await suspendUser(userId, reason);
            await refreshData('users');
          }
          break;
        case 'unsuspend':
          await unsuspendUser(userId, 'Admin unsuspension');
          await refreshData('users');
          break;
        default:
          console.log(`Unknown user action: ${action}`);
      }
    } catch (error) {
      console.error('User action failed:', error);
    }
  };

  // Handle property actions
  const handlePropertyAction = async (propertyId: string, action: string, reason?: string) => {
    clearActionError();
    
    try {
      switch (action) {
        case 'approve':
          await approveProperty(propertyId);
          await refreshData('properties');
          break;
        case 'reject':
          if (reason) {
            await rejectProperty(propertyId, reason);
            await refreshData('properties');
          }
          break;
        case 'details':
          const property = properties?.properties?.find(p => p.id === propertyId);
          if (property) {
            setSelectedProperty(property);
            setIsPropertyModalOpen(true);
          }
          break;
        default:
          console.log(`Unknown property action: ${action}`);
      }
    } catch (error) {
      console.error('Property action failed:', error);
    }
  };

  // WebSocket event handlers
  const handleStatsUpdate = (data: any) => {
    console.log('Received real-time stats update:', data);
    setRealtimeStats(data);
  };

  const handleSystemAlert = (alert: SystemAlert) => {
    console.log('Received real-time system alert:', alert);
    setRealtimeAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);
  };

  const handleUserUpdate = (data: any) => {
    console.log('Received real-time user update:', data);
    if (currentView === 'users') {
      refreshData('users');
    }
  };

  const handlePropertyUpdate = (data: any) => {
    console.log('Received real-time property update:', data);
    if (currentView === 'properties-admin') {
      refreshData('properties');
    }
  };

  const handleTransactionUpdate = (data: any) => {
    console.log('Received real-time transaction update:', data);
    if (currentView === 'transactions-admin' || currentView === 'financial') {
      refreshData('all');
    }
  };

  const handleFinancialUpdate = (data: any) => {
    console.log('Received real-time financial update:', data);
    if (currentView === 'financial') {
      refreshData('financial');
    }
  };

  // Merge real-time data with dashboard data
  const mergedStats = realtimeStats ? { ...dashboardStats, ...realtimeStats } : dashboardStats;
  const mergedAlerts = [...realtimeAlerts, ...systemAlerts].slice(0, 10);

  // Convert dashboard stats to StatItem format
  const formattedStats = formatDashboardStats(mergedStats);
  
  // Convert system alerts to activities
  const systemActivities = formatSystemAlerts(mergedAlerts);
  // Dynamic quick actions based on real data
  const pendingKYC = users?.users?.filter(user => user.kycStatus === 'pending').length || 0;
  const pendingProperties = properties?.properties?.filter(prop => prop.status === 'pending_approval').length || 0;
  const criticalAlerts = mergedAlerts.filter(alert => alert.severity === 'CRITICAL' && alert.status === 'ACTIVE').length;
  
  const quickActions: QuickAction[] = [
    {
      id: 'approve-users',
      label: 'Review KYC',
      icon: '✅',
      description: `${pendingKYC} pending approvals`,
      variant: pendingKYC > 0 ? 'warning' : 'default',
      onClick: () => console.log('Navigate to user approvals')
    },
    {
      id: 'review-properties',
      label: 'Review Properties',
      icon: '🏢',
      description: `${pendingProperties} pending reviews`,
      variant: pendingProperties > 0 ? 'primary' : 'default',
      onClick: () => console.log('Navigate to property reviews')
    },
    {
      id: 'system-alerts',
      label: 'System Alerts',
      icon: '⚠️',
      description: criticalAlerts > 0 ? `${criticalAlerts} critical alerts` : 'All systems normal',
      variant: criticalAlerts > 0 ? 'danger' : 'default',
      onClick: () => console.log('View system alerts')
    },
    {
      id: 'refresh-data',
      label: 'Refresh Data',
      icon: '🔄',
      description: 'Update dashboard',
      onClick: () => refreshData('all')
    }
  ];

  // Show loading state for initial load
  if (isLoading && !dashboardStats && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show global error state
  if (error && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <ErrorDisplay error={error} onRetry={() => refreshData('all')} />
      </div>
    );
  }

  // Render the modals
  const modals = (
    <>
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
          }}
          onUserUpdated={() => {
            refreshData('users');
          }}
        />
      )}
      
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isPropertyModalOpen}
          onClose={() => {
            setIsPropertyModalOpen(false);
            setSelectedProperty(null);
          }}
          onPropertyUpdated={() => {
            refreshData('properties');
          }}
        />
      )}
    </>
  );

  // Determine the main content based on current view
  const mainContent = (() => {
    switch (currentView) {
    case 'overview':
      return (
        <div className="space-y-6">
          {/* Show action error if present */}
          {actionError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800 dark:text-red-200">{actionError}</p>
                <button 
                  onClick={clearActionError}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          <DashboardStats 
            stats={formattedStats} 
            isLoading={loadingStates.stats}
            error={error}
            onRefresh={() => refreshData('stats')}
          />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PlatformMetrics 
                metrics={platformMetrics}
                isLoading={loadingStates.metrics}
                error={error}
                onRetry={() => refreshData('metrics')}
              />
            </div>
            <QuickActions actions={quickActions} columns={2} />
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TransactionMonitoring 
                transactions={[]}
                isLoading={false}
                error={null}
                onRetry={() => console.log('Load transactions')}
              />
            </div>
            <ActivityFeed 
              activities={systemActivities} 
              maxItems={5}
              showViewAll={true}
              onViewAll={() => console.log('View all activities')}
            />
          </div>
        </div>
      );

    case 'users':
      return (
        <div className="space-y-6">
          {actionError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800 dark:text-red-200">{actionError}</p>
                <button onClick={clearActionError} className="text-red-600 dark:text-red-400">×</button>
              </div>
            </div>
          )}
          
          <UserManagement 
            users={users?.users || null}
            isLoading={loadingStates.users}
            error={error}
            onRetry={() => refreshData('users')}
            onUserAction={handleUserAction}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                User Statistics
              </h3>
              <div className="space-y-3">
                {[
                  { 
                    label: 'Total Users', 
                    value: users?.totalCount?.toLocaleString() || '0', 
                    change: '+' + (users?.totalCount || 0 - (users?.users?.filter(u => u.kycStatus === 'verified').length || 0))
                  },
                  { 
                    label: 'Verified Users', 
                    value: users?.users?.filter(u => u.kycStatus === 'verified').length?.toLocaleString() || '0', 
                    change: '+' + (users?.users?.filter(u => u.kycStatus === 'verified').length || 0)
                  },
                  { 
                    label: 'Pending KYC', 
                    value: users?.users?.filter(u => u.kycStatus === 'pending').length?.toLocaleString() || '0', 
                    change: '+' + (users?.users?.filter(u => u.kycStatus === 'pending').length || 0)
                  },
                  { 
                    label: 'Suspended Users', 
                    value: users?.users?.filter(u => u.isSuspended).length?.toLocaleString() || '0', 
                    change: '+' + (users?.users?.filter(u => u.isSuspended).length || 0)
                  }
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                      {stat.label}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                        {stat.value}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                User Types
              </h3>
              <div className="space-y-3">
                {(() => {
                  const totalUsers = users?.totalCount || 1;
                  const investors = users?.users?.filter(u => u.role === 'investor').length || 0;
                  const propertyOwners = users?.users?.filter(u => u.role === 'property_owner').length || 0;
                  const brokers = users?.users?.filter(u => u.role === 'broker').length || 0;
                  
                  return [
                    { 
                      label: 'Investors', 
                      percentage: Math.round((investors / totalUsers) * 100), 
                      count: investors 
                    },
                    { 
                      label: 'Property Owners', 
                      percentage: Math.round((propertyOwners / totalUsers) * 100), 
                      count: propertyOwners 
                    },
                    { 
                      label: 'Brokers', 
                      percentage: Math.round((brokers / totalUsers) * 100), 
                      count: brokers 
                    }
                  ];
                })().map((segment) => (
                  <div key={segment.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                        {segment.label}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-slate-400">
                        {segment.count}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${segment.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                Geographic Distribution
              </h3>
              <div className="space-y-2">
                {[
                  { region: 'North America', percentage: 45 },
                  { region: 'Europe', percentage: 28 },
                  { region: 'Asia', percentage: 18 },
                  { region: 'Others', percentage: 9 }
                ].map((region) => (
                  <div key={region.region} className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-slate-400">
                      {region.region}
                    </span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                      {region.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'properties-admin':
      return (
        <div className="space-y-6">
          {actionError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800 dark:text-red-200">{actionError}</p>
                <button onClick={clearActionError} className="text-red-600 dark:text-red-400">×</button>
              </div>
            </div>
          )}
          
          <PropertyApproval 
            properties={properties?.properties || null}
            isLoading={loadingStates.properties}
            error={error}
            onRetry={() => refreshData('properties')}
            onPropertyAction={handlePropertyAction}
          />
        </div>
      );

    case 'transactions-admin':
      return (
        <div className="space-y-6">
          <TransactionMonitoring 
            transactions={[]}
            isLoading={false}
            error={null}
            onRetry={() => console.log('Load transactions')}
          />
          <PlatformMetrics 
            metrics={platformMetrics}
            isLoading={loadingStates.metrics}
            error={error}
            onRetry={() => refreshData('metrics')}
          />
        </div>
      );

    case 'platform':
      return (
        <div className="space-y-6">
          <PlatformMetrics 
            metrics={platformMetrics}
            isLoading={loadingStates.metrics}
            error={error}
            onRetry={() => refreshData('metrics')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                label: 'Daily Active Users', 
                value: dashboardStats?.dailyActiveUsers?.toLocaleString() || '0', 
                change: '+5.2%' 
              },
              { 
                label: 'Transaction Volume', 
                value: `$${((dashboardStats?.monthlyTransactionVolume || 0) / 1000).toFixed(0)}K`, 
                change: `${dashboardStats?.platformVolumeChange > 0 ? '+' : ''}${dashboardStats?.platformVolumeChange?.toFixed(1)}%` 
              },
              { 
                label: 'Platform Revenue', 
                value: `$${((dashboardStats?.platformRevenue || 0) / 1000).toFixed(1)}K`, 
                change: `${dashboardStats?.revenueChange > 0 ? '+' : ''}${dashboardStats?.revenueChange?.toFixed(1)}%` 
              },
              { 
                label: 'Success Rate', 
                value: `${(dashboardStats?.successRate || 0).toFixed(1)}%`, 
                change: '+0.1%' 
              }
            ].map((metric) => (
              <div key={metric.label} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-2">
                  {metric.label}
                </h3>
                <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                  {metric.value}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {metric.change}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'system':
      return (
        <div className="space-y-6">
          <SystemHealthComponent 
            health={systemHealth}
            isLoading={loadingStates.health}
            error={error}
            onRetry={() => refreshData('health')}
          />
          
          {mergedAlerts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
              <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Active System Alerts</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {mergedAlerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border ${
                      alert.severity === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                      alert.severity === 'HIGH' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-neutral-900 dark:text-slate-100">{alert.title}</h4>
                          <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">{alert.message}</p>
                          <p className="text-xs text-neutral-500 dark:text-slate-500 mt-2">
                            {new Date(alert.createdAt).toLocaleString()} • {alert.severity} • {alert.source}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {alert.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => acknowledgeAlert(alert.id)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                Acknowledge
                              </button>
                              <button
                                onClick={() => {
                                  const resolution = prompt('Please provide resolution details:');
                                  if (resolution) {
                                    resolveAlert(alert.id, resolution);
                                  }
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case 'financial':
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
            <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Financial Management</h3>
            </div>
            <div className="p-6">
              {loadingStates.financial ? (
                <LoadingSpinner size="lg" />
              ) : financialMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { 
                      label: 'Total Revenue', 
                      value: `$${financialMetrics.totalRevenue?.toLocaleString() || '0'}`, 
                      change: `${financialMetrics.revenueChange > 0 ? '+' : ''}${financialMetrics.revenueChange?.toFixed(1)}%` 
                    },
                    { 
                      label: 'Monthly Revenue', 
                      value: `$${financialMetrics.monthlyRevenue?.toLocaleString() || '0'}`, 
                      change: 'This month' 
                    },
                    { 
                      label: 'Pending Withdrawals', 
                      value: `$${financialMetrics.pendingWithdrawalAmount?.toLocaleString() || '0'}`, 
                      change: `${financialMetrics.pendingWithdrawals || 0} requests` 
                    },
                    { 
                      label: 'Total Commissions', 
                      value: `$${financialMetrics.totalCommissions?.toLocaleString() || '0'}`, 
                      change: `${financialMetrics.pendingCommissions || 0} pending` 
                    }
                  ].map((metric) => (
                    <div key={metric.label} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-2">
                        {metric.label}
                      </h4>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                        {metric.value}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
                        {metric.change}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <ErrorDisplay error={error || 'Failed to load financial data'} onRetry={() => refreshData('financial')} />
              )}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <span className="text-4xl mb-4 block">🚧</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              {currentView.replace('-', ' ')} Dashboard
            </h3>
            <p className="text-neutral-500 dark:text-slate-400">
              This section is under development
            </p>
          </div>
        </div>
      );
    }
  })();

  return (
    <AdminWebSocketManager
      onStatsUpdate={handleStatsUpdate}
      onUserUpdate={handleUserUpdate}
      onPropertyUpdate={handlePropertyUpdate}
      onSystemAlert={handleSystemAlert}
      onTransactionUpdate={handleTransactionUpdate}
      onFinancialUpdate={handleFinancialUpdate}
    >
      {mainContent}
      {modals}
    </AdminWebSocketManager>
  );
};