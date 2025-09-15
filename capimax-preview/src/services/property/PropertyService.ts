import { apiClient } from '../api/ApiClient';
import type { 
  Property, 
  PropertyCreateData, 
  PropertyFilterOptions,
  PropertyStatus,
  Investment 
} from '../api/types';

export interface PropertySearchResult {
  properties: Property[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters_applied: PropertyFilterOptions;
}

export interface PropertyAnalytics {
  total_value: number;
  tokens_sold: number;
  tokens_remaining: number;
  funding_percentage: number;
  investor_count: number;
  average_investment: number;
  roi_projection: number;
  rental_yield: number;
  appreciation_rate: number;
}

export interface PropertyDocuments {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploaded_at: Date;
  description?: string;
}

export interface PropertyUpdate {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'financial' | 'construction' | 'legal';
  images?: string[];
  documents?: string[];
  created_at: Date;
}

export class PropertyService {
  /**
   * Get all properties with filtering and pagination
   */
  static async getProperties(filters?: PropertyFilterOptions): Promise<PropertySearchResult> {
    try {
      const response = await apiClient.get<any>('/properties', filters);
      
      // Map backend response to frontend format
      const mappedProperties: Property[] = response.properties.map((property: any) => ({
        id: property.id,
        title: property.title,
        description: property.description,
        property_type: property.propertyType || property.property_type,
        status: property.status as PropertyStatus,
        total_value: property.totalValue || property.total_value,
        token_price: property.tokenPrice || property.token_price,
        total_tokens: property.totalTokens || property.total_tokens,
        tokens_sold: property.tokensSold || property.tokens_sold,
        expected_return: property.expectedReturn || property.expected_return,
        rental_yield: property.rentalYield || property.rental_yield,
        property_size: property.propertySize || property.property_size,
        year_built: property.yearBuilt || property.year_built,
        address: property.address,
        city: property.city,
        state: property.state,
        country: property.country,
        coordinates: property.coordinates,
        images: property.images || [],
        documents: property.documents || [],
        smart_contract_address: property.smartContractAddress || property.smart_contract_address,
        owner_id: property.ownerId || property.owner_id,
        created_at: new Date(property.createdAt || property.created_at),
        updated_at: new Date(property.updatedAt || property.updated_at)
      }));

      return {
        properties: mappedProperties,
        pagination: {
          page: response.pagination.currentPage,
          limit: response.pagination.itemsPerPage,
          total: response.pagination.totalItems,
          pages: response.pagination.totalPages
        },
        filters_applied: filters || {}
      };
    } catch (error) {
      console.error('Failed to get properties:', error);
      throw error;
    }
  }

  /**
   * Get property by ID
   */
  static async getProperty(propertyId: string): Promise<Property> {
    try {
      const response = await apiClient.get<any>(`/properties/${propertyId}`);
      const property = response.property;
      
      // Map backend response to frontend format
      return {
        id: property.id,
        title: property.title,
        description: property.description,
        property_type: property.propertyType || property.property_type,
        status: property.status as PropertyStatus,
        total_value: property.totalValue || property.total_value,
        token_price: property.tokenPrice || property.token_price,
        total_tokens: property.totalTokens || property.total_tokens,
        tokens_sold: property.tokensSold || property.tokens_sold,
        expected_return: property.expectedReturn || property.expected_return,
        rental_yield: property.rentalYield || property.rental_yield,
        property_size: property.propertySize || property.property_size,
        year_built: property.yearBuilt || property.year_built,
        address: property.address,
        city: property.city,
        state: property.state,
        country: property.country,
        coordinates: property.coordinates,
        images: property.images || [],
        documents: property.documents || [],
        smart_contract_address: property.smartContractAddress || property.smart_contract_address,
        owner_id: property.ownerId || property.owner_id,
        created_at: new Date(property.createdAt || property.created_at),
        updated_at: new Date(property.updatedAt || property.updated_at)
      };
    } catch (error) {
      console.error('Failed to get property:', error);
      throw error;
    }
  }

