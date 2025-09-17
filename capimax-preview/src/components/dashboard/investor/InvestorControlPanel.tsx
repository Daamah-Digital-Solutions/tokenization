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
  EyeOff
} from 'lucide-react';

import { DashboardService } from '../../../services/dashboard/DashboardService';
import { type Portfolio, type PropertyAnalytics, type AnalyticsData } from '../../../services/api/types';
import { StatsCard, Card } from '../../design-system';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
import { PortfolioManager } from './PortfolioManager';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { TransactionManager } from './TransactionManager';
import { CollaborativeInvestments } from './CollaborativeInvestments';
import { cn } from '../../../utils/cn';

interface InvestorControlPanelProps {
  className?: string;
  currentView?: string;
}

type TabType = 'overview' | 'portfolio' | 'investments' | 'analytics' | 'transactions' | 'income' | 'collaborative' | 'documents' | 'alerts';

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
      case 'portfolio':
        return 'portfolio';
      case 'investments':
        return 'investments'; // Dedicated investments view
      case 'transactions':
        return 'transactions';
      case 'income':
        return 'income'; // Dedicated income view
      case 'analytics':
        return 'analytics';
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
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'collaborative', label: 'Group Investments', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'alerts', label: 'Alerts', icon: Bell },
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Text variant="h2" weight="bold" className="mb-2">
            Investment Control Panel
          </Text>
          <Text variant="body" color="muted">
            Manage your real estate investments and track performance
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="ml-2">{showBalances ? 'Hide' : 'Show'} Balances</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={portfolioLoading}
          >
            <RefreshCw className={cn('w-4 h-4', portfolioLoading && 'animate-spin')} />
            <span className="ml-2">Refresh</span>
          </Button>

          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Investment
          </Button>
        </div>
      </div>

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
              className={portfolioLoading ? 'animate-pulse' : ''}
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
              className={portfolioLoading ? 'animate-pulse' : ''}
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
              className={portfolioLoading ? 'animate-pulse' : ''}
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
              className={portfolioLoading ? 'animate-pulse' : ''}
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
              onClick={() => setActiveTab('portfolio')}
            >
              <PieChart className="w-4 h-4 mr-3" />
              Manage Portfolio
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              View Analytics
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
              onClick={() => setActiveTab('collaborative')}
            >
              <Users className="w-4 h-4 mr-3" />
              Join Group Investment
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

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
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
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioManager
            portfolio={portfolio}
            loading={portfolioLoading}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentsContent
            portfolio={portfolio}
            loading={portfolioLoading}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            analyticsData={analyticsData}
            portfolio={portfolio}
            loading={analyticsLoading || portfolioLoading}
          />
        )}

        {activeTab === 'income' && (
          <IncomeContent
            portfolio={portfolio}
            loading={portfolioLoading}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionManager />
        )}

        {activeTab === 'collaborative' && (
          <CollaborativeInvestments />
        )}

        {activeTab === 'documents' && (
          <DocumentsContent portfolio={portfolio} loading={portfolioLoading} />
        )}

        {activeTab === 'alerts' && (
          <AlertsContent />
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
}> = ({ portfolio, marketInsights, loading }) => (
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
);

// Documents Content Component
const DocumentsContent: React.FC<{
  portfolio: Portfolio | undefined;
  loading: boolean;
}> = ({ portfolio, loading }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Text variant="h3" weight="semibold">
        Investment Documents
      </Text>
      <Button variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Download All
      </Button>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-24 rounded" />
          </Card>
        ))
      ) : (
        portfolio?.investments?.map((investment) => (
          <Card key={investment.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <FileText className="w-8 h-8 text-emerald-600" />
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <Text variant="body" weight="semibold" className="mb-2">
              Investment #{investment.id.slice(0, 8)}
            </Text>
            <Text variant="caption" color="muted">
              Tax documents, contracts, and receipts
            </Text>
          </Card>
        )) || (
          <div className="col-span-full">
            <Text variant="body" color="muted" className="text-center py-8">
              No documents available
            </Text>
          </div>
        )
      )}
    </div>
  </div>
);

// Alerts Content Component
const AlertsContent: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Text variant="h3" weight="semibold">
        Price Alerts & Notifications
      </Text>
      <Button variant="primary" size="sm">
        <Plus className="w-4 h-4 mr-2" />
        New Alert
      </Button>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Text variant="body" weight="semibold" className="mb-4">
          Active Price Alerts
        </Text>
        <Text variant="body" color="muted" className="text-center py-8">
          No active price alerts. Set up alerts to get notified when property prices change.
        </Text>
      </Card>
      
      <Card className="p-6">
        <Text variant="body" weight="semibold" className="mb-4">
          Notification Settings
        </Text>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Text variant="body">Price alerts</Text>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
          <div className="flex items-center justify-between">
            <Text variant="body">Dividend notifications</Text>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
          <div className="flex items-center justify-between">
            <Text variant="body">Market updates</Text>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

