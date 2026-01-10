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
      const response = await apiClient.rawClient.get('/properties/owner/');
      const data = response.data;

      if (!data || !data.results) {
        console.warn('No properties found for owner');
        return [];
      }

      // Map backend response to frontend Property format
      return data.results.map((property: any) => ({
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
      const response = await apiClient.get<{ revenue_data: RevenueAnalyticsData[] }>('/properties/owner/revenue-analytics/', {
        period
      });
      return response.revenue_data || [];
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
      const response = await apiClient.get<{ tokenization_data: TokenizationAnalyticsData[] }>('/properties/owner/tokenization-analytics/', {
        period
      });
      return response.tokenization_data || [];
    } catch (error) {
      console.error('Failed to fetch tokenization analytics:', error);
      return [];
    }
  }

  /**
   * Get revenue statistics
   */
  static async getRevenueStats(): Promise<RevenueStats> {
    try {
      const response = await apiClient.get<RevenueStats>('/properties/owner/revenue-stats/');
      return response;
    } catch (error) {
      console.error('Failed to fetch revenue stats:', error);
      return {
        total_revenue: 0,
        total_revenue_change: '+0%',
        pending_distributions: 0,
        next_distribution_date: new Date().toISOString(),
        next_distribution_amount: 0,
        distribution_rate: 0,
        distribution_rate_change: '+0%'
      };
    }
  }

  /**
   * Get top investors across all properties
   */
  static async getTopInvestors(limit: number = 10): Promise<TopInvestor[]> {
    try {
      const response = await apiClient.get<{ investors: TopInvestor[] }>('/properties/owner/investors/', {
        limit
      });
      return response.investors || [];
    } catch (error) {
      console.error('Failed to fetch top investors:', error);
      return [];
    }
  }

  /**
   * Get investor analytics and segmentation
   */
  static async getInvestorAnalytics(): Promise<InvestorAnalytics> {
    try {
      const response = await apiClient.get<InvestorAnalytics>('/properties/owner/investor-analytics/');
      return response;
    } catch (error) {
      console.error('Failed to fetch investor analytics:', error);
      return {
        total_investors: 0,
        retail_investors: { count: 0, percentage: 0 },
        institutional_investors: { count: 0, percentage: 0 },
        high_net_worth: { count: 0, percentage: 0 }
      };
    }
  }

  /**
   * Get investment metrics
   */
  static async getInvestmentMetrics(): Promise<InvestmentMetrics> {
    try {
      const response = await apiClient.get<InvestmentMetrics>('/properties/owner/investment-metrics/');
      return response;
    } catch (error) {
      console.error('Failed to fetch investment metrics:', error);
      return {
        average_investment: 0,
        total_capital_raised: 0,
        investor_retention_rate: 0,
        new_investors_30d: 0
      };
    }
  }

  /**
   * Get property documents across all owned properties
   */
  static async getPropertyDocuments(limit: number = 20): Promise<PropertyDocument[]> {
    try {
      const response = await apiClient.get<{ documents: PropertyDocument[] }>('/properties/owner/documents/', {
        limit
      });
      return response.documents || [];
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