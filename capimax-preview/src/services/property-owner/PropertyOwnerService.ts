import { apiClient } from '../api/ApiClient';
import type { Property } from '../api/types';

// Property Owner Dashboard Interfaces
export interface PropertyOwnerStats {
  total_properties: number;
  total_properties_change: string;
  capital_raised: number;
  capital_raised_change: string;
  active_investors: number;
  active_investors_change: string;
  monthly_revenue: number;
  monthly_revenue_change: string;
}

export interface RevenueAnalyticsData {
  date: string;
  value: number;
  label?: string;
}

export interface TokenizationAnalyticsData {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueStats {
  total_revenue: number;
  total_revenue_change: string;
  pending_distributions: number;
  next_distribution_date: string;
  next_distribution_amount: number;
  distribution_rate: number;
  distribution_rate_change: string;
}

export interface TopInvestor {
  id: string;
  name: string;
  email: string;
  total_investment: number;
  properties_count: number;
  join_date: string;
  avatar?: string;
}

export interface InvestorAnalytics {
  total_investors: number;
  retail_investors: {
    count: number;
    percentage: number;
  };
  institutional_investors: {
    count: number;
    percentage: number;
  };
  high_net_worth: {
    count: number;
    percentage: number;
  };
}

export interface InvestmentMetrics {
  average_investment: number;
  total_capital_raised: number;
  investor_retention_rate: number;
  new_investors_30d: number;
}

export interface PropertyDocument {
  id: string;
  name: string;
  document_type: string;
  file_size: number;
  uploaded_at: string;
  property_name?: string;
  url?: string;
}

export interface ActivityItem {
  id: string;
  type: 'property_update' | 'transaction' | 'dividend' | 'investment' | 'system';
  title: string;
  description: string;
  amount?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  property_id?: string;
  property_name?: string;
}

export class PropertyOwnerService {
  /**
   * Get property owner dashboard statistics
   */
  static async getOwnerStats(): Promise<PropertyOwnerStats> {
    try {
      const response = await apiClient.get<PropertyOwnerStats>('/properties/owner/stats/');
      return response;
    } catch (error) {
      console.error('Failed to fetch owner stats:', error);
      // Return default stats for new property owners
      return {
        total_properties: 0,
        total_properties_change: '+0',
        capital_raised: 0,
        capital_raised_change: '+0%',
        active_investors: 0,
        active_investors_change: '+0',
        monthly_revenue: 0,
        monthly_revenue_change: '+0%'
      };
    }
  }

  /**
   * Get properties owned by the current user
   */
  static async getOwnedProperties(): Promise<Property[]> {
    try {
      // The backend returns ``{success, data: {properties: [...]}}`` for the
      // owner endpoint, not DRF's ``{count, results}`` shape. Use apiClient's
      // standard unwrap so we get the inner ``data`` object regardless.
      const data = await apiClient.get<any>('/properties/owner/');
      const properties = data?.properties || data?.results || [];

      if (!Array.isArray(properties) || properties.length === 0) {
        return [];
      }

      // Map backend response to frontend Property format
      return properties.map((property: any) => ({
        id: property.id,
        title: property.title,
        description: property.description,
        property_type: property.property_type,
        status: property.status,
        total_value: parseFloat(property.total_value),
        token_price: parseFloat(property.token_price),
        total_tokens: property.total_tokens,
        tokens_sold: property.tokens_sold,
        expected_return: parseFloat(property.expected_return),
        rental_yield: parseFloat(property.rental_yield),
        property_size: parseFloat(property.property_size),
        year_built: property.year_built,
        address: property.address || '',
        city: property.city,
        state: property.state || '',
        country: property.country,
        coordinates: property.coordinates,
        images: property.primary_image ? [property.primary_image] : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"],
        documents: property.documents || [],
        smart_contract_address: property.smart_contract_address,
        owner_id: property.owner?.id || property.owner_id,
        created_at: new Date(property.created_at),
        updated_at: new Date(property.updated_at),
        // Additional fields
        property_category: property.property_category,
        tokens_available: property.tokens_available,
        funding_percentage: property.funding_percentage,
        is_fully_funded: property.is_fully_funded,
        can_accept_investments: property.can_accept_investments,
        monthly_rental_income: parseFloat(property.monthly_rental_income || 0),
        occupancy_rate: parseFloat(property.occupancy_rate || 0),
        supports_installments: property.supports_installments,
        installment_period_months: property.installment_period_months,
        is_under_construction: property.is_under_construction,
        is_ready_property: property.is_ready_property,
        construction_status_display: property.construction_status_display,
        estimated_monthly_return: property.estimated_monthly_return,
        featured: property.featured,
        minimum_investment: parseFloat(property.minimum_investment || 1000),
        average_rating: property.average_rating,
        total_reviews: property.total_reviews
      }));
    } catch (error) {
      console.error('Failed to fetch owned properties:', error);
      return [];
    }
  }

