import { apiClient } from '../api/ApiClient';
import type { 
  User, 
  Property, 
  Investment, 
  Transaction,
  Portfolio,
  AnalyticsData 
} from '../api/types';

export interface DashboardStats {
  totalInvestments: number;
  totalValue: number;
  totalReturns: number;
  activeProperties: number;
  pendingTransactions: number;
  roi: number;
  monthlyIncome: number;
  portfolioGrowth: number;
}

export interface PropertyAnalytics {
  propertyId: string;
  name: string;
  performance: {
    currentValue: number;
    purchaseValue: number;
    appreciation: number;
    monthlyRental: number;
    occupancyRate: number;
    roi: number;
  };
  marketTrends: {
    date: string;
    value: number;
  }[];
  tokenMetrics: {
    totalTokens: number;
    ownedTokens: number;
    tokenPrice: number;
    marketCap: number;
  };
}

export interface InvestorProfile {
  user: User;
  kycStatus: string;
  investmentPreferences: {
    riskTolerance: 'low' | 'medium' | 'high';
    investmentGoals: string[];
    preferredPropertyTypes: string[];
    minInvestment: number;
    maxInvestment: number;
  };
  achievements: {
    title: string;
    description: string;
    earnedDate: string;
    icon: string;
  }[];
}

export interface CollaborativeInvestment {
  id: string;
  propertyId: string;
  propertyName: string;
  totalAmount: number;
  currentAmount: number;
  minimumContribution: number;
  investors: {
    userId: string;
    name: string;
    amount: number;
    percentage: number;
    joinedAt: string;
  }[];
  deadline: string;
  status: 'open' | 'closed' | 'completed';
}

export interface MarketInsights {
  trending: Property[];
  highYield: Property[];
  newListings: Property[];
  priceAlerts: {
    propertyId: string;
    propertyName: string;
    previousPrice: number;
    currentPrice: number;
    change: number;
    timestamp: string;
  }[];
  marketNews: {
    id: string;
    title: string;
    summary: string;
    url: string;
    publishedAt: string;
  }[];
}

export class DashboardService {
  /**
   * Get dashboard statistics for the current user
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<DashboardStats>('/dashboard/stats/');
      return response || {
        totalInvestments: 0,
        totalValue: 0,
        totalReturns: 0,
        activeProperties: 0,
        pendingTransactions: 0,
        roi: 0,
        monthlyIncome: 0,
        portfolioGrowth: 0
      };
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);

      // Handle specific error cases
      if (error?.code === 'AUTH_REQUIRED' || error?.code === 'AUTH_FAILED') {
        throw new Error('Please login to view your dashboard');
      }

      if (error?.code === 'NETWORK_ERROR') {
        throw new Error('Network connection failed. Please check your internet connection.');
      }

      // Return empty stats for new users or any errors
      return {
        totalInvestments: 0,
        totalValue: 0,
        totalReturns: 0,
        activeProperties: 0,
        pendingTransactions: 0,
        roi: 0,
        monthlyIncome: 0,
        portfolioGrowth: 0
      };
    }
  }

  /**
   * Get detailed portfolio data
   */
  static async getPortfolio(): Promise<Portfolio> {
    try {
      const response = await apiClient.get<Portfolio>('/portfolio/summary/');
      return response;
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      throw error;
    }
  }

  /**
   * Get portfolio performance data
   */
  static async getPortfolioPerformance(periodDays: number = 30): Promise<any> {
    try {
      const response = await apiClient.get('/portfolio/performance/', {
        period_days: periodDays
      });
      return response;
    } catch (error) {
      console.error('Failed to fetch portfolio performance:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
      const response = await apiClient.get<any>('/transactions/', {
        limit,
        ordering: '-created_at'
      });
      // Handle both array and paginated {results: [...]} formats
      if (Array.isArray(response)) {
        return response;
      }
      if (response?.results && Array.isArray(response.results)) {
        return response.results;
      }
      return response || [];
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }

  /**
   * Get property analytics for a specific property
   */
  static async getPropertyAnalytics(propertyId: string): Promise<PropertyAnalytics> {
    try {
      const response = await apiClient.get<PropertyAnalytics>(
        `/properties/${propertyId}/analytics/`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch property analytics:', error);
      throw error;
    }
  }

  /**
   * Get investor profile with preferences and achievements
   */
  static async getInvestorProfile(): Promise<InvestorProfile> {
    try {
      const response = await apiClient.get<InvestorProfile>('/auth/investor/profile/');
      return response;
    } catch (error) {
      console.error('Failed to fetch investor profile:', error);
      throw error;
    }
  }

  /**
   * Update investor preferences
   */
  static async updateInvestorPreferences(preferences: any): Promise<void> {
    try {
      await apiClient.patch('/auth/investor/preferences/', preferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Get collaborative investment opportunities
   */
  static async getCollaborativeInvestments(): Promise<CollaborativeInvestment[]> {
    try {
      const response = await apiClient.get<CollaborativeInvestment[]>(
        '/investments/collaborative/'
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch collaborative investments:', error);
      return [];
    }
  }

  /**
   * Join a collaborative investment
   */
  static async joinCollaborativeInvestment(
    investmentId: string,
    amount: number
  ): Promise<void> {
    try {
      await apiClient.post(`/investments/collaborative/${investmentId}/join/`, {
        amount
      });
    } catch (error) {
      console.error('Failed to join collaborative investment:', error);
      throw error;
    }
  }

  /**
   * Get market insights and trends
   */
  static async getMarketInsights(): Promise<MarketInsights> {
    try {
      const response = await apiClient.get<MarketInsights>('/properties/market/insights/');
      return response || {
        trending: [],
        highYield: [],
        newListings: [],
        priceAlerts: [],
        marketNews: []
      };
    } catch (error: any) {
      console.error('Failed to fetch market insights:', error);

      // Handle specific error cases
      if (error?.code === 'AUTH_REQUIRED' || error?.code === 'AUTH_FAILED') {
        throw new Error('Please login to view market insights');
      }

      if (error?.code === 'NETWORK_ERROR') {
        throw new Error('Failed to load market data. Please check your connection.');
      }

      // Return empty data for any other errors (server down, etc.)
      return {
        trending: [],
        highYield: [],
        newListings: [],
        priceAlerts: [],
        marketNews: []
      };
    }
  }

  /**
   * Get investment documents
   */
  static async getInvestmentDocuments(investmentId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/investments/${investmentId}/documents/`);
      return response;
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      return [];
    }
  }

  /**
   * Download document
   */
  static async downloadDocument(documentId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/documents/${documentId}/download/`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Failed to download document:', error);
      throw error;
    }
  }

  /**
   * Get analytics data for charts
   */
  static async getAnalyticsData(period: 'day' | 'week' | 'month' | 'year'): Promise<AnalyticsData> {
    try {
      const response = await apiClient.get<AnalyticsData>('/portfolio/analytics/', {
        period
      });
      return response;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw error;
    }
  }

  /**
   * Set price alert for a property
   */
  static async setPriceAlert(propertyId: string, targetPrice: number): Promise<void> {
    try {
      await apiClient.post('/alerts/price/', {
        property_id: propertyId,
        target_price: targetPrice
      });
    } catch (error) {
      console.error('Failed to set price alert:', error);
      throw error;
    }
  }

  /**
   * Get ROI projections
   */
  static async getROIProjections(investmentId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/investments/${investmentId}/roi-projections/`);
      return response;
    } catch (error) {
      console.error('Failed to fetch ROI projections:', error);
      throw error;
    }
  }
}