// Investments Content Component
const InvestmentsContent: React.FC<{
  portfolio: Portfolio | undefined;
  loading: boolean;
}> = ({ portfolio, loading }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Text variant="h3" weight="semibold">
        Investment History
      </Text>
      <Button variant="primary" size="sm">
        <Plus className="w-4 h-4 mr-2" />
        New Investment
      </Button>
    </div>

    <div className="grid grid-cols-1 gap-4">
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-20 rounded" />
          </Card>
        ))
      ) : (
        portfolio?.investments?.map((investment) => (
          <Card key={investment.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Text variant="body" weight="semibold" className="mb-2">
                  {investment.property?.title || `Investment #${investment.id.slice(0, 8)}`}
                </Text>
                <Text variant="caption" color="muted">
                  {investment.token_amount} tokens • ${investment.investment_amount.toLocaleString()}
                </Text>
              </div>
              <div className="text-right">
                <Text variant="body" weight="semibold" className={cn(
                  investment.status === 'active' ? 'text-emerald-600' :
                  investment.status === 'pending' ? 'text-orange-600' :
                  'text-slate-600'
                )}>
                  {investment.status.toUpperCase()}
                </Text>
                <Text variant="caption" color="muted">
                  {new Date(investment.created_at).toLocaleDateString()}
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <Text variant="caption" color="muted">Current Value</Text>
                <Text variant="body" weight="semibold">
                  ${(investment.investment_amount * 1.15).toLocaleString()}
                </Text>
              </div>
              <div>
                <Text variant="caption" color="muted">Return</Text>
                <Text variant="body" weight="semibold" className="text-emerald-600">
                  +15.2%
                </Text>
              </div>
            </div>
          </Card>
        )) || (
          <Card className="p-8 text-center">
            <Text variant="body" color="muted">
              No investments found. Start investing to see your portfolio here.
            </Text>
          </Card>
        )
      )}
    </div>
  </div>
);

// Income Content Component
const IncomeContent: React.FC<{
  portfolio: Portfolio | undefined;
  loading: boolean;
}> = ({ portfolio, loading }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Text variant="h3" weight="semibold">
        Income & Dividends
      </Text>
      <Button variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Export Report
      </Button>
    </div>

    {/* Income Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatsCard
        title="Monthly Income"
        value={loading ? '$0' : `$${portfolio?.monthly_dividends?.toLocaleString() || '0'}`}
        subtitle="Average monthly dividends"
        icon={DollarSign}
        variant="default"
      />
      <StatsCard
        title="This Year"
        value={loading ? '$0' : `$${(portfolio?.monthly_dividends * 12 * 0.8)?.toLocaleString() || '0'}`}
        subtitle="Total dividends received"
        icon={Calendar}
        variant="default"
      />
      <StatsCard
        title="Dividend Yield"
        value={loading ? '0%' : `${((portfolio?.monthly_dividends * 12 / portfolio?.total_invested) * 100)?.toFixed(1) || '0'}%`}
        subtitle="Annual yield rate"
        icon={TrendingUp}
        variant="default"
      />
    </div>

    {/* Recent Dividend Payments */}
    <Card className="p-6">
      <Text variant="body" weight="semibold" className="mb-4">
        Recent Dividend Payments
      </Text>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-16 rounded" />
          ))
        ) : (
          // Mock dividend data - replace with real API data
          [
            { id: '1', property: 'Downtown Plaza', amount: 125.50, date: '2024-01-15', status: 'paid' },
            { id: '2', property: 'Sunset Apartments', amount: 89.75, date: '2024-01-15', status: 'paid' },
            { id: '3', property: 'Tech Park Office', amount: 234.20, date: '2024-01-15', status: 'paid' },
            { id: '4', property: 'Riverside Mall', amount: 156.80, date: '2024-01-15', status: 'pending' },
            { id: '5', property: 'Green Valley Resort', amount: 198.40, date: '2024-01-15', status: 'pending' }
          ].map((dividend) => (
            <div key={dividend.id} className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
              <div>
                <Text variant="body" weight="medium">
                  {dividend.property}
                </Text>
                <Text variant="caption" color="muted">
                  {new Date(dividend.date).toLocaleDateString()}
                </Text>
              </div>
              <div className="text-right">
                <Text variant="body" weight="semibold">
                  ${dividend.amount.toFixed(2)}
                </Text>
                <Text variant="caption" className={cn(
                  dividend.status === 'paid' ? 'text-emerald-600' : 'text-orange-600'
                )}>
                  {dividend.status.toUpperCase()}
                </Text>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  </div>
);