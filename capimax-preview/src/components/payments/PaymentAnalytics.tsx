import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  PieChart,
  BarChart3,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency, getCurrencyInfo } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../design-system/forms/Select';

interface PaymentAnalyticsProps {
  className?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
}

interface AnalyticsData {
  totalVolume: number;
  totalFees: number;
  transactionCount: number;
  averageAmount: number;
  successRate: number;
  topCurrency: string;
  growth: number;
}

interface ChartData {
  date: string;
  amount: number;
  count: number;
  fees: number;
}

interface PaymentMethodStats {
  method: string;
  volume: number;
  count: number;
  percentage: number;
  avgAmount: number;
}

export function PaymentAnalytics({ className, timeRange: defaultTimeRange = '30d' }: PaymentAnalyticsProps) {
  const { state } = usePayment();
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'count' | 'fees'>('volume');
  const [selectedView, setSelectedView] = useState<'overview' | 'methods' | 'trends'>('overview');

  // Calculate analytics data based on time range
  const analyticsData = useMemo((): AnalyticsData => {
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    const filteredTx = state.transactions.filter(tx => 
      new Date(tx.timestamp) >= startDate &&
      (tx.type === 'investment' || tx.type === 'deposit' || tx.type === 'withdrawal')
    );

    const totalVolume = filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
    const totalFees = filteredTx.reduce((sum, tx) => sum + (tx.fee || 0), 0);
    const transactionCount = filteredTx.length;
    const completedTx = filteredTx.filter(tx => tx.status === 'completed');
    const successRate = transactionCount > 0 ? (completedTx.length / transactionCount) * 100 : 0;

    // Currency analysis
    const currencyVolumes = filteredTx.reduce((acc, tx) => {
      acc[tx.currency] = (acc[tx.currency] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const topCurrency = Object.entries(currencyVolumes)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'USD';

    // Growth calculation (comparing to previous period)
    const previousStartDate = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const previousTx = state.transactions.filter(tx => 
      new Date(tx.timestamp) >= previousStartDate && new Date(tx.timestamp) < startDate
    );
    const previousVolume = previousTx.reduce((sum, tx) => sum + tx.amount, 0);
    const growth = previousVolume > 0 ? ((totalVolume - previousVolume) / previousVolume) * 100 : 0;

    return {
      totalVolume,
      totalFees,
      transactionCount,
      averageAmount: transactionCount > 0 ? totalVolume / transactionCount : 0,
      successRate,
      topCurrency,
      growth
    };
  }, [state.transactions, timeRange]);

  // Generate chart data
  const chartData = useMemo((): ChartData[] => {
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const data: ChartData[] = [];

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTransactions = state.transactions.filter(tx => {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
        return txDate === dateStr && tx.status === 'completed';
      });

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: dayTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        count: dayTransactions.length,
        fees: dayTransactions.reduce((sum, tx) => sum + (tx.fee || 0), 0)
      });
    }

    return data;
  }, [state.transactions, timeRange]);

  // Payment method statistics
  const paymentMethodStats = useMemo((): PaymentMethodStats[] => {
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    const filteredTx = state.transactions.filter(tx => 
      new Date(tx.timestamp) >= startDate && tx.status === 'completed'
    );

    const methodStats = filteredTx.reduce((acc, tx) => {
      const method = tx.paymentMethod.type;
      if (!acc[method]) {
        acc[method] = { volume: 0, count: 0 };
      }
      acc[method].volume += tx.amount;
      acc[method].count += 1;
      return acc;
    }, {} as Record<string, { volume: number; count: number }>);

    const totalVolume = Object.values(methodStats).reduce((sum, stat) => sum + stat.volume, 0);

    return Object.entries(methodStats).map(([method, stat]) => ({
      method,
      volume: stat.volume,
      count: stat.count,
      percentage: totalVolume > 0 ? (stat.volume / totalVolume) * 100 : 0,
      avgAmount: stat.count > 0 ? stat.volume / stat.count : 0
    })).sort((a, b) => b.volume - a.volume);
  }, [state.transactions, timeRange]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.totalVolume, 'USD')}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            {analyticsData.growth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              analyticsData.growth >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {Math.abs(analyticsData.growth).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-600 ml-1">vs previous period</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.transactionCount.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-sm text-gray-600">
              Avg: {formatCurrency(analyticsData.averageAmount, 'USD')}
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.successRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <PieChart className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-sm text-gray-600">
              {state.transactions.filter(tx => tx.status === 'completed').length} completed
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Fees</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.totalFees, 'USD')}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-sm text-gray-600">
              {((analyticsData.totalFees / analyticsData.totalVolume) * 100 || 0).toFixed(2)}% of volume
            </span>
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Transaction Volume</h3>
          <Select
            value={selectedMetric}
            onChange={(value) => setSelectedMetric(value as any)}
            options={[
              { value: 'volume', label: 'Volume' },
              { value: 'count', label: 'Count' },
              { value: 'fees', label: 'Fees' }
            ]}
          />
        </div>

        <div className="h-64 flex items-end justify-between gap-2">
          {chartData.map((data, index) => {
            const value = selectedMetric === 'volume' ? data.amount : 
                         selectedMetric === 'count' ? data.count : data.fees;
            const maxValue = Math.max(...chartData.map(d => 
              selectedMetric === 'volume' ? d.amount : 
              selectedMetric === 'count' ? d.count : d.fees
            ));
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: index * 0.02 }}
                  className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm min-h-[2px]"
                />
                <div className="text-xs text-gray-500 mt-2 text-center">
                  {data.date}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  const renderPaymentMethods = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="space-y-4">
            {paymentMethodStats.map((method, index) => (
              <motion.div
                key={method.method}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    {method.method === 'crypto' && <Wallet className="h-4 w-4 text-emerald-600" />}
                    {method.method === 'card' && <CreditCard className="h-4 w-4 text-blue-600" />}
                    {method.method === 'bank' && <DollarSign className="h-4 w-4 text-green-600" />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 capitalize">{method.method}</div>
                    <div className="text-sm text-gray-600">
                      {method.count} transactions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(method.volume, 'USD')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {method.percentage.toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Average Transaction Size */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Transaction Size</h3>
          <div className="space-y-4">
            {paymentMethodStats.map((method, index) => (
              <div key={method.method} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {method.method}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(method.avgAmount, 'USD')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(method.avgAmount / Math.max(...paymentMethodStats.map(m => m.avgAmount))) * 100}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-emerald-500 h-2 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <ArrowUpRight className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-emerald-900">
              {formatCurrency(
                chartData.slice(-7).reduce((sum, d) => sum + d.amount, 0), 
                'USD'
              )}
            </div>
            <div className="text-sm text-emerald-700">Last 7 days volume</div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-blue-900">
              {chartData.slice(-7).reduce((sum, d) => sum + d.count, 0)}
            </div>
            <div className="text-sm text-blue-700">Transactions this week</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-purple-900">
              {analyticsData.growth > 0 ? '+' : ''}{analyticsData.growth.toFixed(1)}%
            </div>
            <div className="text-sm text-purple-700">Growth rate</div>
          </div>
        </div>
      </Card>

      {/* Currency Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency Distribution</h3>
        <div className="space-y-3">
          {state.balances.map((balance, index) => {
            const info = getCurrencyInfo(balance.currency);
            const percentage = state.balances.length > 0 
              ? (balance.balance / state.balances.reduce((sum, b) => sum + b.balance, 0)) * 100 
              : 0;

            return (
              <div key={balance.currency} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    info.type === 'crypto' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <span className="font-medium text-gray-900">{info.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(balance.balance, balance.currency)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Analytics</h2>
          <p className="text-gray-600">Track and analyze your payment performance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onChange={(value) => setTimeRange(value as any)}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' }
            ]}
            icon={<Calendar className="h-4 w-4" />}
          />
          
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'methods', label: 'Payment Methods' },
          { key: 'trends', label: 'Trends' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedView(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              selectedView === tab.key
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={selectedView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'methods' && renderPaymentMethods()}
        {selectedView === 'trends' && renderTrends()}
      </motion.div>
    </div>
  );
}

export default PaymentAnalytics;