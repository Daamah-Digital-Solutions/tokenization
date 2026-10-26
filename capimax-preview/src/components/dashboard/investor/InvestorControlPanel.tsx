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
import { MyProperties } from './MyProperties';
import { InvestorReports } from './InvestorReports';
import { KYCStatusSummaryCard } from '../../kyc/KYCStatusSummaryCard';
import { InstallmentsPanel } from './InstallmentsPanel';
import { InvestorDocumentsPanel } from './InvestorDocumentsPanel';
import { WithdrawModal } from '../../wallet/WithdrawModal';
import { WithdrawalRequestsSection } from '../../wallet/WithdrawalRequestsSection';
import { OpenCryptoPayments } from '../../purchase/OpenCryptoPayments';
import { WalletLedger } from '../../wallet/WalletLedger';
import { AddFundsModal } from '../../wallet/AddFundsModal';
import WalletPanel from '../../wallet/WalletPanel';
import { SecondaryMarketDashboard } from '../../marketplace/SecondaryMarketDashboard';
import { useUser, useAuth } from '../../../contexts/AuthContext';
import { useRouter } from '../../../utils/router';
import { apiClient } from '../../../services/api/ApiClient';
import { PropertyService } from '../../../services/property/PropertyService';
import { PaymentService } from '../../../services/payment/PaymentService';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface InvestorControlPanelProps {
  className?: string;
  currentView?: string;
}

