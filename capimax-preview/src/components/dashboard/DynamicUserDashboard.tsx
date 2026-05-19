import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Bell, 
  User as UserIcon, 
  Moon, 
  Sun,
  Settings,
  Activity,
  Wallet,
  BarChart3,
  Building,
  Users,
  Calendar,
  FileText
} from 'lucide-react';

import { DashboardService, type DashboardStats, type MarketInsights } from '../../services/dashboard/DashboardService';
import PropertyOwnerService from '../../services/property-owner/PropertyOwnerService';
import { AuthService } from '../../services/auth/AuthService';
import { UserRole, type User as UserType, type Transaction } from '../../services/api/types';
import { useTheme } from '../../contexts/ThemeContext';
import { StatsCard, Card } from '../design-system';
import { Text } from '../design-system/typography/Text';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface DashboardContent {
  stats: Array<{
    title: string;
    value: string | number;
    subtitle?: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'accent' | 'gradient';
  }>;
  quickActions: Array<{
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    variant: 'primary' | 'secondary' | 'outline';
  }>;
  sections: Array<{
    title: string;
    component: React.ComponentType<any>;
    priority: number;
  }>;
}

interface DynamicUserDashboardProps {
  className?: string;
  userRole?: string;
  onViewChange?: (view: string) => void;
}

