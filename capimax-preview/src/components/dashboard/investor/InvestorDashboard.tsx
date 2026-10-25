import React, { useState, useEffect } from 'react';
import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';
import { InvestmentService } from '../../../services/investment/InvestmentService';
import { useAuth } from '../../../contexts/AuthContext';
import type { Investment, Property, Transaction } from '../../../services/api/types';
import { apiClient } from '../../../services/api/ApiClient';
import { MyProperties } from './MyProperties';
import { useTranslation } from 'react-i18next';
// MyProperties is also exported from InvestorControlPanel — the
// dashboard router actually uses InvestorControlPanel for investor
// role, not this file. Keeping the import here means the case below
// works if anything mounts InvestorDashboard directly (e.g. tests).

// Portfolio data interfaces
interface PortfolioData {
  stats: StatItem[];
  performanceData: ChartDataPoint[];
  incomeData: ChartDataPoint[];
  holdings: PropertyHolding[];
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
}


interface PropertyHolding {
  id: string;
  name: string;
  location: string;
  investment: number;
  currentValue: number;
  tokens: number;
  yield: number;
  change: number;
  image?: string;
  property?: Property;
}

const PortfolioOverview: React.FC<{ portfolioData: PortfolioData }> = ({ portfolioData }) => {
  const { t } = useTranslation('dashboard');
  if (portfolioData.loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6 animate-pulse">
          <div className="h-6 bg-neutral-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="h-64 bg-neutral-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6 animate-pulse">
          <div className="h-6 bg-neutral-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="h-64 bg-neutral-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart
        data={portfolioData.performanceData}
        title={t('invDash.portfolioPerformance')}
        type="area"
        color="#10b981"
      />
      <PerformanceChart
        data={portfolioData.incomeData}
        title={t('invDash.monthlyIncomeTrend')}
        type="line"
        color="#3b82f6"
      />
    </div>
  );
};

