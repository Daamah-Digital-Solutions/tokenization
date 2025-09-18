import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Bell,
  Download,
  Search,
  Filter,
  Settings,
  AlertTriangle,
  Plus,
  Minus,
  RefreshCw,
  FileText,
  Users,
  Calendar,
  Target,
  Activity,
  Wallet,
  Eye,
  EyeOff,
  User,
  Shield,
  Building,
  Briefcase,
  Check
} from 'lucide-react';

import { DashboardService } from '../../../services/dashboard/DashboardService';
import { type Portfolio, type PropertyAnalytics, type AnalyticsData, UserRole } from '../../../services/api/types';
import { StatsCard, Card } from '../../design-system';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
import { PortfolioManager } from './PortfolioManager';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { TransactionManager } from './TransactionManager';
import { CollaborativeInvestments } from './CollaborativeInvestments';
import { useUser } from '../../../contexts/AuthContext';
import { apiClient } from '../../../services/api/ApiClient';
import { cn } from '../../../utils/cn';

interface InvestorControlPanelProps {
  className?: string;
  currentView?: string;
}

type TabType = 'overview' | 'marketplace' | 'transactions' | 'wallet' | 'settings';

interface PriceAlert {
  id: string;
  propertyId: string;
  propertyName: string;
  currentPrice: number;
  targetPrice: number;
  isAbove: boolean;
  createdAt: Date;
}

export const InvestorControlPanel: React.FC<InvestorControlPanelProps> = ({
  className,
  currentView
}) => {
  // Map dashboard sidebar views to internal tabs
  const mapViewToTab = (view: string): TabType => {
    switch (view) {
      case 'marketplace':
        return 'marketplace';
      case 'transactions':
        return 'transactions';
      case 'wallet':
        return 'wallet';
      case 'settings':
        return 'settings';
      default:
        return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>(
    currentView ? mapViewToTab(currentView) : 'overview'
  );

  // Update active tab when currentView changes
  useEffect(() => {
    if (currentView) {
      setActiveTab(mapViewToTab(currentView));
    }
  }, [currentView]);
  const [showBalances, setShowBalances] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const queryClient = useQueryClient();

  // Fetch portfolio data
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = useQuery({
    queryKey: ['investor-portfolio'],
    queryFn: DashboardService.getPortfolio,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch market insights
  const { data: marketInsights, isLoading: marketLoading } = useQuery({
    queryKey: ['market-insights'],
    queryFn: DashboardService.getMarketInsights,
    refetchInterval: 60000,
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-data', 'month'],
    queryFn: () => DashboardService.getAnalyticsData('month'),
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Refresh all data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['investor-portfolio'] });
    queryClient.invalidateQueries({ queryKey: ['market-insights'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-data'] });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'marketplace', label: 'Marketplace', icon: Search },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const formatCurrency = (amount: number | undefined | null) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return showBalances ? '$0' : '$****';
    }
    return showBalances ? `$${amount.toLocaleString()}` : '$****';
  };

  const formatPercentage = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return showBalances ? '0.00%' : '**%';
    }
    const formatted = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    return showBalances ? formatted : '**%';
  };

  if (portfolioError) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <Text variant="h3" weight="semibold" className="mb-2">
            Failed to Load Portfolio
          </Text>
          <Text variant="body" color="muted" className="mb-4">
            We're having trouble loading your investment data. Please try again.
          </Text>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>



      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <OverviewContent
            portfolio={portfolio}
            marketInsights={marketInsights}
            loading={portfolioLoading || marketLoading}
            showBalances={showBalances}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceContent />
        )}

        {activeTab === 'transactions' && (
          <TransactionManager />
        )}

        {activeTab === 'wallet' && (
          <WalletContent portfolio={portfolio} loading={portfolioLoading} />
        )}

        {activeTab === 'settings' && (
          <SettingsContent />
        )}
      </motion.div>
    </div>
  );
};

