/**
 * PortfolioAnalyticsService — frontend wrapper for portfolio analytics.
 *
 * Backend reality (P1 audit, 2026-05):
 *   - `/analytics/dashboard/` exists (analytics app)
 *   - `/analytics/investments/` exists (analytics app)
 *   - `/portfolio/summary/` and `/portfolio/performance/` exist (investments app)
 *   - `/analytics/portfolio/*` does NOT exist — the entire namespace this
 *     service used to call was phantom and was silently returning zeros.
 *
 * Strategy: repoint the methods that map cleanly onto real endpoints,
 * keep the rest as best-effort with sensible empty defaults so existing
 * dashboards don't crash, but emit a console warning the first time a
 * caller hits an unmapped endpoint so the gap is visible in dev tools.
 */

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

const warnedAbout = new Set<string>();
function warnOnce(method: string, missingEndpoint: string) {
  if (warnedAbout.has(method)) return;
  warnedAbout.add(method);
  console.warn(
    `[PortfolioAnalyticsService] ${method} hits ${missingEndpoint} which is not implemented on the backend. Returning empty data — see AUDIT_REPORT.md.`
  );
}

export class PortfolioAnalyticsService {
  /**
   * Get current portfolio growth data.
   *
   * Computed from the investments app's portfolio summary (real endpoint).
   * `growth_rate` is derived locally because the backend doesn't return it
   * directly.
   */
  static async getPortfolioGrowth(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<PortfolioGrowthData> {
    try {
      const summary: any = await apiClient.get('/portfolio/summary/');
      const invested = Number(summary?.total_invested ?? 0);
      const current = Number(summary?.current_value ?? invested);
      const ret = current - invested;
      const pct = invested > 0 ? (ret / invested) * 100 : 0;
      return {
        current_value: current,
        invested_amount: invested,
        return_amount: ret,
        return_percentage: pct,
        growth_rate: pct,
        period,
        last_updated: new Date(),
      };
    } catch (error) {
      console.error('Failed to fetch portfolio growth:', error);
      return {
        current_value: 0,
        invested_amount: 0,
        return_amount: 0,
        return_percentage: 0,
        growth_rate: 0,
        period,
        last_updated: new Date(),
      };
    }
  }

  /**
   * Get portfolio performance data over time.
   *
   * Repoints to `/portfolio/performance/` (real endpoint in the investments
   * app). The backend uses a single `period` query param — `limit` is
   * passed through but is currently ignored server-side.
   */
  static async getPortfolioPerformance(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
    limit: number = 30
  ): Promise<PortfolioPerformanceData[]> {
    try {
      // Map the local period vocabulary to the backend's expected values.
      const backendPeriod =
        period === 'day' || period === 'week'
          ? '1month'
          : period === 'month'
            ? '3months'
            : period === 'quarter'
              ? '6months'
              : '1year';

      const response: any = await apiClient.get('/portfolio/performance/', {
        period: backendPeriod,
        limit,
      });
      const points: any[] = Array.isArray(response)
        ? response
        : response?.results || response?.data || [];
      return points.map((p: any) => ({
        date: p.date,
        portfolio_value: Number(p.total_value ?? p.portfolio_value ?? 0),
        invested_amount: Number(p.invested_amount ?? 0),
        return_amount: Number(p.return_amount ?? 0),
        return_percentage: Number(p.return_percentage ?? 0),
      }));
    } catch (error) {
      console.error('Failed to fetch portfolio performance:', error);
      return [];
    }
  }

  /**
   * Get comprehensive portfolio metrics.
   *
   * Repoints to `/analytics/dashboard/` (real endpoint). Field names are
   * remapped where they differ from the local PortfolioMetrics shape.
   */
  static async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    try {
      const response: any = await apiClient.get('/analytics/dashboard/');
      return {
        total_invested: Number(response?.total_invested ?? 0),
        current_value: Number(response?.current_value ?? response?.total_invested ?? 0),
        total_return: Number(response?.total_return ?? 0),
        return_percentage: Number(response?.return_percentage ?? 0),
        monthly_growth: Number(response?.monthly_growth ?? 0),
        quarterly_growth: Number(response?.quarterly_growth ?? 0),
        yearly_growth: Number(response?.yearly_growth ?? 0),
        best_performing_property: response?.best_performing_property,
        worst_performing_property: response?.worst_performing_property,
      };
    } catch (error) {
      console.error('Failed to fetch portfolio metrics:', error);
      return {
        total_invested: 0,
        current_value: 0,
        total_return: 0,
        return_percentage: 0,
        monthly_growth: 0,
        quarterly_growth: 0,
        yearly_growth: 0,
      };
    }
  }