  /**
   * Create new property (property owner only)
   */
  static async createProperty(propertyData: PropertyCreateData): Promise<Property> {
    try {
      return await apiClient.post<Property>('/properties', propertyData);
    } catch (error) {
      console.error('Failed to create property:', error);
      throw error;
    }
  }

  /**
   * Update property
   */
  static async updateProperty(propertyId: string, updates: Partial<PropertyCreateData>): Promise<Property> {
    try {
      return await apiClient.put<Property>(`/properties/${propertyId}`, updates);
    } catch (error) {
      console.error('Failed to update property:', error);
      throw error;
    }
  }

  /**
   * Delete property
   */
  static async deleteProperty(propertyId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/properties/${propertyId}`);
    } catch (error) {
      console.error('Failed to delete property:', error);
      throw error;
    }
  }

  /**
   * Upload property images
   */
  static async uploadImages(propertyId: string, images: File[]): Promise<{ images: string[] }> {
    try {
      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
      });

      return await apiClient.uploadFile(`/properties/${propertyId}/images`, formData);
    } catch (error) {
      console.error('Failed to upload property images:', error);
      throw error;
    }
  }

  /**
   * Upload property documents
   */
  static async uploadDocuments(propertyId: string, documents: File[]): Promise<{ documents: PropertyDocuments[] }> {
    try {
      const formData = new FormData();
      documents.forEach((doc, index) => {
        formData.append(`documents[${index}]`, doc);
      });

      return await apiClient.uploadFile(`/properties/${propertyId}/documents`, formData);
    } catch (error) {
      console.error('Failed to upload property documents:', error);
      throw error;
    }
  }

  /**
   * Get property analytics
   */
  static async getPropertyAnalytics(propertyId: string): Promise<PropertyAnalytics> {
    try {
      return await apiClient.get<PropertyAnalytics>(`/properties/${propertyId}/analytics`);
    } catch (error) {
      console.error('Failed to get property analytics:', error);
      throw error;
    }
  }

  /**
   * Get property investors
   */
  static async getPropertyInvestors(propertyId: string, page = 1, limit = 20): Promise<{
    investors: Array<{
      id: string;
      name: string;
      avatar?: string;
      tokens_owned: number;
      investment_amount: number;
      investment_date: Date;
      ownership_percentage: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get(`/properties/${propertyId}/investors`, { page, limit });
    } catch (error) {
      console.error('Failed to get property investors:', error);
      throw error;
    }
  }

  /**
   * Get property investment history
   */
  static async getInvestmentHistory(propertyId: string, page = 1, limit = 20): Promise<{
    investments: Investment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get(`/properties/${propertyId}/investments`, { page, limit });
    } catch (error) {
      console.error('Failed to get investment history:', error);
      throw error;
    }
  }

  /**
   * Get property documents
   */
  static async getDocuments(propertyId: string): Promise<PropertyDocuments[]> {
    try {
      return await apiClient.get<PropertyDocuments[]>(`/properties/${propertyId}/documents`);
    } catch (error) {
      console.error('Failed to get property documents:', error);
      throw error;
    }
  }

  /**
   * Get property updates/news
   */
  static async getPropertyUpdates(propertyId: string, page = 1, limit = 10): Promise<{
    updates: PropertyUpdate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get(`/properties/${propertyId}/updates`, { page, limit });
    } catch (error) {
      console.error('Failed to get property updates:', error);
      throw error;
    }
  }

  /**
   * Add property update (property owner only)
   */
  static async addPropertyUpdate(propertyId: string, update: {
    title: string;
    content: string;
    type: 'general' | 'financial' | 'construction' | 'legal';
    images?: File[];
    documents?: File[];
  }): Promise<PropertyUpdate> {
    try {
      const formData = new FormData();
      formData.append('title', update.title);
      formData.append('content', update.content);
      formData.append('type', update.type);

      if (update.images) {
        update.images.forEach((image, index) => {
          formData.append(`images[${index}]`, image);
        });
      }

      if (update.documents) {
        update.documents.forEach((doc, index) => {
          formData.append(`documents[${index}]`, doc);
        });
      }

      return await apiClient.uploadFile(`/properties/${propertyId}/updates`, formData);
    } catch (error) {
      console.error('Failed to add property update:', error);
      throw error;
    }
  }

  /**
   * Submit property for approval
   */
  static async submitForApproval(propertyId: string): Promise<{ message: string; submission_id: string }> {
    try {
      return await apiClient.post(`/properties/${propertyId}/submit`);
    } catch (error) {
      console.error('Failed to submit property for approval:', error);
      throw error;
    }
  }

  /**
   * Get featured properties
   */
  static async getFeaturedProperties(limit = 6): Promise<Property[]> {
    try {
      return await apiClient.get<Property[]>('/properties/featured', { limit });
    } catch (error) {
      console.error('Failed to get featured properties:', error);
      throw error;
    }
  }

  /**
   * Get trending properties
   */
  static async getTrendingProperties(limit = 6): Promise<Property[]> {
    try {
      return await apiClient.get<Property[]>('/properties/trending', { limit });
    } catch (error) {
      console.error('Failed to get trending properties:', error);
      throw error;
    }
  }

  /**
   * Get properties by location
   */
  static async getPropertiesByLocation(
    latitude: number, 
    longitude: number, 
    radius: number = 10,
    limit = 20
  ): Promise<Property[]> {
    try {
      return await apiClient.get<Property[]>('/properties/nearby', {
        lat: latitude,
        lng: longitude,
        radius,
        limit
      });
    } catch (error) {
      console.error('Failed to get properties by location:', error);
      throw error;
    }
  }

  /**
   * Search properties
   */
  static async searchProperties(query: string, filters?: PropertyFilterOptions): Promise<PropertySearchResult> {
    try {
      return await apiClient.get<PropertySearchResult>('/properties/search', {
        q: query,
        ...filters
      });
    } catch (error) {
      console.error('Failed to search properties:', error);
      throw error;
    }
  }

  /**
   * Get property price history
   */
  static async getPriceHistory(propertyId: string, period = '1year'): Promise<Array<{
    date: string;
    token_price: number;
    market_value: number;
    volume: number;
  }>> {
    try {
      return await apiClient.get(`/properties/${propertyId}/price-history`, { period });
    } catch (error) {
      console.error('Failed to get price history:', error);
      throw error;
    }
  }

  /**
   * Get property valuation
   */
  static async getValuation(propertyId: string): Promise<{
    current_value: number;
    last_valuation_date: Date;
    valuation_method: string;
    comparable_properties: Array<{
      address: string;
      sale_price: number;
      sale_date: Date;
      distance: number;
    }>;
    market_trends: {
      appreciation_rate: number;
      market_sentiment: 'bullish' | 'bearish' | 'neutral';
      forecast_6months: number;
      forecast_12months: number;
    };
  }> {
    try {
      return await apiClient.get(`/properties/${propertyId}/valuation`);
    } catch (error) {
      console.error('Failed to get property valuation:', error);
      throw error;
    }
  }

  /**
   * Subscribe to property updates
   */
  static async subscribeToUpdates(propertyId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/properties/${propertyId}/subscribe`);
    } catch (error) {
      console.error('Failed to subscribe to property updates:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from property updates
   */
  static async unsubscribeFromUpdates(propertyId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/properties/${propertyId}/subscribe`);
    } catch (error) {
      console.error('Failed to unsubscribe from property updates:', error);
      throw error;
    }
  }

  /**
   * Report property issue
   */
  static async reportIssue(propertyId: string, issue: {
    type: 'incorrect_information' | 'fraud' | 'technical' | 'other';
    description: string;
    evidence?: File[];
  }): Promise<{ report_id: string; message: string }> {
    try {
      const formData = new FormData();
      formData.append('type', issue.type);
      formData.append('description', issue.description);

      if (issue.evidence) {
        issue.evidence.forEach((file, index) => {
          formData.append(`evidence[${index}]`, file);
        });
      }

      return await apiClient.uploadFile(`/properties/${propertyId}/report`, formData);
    } catch (error) {
      console.error('Failed to report property issue:', error);
      throw error;
    }
  }
}

export default PropertyService;