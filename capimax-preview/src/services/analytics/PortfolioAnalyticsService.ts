import { apiClient } from '../api/ApiClient';

export interface PortfolioGrowthData {
  current_value: number;
  invested_amount: number;
  return_amount: number;
  return_percentage: number;
  growth_rate: number;
  period: string;
  last_updated: Date;
}

export interface PortfolioPerformanceData {
  date: string;
  portfolio_value: number;
  invested_amount: number;
  return_amount: number;
  return_percentage: number;
}

export interface PortfolioMetrics {
  total_invested: number;
  current_value: number;
  total_return: number;
  return_percentage: number;
  monthly_growth: number;
  quarterly_growth: number;
  yearly_growth: number;
  best_performing_property?: {
    id: string;
    title: string;
    return_percentage: number;
  };
  worst_performing_property?: {
    id: string;
    title: string;
    return_percentage: number;
  };
}

export interface PortfolioTrend {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  data: PortfolioPerformanceData[];
  summary: {
    start_value: number;
    end_value: number;
    change_amount: number;
    change_percentage: number;
    volatility: number;
  };
}

export interface PortfolioAnalytics {
  growth: PortfolioGrowthData;
  metrics: PortfolioMetrics;
  trends: {
    daily: PortfolioTrend;
    weekly: PortfolioTrend;
    monthly: PortfolioTrend;
    yearly: PortfolioTrend;
  };
  last_calculated: Date;
}

export class PortfolioAnalyticsService {
  /**
   * Get current portfolio growth data
   */
  static async getPortfolioGrowth(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<PortfolioGrowthData> {
    try {
      const response = await apiClient.get<PortfolioGrowthData>('/analytics/portfolio/growth/', {
        period
      });

      return {
        ...response,
        last_updated: new Date(response.last_updated)
      };
    } catch (error) {
      console.error('Failed to fetch portfolio growth:', error);

      // Return default data if request fails
      return {
        current_value: 0,
        invested_amount: 0,
        return_amount: 0,
        return_percentage: 0,
        growth_rate: 0,
        period,
        last_updated: new Date()
      };
    }
  }

  /**
   * Get portfolio performance data over time
   */
  static async getPortfolioPerformance(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
    limit: number = 30
  ): Promise<PortfolioPerformanceData[]> {
    try {
      const response = await apiClient.get<PortfolioPerformanceData[]>('/analytics/portfolio/performance/', {
        period,
        limit
      });

      return response || [];
    } catch (error) {
      console.error('Failed to fetch portfolio performance:', error);
      return [];
    }
  }

  /**
   * Get comprehensive portfolio metrics
   */
  static async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    try {
      const response = await apiClient.get<PortfolioMetrics>('/analytics/portfolio/metrics/');
      return response;
    } catch (error) {
      console.error('Failed to fetch portfolio metrics:', error);

      // Return default metrics if request fails
      return {
        total_invested: 0,
        current_value: 0,
        total_return: 0,
        return_percentage: 0,
        monthly_growth: 0,
        quarterly_growth: 0,
        yearly_growth: 0
      };
    }
  }

  /**
   * Get portfolio trends for multiple time periods
   */
  static async getPortfolioTrends(): Promise<PortfolioAnalytics['trends']> {
    try {
      const response = await apiClient.get('/analytics/portfolio/trends/');
      return response;
    } catch (error) {
      console.error('Failed to fetch portfolio trends:', error);

      // Return empty trends if request fails
      const emptyTrend: PortfolioTrend = {
        period: 'day',
        data: [],
        summary: {
          start_value: 0,
          end_value: 0,
          change_amount: 0,
          change_percentage: 0,
          volatility: 0
        }
      };

      return {
        daily: { ...emptyTrend, period: 'day' },
        weekly: { ...emptyTrend, period: 'week' },
        monthly: { ...emptyTrend, period: 'month' },
        yearly: { ...emptyTrend, period: 'year' }
      };
    }
  }

  /**
   * Get complete portfolio analytics data
   */
  static async getPortfolioAnalytics(): Promise<PortfolioAnalytics> {
    try {
      const response = await apiClient.get<PortfolioAnalytics>('/analytics/portfolio/complete/');

      return {
        ...response,
        growth: {
          ...response.growth,
          last_updated: new Date(response.growth.last_updated)
        },
        last_calculated: new Date(response.last_calculated)
      };
    } catch (error) {
      console.error('Failed to fetch complete portfolio analytics:', error);

      // Fallback: fetch individual components
      try {
        const [growth, metrics, trends] = await Promise.all([
          this.getPortfolioGrowth(),
          this.getPortfolioMetrics(),
          this.getPortfolioTrends()
        ]);

        return {
          growth,
          metrics,
          trends,
          last_calculated: new Date()
        };
      } catch (fallbackError) {
        console.error('Failed to fetch fallback portfolio analytics:', fallbackError);
        throw new Error('Unable to load portfolio analytics data');
      }
    }
  }

  /**
   * Calculate portfolio growth percentage for display
   */
  static calculateGrowthPercentage(currentValue: number, investedAmount: number): number {
    if (investedAmount === 0) return 0;
    return ((currentValue - investedAmount) / investedAmount) * 100;
  }

  /**
   * Format growth percentage for display
   */
  static formatGrowthPercentage(percentage: number): string {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  }

  /**
   * Determine growth trend (positive, negative, neutral)
   */
  static getGrowthTrend(percentage: number): 'positive' | 'negative' | 'neutral' {
    if (percentage > 0.1) return 'positive';
    if (percentage < -0.1) return 'negative';
    return 'neutral';
  }

  /**
   * Get growth period label
   */
  static getGrowthPeriodLabel(period: string): string {
    switch (period) {
      case 'week':
        return 'this week';
      case 'month':
        return 'this month';
      case 'quarter':
        return 'this quarter';
      case 'year':
        return 'this year';
      default:
        return 'this period';
    }
  }

  /**
   * Check if portfolio data is stale and needs refresh
   */
  static isDataStale(lastUpdated: Date, maxAgeMinutes: number = 15): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    return diffMinutes > maxAgeMinutes;
  }

  /**
   * Get portfolio diversification metrics
   */
  static async getPortfolioDiversification(): Promise<{
    property_types: Array<{
      type: string;
      percentage: number;
      amount: number;
    }>;
    locations: Array<{
      location: string;
      percentage: number;
      amount: number;
    }>;
    risk_levels: Array<{
      level: 'low' | 'medium' | 'high';
      percentage: number;
      amount: number;
    }>;
    diversification_score: number;
  }> {
    try {
      const response = await apiClient.get('/analytics/portfolio/diversification/');
      return response;
    } catch (error) {
      console.error('Failed to fetch portfolio diversification:', error);

      return {
        property_types: [],
        locations: [],
        risk_levels: [],
        diversification_score: 0
      };
    }
  }

  /**
   * Get portfolio comparison with market benchmarks
   */
  static async getPortfolioBenchmark(): Promise<{
    portfolio_return: number;
    market_return: number;
    real_estate_index_return: number;
    sp500_return: number;
    outperformance: number;
    period: string;
  }> {
    try {
      const response = await apiClient.get('/analytics/portfolio/benchmark/');
      return response;
    } catch (error) {
      console.error('Failed to fetch portfolio benchmark:', error);

      return {
        portfolio_return: 0,
        market_return: 0,
        real_estate_index_return: 0,
        sp500_return: 0,
        outperformance: 0,
        period: 'month'
      };
    }
  }
}

export default PortfolioAnalyticsService;