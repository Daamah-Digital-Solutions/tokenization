import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Settings,
  AlertCircle,
  CheckCircle,
  Users,
  MapPin
} from 'lucide-react';

import { DashboardService } from '../../../services/dashboard/DashboardService';
import { type Portfolio, type AnalyticsData, PropertyType } from '../../../services/api/types';
import { StatsCard, Card } from '../../design-system';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
import { cn } from '../../../utils/cn';
import { useTheme } from '../../../contexts/ThemeContext';

interface AnalyticsDashboardProps {
  analyticsData: AnalyticsData | undefined;
  portfolio: Portfolio | undefined;
  loading: boolean;
  className?: string;
}

type TimePeriod = 'day' | 'week' | 'month' | 'year';
type ChartType = 'performance' | 'allocation' | 'income' | 'comparison';

const COLORS = {
  primary: '#10b981',
  secondary: '#3b82f6',
  accent: '#f59e0b',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  neutral: '#6b7280',
};

const PROPERTY_TYPE_COLORS = {
  [PropertyType.RESIDENTIAL]: '#10b981',
  [PropertyType.COMMERCIAL]: '#3b82f6',
  [PropertyType.MIXED_USE]: '#f59e0b',
  [PropertyType.INDUSTRIAL]: '#8b5cf6',
  [PropertyType.LAND]: '#ef4444',
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analyticsData,
  portfolio,
  loading,
  className
}) => {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [activeChart, setActiveChart] = useState<ChartType>('performance');

  // Fetch analytics data for different periods
  const { data: periodData, refetch } = useQuery({
    queryKey: ['analytics-data', selectedPeriod],
    queryFn: () => DashboardService.getAnalyticsData(selectedPeriod),
    enabled: !!selectedPeriod,
  });

  // Use real portfolio data or show empty state
  const performanceData = useMemo(() => {
    if (periodData?.performance && periodData.performance.length > 0) {
      return periodData.performance;
    }
    // Return real summary as a single data point if we have portfolio data
    if (portfolio) {
      return [{
        date: 'Current',
        portfolioValue: portfolio.total_value || 0,
        invested: portfolio.total_invested || 0,
        return: (portfolio.total_value || 0) - (portfolio.total_invested || 0),
        roi: portfolio.total_invested ? (((portfolio.total_value || 0) - portfolio.total_invested) / portfolio.total_invested * 100) : 0,
        dividends: portfolio.total_dividends || 0,
        marketAverage: 0,
      }];
    }
    return [];
  }, [selectedPeriod, periodData, portfolio]);

  const allocationData = useMemo(() => {
    if (!portfolio?.asset_allocation || portfolio.asset_allocation.length === 0) {
      return [];
    }
    
    return portfolio.asset_allocation.map(allocation => ({
      name: allocation.property_type.replace('_', ' ').toUpperCase(),
      value: allocation.percentage,
      amount: allocation.value,
      count: allocation.properties_count,
      type: allocation.property_type,
    }));
  }, [portfolio?.asset_allocation]);

  const incomeData = useMemo(() => {
    if (periodData?.income && periodData.income.length > 0) {
      return periodData.income;
    }
    // No data available — return empty array (chart will show empty state)
    return [];
  }, [periodData]);

  const riskMetrics = useMemo(() => {
    if (periodData?.risk_metrics) {
      return periodData.risk_metrics;
    }
    return {
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      beta: 0,
      alpha: 0,
      var95: 0,
    };
  }, [periodData]);

  const formatCurrency = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '$0';
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-medium text-slate-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${typeof entry.value === 'number' ? 
                entry.dataKey.includes('roi') || entry.dataKey.includes('Percentage') ? 
                formatPercentage(entry.value) : formatCurrency(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-lg" />
          ))}
        </div>
        <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Text variant="h3" weight="semibold" className="mb-2">
            Portfolio Analytics
          </Text>
          <Text variant="body" color="muted">
            Comprehensive analysis of your portfolio performance and market trends
          </Text>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Period Selector */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1">
            {[
              { value: 'day', label: '7D' },
              { value: 'week', label: '4W' },
              { value: 'month', label: '12M' },
              { value: 'year', label: '5Y' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedPeriod(value as TimePeriod)}
                className={cn(
                  'px-3 py-1 text-sm font-medium rounded transition-colors',
                  selectedPeriod === value
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Return"
          value={formatPercentage(portfolio?.return_percentage ?? 0)}
          changeType={(portfolio?.return_percentage ?? 0) >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          variant="gradient"
          animated={true}
        />
        <StatsCard
          title="Monthly Income"
          value={formatCurrency(portfolio?.monthly_dividends ?? 0)}
          subtitle="Dividend income"
          icon={DollarSign}
          variant="accent"
          animated={true}
        />
        <StatsCard
          title="Sharpe Ratio"
          value={riskMetrics.sharpeRatio.toFixed(2)}
          subtitle="Risk-adjusted return"
          icon={Target}
          animated={true}
        />
        <StatsCard
          title="Volatility"
          value={formatPercentage(riskMetrics.volatility)}
          subtitle="Portfolio risk measure"
          icon={Activity}
          animated={true}
        />
      </div>

      {/* Chart Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8" aria-label="Chart tabs">
          {[
            { id: 'performance', label: 'Performance', icon: BarChart3 },
            { id: 'allocation', label: 'Asset Allocation', icon: PieChartIcon },
            { id: 'income', label: 'Income Analysis', icon: DollarSign },
            { id: 'comparison', label: 'Market Comparison', icon: TrendingUp },
          ].map((tab) => {
            const isActive = activeChart === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id as ChartType)}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
              >
                <tab.icon className="mr-2 w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Chart Content */}
      <motion.div
        key={activeChart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeChart === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Portfolio Performance Chart */}
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between mb-6">
                <Text variant="h4" weight="semibold">
                  Portfolio Performance
                </Text>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span>Portfolio Value</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span>Owned Amount</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="date" 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="portfolioValue"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stroke={COLORS.secondary}
                    fill={COLORS.secondary}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* ROI Trend */}
            <Card className="p-6">
              <Text variant="h4" weight="semibold" className="mb-6">
                ROI Trend
              </Text>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="date" 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="roi"
                    stroke={COLORS.accent}
                    strokeWidth={3}
                    dot={{ fill: COLORS.accent, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS.accent, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {activeChart === 'allocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Allocation Pie Chart */}
            <Card className="p-6">
              <Text variant="h4" weight="semibold" className="mb-6">
                Asset Allocation by Property Type
              </Text>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PROPERTY_TYPE_COLORS[entry.type] || COLORS.neutral} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Geographic Distribution */}
            <Card className="p-6">
              <Text variant="h4" weight="semibold" className="mb-6">
                Geographic Distribution
              </Text>
              <div className="space-y-4">
                {[
                  { city: 'New York', value: 35, amount: 45000 },
                  { city: 'Los Angeles', value: 25, amount: 32000 },
                  { city: 'Chicago', value: 20, amount: 25000 },
                  { city: 'Miami', value: 15, amount: 18000 },
                  { city: 'Others', value: 5, amount: 6500 },
                ].map((location) => (
                  <div key={location.city} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <Text variant="body" weight="medium">
                          {location.city}
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text variant="body" weight="semibold">
                          {location.value}%
                        </Text>
                        <Text variant="caption" color="muted">
                          ${location.amount.toLocaleString()}
                        </Text>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${location.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeChart === 'income' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs Expenses */}
            <Card className="lg:col-span-2 p-6">
              <Text variant="h4" weight="semibold" className="mb-6">
                Monthly Income Analysis
              </Text>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={incomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="month" 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" fill={COLORS.success} name="Gross Income" />
                  <Bar dataKey="expenses" fill={COLORS.danger} name="Expenses" />
                  <Line type="monotone" dataKey="net" stroke={COLORS.primary} strokeWidth={3} name="Net Income" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Income Breakdown */}
            <Card className="p-6">
              <Text variant="h4" weight="semibold" className="mb-6">
                Income Breakdown
              </Text>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <Text variant="body" weight="medium">
                    Rental Dividends
                  </Text>
                  <Text variant="body" weight="semibold" className="text-emerald-600">
                    $2,280
                  </Text>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Text variant="body" weight="medium">
                    Capital Appreciation
                  </Text>
                  <Text variant="body" weight="semibold" className="text-blue-600">
                    $420
                  </Text>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Text variant="body" weight="medium">
                    Bonus Dividends
                  </Text>
                  <Text variant="body" weight="semibold" className="text-yellow-600">
                    $150
                  </Text>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <Text variant="body" weight="semibold">
                      Total Monthly
                    </Text>
                    <Text variant="body" weight="bold" className="text-emerald-600">
                      $2,850
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeChart === 'comparison' && (
          <div className="space-y-6">
            {/* Market Comparison Chart */}
            <Card className="p-6">
              <Text variant="h4" weight="semibold" className="mb-6">
                Portfolio vs Market Performance
              </Text>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="date" 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="portfolioValue"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    name="Your Portfolio"
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="marketAverage"
                    stroke={COLORS.neutral}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Market Average"
                    dot={{ fill: COLORS.neutral, strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Risk Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <Text variant="h4" weight="semibold" className="mb-4">
                  Risk Metrics
                </Text>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Text variant="body" color="muted">Volatility</Text>
                    <Text variant="body" weight="semibold">{formatPercentage(riskMetrics.volatility)}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text variant="body" color="muted">Max Drawdown</Text>
                    <Text variant="body" weight="semibold" className="text-red-600">
                      {formatPercentage(riskMetrics.maxDrawdown)}
                    </Text>
                  </div>
                  <div className="flex justify-between">
                    <Text variant="body" color="muted">VaR (95%)</Text>
                    <Text variant="body" weight="semibold">{formatPercentage(riskMetrics.var95)}</Text>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <Text variant="h4" weight="semibold" className="mb-4">
                  Performance Ratios
                </Text>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Text variant="body" color="muted">Sharpe Ratio</Text>
                    <Text variant="body" weight="semibold" className="text-emerald-600">
                      {riskMetrics.sharpeRatio.toFixed(2)}
                    </Text>
                  </div>
                  <div className="flex justify-between">
                    <Text variant="body" color="muted">Alpha</Text>
                    <Text variant="body" weight="semibold" className="text-emerald-600">
                      {formatPercentage(riskMetrics.alpha)}
                    </Text>
                  </div>
                  <div className="flex justify-between">
                    <Text variant="body" color="muted">Beta</Text>
                    <Text variant="body" weight="semibold">{riskMetrics.beta.toFixed(2)}</Text>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <Text variant="h4" weight="semibold" className="mb-4">
                  Market Position
                </Text>
                <div className="space-y-4">
                  <div className="text-center">
                    <Text variant="h2" weight="bold" className="text-emerald-600">
                      Top 15%
                    </Text>
                    <Text variant="body" color="muted">
                      Performance Rank
                    </Text>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <Text variant="body" weight="medium">
                        Outperforming market by 3.2%
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};