  /**
   * Get portfolio trends for multiple time periods.
   *
   * No backend endpoint exists. We compose multi-period trends from
   * sequential calls to /portfolio/performance/ rather than fabricate
   * data — but only if any of these are actually being consumed by
   * the UI. For now, return empties with a console warning so a future
   * caller knows the gap is intentional.
   */
  static async getPortfolioTrends(): Promise<PortfolioAnalytics['trends']> {
    warnOnce('getPortfolioTrends', '/analytics/portfolio/trends/');
    const emptyTrend: PortfolioTrend = {
      period: 'day',
      data: [],
      summary: {
        start_value: 0,
        end_value: 0,
        change_amount: 0,
        change_percentage: 0,
        volatility: 0,
      },
    };
    return {
      daily: { ...emptyTrend, period: 'day' },
      weekly: { ...emptyTrend, period: 'week' },
      monthly: { ...emptyTrend, period: 'month' },
      yearly: { ...emptyTrend, period: 'year' },
    };
  }

  /**
   * Get complete portfolio analytics — composite of the individual calls.
   */
  static async getPortfolioAnalytics(): Promise<PortfolioAnalytics> {
    const [growth, metrics, trends] = await Promise.all([
      this.getPortfolioGrowth(),
      this.getPortfolioMetrics(),
      this.getPortfolioTrends(),
    ]);
    return {
      growth,
      metrics,
      trends,
      last_calculated: new Date(),
    };
  }

  static calculateGrowthPercentage(currentValue: number, investedAmount: number): number {
    if (investedAmount === 0) return 0;
    return ((currentValue - investedAmount) / investedAmount) * 100;
  }

  static formatGrowthPercentage(percentage: number): string {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  }

  static getGrowthTrend(percentage: number): 'positive' | 'negative' | 'neutral' {
    if (percentage > 0.1) return 'positive';
    if (percentage < -0.1) return 'negative';
    return 'neutral';
  }

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

  static isDataStale(lastUpdated: Date, maxAgeMinutes: number = 15): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    return diffMinutes > maxAgeMinutes;
  }

  /**
   * Get portfolio diversification metrics.
   *
   * No backend endpoint. Return empty shape with a console warning so the
   * UI renders an empty-state instead of a fabricated chart.
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
    warnOnce('getPortfolioDiversification', '/analytics/portfolio/diversification/');
    return {
      property_types: [],
      locations: [],
      risk_levels: [],
      diversification_score: 0,
    };
  }

  /**
   * Get portfolio comparison with market benchmarks.
   *
   * No backend benchmark dataset exists. Return zeros with a warning.
   */
  static async getPortfolioBenchmark(): Promise<{
    portfolio_return: number;
    market_return: number;
    real_estate_index_return: number;
    sp500_return: number;
    outperformance: number;
    period: string;
  }> {
    warnOnce('getPortfolioBenchmark', '/analytics/portfolio/benchmark/');
    return {
      portfolio_return: 0,
      market_return: 0,
      real_estate_index_return: 0,
      sp500_return: 0,
      outperformance: 0,
      period: 'month',
    };
  }
}

export default PortfolioAnalyticsService;