// Overview Content Component
const OverviewContent: React.FC<{
  portfolio: Portfolio | undefined;
  marketInsights: any;
  loading: boolean;
  showBalances: boolean;
  formatCurrency: (amount: number | undefined | null) => string;
  formatPercentage: (value: number | undefined | null) => string;
  setActiveTab: (tab: TabType) => void;
}> = ({ portfolio, marketInsights, loading, showBalances, formatCurrency, formatPercentage, setActiveTab }) => (
  <div className="space-y-6">
    {/* Portfolio Summary Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <AnimatePresence>
        <motion.div
          key="portfolio-value"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <StatsCard
            title="Total Portfolio Value"
            value={formatCurrency(portfolio?.current_value || 0)}
            change={formatPercentage(portfolio?.return_percentage || 0)}
            changeType={
              (portfolio?.return_percentage || 0) >= 0 ? 'positive' : 'negative'
            }
            icon={DollarSign}
            variant="gradient"
            animated={true}
            className={loading ? 'animate-pulse' : ''}
          />
        </motion.div>

        <motion.div
          key="monthly-income"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatsCard
            title="Monthly Income"
            value={formatCurrency(portfolio?.monthly_dividends || 0)}
            subtitle="From dividends"
            icon={TrendingUp}
            variant="accent"
            animated={true}
            className={loading ? 'animate-pulse' : ''}
          />
        </motion.div>

        <motion.div
          key="active-properties"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatsCard
            title="Active Properties"
            value={portfolio?.properties_count || 0}
            subtitle="In portfolio"
            icon={PieChart}
            animated={true}
            className={loading ? 'animate-pulse' : ''}
          />
        </motion.div>

        <motion.div
          key="total-invested"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatsCard
            title="Total Invested"
            value={formatCurrency(portfolio?.total_invested || 0)}
            subtitle="Principal amount"
            icon={Wallet}
            animated={true}
            className={loading ? 'animate-pulse' : ''}
          />
        </motion.div>
      </AnimatePresence>
    </div>

    {/* Quick Actions & Alerts */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Actions */}
      <Card className="p-6">
        <Text variant="h3" weight="semibold" className="mb-4">
          Quick Actions
        </Text>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('marketplace')}
          >
            <Search className="w-4 h-4 mr-3" />
            Browse Properties
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('wallet')}
          >
            <Wallet className="w-4 h-4 mr-3" />
            Manage Wallet
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('transactions')}
          >
            <Activity className="w-4 h-4 mr-3" />
            Transaction History
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4 mr-3" />
            Account Settings
          </Button>
        </div>
      </Card>

      {/* Price Alerts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Text variant="h3" weight="semibold">
            Price Alerts
          </Text>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {marketInsights?.priceAlerts?.slice(0, 3).map((alert) => (
            <div key={alert.propertyId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex-1">
                <Text variant="body" weight="medium" className="truncate">
                  {alert.propertyName}
                </Text>
                <Text variant="caption" color="muted">
                  {alert.change > 0 ? '+' : ''}{alert.change}%
                </Text>
              </div>
              <div className="text-right">
                <Text variant="body" weight="semibold">
                  ${alert.currentPrice.toLocaleString()}
                </Text>
                <div className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  alert.change > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                )}>
                  {alert.change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  Alert
                </div>
              </div>
            </div>
          )) || (
            <Text variant="body" color="muted" className="text-center py-4">
              No active price alerts
            </Text>
          )}
        </div>
      </Card>

      {/* Market Insights */}
      <Card className="p-6">
        <Text variant="h3" weight="semibold" className="mb-4">
          Market Insights
        </Text>
        <div className="space-y-4">
          <div>
            <Text variant="body" weight="semibold" className="mb-2">
              Trending Properties
            </Text>
            <Text variant="caption" color="muted">
              {marketInsights?.trending?.length || 0} properties gaining interest
            </Text>
          </div>
          <div>
            <Text variant="body" weight="semibold" className="mb-2">
              High Yield Opportunities
            </Text>
            <Text variant="caption" color="muted">
              {marketInsights?.highYield?.length || 0} properties with 10%+ ROI
            </Text>
          </div>
          <div>
            <Text variant="body" weight="semibold" className="mb-2">
              New Listings
            </Text>
            <Text variant="caption" color="muted">
              {marketInsights?.newListings?.length || 0} new properties this week
            </Text>
          </div>
        </div>
      </Card>
    </div>

    {/* Portfolio Allocation and Performance */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Text variant="h3" weight="semibold" className="mb-4">
          Portfolio Allocation
        </Text>
        {loading ? (
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded" />
        ) : (
          <div className="space-y-4">
            {portfolio?.asset_allocation?.map((allocation) => (
              <div key={allocation.property_type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Text variant="body" weight="medium">
                    {allocation.property_type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text variant="body" weight="semibold">
                    {allocation.percentage.toFixed(1)}%
                  </Text>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${allocation.percentage}%` }}
                  />
                </div>
              </div>
            )) || (
              <Text variant="body" color="muted" className="text-center py-8">
                No portfolio allocation data available
              </Text>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <Text variant="h3" weight="semibold" className="mb-4">
          Recent Performance
        </Text>
        {loading ? (
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded" />
        ) : (
          <div className="space-y-4">
            {portfolio?.performance_data?.slice(-7).map((point, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <Text variant="body" color="muted">
                  {new Date(point.date).toLocaleDateString()}
                </Text>
                <div className="text-right">
                  <Text variant="body" weight="semibold">
                    ${point.value.toLocaleString()}
                  </Text>
                  <Text
                    variant="caption"
                    className={cn(
                      point.return_percentage >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    )}
                  >
                    {point.return_percentage >= 0 ? '+' : ''}{point.return_percentage.toFixed(2)}%
                  </Text>
                </div>
              </div>
            )) || (
              <Text variant="body" color="muted" className="text-center py-8">
                No performance data available
              </Text>
            )}
          </div>
        )}
      </Card>
    </div>
  </div>
);




// Marketplace Content Component
const MarketplaceContent: React.FC = () => (
  <div className="space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <Text variant="h3" weight="semibold" className="mb-2">
          Property Marketplace
        </Text>
        <Text variant="body" color="muted">
          Discover and invest in tokenized real estate properties
        </Text>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
    </div>

    {/* Market Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatsCard
        title="Available Properties"
        value="47"
        subtitle="Ready for investment"
        icon={Target}
        variant="default"
      />
      <StatsCard
        title="Total Market Value"
        value="$12.4M"
        subtitle="Combined property value"
        icon={DollarSign}
        variant="default"
      />
      <StatsCard
        title="Average ROI"
        value="8.2%"
        subtitle="Expected annual return"
        icon={TrendingUp}
        variant="default"
      />
      <StatsCard
        title="Min. Investment"
        value="$500"
        subtitle="Lowest entry point"
        icon={Wallet}
        variant="default"
      />
    </div>

    {/* Property Listings */}
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Mock property data - replace with real API data */}
      {[
        {
          id: '1',
          title: 'Downtown Office Complex',
          location: 'New York, NY',
          price: 850000,
          tokenPrice: 100,
          totalTokens: 8500,
          availableTokens: 3200,
          roi: 9.5,
          image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400'
        },
        {
          id: '2',
          title: 'Luxury Apartment Building',
          location: 'Los Angeles, CA',
          price: 1200000,
          tokenPrice: 150,
          totalTokens: 8000,
          availableTokens: 5400,
          roi: 7.8,
          image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400'
        },
        {
          id: '3',
          title: 'Shopping Center',
          location: 'Miami, FL',
          price: 2300000,
          tokenPrice: 200,
          totalTokens: 11500,
          availableTokens: 8900,
          roi: 11.2,
          image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'
        }
      ].map((property) => (
        <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <Text variant="body" weight="semibold">
                {property.title}
              </Text>
              <Text variant="caption">
                {property.location}
              </Text>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Text variant="caption" color="muted">Property Value</Text>
                <Text variant="body" weight="semibold">
                  ${property.price.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text variant="caption" color="muted">Token Price</Text>
                <Text variant="body" weight="semibold">
                  ${property.tokenPrice}
                </Text>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <Text variant="caption" color="muted">Available Tokens</Text>
                <Text variant="caption" weight="semibold">
                  {property.availableTokens.toLocaleString()} / {property.totalTokens.toLocaleString()}
                </Text>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(property.availableTokens / property.totalTokens) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Text variant="caption" color="muted">Expected ROI</Text>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {property.roi}%
                </div>
              </div>
            </div>

            <Button className="w-full">
              Invest Now
            </Button>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// Wallet Content Component
const WalletContent: React.FC<{
  portfolio: Portfolio | undefined;
  loading: boolean;
}> = ({ portfolio, loading }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <Text variant="h3" weight="semibold" className="mb-2">
          Wallet & Payments
        </Text>
        <Text variant="body" color="muted">
          Manage your balance and payment methods
        </Text>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Funds
        </Button>
        <Button variant="outline" size="sm">
          <Minus className="w-4 h-4 mr-2" />
          Withdraw
        </Button>
      </div>
    </div>

    {/* Wallet Balance Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatsCard
        title="Available Balance"
        value={loading ? '$0' : '$12,450'}
        subtitle="Ready for investment"
        icon={DollarSign}
        variant="gradient"
      />
      <StatsCard
        title="Pending Transactions"
        value={loading ? '$0' : '$2,100'}
        subtitle="Processing payments"
        icon={RefreshCw}
        variant="accent"
      />
      <StatsCard
        title="Total Deposits"
        value={loading ? '$0' : '$45,280'}
        subtitle="Lifetime deposits"
        icon={TrendingUp}
        variant="default"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Payment Methods */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <Text variant="body" weight="semibold">
            Payment Methods
          </Text>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Mock payment methods */}
          {[
            { id: '1', type: 'Credit Card', last4: '4242', brand: 'Visa', default: true },
            { id: '2', type: 'Bank Account', last4: '8965', brand: 'Chase', default: false },
            { id: '3', type: 'Crypto Wallet', last4: 'a7f3', brand: 'MetaMask', default: false }
          ].map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <Text variant="body" weight="medium">
                    {method.brand} •••• {method.last4}
                  </Text>
                  <Text variant="caption" color="muted">
                    {method.type}
                  </Text>
                </div>
              </div>
              {method.default && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Default
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <Text variant="body" weight="semibold" className="mb-4">
          Recent Transactions
        </Text>

        <div className="space-y-4">
          {/* Mock transactions */}
          {[
            { id: '1', type: 'Deposit', amount: 5000, status: 'completed', date: '2024-01-15' },
            { id: '2', type: 'Investment', amount: -2500, status: 'completed', date: '2024-01-14' },
            { id: '3', type: 'Dividend', amount: 125, status: 'completed', date: '2024-01-10' },
            { id: '4', type: 'Deposit', amount: 1000, status: 'pending', date: '2024-01-09' }
          ].map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  transaction.amount > 0
                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                )}>
                  {transaction.amount > 0 ? (
                    <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <Text variant="body" weight="medium">
                    {transaction.type}
                  </Text>
                  <Text variant="caption" color="muted">
                    {new Date(transaction.date).toLocaleDateString()}
                  </Text>
                </div>
              </div>
              <div className="text-right">
                <Text variant="body" weight="semibold" className={cn(
                  transaction.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                </Text>
                <Text variant="caption" className={cn(
                  transaction.status === 'completed' ? 'text-emerald-600' : 'text-orange-600'
                )}>
                  {transaction.status.toUpperCase()}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

// Settings Content Component with Role Management Integration
const SettingsContent: React.FC = () => {
  const user = useUser();
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      setIsLoadingRoles(true);
      const response = await apiClient.get<any>('/auth/roles/');
      setUserRoles(response.roles || []);
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const ROLE_INFO = {
    [UserRole.INVESTOR]: {
      label: 'Investor',
      description: 'Invest in tokenized real estate properties',
      icon: Briefcase,
      color: 'emerald'
    },
    [UserRole.PROPERTY_OWNER]: {
      label: 'Property Owner',
      description: 'List properties for tokenization',
      icon: Building,
      color: 'blue'
    },
    [UserRole.ADMIN]: {
      label: 'Administrator',
      description: 'Platform administration access',
      icon: Shield,
      color: 'purple'
    }
  };

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'roles', label: 'Role Management', icon: Users },
    { id: 'account', label: 'Account', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      <div>
        <Text variant="h2" weight="bold" className="mb-2">
          Account Settings
        </Text>
        <Text variant="body" color="muted">
          Manage your account preferences, security, and role settings
        </Text>
      </div>

      {/* Settings Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8" aria-label="Settings Tabs">
          {settingsTabs.map((tab) => {
            const isActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                )}
              >
                <tab.icon
                  className={cn(
                    'mr-2 w-5 h-5',
                    isActive
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-slate-400 group-hover:text-slate-500'
                  )}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content */}
      <motion.div
        key={activeSettingsTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        {activeSettingsTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Profile Information
              </Text>
              <div className="space-y-4">
                <div>
                  <Text variant="caption" color="muted" className="mb-1">Full Name</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Text variant="body">{user ? `${user.first_name} ${user.last_name}` : 'John Doe'}</Text>
                  </div>
                </div>
                <div>
                  <Text variant="caption" color="muted" className="mb-1">Email Address</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Text variant="body">{user?.email || 'john.doe@example.com'}</Text>
                  </div>
                </div>
                <div>
                  <Text variant="caption" color="muted" className="mb-1">Phone Number</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Text variant="body">+1 (555) 123-4567</Text>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </div>
            </Card>

            {/* KYC Status */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                KYC Verification Status
              </Text>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <Text variant="body" weight="medium">Identity Verified</Text>
                      <Text variant="caption" color="muted">Document verification complete</Text>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Text variant="caption" color="muted">Verification Level: <span className="font-medium text-emerald-600">Level 2</span></Text>
                  <Text variant="caption" color="muted">Verified on: {new Date().toLocaleDateString()}</Text>
                  <Button variant="outline" size="sm" className="w-full">
                    View Verification Details
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeSettingsTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Settings */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Security & Privacy
              </Text>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">Two-Factor Authentication</Text>
                    <Text variant="caption" color="muted">Add an extra layer of security</Text>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">Change Password</Text>
                    <Text variant="caption" color="muted">Update your login credentials</Text>
                  </div>
                  <Button variant="outline" size="sm">Change</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">Login Sessions</Text>
                    <Text variant="caption" color="muted">Manage active sessions</Text>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
            </Card>

            {/* Privacy Settings */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Privacy Settings
              </Text>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Text variant="body">Profile visibility</Text>
                  <Button variant="outline" size="sm">Private</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="body">Investment activity</Text>
                  <Button variant="outline" size="sm">Hidden</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="body">Contact preferences</Text>
                  <Button variant="outline" size="sm">Limited</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeSettingsTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Notifications */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Email Notifications
              </Text>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Text variant="body">Investment updates</Text>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="body">Dividend notifications</Text>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="body">Market alerts</Text>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="body">Security alerts</Text>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
              </div>
            </Card>

            {/* Push Notifications */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Push Notifications
              </Text>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Text variant="body">Price alerts</Text>
                  <Button variant="outline" size="sm">Disabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="body">Transaction confirmations</Text>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="body">New property listings</Text>
                  <Button variant="outline" size="sm">Disabled</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeSettingsTab === 'roles' && (
          <div className="space-y-6">
            <Text variant="h3" weight="semibold">
              Role Management
            </Text>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Roles */}
              <Card className="p-6">
                <Text variant="body" weight="semibold" className="mb-4">
                  Your Current Roles
                </Text>
                {isLoadingRoles ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userRoles.map((roleData) => {
                      const roleInfo = ROLE_INFO[roleData.role as UserRole];
                      if (!roleInfo) return null;

                      const RoleIcon = roleInfo.icon;

                      return (
                        <div
                          key={roleData.role}
                          className={cn(
                            'p-4 rounded-lg border-2 transition-all duration-200',
                            roleData.is_primary
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'p-2 rounded-full',
                                `bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-900/30`
                              )}>
                                <RoleIcon className={cn(
                                  'w-5 h-5',
                                  `text-${roleInfo.color}-600 dark:text-${roleInfo.color}-400`
                                )} />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Text variant="body" weight="medium">
                                    {roleInfo.label}
                                  </Text>
                                  {roleData.is_primary && (
                                    <span className="text-xs px-2 py-0.5 bg-emerald-500 text-white rounded-full">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <Text variant="caption" color="muted">
                                  {roleInfo.description}
                                </Text>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Role Information */}
              <Card className="p-6">
                <Text variant="body" weight="semibold" className="mb-4">
                  About Roles
                </Text>
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    Roles determine what you can do on the platform. You can have multiple roles
                    and switch between them as needed.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">Primary Role:</strong> Your
                        default dashboard view
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">Role Switching:</strong> Change
                        active role from dashboard anytime
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    Manage Roles
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeSettingsTab === 'account' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Actions */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Account Actions
              </Text>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-3" />
                  Export Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-3" />
                  Download Tax Documents
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-3" />
                  Download Investment Reports
                </Button>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-red-200 dark:border-red-800">
              <Text variant="body" weight="semibold" className="mb-4 text-red-600">
                Danger Zone
              </Text>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                  <AlertTriangle className="w-4 h-4 mr-3" />
                  Suspend Account
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                  <AlertTriangle className="w-4 h-4 mr-3" />
                  Deactivate Account
                </Button>
              </div>
              <Text variant="caption" color="muted" className="mt-3">
                These actions are permanent and cannot be undone. Please contact support if you need assistance.
              </Text>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
};