type TabType = 'overview' | 'my-properties' | 'properties' | 'marketplace' | 'transactions' | 'installments' | 'reports' | 'analytics' | 'wallet' | 'documents' | 'notifications' | 'settings';

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
  const { t } = useTranslation('dashboard');
  // Map dashboard sidebar views to internal tabs
  const mapViewToTab = (view: string): TabType => {
    switch (view) {
      case 'my-properties':
        return 'my-properties';
      case 'portfolio':
        return 'overview'; // Portfolio sidebar item maps to the overview/portfolio tab
      case 'properties':
        return 'properties';
      case 'marketplace':
        return 'marketplace';
      case 'transactions':
        return 'transactions';
      case 'reports':
        return 'reports';
      case 'analytics':
        return 'analytics';
      case 'wallet':
        return 'wallet';
      case 'installments':
        return 'installments';
      case 'documents':
        return 'documents';
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
    { id: 'overview', label: t('nav.overview'), icon: PieChart },
    { id: 'marketplace', label: t('nav.marketplace'), icon: Search },
    { id: 'transactions', label: t('nav.transactions'), icon: Activity },
    { id: 'wallet', label: t('nav.wallet'), icon: Wallet },
    { id: 'installments', label: t('nav.installments'), icon: Calendar },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
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
            {t('icp.loadErrorTitle')}
          </Text>
          <Text variant="body" color="muted" className="mb-4">
            {t('icp.loadErrorText')}
          </Text>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 me-2" />
            {t('tx.tryAgain')}
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

        {/* My Properties — investor's owned holdings (tokens, purchase
            vs current value, P/L, sell on marketplace). The primary
            "what do I own?" surface for any logged-in investor. */}
        {activeTab === 'my-properties' && (
          <MyProperties />
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

        {activeTab === 'reports' && (
          <InvestorReports />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            analyticsData={undefined}
            portfolio={portfolio}
            loading={portfolioLoading}
          />
        )}

        {activeTab === 'installments' && (
          <InstallmentsPanel />
        )}

        {activeTab === 'wallet' && (
          <WalletContent portfolio={portfolio} loading={portfolioLoading} walletBalance={walletBalance} walletLoading={walletLoading} />
        )}

        {activeTab === 'documents' && (
          <InvestorDocumentsPanel />
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
}> = ({ portfolio, marketInsights, loading, showBalances, formatCurrency, formatPercentage, setActiveTab, walletBalance }) => {
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : undefined;
  return (
  <div className="space-y-6">
    {/* Wallet Balance Banner */}
    {walletBalance > 0 && (
      <Card className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 border-0">
        <div className="flex items-center justify-between">
          <div>
            <Text variant="bodySmall" className="text-emerald-100">{t('icp.wallet.balance')}</Text>
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
            {t('icp.manageWallet')}
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
            title={t('overview.stats.totalPortfolioValue')}
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
            title={t('overview.stats.monthlyIncome')}
            value={formatCurrency(portfolio?.monthly_dividends || 0)}
            subtitle={t('overview.stats.fromDividends')}
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
            title={t('overview.stats.activeProperties')}
            value={portfolio?.properties_count || 0}
            subtitle={t('overview.stats.inPortfolio')}
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
            title={t('invDash.stats.totalOwned')}
            value={formatCurrency(portfolio?.total_invested || 0)}
            subtitle={t('icp.principal')}
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
          {t('quickActions.title')}
        </Text>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('marketplace')}
          >
            <Search className="w-4 h-4 me-3" />
            {t('myProps.browseProperties')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('wallet')}
          >
            <Wallet className="w-4 h-4 me-3" />
            {t('icp.manageWallet')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('transactions')}
          >
            <Activity className="w-4 h-4 me-3" />
            {t('overview.actions.transactionHistory')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4 me-3" />
            {t('icp.accountSettings')}
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
          {t('overview.sections.marketInsights')}
        </Text>
        <div className="space-y-4">
          <div>
            <Text variant="body" weight="semibold" className="mb-2">
              {t('overview.trendingProperties')}
            </Text>
            <Text variant="caption" color="muted">
              {t('overview.trendingCount', { count: marketInsights?.trending?.length || 0 })}
            </Text>
          </div>
          <div>
            <Text variant="body" weight="semibold" className="mb-2">
              {t('icp.highYield')}
            </Text>
            <Text variant="caption" color="muted">
              {t('icp.highYieldCount', { count: marketInsights?.highYield?.length || 0 })}
            </Text>
          </div>
          <div>
            <Text variant="body" weight="semibold" className="mb-2">
              {t('icp.newListings')}
            </Text>
            <Text variant="caption" color="muted">
              {t('icp.newListingsCount', { count: marketInsights?.newListings?.length || 0 })}
            </Text>
          </div>
        </div>
      </Card>
    </div>

    {/* Portfolio Allocation and Performance */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Text variant="h3" weight="semibold" className="mb-4">
          {t('icp.portfolioAllocation')}
        </Text>
        {loading ? (
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded" />
        ) : (
          <div className="space-y-4">
            {portfolio?.asset_allocation?.map((allocation) => (
              <div key={allocation.property_type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Text variant="body" weight="medium">
                    {t(`propertyTypes.${allocation.property_type}`, { defaultValue: allocation.property_type.replace('_', ' ').toUpperCase() })}
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
                {t('icp.noAllocation')}
              </Text>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <Text variant="h3" weight="semibold" className="mb-4">
          {t('icp.recentPerformance')}
        </Text>
        {loading ? (
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded" />
        ) : (
          <div className="space-y-4">
            {portfolio?.performance_data?.slice(-7).map((point, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <Text variant="body" color="muted">
                  {new Date(point.date).toLocaleDateString(dateLocale)}
                </Text>
                <div className="text-end">
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
                {t('icp.noPerformance')}
              </Text>
            )}
          </div>
        )}
      </Card>
    </div>
  </div>
  );
};




// Secondary Market Content — mounts the real ``SecondaryMarketDashboard``
// component, which is the same orderbook UI as the standalone /marketplace
// route. Previously a "Coming Soon" stub here; the user (rightly) flagged
// that the real implementation already exists.
const SecondaryMarketContent: React.FC = () => <SecondaryMarketDashboard />;

// Marketplace Content Component (primary listings — newly tokenized properties)
const MarketplaceContent: React.FC = () => {
  const { t } = useTranslation('dashboard');
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
          <Text variant="h4" weight="semibold" className="mb-2">{t('icp.loadPropsError')}</Text>
          <Text variant="body" color="muted">{t('icp.tryRefresh')}</Text>
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
          {t('myProps.properties')}
        </Text>
        <Text variant="body" color="muted">
          {t('icp.discover')}
        </Text>
      </div>
      <div className="relative w-full lg:w-72">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('icp.searchPlaceholder')}
          className="w-full ps-9 pe-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
            title={t('icp.market.available')}
            value={String(properties.length)}
            subtitle={t('icp.market.availableSub')}
            icon={Target}
            variant="default"
          />
          <StatsCard
            title={t('icp.market.totalValue')}
            value={`$${(totalValue / 1000000).toFixed(1)}M`}
            subtitle={t('icp.market.totalValueSub')}
            icon={DollarSign}
            variant="default"
          />
          <StatsCard
            title={t('invDash.averageRoi')}
            value={`${avgRoi.toFixed(1)}%`}
            subtitle={t('icp.market.avgRoiSub')}
            icon={TrendingUp}
            variant="default"
          />
          <StatsCard
            title={t('icp.market.minPrice')}
            value={`$${minPrice.toLocaleString()}`}
            subtitle={t('icp.market.minPriceSub')}
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
          {q ? t('icp.noMatch', { q }) : t('icp.noActive')}
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
            <div className="absolute bottom-4 start-4 text-white">
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
                <Text variant="caption" color="muted">{t('icp.propertyValue')}</Text>
                <Text variant="body" weight="semibold">
                  ${Number(property.total_value).toLocaleString()}
                </Text>
              </div>
              <div>
                <Text variant="caption" color="muted">{t('icp.sharePrice')}</Text>
                <Text variant="body" weight="semibold">
                  ${Number(property.token_price).toLocaleString()}
                </Text>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <Text variant="caption" color="muted">{t('icp.availableShares')}</Text>
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
              <div className="flex items-center gap-2">
                <Text variant="caption" color="muted">{t('collab.sort.roi')}</Text>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {Number(property.expected_return) > 0
                    ? `${Number(property.expected_return).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => navigate('property-detail', { id: property.id })}>
              {t('icp.buyNow')}
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
export const WalletContent: React.FC<{
  portfolio: Portfolio | undefined;
  loading: boolean;
  walletBalance: number;
  walletLoading: boolean;
}> = ({ portfolio, loading, walletBalance, walletLoading }) => {
  const { t } = useTranslation('dashboard');
  const queryClient = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [statementBusy, setStatementBusy] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <Text variant="h3" weight="semibold" className="mb-2">
            {t('icp.wallet.title')}
          </Text>
          <Text variant="body" color="muted">
            {t('icp.wallet.subtitle')}
          </Text>
        </div>
        <div className="flex gap-3">
          {/* Add Funds tops the wallet up (card via Stripe, crypto via
              NOWPayments); Withdraw sends funds out (bank/crypto,
              admin-reviewed). */}
          <Button onClick={() => setAddFundsOpen(true)}>
            {t('icp.wallet.addFunds')}
          </Button>
          <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
            {t('invDash.actions.withdraw')}
          </Button>
          <Button
            variant="outline"
            disabled={statementBusy}
            onClick={async () => {
              // Official wallet statement (client round 3, #16).
              setStatementBusy(true);
              try {
                const [{ StatementService }, { downloadStatementPdf }, { default: i18n }] = await Promise.all([
                  import('../../../services/documents/StatementService'),
                  import('../../../utils/pdf/statements'),
                  import('../../../i18n/config'),
                ]);
                await downloadStatementPdf(await StatementService.get('wallet'), i18n.language || 'en');
              } catch (e) {
                console.error('Wallet statement failed:', e);
              } finally {
                setStatementBusy(false);
              }
            }}
          >
            {statementBusy ? t('analytics.preparing') : t('icp.wallet.statement')}
          </Button>
        </div>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title={t('icp.wallet.balance')}
          value={walletLoading ? '$0' : `$${walletBalance.toLocaleString()}`}
          subtitle={t('icp.wallet.available')}
          icon={Wallet}
          variant="gradient"
        />
        <StatsCard
          title={t('invDash.stats.portfolioValue')}
          value={loading ? '$0' : `$${(parseFloat(String(portfolio?.current_value || 0))).toLocaleString()}`}
          subtitle={t('icp.wallet.currentPortfolio')}
          icon={DollarSign}
          variant="accent"
        />
        <StatsCard
          title={t('invDash.stats.totalOwned')}
          value={loading ? '$0' : `$${(parseFloat(String(portfolio?.total_invested || 0))).toLocaleString()}`}
          subtitle={t('icp.wallet.allTime')}
          icon={RefreshCw}
        />
        <StatsCard
          title={t('icp.wallet.totalReturns')}
          value={loading ? '$0' : `$${(parseFloat(String(portfolio?.total_returns || portfolio?.total_return || 0))).toLocaleString()}`}
          subtitle={t('icp.wallet.earnings')}
          icon={TrendingUp}
        />
      </div>

      {/* Custodial / on-chain wallet — the digital wallet the platform issues
          after KYC (address, network, verification, token balance, and the
          tokenized properties held in it). Previously only on the standalone
          /wallet route, so dashboard users never saw where their wallet was. */}
      <OpenCryptoPayments />

      <WalletPanel />

      {/* Withdrawal request history. The investor sees every request
          they have lodged, what state it's in, and (for rejected
          requests) the compliance note. Funds in `pending`, `approved`,
          or `processing` are already deducted from the wallet's
          available balance — the locked total adds up to what's shown
          here. */}
      <WithdrawalRequestsSection />

      {/* Every wallet movement with its numbered receipt (PropShare model). */}
      <WalletLedger />

      {/* Withdraw modal — the only wallet action surfaced to investors.
          (Deposit / Add Funds was removed; see comment above the action
          row.) */}
      {withdrawOpen && (
        <WithdrawModal
          availableBalance={walletBalance}
          onClose={() => setWithdrawOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-ledger'] });
            setWithdrawOpen(false);
          }}
        />
      )}

      {addFundsOpen && (
        <AddFundsModal
          onClose={() => setAddFundsOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setAddFundsOpen(false);
          }}
        />
      )}
    </div>
  );
};



// Notifications Content Component
const NotificationsContent: React.FC = () => {
  const { t, i18n } = useTranslation('dashboard');
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
          <Text variant="h3" weight="semibold" className="mb-2">{t('nav.notifications')}</Text>
          <Text variant="body" color="muted">{t('icp.notif.subtitle')}</Text>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : notificationList.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <Text variant="h4" weight="semibold" className="mb-2">{t('icp.notif.emptyTitle')}</Text>
          <Text variant="body" color="muted">
            {t('icp.notif.emptyText')}
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
                  <Text variant="body" weight="medium">{notif.title || notif.message || t('icp.notif.fallback')}</Text>
                  <Text variant="caption" color="muted">{notif.message || notif.description || ''}</Text>
                  {notif.created_at && (
                    <Text variant="caption" color="muted" className="mt-1">
                      {new Date(notif.created_at).toLocaleDateString(i18n.language?.startsWith('ar') ? 'ar-EG' : undefined)}
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
  const { t } = useTranslation('dashboard');
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
      setProfileError(e?.message || t('icp.settings.profileError'));
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
      label: t('icp.settings.roles.investor'),
      description: t('icp.settings.roles.investorDesc'),
      icon: Briefcase,
      color: 'emerald'
    },
    [UserRole.PROPERTY_OWNER]: {
      label: t('icp.settings.roles.property_owner'),
      description: t('icp.settings.roles.property_ownerDesc'),
      icon: Building,
      color: 'blue'
    },
    [UserRole.ADMIN]: {
      label: t('icp.settings.roles.admin'),
      description: t('icp.settings.roles.adminDesc'),
      icon: Shield,
      color: 'purple'
    }
  };

  // The standalone "Notifications" sub-tab held seven toggle buttons that
  // were all wired to no handler at all — pure decoration over no backend
  // preferences endpoint. The top-level Notifications sidebar item still
  // shows real notifications. Dropped from this tab list.
  const settingsTabs = [
    { id: 'profile', label: t('icp.settings.tabs.profile'), icon: User },
    { id: 'security', label: t('icp.settings.tabs.security'), icon: Shield },
    { id: 'roles', label: t('icp.settings.tabs.roles'), icon: Users },
    { id: 'account', label: t('icp.settings.tabs.account'), icon: Settings }
  ];

  return (
    <div className="space-y-6">
      <div>
        <Text variant="h2" weight="bold" className="mb-2">
          {t('icp.accountSettings')}
        </Text>
        <Text variant="body" color="muted">
          {t('icp.settings.subtitle')}
        </Text>
      </div>

      {/* Settings Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-8" aria-label={t('icp.settings.tabsLabel')}>
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
                    'me-2 w-5 h-5',
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
                {t('icp.settings.profileInfo')}
              </Text>
              <div className="space-y-4">
                <div>
                  <Text variant="caption" color="muted" className="mb-1">{t('icp.settings.fullName')}</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Text variant="body">{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || t('icp.settings.notSet') : '—'}</Text>
                  </div>
                </div>
                <div>
                  <Text variant="caption" color="muted" className="mb-1">{t('icp.settings.email')}</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Text variant="body">{user?.email || '—'}</Text>
                  </div>
                </div>
                <div>
                  <Text variant="caption" color="muted" className="mb-1">{t('icp.settings.phoneNumber')}</Text>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    {/* Was hardcoded "+1 (555) 123-4567" — now reads the
                        actual user phone with a clear empty state. */}
                    <Text variant="body">{user?.phone || (user as any)?.phone_number || t('icp.settings.notSet')}</Text>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setSettingsModal('edit-profile')}>
                  {t('icp.settings.editProfile')}
                </Button>
              </div>
            </Card>

            {/* KYC Status — real data (was hard-coded "Identity Verified"
                for every user; client round 3, #3) */}
            <Card className="p-6">
              <KYCStatusSummaryCard />
            </Card>
          </div>
        )}

        {activeSettingsTab === 'security' && (
          <div className="grid grid-cols-1 gap-6 max-w-2xl">
            {/* Security Settings — only items with a real backend behind them */}
            <Card className="p-6">
              <Text variant="body" weight="semibold" className="mb-4">
                {t('icp.settings.tabs.security')}
              </Text>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">{t('icp.settings.twoFa')}</Text>
                    <Text variant="caption" color="muted">{t('icp.settings.twoFaDesc')}</Text>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSettingsModal('2fa')}>{t('icp.settings.enable')}</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">{t('icp.settings.changePassword')}</Text>
                    <Text variant="caption" color="muted">{t('icp.settings.changePasswordDesc')}</Text>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSettingsModal('password')}>{t('icp.settings.change')}</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text variant="body" weight="medium">{t('icp.settings.sessions')}</Text>
                    <Text variant="caption" color="muted">{t('icp.settings.sessionsDesc')}</Text>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSettingsModal('sessions')}>{t('icp.settings.view')}</Button>
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
              {t('icp.settings.tabs.roles')}
            </Text>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Roles */}
              <Card className="p-6">
                <Text variant="body" weight="semibold" className="mb-4">
                  {t('icp.settings.currentRoles')}
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
                                      {t('icp.settings.primary')}
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
                  {t('icp.settings.aboutRoles')}
                </Text>
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    {t('icp.settings.rolesText')}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">{t('icp.settings.primaryRole')}</strong>{' '}
                        {t('icp.settings.primaryRoleText')}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">{t('icp.settings.roleSwitching')}</strong>{' '}
                        {t('icp.settings.roleSwitchingText')}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => navigate('role-management')}>
                    {t('roleSwitcher.manageRoles')}
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
                {t('icp.settings.accountActions')}
              </Text>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => setSettingsModal('export')}>
                  <Download className="w-4 h-4 me-3" />
                  {t('icp.settings.exportData')}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setSettingsModal('tax')}>
                  <FileText className="w-4 h-4 me-3" />
                  {t('icp.settings.taxDocs')}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setSettingsModal('reports')}>
                  <FileText className="w-4 h-4 me-3" />
                  {t('icp.settings.ownershipReports')}
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
                  <Text variant="h3" weight="bold" className="mb-3">{t('icp.settings.editProfile')}</Text>
                  {profileError && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
                      {t('icp.settings.profileUpdated')}
                    </div>
                  )}
                  <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('icp.settings.firstName')}</label>
                        <input
                          type="text"
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('icp.settings.lastName')}</label>
                        <input
                          type="text"
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('icp.settings.phone')}</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('icp.settings.address')}</label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(p => ({ ...p, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('icp.settings.city')}</label>
                        <input
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm(p => ({ ...p, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('icp.settings.country')}</label>
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
                    <Button variant="outline" onClick={() => setSettingsModal(null)} className="flex-1" disabled={profileSaving}>{t('common.cancel')}</Button>
                    <Button onClick={handleProfileSave} className="flex-1" disabled={profileSaving}>
                      {profileSaving ? t('icp.settings.saving') : t('icp.settings.saveChanges')}
                    </Button>
                  </div>
                </>
              )}
              {settingsModal === '2fa' && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">{t('icp.settings.enable2faTitle')}</Text>
                  <Text variant="body" color="muted" className="mb-4">
                    {t('icp.settings.enable2faText')}
                  </Text>
                  <Text variant="caption" color="muted" className="mb-4 block">{t('icp.settings.enable2faSoon')}</Text>
                  <Button onClick={() => setSettingsModal(null)} className="w-full">{t('common.close')}</Button>
                </>
              )}
              {settingsModal === 'password' && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">{t('icp.settings.changePassword')}</Text>
                  <div className="space-y-3 mb-4">
                    <input type="password" placeholder={t('icp.settings.currentPassword')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    <input type="password" placeholder={t('icp.settings.newPassword')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    <input type="password" placeholder={t('icp.settings.confirmPassword')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setSettingsModal(null)} className="flex-1">{t('common.cancel')}</Button>
                    <Button onClick={() => { alert(t('icp.settings.passwordSubmitted')); setSettingsModal(null); }} className="flex-1">{t('icp.settings.updatePassword')}</Button>
                  </div>
                </>
              )}
              {settingsModal === 'sessions' && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">{t('icp.settings.activeSessions')}</Text>
                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Text variant="body" weight="medium">{t('icp.settings.currentSession')}</Text>
                      <Text variant="caption" color="muted">{t('icp.settings.thisDevice')}</Text>
                    </div>
                  </div>
                  <Button onClick={() => setSettingsModal(null)} className="w-full">{t('common.close')}</Button>
                </>
              )}
              {(settingsModal === 'export' || settingsModal === 'tax' || settingsModal === 'reports') && (
                <>
                  <Text variant="h3" weight="bold" className="mb-3">
                    {settingsModal === 'export' ? t('icp.settings.exportData') : settingsModal === 'tax' ? t('icp.settings.taxTitle') : t('icp.settings.reportsTitle')}
                  </Text>
                  <Text variant="body" color="muted" className="mb-4">
                    {settingsModal === 'export' ? t('icp.settings.soonExport') : settingsModal === 'tax' ? t('icp.settings.soonTax') : t('icp.settings.soonReports')}
                  </Text>
                  <Button onClick={() => setSettingsModal(null)} className="w-full">{t('common.close')}</Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
