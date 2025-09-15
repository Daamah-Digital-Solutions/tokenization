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

export class BrokerService {
  /**
   * Get broker dashboard statistics
   */
  static async getBrokerStats(): Promise<BrokerStats> {
    try {
      return await apiClient.get<BrokerStats>('/brokers/stats');
    } catch (error) {
      console.error('Failed to get broker stats:', error);
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
      const params: any = { page, limit };
      if (status) params.status = status;

      return await apiClient.get('/brokers/commissions', params);
    } catch (error) {
      console.error('Failed to get commissions:', error);
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
      return await apiClient.get(`/brokers/commissions/${commissionId}`);
    } catch (error) {
      console.error('Failed to get commission details:', error);
      throw error;
    }
  }

  /**
   * Get referred clients
   */
  static async getReferredClients(page = 1, limit = 20): Promise<{
    clients: ReferralClient[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get('/brokers/clients', { page, limit });
    } catch (error) {
      console.error('Failed to get referred clients:', error);
      throw error;
    }
  }

  /**
   * Get client details
   */
  static async getClient(clientId: string): Promise<ReferralClient & {
    investments: Investment[];
    total_commissions_earned: number;
  }> {
    try {
      return await apiClient.get(`/brokers/clients/${clientId}`);
    } catch (error) {
      console.error('Failed to get client details:', error);
      throw error;
    }
  }

  /**
   * Get commission structure/tiers
   */
  static async getCommissionTiers(): Promise<{
    current_tier: CommissionTier;
    next_tier?: CommissionTier;
    progress_to_next: number;
    all_tiers: CommissionTier[];
  }> {
    try {
      return await apiClient.get('/brokers/commission-structure');
    } catch (error) {
      console.error('Failed to get commission structure:', error);
      throw error;
    }
  }

  /**
   * Generate new referral link
   */
  static async generateReferralLink(campaignName?: string): Promise<ReferralLink> {
    try {
      const data: any = {};
      if (campaignName) data.campaign_name = campaignName;

      return await apiClient.post<ReferralLink>('/brokers/referral-links', data);
    } catch (error) {
      console.error('Failed to generate referral link:', error);
      throw error;
    }
  }

  /**
   * Get all referral links
   */
  static async getReferralLinks(): Promise<ReferralLink[]> {
    try {
      return await apiClient.get<ReferralLink[]>('/brokers/referral-links');
    } catch (error) {
      console.error('Failed to get referral links:', error);
      throw error;
    }
  }

  /**
   * Update referral link
   */
  static async updateReferralLink(
    linkId: string, 
    updates: { campaign_name?: string; is_active?: boolean }
  ): Promise<ReferralLink> {
    try {
      return await apiClient.put<ReferralLink>(`/brokers/referral-links/${linkId}`, updates);
    } catch (error) {
      console.error('Failed to update referral link:', error);
      throw error;
    }
  }

