import { apiClient } from '../api/ApiClient';
import type { 
  BrokerCommission,
  CommissionStatus,
  Investment,
  Property,
  User 
} from '../api/types';

export interface BrokerStats {
  total_referrals: number;
  active_clients: number;
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  conversion_rate: number;
  average_commission: number;
  this_month_earnings: number;
  last_month_earnings: number;
  growth_percentage: number;
}

export interface ReferralClient {
  id: string;
  name: string;
  email: string;
  joined_date: Date;
  total_invested: number;
  investments_count: number;
  last_investment_date?: Date;
  status: 'active' | 'inactive' | 'pending_kyc';
  lifetime_value: number;
  referral_code_used: string;
}

export interface CommissionTier {
  tier_name: string;
  min_volume: number;
  max_volume?: number;
  commission_rate: number;
  bonus_rate?: number;
  requirements: string[];
  benefits: string[];
}

export interface ReferralLink {
  id: string;
  code: string;
  url: string;
  campaign_name?: string;
  clicks: number;
  conversions: number;
  conversion_rate: number;
  created_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

export interface MarketingMaterial {
  id: string;
  type: 'banner' | 'email_template' | 'social_post' | 'brochure' | 'presentation';
  title: string;
  description: string;
  file_url?: string;
  preview_url?: string;
  download_count: number;
  created_at: Date;
  tags: string[];
}

export interface BrokerApplication {
  id?: string;
  full_name: string;
  email: string;
  phone_number: string;
  company_name?: string;
  license_number?: string;
  years_of_experience: number;
  specialization: string;
  linkedin_url?: string;
  portfolio_url?: string;
  motivation: string;
  target_market?: string;
  expected_clients?: number;
  status?: 'pending' | 'approved' | 'rejected';
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export interface BrokerDashboard {
  profile: {
    id: string;
    user: {
      id: string;
      email: string;
      full_name: string;
    };
    license_number?: string;
    years_of_experience: number;
    specialization: string;
    commission_rate: number;
    status: 'active' | 'inactive' | 'suspended';
    total_earned: number;
    total_referrals: number;
    successful_referrals: number;
  };
  total_earned: number;
  pending_commission: number;
  total_referrals: number;
  successful_referrals: number;
  conversion_rate: number;
  recent_commissions: BrokerCommission[];
  recent_referrals: any[];
  monthly_performance: any[];
}

export interface CommissionSummary {
  total_earned: number;
  pending_amount: number;
  paid_amount: number;
  total_commissions: number;
  this_month_earned: number;
  last_month_earned: number;
}

export class BrokerService {
  /**
   * Submit broker application
   */
  static async submitApplication(data: BrokerApplication): Promise<BrokerApplication> {
    try {
      return await apiClient.post<BrokerApplication>('/broker/applications/submit/', data);
    } catch (error) {
      console.error('Failed to submit broker application:', error);
      throw error;
    }
  }

  /**
   * Get application status
   */
  static async getApplicationStatus(applicationId: string): Promise<BrokerApplication> {
    try {
      return await apiClient.get<BrokerApplication>(`/broker/applications/status/${applicationId}/`);
    } catch (error) {
      console.error('Failed to get application status:', error);
      throw error;
    }
  }

  /**
   * Get broker dashboard data
   */
  static async getDashboard(): Promise<BrokerDashboard> {
    try {
      return await apiClient.get<BrokerDashboard>('/broker/dashboard/');
    } catch (error) {
      console.error('Failed to get broker dashboard:', error);
      throw error;
    }
  }