  /**
   * Get revenue analytics data for charts
   */
  static async getRevenueAnalytics(period: 'month' | 'quarter' | 'year' = 'month'): Promise<RevenueAnalyticsData[]> {
    try {
      // Backend returns ``{monthly_data: [{month, total_revenue, ...}], summary}``.
      // Chart components expect a flat ``[{date, value, label}]`` shape.
      const response = await apiClient.get<any>('/properties/owner/revenue-analytics/', {
        period
      });
      const rows = response?.monthly_data || response?.revenue_data || [];
      return rows.map((row: any) => ({
        date: row.month || row.date,
        value: Number(row.total_revenue ?? row.value ?? 0),
        label: row.label,
      }));
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
      return [];
    }
  }

  /**
   * Get tokenization analytics data for charts
   */
  static async getTokenizationAnalytics(period: 'month' | 'quarter' | 'year' = 'month'): Promise<TokenizationAnalyticsData[]> {
    try {
      // Backend returns ``{progression_data: [{date, cumulative_funding, ...}], summary}``.
      // Chart components expect a flat ``[{date, value, label}]`` shape.
      const response = await apiClient.get<any>('/properties/owner/tokenization-analytics/', {
        period
      });
      const rows = response?.progression_data || response?.tokenization_data || [];
      return rows.map((row: any) => ({
        date: row.date,
        value: Number(row.cumulative_funding ?? row.value ?? 0),
        label: row.label,
      }));
    } catch (error) {
      console.error('Failed to fetch tokenization analytics:', error);
      return [];
    }
  }