const roleBasedContent: Record<UserRole, (data: any) => DashboardContent> = {
  [UserRole.INVESTOR]: (data) => ({
    stats: [
      {
        title: 'Total Portfolio Value',
        value: `$${data.stats?.totalValue?.toLocaleString() || '0'}`,
        change: data.stats?.portfolioGrowth ? `+${data.stats.portfolioGrowth}%` : undefined,
        changeType: 'positive' as const,
        icon: DollarSign,
        variant: 'gradient' as const,
      },
      {
        title: 'Monthly Income',
        value: `$${data.stats?.monthlyIncome?.toLocaleString() || '0'}`,
        subtitle: 'From dividends',
        icon: TrendingUp,
        variant: 'accent' as const,
      },
      {
        title: 'Active Properties',
        value: data.stats?.activeProperties || 0,
        subtitle: 'In portfolio',
        icon: Building,
      },
      {
        title: 'Total ROI',
        value: `${data.stats?.roi || 0}%`,
        change: data.stats?.roi > 0 ? 'positive' : 'neutral',
        changeType: data.stats?.roi > 0 ? 'positive' as const : 'neutral' as const,
        icon: BarChart3,
      },
    ],
    quickActions: [
      {
        title: 'Browse Properties',
        description: 'Discover new investment opportunities',
        icon: Building,
        action: () => window.location.href = '/properties',
        variant: 'primary' as const,
      },
      {
        title: 'View Portfolio',
        description: 'Manage your investments',
        icon: PieChart,
        action: () => window.location.href = '/dashboard/investor',
        variant: 'secondary' as const,
      },
      {
        title: 'Transaction History',
        description: 'Track your investment activity',
        icon: Activity,
        action: () => window.location.href = '/transactions',
        variant: 'outline' as const,
      },
    ],
    sections: [
      { title: 'Recent Transactions', component: RecentTransactions, priority: 1 },
      { title: 'Market Insights', component: MarketInsightsSection, priority: 2 },
      { title: 'Portfolio Performance', component: PortfolioPerformance, priority: 3 },
    ],
  }),

  [UserRole.PROPERTY_OWNER]: (data) => ({
    stats: [
      {
        title: 'Listed Properties',
        value: data.stats?.activeProperties || 0,
        subtitle: 'Currently active',
        icon: Building,
        variant: 'gradient' as const,
      },
      {
        title: 'Total Raised',
        value: `$${data.stats?.totalValue?.toLocaleString() || '0'}`,
        icon: DollarSign,
        variant: 'accent' as const,
      },
      {
        title: 'Investors',
        value: data.stats?.totalInvestments || 0,
        subtitle: 'Across all properties',
        icon: Users,
      },
      {
        title: 'Occupancy Rate',
        value: data.stats?.occupancyRate ? `${data.stats.occupancyRate}%` : '--',
        icon: TrendingUp,
      },
    ],
    quickActions: [
      {
        title: 'List New Property',
        description: 'Tokenize your next property',
        icon: Building,
        action: () => window.location.href = '/properties/create',
        variant: 'primary' as const,
      },
      {
        title: 'Manage Properties',
        description: 'View all your listings',
        icon: Settings,
        action: () => window.location.href = '/dashboard/property-owner',
        variant: 'secondary' as const,
      },
      {
        title: 'Analytics',
        description: 'View performance metrics',
        icon: BarChart3,
        action: () => window.location.href = '/analytics',
        variant: 'outline' as const,
      },
    ],
    sections: [
      { title: 'Property Performance', component: PropertyPerformance, priority: 1 },
      { title: 'Investor Activity', component: InvestorActivity, priority: 2 },
      { title: 'Pending Approvals', component: PendingApprovals, priority: 3 },
    ],
  }),

  [UserRole.BROKER]: (data) => ({
    stats: [
      {
        title: 'Total Commissions',
        value: `$${data.stats?.totalReturns?.toLocaleString() || '0'}`,
        subtitle: 'This month',
        icon: DollarSign,
        variant: 'gradient' as const,
      },
      {
        title: 'Active Referrals',
        value: data.stats?.activeProperties || 0,
        icon: Users,
        variant: 'accent' as const,
      },
      {
        title: 'Properties Sold',
        value: data.stats?.totalInvestments || 0,
        subtitle: 'All time',
        icon: Building,
      },
      {
        title: 'Conversion Rate',
        value: data.stats?.conversionRate ? `${data.stats.conversionRate}%` : '--',
        icon: TrendingUp,
      },
    ],
    quickActions: [
      {
        title: 'Refer Client',
        description: 'Add new referral',
        icon: Users,
        action: () => window.location.href = '/referrals/create',
        variant: 'primary' as const,
      },
      {
        title: 'View Commissions',
        description: 'Track your earnings',
        icon: DollarSign,
        action: () => window.location.href = '/dashboard/broker',
        variant: 'secondary' as const,
      },
      {
        title: 'Marketing Tools',
        description: 'Access promotional materials',
        icon: FileText,
        action: () => window.location.href = '/marketing',
        variant: 'outline' as const,
      },
    ],
    sections: [
      { title: 'Commission Tracking', component: CommissionTracking, priority: 1 },
      { title: 'Referral Network', component: ReferralNetwork, priority: 2 },
      { title: 'Performance Analytics', component: BrokerAnalytics, priority: 3 },
    ],
  }),

  [UserRole.ADMIN]: (data) => ({
    stats: [
      {
        title: 'Platform Revenue',
        value: `$${data.stats?.totalValue?.toLocaleString() || '0'}`,
        subtitle: 'This month',
        icon: DollarSign,
        variant: 'gradient' as const,
      },
      {
        title: 'Total Users',
        value: data.stats?.totalInvestments || 0,
        change: '+12%',
        changeType: 'positive' as const,
        icon: Users,
        variant: 'accent' as const,
      },
      {
        title: 'Active Properties',
        value: data.stats?.activeProperties || 0,
        icon: Building,
      },
      {
        title: 'Pending Reviews',
        value: data.stats?.pendingTransactions || 0,
        icon: Calendar,
      },
    ],
    quickActions: [
      {
        title: 'User Management',
        description: 'Manage platform users',
        icon: Users,
        action: () => window.location.href = '/admin/users',
        variant: 'primary' as const,
      },
      {
        title: 'Property Reviews',
        description: 'Review pending properties',
        icon: Building,
        action: () => window.location.href = '/admin/properties',
        variant: 'secondary' as const,
      },
      {
        title: 'Platform Analytics',
        description: 'View detailed analytics',
        icon: BarChart3,
        action: () => window.location.href = '/admin/analytics',
        variant: 'outline' as const,
      },
    ],
    sections: [
      { title: 'Platform Overview', component: PlatformOverview, priority: 1 },
      { title: 'User Activity', component: UserActivity, priority: 2 },
      { title: 'System Health', component: SystemHealth, priority: 3 },
    ],
  }),
};

