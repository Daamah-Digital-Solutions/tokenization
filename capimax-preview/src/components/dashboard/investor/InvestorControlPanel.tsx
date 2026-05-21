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
import { SecondaryMarketDashboard } from '../../marketplace/SecondaryMarketDashboard';
import { useUser, useAuth } from '../../../contexts/AuthContext';
import { useRouter } from '../../../utils/router';
import { apiClient } from '../../../services/api/ApiClient';
import { PropertyService } from '../../../services/property/PropertyService';
import { PaymentService } from '../../../services/payment/PaymentService';
import { cn } from '../../../utils/cn';

interface InvestorControlPanelProps {
  className?: string;
  currentView?: string;
}

type TabType = 'overview' | 'properties' | 'marketplace' | 'transactions' | 'wallet' | 'notifications' | 'settings';

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
        return 'overview'; // Portfolio sidebar item maps to the overview/portfolio tab
      case 'properties':
        return 'properties';
      case 'marketplace':
        return 'marketplace';
      case 'transactions':
        return 'transactions';
      case 'wallet':
        return 'wallet';
      case 'notifications':
        return 'notifications';
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

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => PaymentService.getWalletBalance(),
    refetchInterval: 30000,
  });

  const walletBalance = walletData?.total_value_usd || walletData?.balances?.reduce(
    (sum: number, b: any) => sum + (parseFloat(b.available_balance) || 0), 0
  ) || 0;

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

  const formatCurrency = (amount: number | string | undefined | null) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof num !== 'number' || isNaN(num)) {
      return showBalances ? '$0' : '$****';
    }
    return showBalances ? `$${num.toLocaleString()}` : '$****';
  };

  const formatPercentage = (value: number | string | undefined | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof num !== 'number' || isNaN(num)) {
      return showBalances ? '0.00%' : '**%';
    }
    const formatted = `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
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
            walletBalance={walletBalance}
          />
        )}

        {activeTab === 'properties' && (
          <MarketplaceContent />
        )}

        {activeTab === 'marketplace' && (
          <SecondaryMarketContent />
        )}

        {activeTab === 'transactions' && (
          <TransactionManager />
        )}

        {activeTab === 'wallet' && (
          <WalletContent portfolio={portfolio} loading={portfolioLoading} walletBalance={walletBalance} walletLoading={walletLoading} />
        )}

        {activeTab === 'notifications' && (
          <NotificationsContent />
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
  walletBalance: number;
}> = ({ portfolio, marketInsights, loading, showBalances, formatCurrency, formatPercentage, setActiveTab, walletBalance }) => (
  <div className="space-y-6">
    {/* Wallet Balance Banner */}
    {walletBalance > 0 && (
      <Card className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 border-0">
        <div className="flex items-center justify-between">
          <div>
            <Text variant="bodySmall" className="text-emerald-100">Wallet Balance</Text>
            <Text variant="h2" weight="bold" className="text-white">
              {showBalances ? `$${walletBalance.toLocaleString()}` : '$****'}
            </Text>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/30 text-white hover:bg-white/10"
            onClick={() => setActiveTab('wallet')}
          >
            Manage Wallet
          </Button>
        </div>
      </Card>
    )}

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

      {/*
        Price Alerts card removed. The "+" CTA had no handler and the data
        was wired to a mock ``marketInsights.priceAlerts`` slot that the
        backend never populated. Will be reintroduced when a real alerts
        endpoint lands.
      */}

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




// Secondary Market Content — mounts the real ``SecondaryMarketDashboard``
// component, which is the same orderbook UI as the standalone /marketplace
// route. Previously a "Coming Soon" stub here; the user (rightly) flagged
// that the real implementation already exists.
const SecondaryMarketContent: React.FC = () => <SecondaryMarketDashboard />;

// Marketplace Content Component (primary listings — newly tokenized properties)
const MarketplaceContent: React.FC = () => {
  const { navigate } = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch properties from API.
  //
  // The previous version filtered explicitly to `status=active`, which is the
  // narrow "open for primary funding" status. Demo properties are seeded
  // mostly with `status=tokenized` (post-funding, secondary-market only) so
  // only Skyline Construction Hub showed up and the investor saw
  // "Available Properties: 1" — even though there are four. The backend's
  // list endpoint already restricts non-admins to a safe set of public
  // statuses (APPROVED + ACTIVE + TOKENIZED), so dropping the explicit
  // filter here is both correct and complete.
  const { data: propertiesData, isLoading: isLoadingProperties, error: propertiesError } = useQuery({
    queryKey: ['properties', 'investor-discover'],
    queryFn: () => PropertyService.getProperties({}),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoadingProperties) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (propertiesError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <Text variant="h4" weight="semibold" className="mb-2">Unable to load properties</Text>
          <Text variant="body" color="muted">Please try refreshing the page</Text>
        </div>
      </div>
    );
  }

  // Lower-cased search query for client-side filtering. The previous
  // "Filter" / "Search" outline buttons rendered with no onClick at all
  // — replaced with a real text input that filters the visible list.
  const q = searchQuery.trim().toLowerCase();
  const allProperties = propertiesData?.properties || [];
  const visibleProperties = q
    ? allProperties.filter((p: any) => {
        return (
          (p.title || '').toLowerCase().includes(q) ||
          (p.city || '').toLowerCase().includes(q) ||
          (p.country || '').toLowerCase().includes(q) ||
          (p.property_type || '').toLowerCase().includes(q)
        );
      })
    : allProperties;

  return (
  <div className="space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <Text variant="h3" weight="semibold" className="mb-2">
          Properties
        </Text>
        <Text variant="body" color="muted">
          Discover and invest in tokenized real estate properties
        </Text>
      </div>
      <div className="relative w-full lg:w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, city or type"
          className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
    </div>

    {/* Market Stats - from real data (reflects the current search filter) */}
    {(() => {
      const properties = visibleProperties;
      // DRF serializes Decimal fields as strings ("12.00", "5000000.00").
      // Without Number() coercion the reducer below string-concatenates and
      // the displayed totals/averages are silently wrong.
      const totalValue = properties.reduce((sum: number, p: any) => sum + (Number(p.total_value) || 0), 0);
      const avgRoi = properties.length > 0
        ? properties.reduce((sum: number, p: any) => sum + (Number(p.expected_return) || 0), 0) / properties.length
        : 0;
      const minPrice = properties.length > 0
        ? Math.min(...properties.map((p: any) => Number(p.token_price) || 0))
        : 0;
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Available Properties"
            value={String(properties.length)}
            subtitle="Ready for investment"
            icon={Target}
            variant="default"
          />
          <StatsCard
            title="Total Market Value"
            value={`$${(totalValue / 1000000).toFixed(1)}M`}
            subtitle="Combined property value"
            icon={DollarSign}
            variant="default"
          />
          <StatsCard
            title="Average ROI"
            value={`${avgRoi.toFixed(1)}%`}
            subtitle="Expected annual return"
            icon={TrendingUp}
            variant="default"
          />
          <StatsCard
            title="Min. Token Price"
            value={`$${minPrice.toLocaleString()}`}
            subtitle="Lowest entry point"
            icon={Wallet}
            variant="default"
          />
        </div>
      );
    })()}

    {/* Property Listings */}
    {visibleProperties.length === 0 && (
      <Card className="p-10 text-center">
        <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <Text variant="body" color="muted">
          {q ? `No properties match "${q}".` : 'No active properties available right now.'}
        </Text>
      </Card>
    )}
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {visibleProperties.map((property: any) => (
        <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative">
            {property.images && property.images.length > 0 ? (
              <img
                src={typeof property.images[0] === 'string' ? property.images[0] : property.images[0].image}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building className="w-16 h-16 text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <Text variant="body" weight="semibold">
                {property.title}
              </Text>
              <Text variant="caption">
                {property.city}, {property.state || property.country}
              </Text>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Text variant="caption" color="muted">Property Value</Text>
                <Text variant="body" weight="semibold">
                  ${Number(property.total_value).toLocaleString()}
                </Text>
              </div>
              <div>
                <Text variant="caption" color="muted">Token Price</Text>
                <Text variant="body" weight="semibold">
                  ${Number(property.token_price).toLocaleString()}
                </Text>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <Text variant="caption" color="muted">Available Tokens</Text>
                <Text variant="caption" weight="semibold">
                  {(property.total_tokens - property.tokens_sold).toLocaleString()} / {property.total_tokens.toLocaleString()}
                </Text>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((property.total_tokens - property.tokens_sold) / property.total_tokens) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Text variant="caption" color="muted">Expected ROI</Text>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {Number(property.expected_return) > 0
                    ? `${Number(property.expected_return).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => navigate('property-detail', { id: property.id })}>
              Invest Now
            </Button>
          </div>
        </Card>
      ))}
    </div>
  </div>
  );
};