  /**
   * Get revenue statistics
   */
  static async getRevenueStats(): Promise<RevenueStats> {
    const empty: RevenueStats = {
      total_revenue: 0,
      total_revenue_change: '+0%',
      pending_distributions: 0,
      next_distribution_date: new Date().toISOString(),
      next_distribution_amount: 0,
      distribution_rate: 0,
      distribution_rate_change: '+0%',
    };
    try {
      // Backend returns rich aggregates (revenue_by_property_type,
      // revenue_by_location, monthly_performance, total_revenue). Map to the
      // flat card-row shape this view consumes. Fields the backend does not
      // currently compute fall back to 0 so cards render cleanly instead of
      // showing "NaN" or "undefined".
      const data = await apiClient.get<any>('/properties/owner/revenue-stats/');
      const mom = data?.monthly_performance || {};
      const change = Number(mom.month_over_month_change ?? 0);
      const formatChange = (n: number) =>
        `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
      return {
        total_revenue: Number(data?.total_revenue ?? 0),
        total_revenue_change: formatChange(change),
        pending_distributions: 0,
        next_distribution_date: new Date().toISOString(),
        next_distribution_amount: 0,
        distribution_rate: Number(mom.current_month_revenue ?? 0),
        distribution_rate_change: formatChange(change),
      };
    } catch (error) {
      console.error('Failed to fetch revenue stats:', error);
      return empty;
    }
  }

  /**
   * Get top investors across all properties
   */
  static async getTopInvestors(limit: number = 10): Promise<TopInvestor[]> {
    try {
      // Backend returns ``{top_investors: [{investor_id, investor_name,
      // investor_email, total_invested, properties_count, first_investment_date,
      // ...}], summary}``. Map to the flat ``TopInvestor`` shape consumed by
      // the dashboard list.
      const data = await apiClient.get<any>('/properties/owner/investors/', {
        limit,
      });
      const rows = data?.top_investors || data?.investors || [];
      return rows.slice(0, limit).map((row: any) => ({
        id: row.investor_id ?? row.id ?? '',
        name: row.investor_name ?? row.name ?? '',
        email: row.investor_email ?? row.email ?? '',
        total_investment: Number(row.total_invested ?? row.total_investment ?? 0),
        properties_count: Number(row.properties_count ?? 0),
        join_date: row.first_investment_date ?? row.join_date ?? '',
        avatar: row.avatar,
      }));
    } catch (error) {
      console.error('Failed to fetch top investors:', error);
      return [];
    }
  }

  /**
   * Get investor analytics and segmentation
   */
  static async getInvestorAnalytics(): Promise<InvestorAnalytics> {
    const empty: InvestorAnalytics = {
      total_investors: 0,
      retail_investors: { count: 0, percentage: 0 },
      institutional_investors: { count: 0, percentage: 0 },
      high_net_worth: { count: 0, percentage: 0 },
    };
    try {
      // Backend returns ``investor_segmentation: {whale_investors, large_investors,
      // medium_investors, small_investors}`` and ``summary.total_unique_investors``.
      // Map whale → high net worth, large → institutional, medium+small → retail
      // (closest semantic match to the dashboard's three segments).
      const data = await apiClient.get<any>('/properties/owner/investor-analytics/');
      const seg = data?.investor_segmentation || {};
      const totalInvestors = Number(data?.summary?.total_unique_investors ?? 0);
      const whaleCount = Number(seg.whale_investors?.count ?? 0);
      const largeCount = Number(seg.large_investors?.count ?? 0);
      const retailCount =
        Number(seg.medium_investors?.count ?? 0) +
        Number(seg.small_investors?.count ?? 0);
      const pct = (n: number) =>
        totalInvestors > 0 ? Math.round((n / totalInvestors) * 1000) / 10 : 0;
      return {
        total_investors: totalInvestors,
        retail_investors: { count: retailCount, percentage: pct(retailCount) },
        institutional_investors: { count: largeCount, percentage: pct(largeCount) },
        high_net_worth: { count: whaleCount, percentage: pct(whaleCount) },
      };
    } catch (error) {
      console.error('Failed to fetch investor analytics:', error);
      return empty;
    }
  }

  /**
   * Get investment metrics
   */
  static async getInvestmentMetrics(): Promise<InvestmentMetrics> {
    const empty: InvestmentMetrics = {
      average_investment: 0,
      total_capital_raised: 0,
      investor_retention_rate: 0,
      new_investors_30d: 0,
    };
    try {
      // Backend returns ``portfolio_overview: {total_funding_raised, ...}``.
      // ``new_investors_30d`` and ``investor_retention_rate`` are not
      // tracked server-side yet. The previous implementation derived
      // new_investors_30d as ``last_month_funding / 1000``, which
      // surfaced absurd values (e.g. "11 new investors" when the platform
      // had 2 investors total) — pure fabrication, not a metric. Both
      // fields stay 0 until the backend exposes them properly.
      const data = await apiClient.get<any>('/properties/owner/investment-metrics/');
      const overview = data?.portfolio_overview || {};
      const totalRaised = Number(overview.total_funding_raised ?? 0);
      const propertyCount = Number(overview.property_count ?? 0);
      return {
        total_capital_raised: totalRaised,
        average_investment:
          propertyCount > 0 ? Math.round(totalRaised / propertyCount) : 0,
        investor_retention_rate: 0,
        new_investors_30d: 0,
      };
    } catch (error) {
      console.error('Failed to fetch investment metrics:', error);
      return empty;
    }
  }

  /**
   * Get property documents across all owned properties
   */
  static async getPropertyDocuments(limit: number = 20): Promise<PropertyDocument[]> {
    try {
      // Backend returns ``{documents: [{id, name, document_type, size,
      // uploaded_at, download_url, property: {id, title, location}}], ...}``.
      // Map ``size`` → ``file_size``, ``download_url`` → ``url``, and lift
      // ``property.title`` → ``property_name`` for the list view.
      const data = await apiClient.get<any>('/properties/owner/documents/', {
        page_size: limit,
      });
      const rows = data?.documents || [];
      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        document_type: row.document_type,
        file_size: Number(row.size ?? row.file_size ?? 0),
        uploaded_at: row.uploaded_at,
        property_name: row.property?.title ?? row.property_name,
        url: row.download_url ?? row.url,
      }));
    } catch (error) {
      console.error('Failed to fetch property documents:', error);
      return [];
    }
  }

  /**
   * Get activity feed for property owner
   */
  static async getActivities(limit: number = 10): Promise<ActivityItem[]> {
    try {
      const response = await apiClient.get<{ activities: ActivityItem[] }>('/dashboard/activities/', {
        user_type: 'property_owner',
        limit
      });
      return response.activities || [];
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  }

  /**
   * Upload property document
   */
  static async uploadDocument(propertyId: string, file: File, documentType: string): Promise<PropertyDocument> {
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', documentType);

      const response = await apiClient.uploadFile<PropertyDocument>(`/properties/${propertyId}/documents/`, formData);
      return response;
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }

  /**
   * Get property performance comparison
   */
  static async getPropertyPerformanceComparison(): Promise<Array<{
    property_id: string;
    property_name: string;
    roi: number;
    monthly_revenue: number;
    occupancy_rate: number;
    token_price_change: number;
  }>> {
    try {
      const response = await apiClient.get<{ performance_data: any[] }>('/properties/owner/performance-comparison/');
      return response.performance_data || [];
    } catch (error) {
      console.error('Failed to fetch property performance comparison:', error);
      return [];
    }
  }

  /**
   * Generate property report
   */
  static async generatePropertyReport(propertyId: string, reportType: 'financial' | 'performance' | 'investor'): Promise<{ download_url: string }> {
    try {
      const response = await apiClient.post<{ download_url: string }>(`/properties/${propertyId}/reports/`, {
        report_type: reportType
      });
      return response;
    } catch (error) {
      console.error('Failed to generate property report:', error);
      throw error;
    }
  }

  /**
   * Distribute revenue to investors
   */
  static async distributeRevenue(propertyId: string, amount: number, distributionDate: string): Promise<{ message: string; transaction_id: string }> {
    try {
      const response = await apiClient.post<{ message: string; transaction_id: string }>(`/properties/${propertyId}/distribute-revenue/`, {
        amount,
        distribution_date: distributionDate
      });
      return response;
    } catch (error) {
      console.error('Failed to distribute revenue:', error);
      throw error;
    }
  }

  /**
   * Get revenue distribution history
   */
  static async getRevenueDistributionHistory(propertyId?: string, limit: number = 50): Promise<Array<{
    id: string;
    property_id: string;
    property_name: string;
    amount: number;
    distribution_date: string;
    investors_count: number;
    status: 'completed' | 'pending' | 'failed';
  }>> {
    try {
      const params: any = { limit };
      if (propertyId) {
        params.property_id = propertyId;
      }

      const response = await apiClient.get<{ distributions: any[] }>('/properties/owner/revenue-distributions/', params);
      return response.distributions || [];
    } catch (error) {
      console.error('Failed to fetch revenue distribution history:', error);
      return [];
    }
  }
}

export default PropertyOwnerService;