export const DynamicUserDashboard: React.FC<DynamicUserDashboardProps> = ({
  className,
  onViewChange
}) => {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserType | null>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await AuthService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch dashboard data.
  //
  // For PROPERTY_OWNER we hit the owner-scoped endpoint and map its shape onto
  // the same {activeProperties, totalValue, totalInvestments, monthlyIncome}
  // keys the role-aware roleBasedContent[] entries already read — otherwise
  // the owner sees zeros even though they own properties (investor stats
  // endpoint returns nothing for them).
  const dashboardRole = user?.role;
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', dashboardRole],
    enabled: !!dashboardRole,
    queryFn: async () => {
      if (dashboardRole === UserRole.PROPERTY_OWNER) {
        const ownerStats = await PropertyOwnerService.getOwnerStats();
        return {
          totalInvestments: ownerStats.active_investors,
          totalValue: ownerStats.capital_raised,
          totalReturns: 0,
          activeProperties: ownerStats.total_properties,
          pendingTransactions: 0,
          roi: 0,
          monthlyIncome: ownerStats.monthly_revenue,
          portfolioGrowth: 0,
        } as DashboardStats;
      }
      return DashboardService.getDashboardStats();
    },
    refetchInterval: 30000,
  });

  const { data: marketInsights, isLoading: marketLoading } = useQuery({
    queryKey: ['market-insights'],
    queryFn: DashboardService.getMarketInsights,
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => DashboardService.getRecentTransactions(5),
    refetchInterval: 30000,
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const dashboardData = {
    stats: dashboardStats,
    insights: marketInsights,
    transactions: recentTransactions,
  };

  const content = roleBasedContent[user.role](dashboardData);

  // Override quick actions to use proper in-app navigation instead of window.location.href
  if (user.role === UserRole.INVESTOR && onViewChange) {
    content.quickActions = [
      {
        title: 'Browse Properties',
        description: 'Discover new investment opportunities',
        icon: Building,
        action: () => window.location.href = '/properties',
        variant: 'primary' as const,
      },
      {
        title: 'View Portfolio',
        description: 'See your investments & returns',
        icon: PieChart,
        action: () => onViewChange('portfolio'),
        variant: 'secondary' as const,
      },
      {
        title: 'Transaction History',
        description: 'Track your investment activity',
        icon: Activity,
        action: () => onViewChange('transactions'),
        variant: 'outline' as const,
      },
    ];
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Text variant="h2" weight="bold" className="mb-2">
            Welcome back, {user.first_name}!
          </Text>
          <Text variant="body" color="muted">
            {getRoleGreeting(user.role)}
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="px-3"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => onViewChange?.('notifications')}>
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>

          <Button variant="outline" size="sm" onClick={() => onViewChange?.('settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence>
          {content.stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatsCard
                {...stat}
                animated={true}
                className={statsLoading ? 'animate-pulse' : ''}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <Text variant="h3" weight="semibold" className="mb-4">
          Quick Actions
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {content.quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700"
                onClick={action.action}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    action.variant === 'primary' && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                    action.variant === 'secondary' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                    action.variant === 'outline' && 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  )}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <Text variant="body" weight="semibold" className="mb-1">
                      {action.title}
                    </Text>
                    <Text variant="caption" color="muted">
                      {action.description}
                    </Text>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Dynamic Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {content.sections
          .sort((a, b) => a.priority - b.priority)
          .map((section) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 h-full">
                <Text variant="h3" weight="semibold" className="mb-4">
                  {section.title}
                </Text>
                <section.component 
                  data={dashboardData}
                  loading={statsLoading || marketLoading}
                />
              </Card>
            </motion.div>
          ))}
      </div>
    </div>
  );
};

// Helper function to get role-specific greeting
function getRoleGreeting(role: UserRole): string {
  switch (role) {
    case UserRole.INVESTOR:
      return "Track your investments and discover new opportunities";
    case UserRole.PROPERTY_OWNER:
      return "Manage your properties and connect with investors";
    case UserRole.BROKER:
      return "Track commissions and expand your network";
    case UserRole.ADMIN:
      return "Monitor platform performance and user activity";
    default:
      return "Welcome to your dashboard";
  }
}

// Placeholder components for different sections
const RecentTransactions: React.FC<{ data: any; loading: boolean }> = ({ data, loading }) => (
  <div className="space-y-3">
    {loading ? (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-12 rounded" />
        ))}
      </div>
    ) : (
      (Array.isArray(data.transactions) ? data.transactions : [])?.slice(0, 5).map((transaction: Transaction) => (
        <div key={transaction.id} className="flex items-center justify-between py-2">
          <div>
            <Text variant="body" weight="medium">
              {transaction.description}
            </Text>
            <Text variant="caption" color="muted">
              {new Date(transaction.date || transaction.created_at).toLocaleDateString()}
            </Text>
          </div>
          <Text variant="body" weight="semibold">
            ${transaction.amount.toLocaleString()}
          </Text>
        </div>
      )) || <Text variant="body" color="muted">No recent transactions</Text>
    )}
  </div>
);