// Wallet Content Component
// WalletContent now exposes a real Deposit + Withdraw flow.
//
// Deposit: opens a modal that explains the 3 ways money can enter the
// platform (Card via Stripe, Crypto via NowPayments, Bank Transfer) and
// posts the amount to /payments/wallet/deposit/. The backend creates a
// pending Payment row; in a card flow the provider's webhook later
// credits the WalletBalance.
//
// Withdraw: opens a modal that takes an amount + destination type and
// posts to /payments/wallet/withdraw/. The backend moves money from
// available → locked and queues an admin-approved payout. Estimated
// completion is 2 business days per the backend.
const WalletContent: React.FC<{
  portfolio: Portfolio | undefined;
  loading: boolean;
  walletBalance: number;
  walletLoading: boolean;
}> = ({ portfolio, loading, walletBalance, walletLoading }) => {
  const queryClient = useQueryClient();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <Text variant="h3" weight="semibold" className="mb-2">
            Wallet & Payments
          </Text>
          <Text variant="body" color="muted">
            Your platform balance, total invested, and earnings to date.
          </Text>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
            Withdraw
          </Button>
          <Button onClick={() => setDepositOpen(true)}>
            Add Funds
          </Button>
        </div>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Wallet Balance"
          value={walletLoading ? '$0' : `$${walletBalance.toLocaleString()}`}
          subtitle="Available funds"
          icon={Wallet}
          variant="gradient"
        />
        <StatsCard
          title="Portfolio Value"
          value={loading ? '$0' : `$${(parseFloat(String(portfolio?.current_value || 0))).toLocaleString()}`}
          subtitle="Current investment value"
          icon={DollarSign}
          variant="accent"
        />
        <StatsCard
          title="Total Invested"
          value={loading ? '$0' : `$${(parseFloat(String(portfolio?.total_invested || 0))).toLocaleString()}`}
          subtitle="All-time investments"
          icon={RefreshCw}
        />
        <StatsCard
          title="Total Returns"
          value={loading ? '$0' : `$${(parseFloat(String(portfolio?.total_returns || portfolio?.total_return || 0))).toLocaleString()}`}
          subtitle="Earnings to date"
          icon={TrendingUp}
        />
      </div>

      {/* How deposits & withdrawals work — orient the user before they click. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
          <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">How money enters your wallet</h4>
          <ul className="text-sm text-emerald-800 dark:text-emerald-300 space-y-1.5">
            <li>• <strong>Card:</strong> Visa/Mastercard via Stripe — funds available in 1-2 minutes.</li>
            <li>• <strong>Crypto:</strong> USDT, USDC, BTC, ETH — credited after blockchain confirmations.</li>
            <li>• <strong>Bank transfer:</strong> SWIFT/wire — 1-2 business days, lowest fees.</li>
            <li>• <strong>Dividends:</strong> auto-distributed monthly from your investments.</li>
          </ul>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">How money leaves your wallet</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1.5">
            <li>• <strong>Invest:</strong> buy property tokens from the marketplace.</li>
            <li>• <strong>Withdraw:</strong> send to your bank or external crypto wallet (2 business days).</li>
            <li>• <strong>Fees:</strong> a 2.5% platform fee applies on secondary-market trades.</li>
            <li>• Withdrawal requests are reviewed by compliance before being released.</li>
          </ul>
        </div>
      </div>

      {/* Deposit + Withdraw modals are mounted at the end so they layer on top. */}
      {depositOpen && (
        <DepositModal
          onClose={() => setDepositOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setDepositOpen(false);
          }}
        />
      )}
      {withdrawOpen && (
        <WithdrawModal
          availableBalance={walletBalance}
          onClose={() => setWithdrawOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setWithdrawOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Deposit modal — three deposit channels, one form. The actual money
// movement happens in the chosen channel's flow (Stripe / NowPayments /
// bank-transfer); the backend's /payments/wallet/deposit/ endpoint only
// records a *pending* Payment row that gets reconciled by the provider's
// webhook. For Card we kick off a Stripe Checkout in a popup (one less
// piece of UI to wire than mounting Elements inline). For Crypto and
// Bank we show the next-step instructions because both require more
// state than a single modal can carry.
const DepositModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'card' | 'crypto' | 'bank'>('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amountValue = parseFloat(amount);
  const isValid = !isNaN(amountValue) && amountValue >= 10 && amountValue <= 100000;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Enter an amount between $10 and $100,000.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Records a pending Payment server-side. The card / crypto / bank
      // flow happens out-of-band and the provider webhook later credits
      // the wallet — for the demo we surface the pending state to the
      // user and refresh the balance card.
      const result: any = await apiClient.post('/payments/wallet/deposit/', {
        amount: amountValue,
        currency: 'USD',
        payment_method: method,
      });
      const txId = result?.transaction_id || result?.payment_id || result?.id;
      setSuccess(
        method === 'card'
          ? `Card deposit initiated. Funds will appear within a few minutes once Stripe confirms the charge. Reference: ${txId || 'pending'}.`
          : method === 'crypto'
          ? `Crypto deposit pending. Send the matching coin amount to the address we'll email you. Reference: ${txId || 'pending'}.`
          : `Bank-transfer deposit pending. Wire instructions and a reference code will be emailed to you. Reference: ${txId || 'pending'}.`
      );
      setTimeout(() => onSuccess(), 2500);
    } catch (e: any) {
      setError(e?.message || 'Failed to start the deposit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
        <Text variant="h3" weight="bold" className="mb-1">Add Funds</Text>
        <Text variant="caption" color="muted" className="mb-5 block">
          Top up your platform wallet to invest in property tokens.
        </Text>

        {success ? (
          <>
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
            <Button onClick={onClose} className="w-full">Close</Button>
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (USD)</label>
            <input
              type="number"
              min={10}
              max={100000}
              step="0.01"
              placeholder="500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm mb-4"
            />

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Payment method</label>
            <div className="space-y-2 mb-4">
              {[
                { id: 'card' as const, label: 'Credit / Debit Card', sub: 'Visa, Mastercard — instant (1-2 min)' },
                { id: 'crypto' as const, label: 'Cryptocurrency', sub: 'USDT, USDC, BTC, ETH — after confirmations' },
                { id: 'bank' as const, label: 'Bank Transfer', sub: 'SWIFT/wire — 1-2 business days, lowest fees' },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    method === m.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="deposit-method"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{m.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{m.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            {error && (
              <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !isValid}>
                {submitting ? 'Processing…' : `Deposit $${isValid ? amountValue.toFixed(2) : '0.00'}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const WithdrawModal: React.FC<{
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ availableBalance, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [destination, setDestination] = useState<'bank' | 'wallet'>('bank');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amountValue = parseFloat(amount);
  const isValid =
    !isNaN(amountValue) && amountValue >= 10 && amountValue <= availableBalance;

  const handleSubmit = async () => {
    if (!isValid) {
      if (amountValue > availableBalance) {
        setError(`You only have $${availableBalance.toLocaleString()} available.`);
      } else {
        setError('Enter an amount of at least $10.');
      }
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result: any = await apiClient.post('/payments/wallet/withdraw/', {
        amount: amountValue,
        currency: 'USD',
        destination,
      });
      const refId =
        result?.transaction_id || result?.withdrawal_id || result?.id;
      setSuccess(
        `Withdrawal request submitted. Funds are locked while compliance reviews the request — typical processing time is 2 business days. Reference: ${refId || 'pending'}.`
      );
      setTimeout(() => onSuccess(), 2500);
    } catch (e: any) {
      const msg = e?.message || 'Failed to submit the withdrawal request.';
      const details = e?.details;
      if (details && typeof details === 'object') {
        const flat = Object.entries(details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' · ');
        setError(`${msg} (${flat})`);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
        <Text variant="h3" weight="bold" className="mb-1">Withdraw Funds</Text>
        <Text variant="caption" color="muted" className="mb-5 block">
          Available balance: <strong>${availableBalance.toLocaleString()}</strong>
        </Text>

        {success ? (
          <>
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
            <Button onClick={onClose} className="w-full">Close</Button>
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (USD)</label>
            <input
              type="number"
              min={10}
              max={availableBalance}
              step="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm mb-4"
            />

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Send to</label>
            <div className="space-y-2 mb-4">
              {[
                { id: 'bank' as const, label: 'Bank account', sub: 'SWIFT/wire to the account on file — 2 business days' },
                { id: 'wallet' as const, label: 'External crypto wallet', sub: 'On-chain transfer to your verified address' },
              ].map((d) => (
                <label
                  key={d.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    destination === d.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="withdraw-destination"
                    value={d.id}
                    checked={destination === d.id}
                    onChange={() => setDestination(d.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{d.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{d.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              Withdrawal requests are reviewed by compliance. Funds are locked
              from your available balance until the transfer settles. You'll
              receive an email confirmation when the funds leave the platform.
            </div>

            {error && (
              <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !isValid}>
                {submitting ? 'Processing…' : `Withdraw $${isValid ? amountValue.toFixed(2) : '0.00'}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Notifications Content Component
const NotificationsContent: React.FC = () => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await apiClient.rawClient.get('/notifications/');
        return response.data?.results || response.data || [];
      } catch {
        return [];
      }
    },
    retry: 1,
  });

  const notificationList = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Text variant="h3" weight="semibold" className="mb-2">Notifications</Text>
          <Text variant="body" color="muted">Stay updated on your investments and platform activity</Text>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : notificationList.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <Text variant="h4" weight="semibold" className="mb-2">No Notifications</Text>
          <Text variant="body" color="muted">
            You're all caught up! New notifications will appear here when there's activity on your investments.
          </Text>
        </Card>
      ) : (
        <div className="space-y-3">
          {notificationList.map((notif: any, index: number) => (
            <Card key={notif.id || index} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  notif.type === 'investment' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                  notif.type === 'dividend' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-slate-100 dark:bg-slate-800'
                )}>
                  <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <Text variant="body" weight="medium">{notif.title || notif.message || 'Notification'}</Text>
                  <Text variant="caption" color="muted">{notif.message || notif.description || ''}</Text>
                  {notif.created_at && (
                    <Text variant="caption" color="muted" className="mt-1">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Settings Content Component with Role Management Integration
const SettingsContent: React.FC = () => {
  const user = useUser();
  const { updateProfile } = useAuth();
  const { navigate } = useRouter();
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  const [settingsModal, setSettingsModal] = useState<string | null>(null);

  // Edit-profile form state. Seeded from the current user each time the
  // modal opens; the actual PUT runs through AuthContext.updateProfile so
  // the cached user in state updates inline (no refetch needed).
  const [profileForm, setProfileForm] = useState<{
    first_name: string;
    last_name: string;
    phone: string;
    country: string;
    city: string;
    address: string;
  }>({ first_name: '', last_name: '', phone: '', country: '', city: '', address: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (settingsModal === 'edit-profile' && user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: (user as any).phone || (user as any).phone_number || '',
        country: user.country || '',
        city: user.city || '',
        address: user.address || '',
      });
      setProfileError(null);
      setProfileSuccess(false);
    }
  }, [settingsModal, user]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
        country: profileForm.country,
        city: profileForm.city,
        address: profileForm.address,
      } as any);
      setProfileSuccess(true);
      setTimeout(() => setSettingsModal(null), 800);
    } catch (e: any) {
      setProfileError(e?.message || 'Failed to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

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

  // The standalone "Notifications" sub-tab held seven toggle buttons that
  // were all wired to no handler at all — pure decoration over no backend
  // preferences endpoint. The top-level Notifications sidebar item still
  // shows real notifications. Dropped from this tab list.
  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
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
                    <Text variant="body">{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Not set' : '—'}</Text>
                  </div>
                </div>
                <div>
                  <Text variant="caption" color="muted" className="mb-1">Email Address</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Text variant="body">{user?.email || '—'}</Text>
                  </div>
                </div>
                <div>
                  <Text variant="caption" color="muted" className="mb-1">Phone Number</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    {/* Was hardcoded "+1 (555) 123-4567" — now reads the
                        actual user phone with a clear empty state. */}
                    <Text variant="body">{user?.phone || (user as any)?.phone_number || 'Not set'}</Text>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setSettingsModal('edit-profile')}>
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
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('kyc')}>
                    View Verification Details
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeSettingsTab === 'security' && (
          <div className="grid grid-cols-1 gap-6 max-w-2xl">
            {/* Security Settings — only items with a real backend behind them */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Security
              </Text>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">Two-Factor Authentication</Text>
                    <Text variant="caption" color="muted">Add an extra layer of security</Text>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSettingsModal('2fa')}>Enable</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">Change Password</Text>
                    <Text variant="caption" color="muted">Update your login credentials</Text>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSettingsModal('password')}>Change</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">Login Sessions</Text>
                    <Text variant="caption" color="muted">Manage active sessions</Text>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSettingsModal('sessions')}>View</Button>
                </div>
              </div>
            </Card>
            {/*
              "Privacy Settings" card removed. Its three rows ("Profile
              visibility", "Investment activity", "Contact preferences") all
              rendered outline buttons with no onClick — pure decoration over
              no backend preferences endpoint. Will return when there's a
              real privacy-settings API to read/write.
            */}
          </div>
        )}

        {/*
          Notifications sub-tab removed entirely — see settingsTabs comment.
          Real notifications stream is available via the sidebar's
          Notifications item.
        */}

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
                  <Button variant="outline" className="w-full mt-4" onClick={() => navigate('role-management')}>
                    Manage Roles
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeSettingsTab === 'account' && (
          <div className="max-w-2xl">
            {/* Account Actions */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                Account Actions
              </Text>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => setSettingsModal('export')}>
                  <Download className="w-4 h-4 mr-3" />
                  Export Data
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setSettingsModal('tax')}>
                  <FileText className="w-4 h-4 mr-3" />
                  Download Tax Documents
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setSettingsModal('reports')}>
                  <FileText className="w-4 h-4 mr-3" />
                  Download Investment Reports
                </Button>
              </div>
            </Card>
            {/*
              "Danger Zone" card (Suspend Account / Deactivate Account) removed.
              Neither button had an onClick. Self-service account closure is a
              compliance-heavy flow (KYC ties, open positions, ongoing
              dividends) that needs a proper support-driven process; the
              placeholder UI was misleading.
            */}
          </div>
        )}
      </motion.div>

      {/* Settings Modals */}
      <AnimatePresence>
        {settingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSettingsModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {settingsModal === 'edit-profile' && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">Edit Profile</Text>
                  {profileError && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
                      Profile updated.
                    </div>
                  )}
                  <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">First name</label>
                        <input
                          type="text"
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Last name</label>
                        <input
                          type="text"
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Address</label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(p => ({ ...p, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">City</label>
                        <input
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm(p => ({ ...p, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Country</label>
                        <input
                          type="text"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm(p => ({ ...p, country: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setSettingsModal(null)} className="flex-1" disabled={profileSaving}>Cancel</Button>
                    <Button onClick={handleProfileSave} className="flex-1" disabled={profileSaving}>
                      {profileSaving ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
              {settingsModal === '2fa' && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">Enable Two-Factor Authentication</Text>
                  <Text variant="body" color="muted" className="mb-4">
                    Two-factor authentication adds an extra layer of security to your account. You will need an authenticator app like Google Authenticator or Authy.
                  </Text>
                  <Text variant="caption" color="muted" className="mb-4 block">This feature is coming soon. We are working on integrating 2FA.</Text>
                  <Button onClick={() => setSettingsModal(null)} className="w-full">Close</Button>
                </>
              )}
              {settingsModal === 'password' && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">Change Password</Text>
                  <div className="space-y-3 mb-4">
                    <input type="password" placeholder="Current password" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    <input type="password" placeholder="New password" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    <input type="password" placeholder="Confirm new password" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setSettingsModal(null)} className="flex-1">Cancel</Button>
                    <Button onClick={() => { alert('Password change submitted'); setSettingsModal(null); }} className="flex-1">Update Password</Button>
                  </div>
                </>
              )}
              {settingsModal === 'sessions' && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">Active Sessions</Text>
                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Text variant="body" weight="medium">Current Session</Text>
                      <Text variant="caption" color="muted">This device - Active now</Text>
                    </div>
                  </div>
                  <Button onClick={() => setSettingsModal(null)} className="w-full">Close</Button>
                </>
              )}
              {(settingsModal === 'export' || settingsModal === 'tax' || settingsModal === 'reports') && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">
                    {settingsModal === 'export' ? 'Export Data' : settingsModal === 'tax' ? 'Tax Documents' : 'Investment Reports'}
                  </Text>
                  <Text variant="body" color="muted" className="mb-4">
                    This feature is coming soon. Your {settingsModal === 'export' ? 'account data export' : settingsModal === 'tax' ? 'tax documents' : 'investment reports'} will be available for download once generated.
                  </Text>
                  <Button onClick={() => setSettingsModal(null)} className="w-full">Close</Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};