  /**
   * Get broker commissions
   */
  static async getCommissions(
    page = 1,
    limit = 20,
    status?: CommissionStatus
  ): Promise<{
    commissions: BrokerCommission[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params: any = { page, page_size: limit };
      if (status) params.status = status;

      const response = await apiClient.get('/broker/commissions/', params);
      return {
        commissions: response.results || response,
        pagination: {
          page,
          limit,
          total: response.count || 0,
          pages: Math.ceil((response.count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get commissions:', error);
      throw error;
    }
  }

  /**
   * Get commission summary
   */
  static async getCommissionSummary(): Promise<CommissionSummary> {
    try {
      return await apiClient.get<CommissionSummary>('/broker/commissions/summary/');
    } catch (error) {
      console.error('Failed to get commission summary:', error);
      throw error;
    }
  }

  /**
   * Get commission details
   */
  static async getCommission(commissionId: string): Promise<BrokerCommission & {
    investment: Investment;
    client: User;
    property: Property;
  }> {
    try {
      return await apiClient.get(`/broker/commissions/${commissionId}/`);
    } catch (error) {
      console.error('Failed to get commission details:', error);
      throw error;
    }
  }

  /**
   * Get broker referrals
   */
  static async getReferrals(page = 1, limit = 20, status?: string): Promise<{
    referrals: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params: any = { page, page_size: limit };
      if (status) params.status = status;

      const response = await apiClient.get('/broker/referrals/', params);
      return {
        referrals: response.results || response,
        pagination: {
          page,
          limit,
          total: response.count || 0,
          pages: Math.ceil((response.count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get referrals:', error);
      throw error;
    }
  }

  /**
   * Generate new referral link
   */
  static async generateReferralLink(propertyId?: string): Promise<{
    referral_code: string;
    referral_link: string;
    expires_at: string;
  }> {
    try {
      const data: any = {};
      if (propertyId) data.property_id = propertyId;

      return await apiClient.post('/broker/referrals/generate/', data);
    } catch (error) {
      console.error('Failed to generate referral link:', error);
      throw error;
    }
  }

  /**
   * Refer a specific client by email. Creates a tracked BrokerReferral the
   * client can be invited to sign up against; returns it (incl. referral_code).
   */
  static async createReferral(referredEmail: string, notes?: string): Promise<any> {
    try {
      return await apiClient.post('/broker/referrals/', {
        referred_email: referredEmail,
        ...(notes ? { notes } : {}),
      });
    } catch (error) {
      console.error('Failed to create referral:', error);
      throw error;
    }
  }

  /**
   * Get marketing materials
   */
  static async getMarketingMaterials(
    type?: string,
    page = 1,
    limit = 20
  ): Promise<{
    materials: MarketingMaterial[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params: any = { page, page_size: limit };
      if (type) params.material_type = type;

      const response = await apiClient.get('/broker/materials/', params);
      return {
        materials: response.results || response,
        pagination: {
          page,
          limit,
          total: response.count || 0,
          pages: Math.ceil((response.count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get marketing materials:', error);
      throw error;
    }
  }

  /**
   * Download marketing material
   */
  static async downloadMarketingMaterial(materialId: string): Promise<Blob> {
    try {
      // Bypass the wrapped ApiClient because the response is a binary blob,
      // not a JSON envelope. Send credentials so the auth cookies travel.
      const response = await apiClient.rawClient.get(
        `/broker/materials/${materialId}/download/`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to download marketing material:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await apiClient.get('/broker/performance/', params);
      return response.results || response;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get broker profile
   */
  static async getProfile(): Promise<{
    id: string;
    user: {
      id: string;
      email: string;
      full_name: string;
    };
    license_number?: string;
    years_of_experience: number;
    specialization: string;
    company_name?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    commission_rate: number;
    status: 'active' | 'inactive' | 'suspended';
    total_earned: number;
    total_referrals: number;
    successful_referrals: number;
    created_at: string;
    updated_at: string;
  }> {
    try {
      return await apiClient.get('/broker/profile/');
    } catch (error) {
      console.error('Failed to get broker profile:', error);
      throw error;
    }
  }

  /**
   * Update broker profile
   */
  static async updateProfile(profileData: Partial<{
    license_number: string;
    years_of_experience: number;
    specialization: string;
    company_name: string;
    linkedin_url: string;
    portfolio_url: string;
  }>): Promise<{ message: string }> {
    try {
      return await apiClient.put('/broker/profile/', profileData);
    } catch (error) {
      console.error('Failed to update broker profile:', error);
      throw error;
    }
  }

  /**
   * Submit verification documents
   */
  static async submitVerificationDocuments(documents: {
    license_document: File;
    business_registration?: File;
    insurance_certificate?: File;
  }): Promise<{ message: string; verification_id: string }> {
    try {
      const formData = new FormData();
      formData.append('license_document', documents.license_document);

      if (documents.business_registration) {
        formData.append('business_registration', documents.business_registration);
      }

      if (documents.insurance_certificate) {
        formData.append('insurance_certificate', documents.insurance_certificate);
      }

      return await apiClient.uploadFile('/broker/verification/submit/', formData);
    } catch (error) {
      console.error('Failed to submit verification documents:', error);
      throw error;
    }
  }

  // Admin Methods

  /**
   * Admin: Get all broker applications
   */
  static async getAllApplications(page = 1, limit = 20, status?: string): Promise<{
    applications: BrokerApplication[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params: any = { page, page_size: limit };
      if (status) params.status = status;

      const response = await apiClient.get('/broker/admin/applications/', params);
      return {
        applications: response.results || response,
        pagination: {
          page,
          limit,
          total: response.count || 0,
          pages: Math.ceil((response.count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get broker applications:', error);
      throw error;
    }
  }

  /**
   * Admin: Get broker application details
   */
  static async getApplicationDetails(applicationId: string): Promise<BrokerApplication> {
    try {
      return await apiClient.get(`/broker/admin/applications/${applicationId}/`);
    } catch (error) {
      console.error('Failed to get application details:', error);
      throw error;
    }
  }

  /**
   * Admin: Approve broker application
   */
  static async approveApplication(applicationId: string, commissionRate?: number): Promise<{
    message: string;
    user_id: string;
    broker_profile_id: string;
  }> {
    try {
      const data: any = {};
      if (commissionRate) data.commission_rate = commissionRate;

      return await apiClient.post(`/broker/admin/applications/${applicationId}/approve/`, data);
    } catch (error) {
      console.error('Failed to approve application:', error);
      throw error;
    }
  }

  /**
   * Admin: Reject broker application
   */
  static async rejectApplication(applicationId: string, reason: string): Promise<{
    message: string;
  }> {
    try {
      return await apiClient.post(`/broker/admin/applications/${applicationId}/reject/`, { reason });
    } catch (error) {
      console.error('Failed to reject application:', error);
      throw error;
    }
  }

  /**
   * Admin: Get all brokers
   */
  static async getAllBrokers(page = 1, limit = 20, status?: string): Promise<{
    brokers: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params: any = { page, page_size: limit };
      if (status) params.status = status;

      const response = await apiClient.get('/broker/admin/brokers/', params);
      return {
        brokers: response.results || response,
        pagination: {
          page,
          limit,
          total: response.count || 0,
          pages: Math.ceil((response.count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get brokers:', error);
      throw error;
    }
  }

  /**
   * Admin: Get all broker commissions
   */
  static async getAllCommissions(page = 1, limit = 20): Promise<{
    commissions: BrokerCommission[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params = { page, page_size: limit };
      const response = await apiClient.get('/broker/admin/commissions/', params);

      return {
        commissions: response.results || response,
        pagination: {
          page,
          limit,
          total: response.count || 0,
          pages: Math.ceil((response.count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get all commissions:', error);
      throw error;
    }
  }

  /**
   * Admin: Approve broker commission
   */
  static async approveCommission(commissionId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/broker/admin/commissions/${commissionId}/approve/`);
    } catch (error) {
      console.error('Failed to approve commission:', error);
      throw error;
    }
  }
}

export default BrokerService;