const MarketInsightsSection: React.FC<{ data: any; loading: boolean }> = ({ data, loading }) => (
  <div className="space-y-4">
    {loading ? (
      <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded" />
    ) : (
      <>
        <div>
          <Text variant="body" weight="semibold" className="mb-2">
            Trending Properties
          </Text>
          <Text variant="caption" color="muted">
            {data.insights?.trending?.length || 0} properties gaining interest
          </Text>
        </div>
        <div>
          <Text variant="body" weight="semibold" className="mb-2">
            Market Performance
          </Text>
          <Text variant="caption" color="muted">
            Average ROI: 8.5% • Market Cap: $12.4M
          </Text>
        </div>
      </>
    )}
  </div>
);

const PortfolioPerformance: React.FC<{ data: any; loading: boolean }> = ({ data, loading }) => (
  <div className="space-y-4">
    {loading ? (
      <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded" />
    ) : (
      <>
        <div className="flex justify-between items-center">
          <Text variant="body" weight="semibold">
            Total Return
          </Text>
          <Text variant="body" weight="semibold" className="text-emerald-600">
            +{data.stats?.roi || 0}%
          </Text>
        </div>
        <div className="flex justify-between items-center">
          <Text variant="body" weight="semibold">
            Monthly Income
          </Text>
          <Text variant="body" weight="semibold">
            ${data.stats?.monthlyIncome?.toLocaleString() || '0'}
          </Text>
        </div>
      </>
    )}
  </div>
);

// Additional placeholder components
const PropertyPerformance: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'Property performance content'}</div>
);

const InvestorActivity: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'Investor activity content'}</div>
);

const PendingApprovals: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'Pending approvals content'}</div>
);

const CommissionTracking: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'Commission tracking content'}</div>
);

const ReferralNetwork: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'Referral network content'}</div>
);

const BrokerAnalytics: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'Broker analytics content'}</div>
);

const PlatformOverview: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'Platform overview content'}</div>
);

const UserActivity: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'User activity content'}</div>
);

const SystemHealth: React.FC<{ data: any; loading: boolean }> = ({ loading }) => (
  <div>{loading ? 'Loading...' : 'System health content'}</div>
);