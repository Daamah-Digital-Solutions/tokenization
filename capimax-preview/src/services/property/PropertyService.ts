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
      // Use the correct API endpoint format
      // Note: We need to use the raw axios client instead of the wrapped apiClient.get
      // because the backend returns DRF format directly, not wrapped in {data: ...}
      const response = await apiClient.rawClient.get('/properties/', {
        params: filters
      });

      // The response.data contains the DRF response directly
      const data = response.data;

      // Check if response exists
      if (!data) {
        throw new Error('No response received from properties API');
      }

      // Check if response has results
      if (!data.results) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format: missing results array');
      }

      // Map backend response to frontend format (backend returns DRF paginated format)
      const mappedProperties: Property[] = data.results.map((property: any) => ({
        id: property.id,
        title: property.title,
        description: property.description,
        property_type: property.property_type,
        status: property.status as PropertyStatus,
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
        // Additional fields from the backend
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

      return {
        properties: mappedProperties,
        pagination: {
          page: data.current_page,
          limit: data.page_size,
          total: data.count,
          pages: data.total_pages
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
      // Use rawClient because backend returns DRF format directly, not wrapped in {data: ...}
      const response = await apiClient.rawClient.get(`/properties/${propertyId}/`);
      const property = response.data;

      if (!property) {
        throw new Error('No property data received');
      }

      // Map backend response to frontend format
      return {
        id: property.id,
        title: property.title,
        description: property.description,
        property_type: property.property_type,
        property_category: property.property_category,
        status: property.status as PropertyStatus,
        total_value: parseFloat(property.total_value),
        token_price: parseFloat(property.token_price),
        total_tokens: property.total_tokens,
        tokens_sold: property.tokens_sold,
        tokens_available: property.tokens_available,
        funding_percentage: property.funding_percentage,
        is_fully_funded: property.is_fully_funded,
        can_accept_investments: property.can_accept_investments,
        expected_return: parseFloat(property.expected_return),
        rental_yield: parseFloat(property.rental_yield),
        property_size: parseFloat(property.property_size),
        year_built: property.year_built,
        address: property.address || '',
        city: property.city,
        state: property.state || '',
        country: property.country,
        coordinates: property.coordinates,
        images: property.images && property.images.length > 0
          ? property.images.map((img: any) => img.image || img.image_url || img)
          : (property.primary_image ? [property.primary_image] : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"]),
        documents: property.documents || [],
        smart_contract_address: property.smart_contract_address,
        owner_id: property.owner?.id || property.owner_id,
        created_at: new Date(property.created_at),
        updated_at: new Date(property.updated_at),
        // Additional fields from detail serializer
        is_under_construction: property.is_under_construction,
        is_ready_property: property.is_ready_property,
        construction_status_display: property.construction_status_display,
        construction_progress: property.construction_progress,
        estimated_monthly_return: property.estimated_monthly_return,
        expected_completion_date: property.expected_completion_date,
        monthly_rental_income: parseFloat(property.monthly_rental_income || 0),
        occupancy_rate: parseFloat(property.occupancy_rate || 0),
        rental_income_active: property.rental_income_active,
        supports_installments: property.supports_installments,
        installment_period_months: property.installment_period_months,
        featured: property.featured,
        minimum_investment: parseFloat(property.minimum_investment || property.token_price),
        average_rating: property.average_rating,
        total_reviews: property.total_reviews,
        investor_count: property.investor_count,
        total_investment: property.total_investment
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
      return await apiClient.post<Property>('/properties/', propertyData);
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
      return await apiClient.patch<Property>(`/properties/${propertyId}/`, updates);
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
      return await apiClient.delete(`/properties/${propertyId}/`);
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
      return await apiClient.get<PropertyAnalytics>(`/properties/${propertyId}/analytics/`);
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
      return await apiClient.get(`/properties/${propertyId}/investors/`, { page, limit });
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
      return await apiClient.get(`/properties/${propertyId}/investments/`, { page, limit });
    } catch (error) {
      console.error('Failed to get investment history:', error);
      throw error;
    }
  }

  /**
   * Get property documents.
   *
   * The legacy `/documents/` route is upload-only (POST). Documents the
   * investor can browse live in the data room — same data, different
   * endpoint with proper permissioning.
   */
  static async getDocuments(propertyId: string): Promise<PropertyDocuments[]> {
    try {
      return await apiClient.get<PropertyDocuments[]>(`/properties/${propertyId}/data-room/`);
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
      return await apiClient.get(`/properties/${propertyId}/updates/`, { page, limit });
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

      return await apiClient.uploadFile(`/properties/${propertyId}/updates/`, formData);
    } catch (error) {
      console.error('Failed to add property update:', error);
      throw error;
    }
  }

  /**
   * Upload a single property image
   */
  static async uploadPropertyImage(propertyId: string, formData: FormData): Promise<any> {
    try {
      return await apiClient.uploadFile(`/properties/${propertyId}/images/`, formData);
    } catch (error) {
      console.error('Failed to upload property image:', error);
      throw error;
    }
  }

  /**
   * Upload a single property document
   */
  static async uploadPropertyDocument(propertyId: string, formData: FormData): Promise<any> {
    try {
      return await apiClient.uploadFile(`/properties/${propertyId}/documents/`, formData);
    } catch (error) {
      console.error('Failed to upload property document:', error);
      throw error;
    }
  }

  /**
   * Submit property for approval
   */
  static async submitForApproval(propertyId: string): Promise<{ message: string; submission_id: string }> {
    try {
      return await apiClient.post(`/properties/${propertyId}/submit-for-approval/`);
    } catch (error) {
      console.error('Failed to submit property for approval:', error);
      throw error;
    }
  }

  /**
   * Submit property for approval (alias for consistency with components)
   */
  static async submitPropertyForApproval(propertyId: string): Promise<{ message: string; submission_id: string }> {
    return this.submitForApproval(propertyId);
  }

  /**
   * Get featured properties
   */
  static async getFeaturedProperties(limit = 6): Promise<Property[]> {
    try {
      const response = await apiClient.rawClient.get('/properties/featured/', {
        params: { limit }
      });

      const data = response.data;

      if (!data || !data.results) {
        throw new Error('Invalid response format from featured properties API');
      }

      // Map backend response to frontend format
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
      console.error('Failed to get featured properties:', error);
      throw error;
    }
  }

  /**
   * Get trending properties
   */
  static async getTrendingProperties(limit = 6): Promise<Property[]> {
    try {
      return await apiClient.get<Property[]>('/properties/trending/', { limit });
    } catch (error) {
      console.error('Failed to get trending properties:', error);
      throw error;
    }
  }

  /**
   * Get properties by location.
   *
   * No backend endpoint exists yet — the search route supports city/country
   * filtering but not lat/lng radius. Surface the gap rather than 404.
   */
  static async getPropertiesByLocation(
    _latitude: number,
    _longitude: number,
    _radius: number = 10,
    _limit = 20
  ): Promise<Property[]> {
    throw new Error('Geo-radius property search is not yet implemented on the backend.');
  }

  /**
   * Search properties
   */
  static async searchProperties(query: string, filters?: PropertyFilterOptions): Promise<PropertySearchResult> {
    try {
      return await apiClient.get<PropertySearchResult>('/properties/search/', {
        q: query,
        ...filters
      });
    } catch (error) {
      console.error('Failed to search properties:', error);
      throw error;
    }
  }

  /**
   * Get property price history.
   *
   * Phantom endpoint — no backend implementation. The marketplace
   * analytics surface provides token volume data; appreciation lives in
   * the property analytics endpoint.
   */
  static async getPriceHistory(_propertyId: string, _period = '1year'): Promise<Array<{
    date: string;
    token_price: number;
    market_value: number;
    volume: number;
  }>> {
    throw new Error('Property price history endpoint is not yet implemented.');
  }

  /**
   * Get property valuation.
   *
   * Phantom — backend stores valuations but exposes them only via the
   * analytics endpoint's `current_valuation` / `appreciation_rate` fields.
   */
  static async getValuation(_propertyId: string): Promise<{
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
    throw new Error('Property valuation endpoint is not yet implemented. Use getPropertyAnalytics() instead.');
  }

  /**
   * Subscribe to property updates.
   *
   * Backend exposes one POST endpoint that toggles via a `subscribe`
   * boolean, not separate subscribe/unsubscribe routes.
   */
  static async subscribeToUpdates(propertyId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/properties/${propertyId}/subscribe/`, { subscribe: true });
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
      return await apiClient.post(`/properties/${propertyId}/subscribe/`, { subscribe: false });
    } catch (error) {
      console.error('Failed to unsubscribe from property updates:', error);
      throw error;
    }
  }

  /**
   * Report property issue.
   *
   * No backend endpoint yet — issue reporting goes through the support
   * channel for now. Throw rather than 404 silently.
   */
  static async reportIssue(_propertyId: string, _issue: {
    type: 'incorrect_information' | 'fraud' | 'technical' | 'other';
    description: string;
    evidence?: File[];
  }): Promise<{ report_id: string; message: string }> {
    throw new Error('Property issue reporting is not yet implemented. Contact support directly.');
  }
}

export default PropertyService;