  /**
   * Delete referral link
   */
  static async deleteReferralLink(linkId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/brokers/referral-links/${linkId}`);
    } catch (error) {
      console.error('Failed to delete referral link:', error);
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
      const params: any = { page, limit };
      if (type) params.type = type;

      return await apiClient.get('/brokers/marketing-materials', params);
    } catch (error) {
      console.error('Failed to get marketing materials:', error);
      throw error;
    }
  }

  /**
   * Download marketing material
   */
  static async downloadMarketingMaterial(materialId: string): Promise<{
    download_url: string;
    expires_at: Date;
  }> {
    try {
      return await apiClient.post(`/brokers/marketing-materials/${materialId}/download`);
    } catch (error) {
      console.error('Failed to download marketing material:', error);
      throw error;
    }
  }

  /**
   * Get performance analytics
   */
  static async getPerformanceAnalytics(period = '30days'): Promise<{
    referrals_over_time: Array<{
      date: string;
      new_referrals: number;
      conversions: number;
      commissions_earned: number;
    }>;
    top_properties: Array<{
      property_id: string;
      property_title: string;
      referrals: number;
      total_investment: number;
      commission_earned: number;
    }>;
    conversion_funnel: {
      clicks: number;
      signups: number;
      kyc_completed: number;
      first_investment: number;
      repeat_investors: number;
    };
    geographic_distribution: Array<{
      country: string;
      clients_count: number;
      total_investment: number;
    }>;
  }> {
    try {
      return await apiClient.get('/brokers/analytics', { period });
    } catch (error) {
      console.error('Failed to get performance analytics:', error);
      throw error;
    }
  }

  /**
   * Request commission payout
   */
  static async requestPayout(
    commissionIds: string[],
    paymentMethodId: string
  ): Promise<{
    payout_id: string;
    total_amount: number;
    processing_fee: number;
    net_amount: number;
    estimated_completion: Date;
    message: string;
  }> {
    try {
      return await apiClient.post('/brokers/payouts', {
        commission_ids: commissionIds,
        payment_method_id: paymentMethodId
      });
    } catch (error) {
      console.error('Failed to request payout:', error);
      throw error;
    }
  }

  /**
   * Get payout history
   */
  static async getPayouts(page = 1, limit = 20): Promise<{
    payouts: Array<{
      id: string;
      amount: number;
      processing_fee: number;
      net_amount: number;
      currency: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      payment_method: string;
      requested_at: Date;
      completed_at?: Date;
      commission_count: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get('/brokers/payouts', { page, limit });
    } catch (error) {
      console.error('Failed to get payouts:', error);
      throw error;
    }
  }

  /**
   * Get broker leaderboard
   */
  static async getLeaderboard(period = 'monthly', limit = 10): Promise<Array<{
    rank: number;
    broker_name: string;
    total_commissions: number;
    referral_count: number;
    conversion_rate: number;
    tier: string;
    is_current_user: boolean;
  }>> {
    try {
      return await apiClient.get('/brokers/leaderboard', { period, limit });
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      throw error;
    }
  }

  /**
   * Update broker profile
   */
  static async updateProfile(profileData: {
    business_name?: string;
    website?: string;
    bio?: string;
    specialization?: string[];
    license_number?: string;
    years_experience?: number;
    languages?: string[];
    social_links?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
  }): Promise<{ message: string }> {
    try {
      return await apiClient.put('/brokers/profile', profileData);
    } catch (error) {
      console.error('Failed to update broker profile:', error);
      throw error;
    }
  }

  /**
   * Get broker profile
   */
  static async getProfile(): Promise<{
    id: string;
    user_id: string;
    business_name?: string;
    website?: string;
    bio?: string;
    specialization: string[];
    license_number?: string;
    years_experience?: number;
    languages: string[];
    social_links?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
    verified: boolean;
    created_at: Date;
    updated_at: Date;
  }> {
    try {
      return await apiClient.get('/brokers/profile');
    } catch (error) {
      console.error('Failed to get broker profile:', error);
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

      return await apiClient.uploadFile('/brokers/verification', formData);
    } catch (error) {
      console.error('Failed to submit verification documents:', error);
      throw error;
    }
  }

  /**
   * Get verification status
   */
  static async getVerificationStatus(): Promise<{
    status: 'pending' | 'in_review' | 'approved' | 'rejected';
    submitted_at?: Date;
    reviewed_at?: Date;
    documents_required: string[];
    documents_submitted: string[];
    rejection_reason?: string;
    next_steps: string[];
  }> {
    try {
      return await apiClient.get('/brokers/verification/status');
    } catch (error) {
      console.error('Failed to get verification status:', error);
      throw error;
    }
  }

  /**
   * Get training materials
   */
  static async getTrainingMaterials(): Promise<Array<{
    id: string;
    title: string;
    description: string;
    type: 'video' | 'pdf' | 'webinar' | 'course';
    duration?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    url: string;
    completed: boolean;
    completion_date?: Date;
  }>> {
    try {
      return await apiClient.get('/brokers/training');
    } catch (error) {
      console.error('Failed to get training materials:', error);
      throw error;
    }
  }

  /**
   * Mark training material as completed
   */
  static async completeTraining(trainingId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/brokers/training/${trainingId}/complete`);
    } catch (error) {
      console.error('Failed to mark training as completed:', error);
      throw error;
    }
  }
}

export default BrokerService;