const PropertyHoldings: React.FC<{ portfolioData: PortfolioData }> = ({ portfolioData }) => {
  const { t } = useTranslation('dashboard');
  if (portfolioData.loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            {t('invDash.propertyHoldings')}
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-200 dark:bg-slate-600 rounded-lg"></div>
                  <div>
                    <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-slate-600 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="text-center">
                      <div className="h-3 bg-neutral-200 dark:bg-slate-600 rounded w-16 mb-2"></div>
                      <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (portfolioData.error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{t('invDash.holdingsError')}</p>
          <p className="text-sm mt-2">{portfolioData.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          {t('invDash.propertyHoldings')}
        </h3>
      </div>
      <div className="p-6">
        {portfolioData.holdings.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
            <p>{t('invDash.noHoldings')}</p>
            <p className="text-sm mt-2">{t('invDash.noHoldingsText')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {portfolioData.holdings.map((property) => (
              <div
                key={property.id}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                onClick={() => property.property && window.open(`/properties/${property.property.id}`, '_blank')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    {property.image ? (
                      <img src={property.image} alt={property.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <span className="text-lg">🏢</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-slate-100">
                      {property.name}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      {property.location}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-neutral-500 dark:text-slate-400">{t('invDash.purchase')}</p>
                    <p className="font-semibold text-neutral-900 dark:text-slate-100">
                      ${property.investment.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-500 dark:text-slate-400">{t('myProps.currentValue')}</p>
                    <p className="font-semibold text-neutral-900 dark:text-slate-100">
                      ${property.currentValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-500 dark:text-slate-400">{t('myProps.yield')}</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {property.yield.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-500 dark:text-slate-400">{t('invDash.change')}</p>
                    <p className={`font-semibold ${
                      property.change > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : property.change < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-neutral-600 dark:text-slate-400'
                    }`}>
                      {property.change > 0 ? '+' : ''}{property.change.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const InvestorAnalytics: React.FC<{ portfolioData: PortfolioData }> = ({ portfolioData }) => {
  const { t } = useTranslation('dashboard');
  // Calculate asset allocation from holdings
  const assetAllocation = portfolioData.holdings.reduce((acc, holding) => {
    if (!holding.property) return acc;
    
    const type = holding.property.property_type;
    const existing = acc.find(item => item.label === type);
    
    if (existing) {
      existing.value += holding.investment;
    } else {
      acc.push({
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
        value: holding.investment,
        color: type === 'residential' ? 'bg-blue-500' :
               type === 'commercial' ? 'bg-green-500' :
               type === 'mixed_use' ? 'bg-purple-500' :
               type === 'industrial' ? 'bg-orange-500' : 'bg-gray-500'
      });
    }
    return acc;
  }, [] as Array<{ type?: string; label: string; value: number; color: string }>);

  const totalInvestment = assetAllocation.reduce((sum, item) => sum + item.value, 0);
  const allocationWithPercentages = assetAllocation.map(item => ({
    ...item,
    percentage: totalInvestment > 0 ? (item.value / totalInvestment * 100) : 0
  }));

  // Calculate key metrics
  const averageROI = portfolioData.holdings.length > 0 ?
    portfolioData.holdings.reduce((sum, h) => sum + h.change, 0) / portfolioData.holdings.length : 0;
  
  const totalYield = portfolioData.holdings.length > 0 ?
    portfolioData.holdings.reduce((sum, h) => sum + h.yield, 0) / portfolioData.holdings.length : 0;
  
  const diversificationScore = Math.min(10, allocationWithPercentages.length * 2.5 + (portfolioData.holdings.length * 0.5));
  
  const riskLevel = diversificationScore >= 8 ? 'Low' :
                   diversificationScore >= 6 ? 'Moderate' : 'High';

  if (portfolioData.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 animate-pulse">
            <div className="h-6 bg-neutral-200 dark:bg-slate-700 rounded mb-4 w-32"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded bg-neutral-200 dark:bg-slate-600"></div>
                    <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded w-12"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Asset Allocation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
          {t('invDash.assetAllocation')}
        </h3>
        <div className="space-y-3">
          {allocationWithPercentages.length === 0 ? (
            <div className="text-center py-4 text-neutral-500 dark:text-slate-400">
              <p>{t('invDash.noProperties')}</p>
              <p className="text-sm mt-1">{t('invDash.noPropertiesText')}</p>
            </div>
          ) : (
            allocationWithPercentages.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded ${item.color}`}></div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                    {t(`propertyTypes.${item.type}`, { defaultValue: item.label })}
                  </span>
                </div>
                <div className="text-end">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                    {item.percentage.toFixed(1)}%
                  </span>
                  <div className="text-xs text-neutral-500 dark:text-slate-400">
                    ${item.value.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
          {t('invDash.keyMetrics')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              {t('invDash.averageRoi')}
            </span>
            <div className="text-end">
              <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                {averageROI.toFixed(1)}%
              </span>
              <span className={`text-xs ms-2 ${
                averageROI >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {averageROI >= 0 ? '+' : ''}{averageROI.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              {t('invDash.averageYield')}
            </span>
            <div className="text-end">
              <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                {totalYield.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              {t('invDash.diversificationScore')}
            </span>
            <div className="text-end">
              <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                {diversificationScore.toFixed(1)}/10
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              {t('invDash.riskLevel')}
            </span>
            <div className="text-end">
              <span className={`text-sm font-semibold ${
                riskLevel === 'Low' ? 'text-green-600 dark:text-green-400' :
                riskLevel === 'Moderate' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {t(`invDash.risk.${riskLevel.toLowerCase()}`)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InvestorDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const { state } = useAuth();
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US';
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    stats: [],
    performanceData: [],
    incomeData: [],
    holdings: [],
    activities: [],
    loading: true,
    error: null
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load portfolio data
  useEffect(() => {
    if (!state.user) return;
    
    loadPortfolioData();
  }, [state.user, refreshTrigger]);

  const loadPortfolioData = async () => {
    if (!state.user) return;
    
    try {
      setPortfolioData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch portfolio summary
      const [portfolioSummary, performanceData, dividendHistory, investments, transactions] = await Promise.all([
        InvestmentService.getPortfolioSummary(),
        InvestmentService.getPortfolioPerformance('1year'),
        InvestmentService.getDividendHistory(1, 50),
        InvestmentService.getInvestments(1, 50),
        apiClient.get('/transactions/', { page: 1, limit: 10 })
      ]);

      // Transform portfolio summary to stats
      const stats: StatItem[] = [
        {
          id: 'total-investment',
          label: t('invDash.stats.totalOwned'),
          value: `$${portfolioSummary.total_invested.toLocaleString()}`,
          change: `${portfolioSummary.return_percentage >= 0 ? '+' : ''}${portfolioSummary.return_percentage.toFixed(1)}%`,
          changeType: portfolioSummary.return_percentage >= 0 ? 'positive' : 'negative',
          icon: '💰',
          description: t('invDash.stats.totalOwnedDesc')
        },
        {
          id: 'portfolio-value',
          label: t('invDash.stats.portfolioValue'),
          value: `$${portfolioSummary.current_value.toLocaleString()}`,
          change: `$${portfolioSummary.total_return.toLocaleString()}`,
          changeType: portfolioSummary.total_return >= 0 ? 'positive' : 'negative',
          icon: '📊',
          description: t('invDash.stats.portfolioValueDesc')
        },
        {
          id: 'properties',
          label: t('myProps.properties'),
          value: portfolioSummary.properties_count.toString(),
          change: portfolioSummary.active_investments > 0 ? `+${portfolioSummary.active_investments}` : '0',
          changeType: 'neutral',
          icon: '🏢',
          description: t('invDash.stats.activeHoldings')
        },
        {
          id: 'monthly-income',
          label: t('overview.stats.monthlyIncome'),
          value: `$${portfolioSummary.monthly_dividends.toLocaleString()}`,
          // Dividend history is a plain paginated list — there is no
          // `summary.this_month` on the response. Compute the trend from
          // the portfolio summary instead, and fall back to a neutral
          // indicator when no comparable baseline exists.
          change: portfolioSummary.return_percentage > 0
            ? `+${portfolioSummary.return_percentage.toFixed(1)}%`
            : '0%',
          changeType: portfolioSummary.return_percentage > 0 ? 'positive' : 'neutral',
          icon: '💵',
          description: t('invDash.stats.rentalIncomeThisMonth')
        }
      ];

      // Transform performance data
      const chartData: ChartDataPoint[] = performanceData.map(point => ({
        date: point.date,
        value: point.total_value,
        label: new Date(point.date).toLocaleDateString(dateLocale, { month: 'short' })
      }));

      // Create income data from dividend history
      const incomeData: ChartDataPoint[] = dividendHistory.dividends
        .reduce((acc: any[], dividend) => {
          const monthKey = new Date(dividend.payment_date).toISOString().slice(0, 7);
          const existing = acc.find(item => item.date.startsWith(monthKey));
          if (existing) {
            existing.value += dividend.amount;
          } else {
            acc.push({
              date: monthKey + '-01',
              value: dividend.amount,
              label: new Date(dividend.payment_date).toLocaleDateString(dateLocale, { month: 'short' })
            });
          }
          return acc;
        }, [])
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-12); // Last 12 months

      // Transform investments to holdings
      const holdingsMap = new Map<string, PropertyHolding>();
      
      for (const investment of investments.investments) {
        if (investment.status === 'completed') {
          try {
            const propertyData = await apiClient.get(`/properties/${investment.property_id}/`);
            const property = propertyData as Property;

            // Prefer a real current valuation when the backend supplies
            // one — `analytics.current_valuation` on the property detail
            // serializer reflects the latest appraisal. Fall back to
            // the initial investment amount (zero appreciation) so a
            // newly-listed property doesn't fabricate a +10% bump.
            const currentValuation = Number(
              (property as any).current_valuation ?? (property as any).analytics?.current_valuation ?? 0
            );
            const originalValue = Number(property.total_value || 0);
            const investmentShare = originalValue > 0
              ? investment.investment_amount / originalValue
              : 0;
            const projectedFromValuation =
              currentValuation > 0 ? currentValuation * investmentShare : 0;
            const currentValue = projectedFromValuation > 0
              ? projectedFromValuation
              : investment.investment_amount;
            const yield_rate = property.rental_yield || 0;
            const change = investment.investment_amount > 0
              ? ((currentValue - investment.investment_amount) / investment.investment_amount) * 100
              : 0;
            
            if (holdingsMap.has(investment.property_id)) {
              const existing = holdingsMap.get(investment.property_id)!;
              existing.investment += investment.investment_amount;
              existing.currentValue += currentValue;
              existing.tokens += investment.token_amount;
            } else {
              holdingsMap.set(investment.property_id, {
                id: investment.property_id,
                name: property.title,
                location: `${property.city}, ${property.state || property.country}`,
                investment: investment.investment_amount,
                currentValue,
                tokens: investment.token_amount,
                yield: yield_rate,
                change,
                image: property.images?.[0],
                property
              });
            }
          } catch (error) {
            console.error(`Failed to load property ${investment.property_id}:`, error);
          }
        }
      }

      const holdings = Array.from(holdingsMap.values());

      // Transform transactions to activities
      const activities: ActivityItem[] = transactions.transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type === 'investment' ? 'investment' : 
              tx.type === 'dividend' ? 'dividend' : 'transaction',
        title: tx.description || t('invDash.txTitle', { type: t(`txTypes.${tx.type}`, { defaultValue: tx.type.charAt(0).toUpperCase() + tx.type.slice(1) }) }),
        description: tx.metadata?.property_title || t('invDash.realEstateTx'),
        amount: `${tx.amount >= 0 ? '+' : ''}$${Math.abs(tx.amount).toLocaleString()}`,
        timestamp: tx.created_at,
        status: tx.status === 'completed' ? 'completed' : 'pending'
      }));

      setPortfolioData({
        stats,
        performanceData: chartData,
        incomeData,
        holdings,
        activities,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Failed to load portfolio data:', error);
      setPortfolioData(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('invDash.loadError')
      }));
    }
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const quickActions: QuickAction[] = [
    {
      id: 'invest-more',
      label: t('myProps.buyMore'),
      icon: '💰',
      description: t('invDash.actions.buyMoreDesc'),
      variant: 'primary',
      onClick: () => window.location.href = '/properties'
    },
    {
      id: 'browse-properties',
      label: t('myProps.browseProperties'),
      icon: '🏢',
      description: t('invDash.actions.browseDesc'),
      onClick: () => window.location.href = '/properties'
    },
    {
      id: 'withdraw',
      label: t('invDash.actions.withdraw'),
      icon: '💸',
      description: t('invDash.actions.withdrawDesc'),
      onClick: () => window.location.href = '/dashboard/wallet'
    },
    {
      id: 'analytics',
      label: t('invDash.actions.viewAnalytics'),
      icon: '📊',
      description: t('invDash.actions.viewAnalyticsDesc'),
      onClick: () => refreshData()
    }
  ];

  switch (currentView) {
    case 'overview':
      return (
        <div className="space-y-6">
          {portfolioData.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">⚠️</span>
                <p className="text-red-700 dark:text-red-300">{t('invDash.loadError')}</p>
                <button 
                  onClick={refreshData}
                  className="ms-auto px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                >
                  {t('common.retry')}
                </button>
              </div>
            </div>
          )}
          
          <DashboardStats stats={portfolioData.stats} loading={portfolioData.loading} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PortfolioOverview portfolioData={portfolioData} />
            </div>
            <QuickActions actions={quickActions} columns={2} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PropertyHoldings portfolioData={portfolioData} />
            </div>
            <ActivityFeed 
              activities={portfolioData.activities} 
              maxItems={5}
              showViewAll={true}
              onViewAll={() => window.location.href = '/dashboard/transactions'}
              loading={portfolioData.loading}
            />
          </div>
        </div>
      );

    case 'portfolio':
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                {t('invDash.portfolioOverview')}
              </h2>
              <button 
                onClick={refreshData}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                disabled={portfolioData.loading}
              >
                {portfolioData.loading ? t('invDash.refreshing') : t('common.refresh')}
              </button>
            </div>
            <p className="text-neutral-600 dark:text-slate-400 mb-6">
              {t('invDash.portfolioOverviewText')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {portfolioData.loading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg animate-pulse">
                    <div className="w-8 h-8 bg-neutral-200 dark:bg-slate-600 rounded mb-2 mx-auto"></div>
                    <div className="h-6 bg-neutral-200 dark:bg-slate-600 rounded mb-2"></div>
                    <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                  </div>
                ))
              ) : (
                portfolioData.stats.map((stat) => (
                  <div key={stat.id} className="text-center p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{stat.value}</div>
                    <div className="text-sm text-neutral-500 dark:text-slate-400">{stat.label}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <PortfolioOverview portfolioData={portfolioData} />
          <PropertyHoldings portfolioData={portfolioData} />
          <InvestorAnalytics portfolioData={portfolioData} />
        </div>
      );

    case 'investments':
      return (
        <div className="space-y-6">
          <PropertyHoldings portfolioData={portfolioData} />
          <InvestorAnalytics portfolioData={portfolioData} />
        </div>
      );

    // Dedicated "My Properties" surface — rich card grid showing every
    // owned property with tokens, purchase value, current value, P/L,
    // a deep-link to property-detail, and a one-tap "Sell on Market"
    // CTA that opens the existing CreateListingModal. The component is
    // self-contained (fetches its own investments + property details
    // via React Query), so we just render it.
    case 'my-properties':
      return <MyProperties />;

    case 'transactions':
      return (
        <div className="space-y-6">
          <ActivityFeed 
            activities={portfolioData.activities} 
            title={t('overview.actions.transactionHistory')}
            maxItems={50}
            showViewAll={false}
            loading={portfolioData.loading}
          />
        </div>
      );

    case 'income':
      const incomeStats = portfolioData.loading ? [] : [
        {
          id: 'total-income',
          label: t('invDash.income.total'),
          value: `$${portfolioData.incomeData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}`,
          change: portfolioData.incomeData.length > 1 ? 
            `${((portfolioData.incomeData[portfolioData.incomeData.length - 1].value / 
                (portfolioData.incomeData.reduce((sum, item) => sum + item.value, 0) / portfolioData.incomeData.length) - 1) * 100).toFixed(1)}%` : '0%',
          changeType: 'positive' as const,
          icon: '💰'
        },
        {
          id: 'monthly-average',
          label: t('invDash.income.monthlyAverage'),
          value: `$${portfolioData.incomeData.length > 0 ? (portfolioData.incomeData.reduce((sum, item) => sum + item.value, 0) / portfolioData.incomeData.length).toLocaleString() : '0'}`,
          change: '+0%',
          changeType: 'neutral' as const,
          icon: '📊'
        },
        {
          id: 'yield-rate',
          label: t('invDash.averageYield'),
          value: portfolioData.holdings.length > 0 ? 
            `${(portfolioData.holdings.reduce((sum, h) => sum + h.yield, 0) / portfolioData.holdings.length).toFixed(1)}%` : '0%',
          change: '+0%',
          changeType: 'neutral' as const,
          icon: '📈'
        },
        {
          id: 'next-payment',
          label: t('invDash.income.nextPayment'),
          value: t('invDash.income.tbd'),
          description: t('invDash.income.checkUpdates'),
          icon: '📅'
        }
      ];
      
      return (
        <div className="space-y-6">
          <DashboardStats 
            stats={incomeStats}
            loading={portfolioData.loading}
          />
          <PerformanceChart
            data={portfolioData.incomeData}
            title={t('invDash.income.history')}
            type="bar"
            color="#10b981"
          />
        </div>
      );

    case 'analytics':
      return (
        <div className="space-y-6">
          <PortfolioOverview portfolioData={portfolioData} />
          <InvestorAnalytics portfolioData={portfolioData} />
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <span className="text-4xl mb-4 block">🚧</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              {t('page.title', { view: t(`nav.views.${currentView}`, { defaultValue: currentView.replace('-', ' ') }) })}
            </h3>
            <p className="text-neutral-500 dark:text-slate-400">
              {t('invDash.underDevelopment')}
            </p>
          </div>
        </div>
      );
  }
};