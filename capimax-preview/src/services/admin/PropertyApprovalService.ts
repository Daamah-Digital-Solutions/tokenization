import { apiClient } from '../api/ApiClient';

export interface PropertyApproval {
  id: string;
  property_id: string;
  property: {
    id: string;
    title: string;
    description: string;
    property_type: string;
    total_value: number;
    token_price: number;
    total_tokens: number;
    city: string;
    country: string;
    owner: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
    images: Array<{
      id: string;
      image: string;
      alt_text: string;
    }>;
    documents: Array<{
      id: string;
      name: string;
      file: string;
      document_type: string;
      upload_date: string;
    }>;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_changes';
  review_notes: string;
  required_changes: string;
  reviewer?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  submitted_at: Date;
  reviewed_at?: Date;
  approved_at?: Date;
}

export interface ApprovalAction {
  action: 'approve' | 'reject' | 'request_changes' | 'start_review';
  review_notes?: string;
  required_changes?: string;
}

export interface ApprovalStats {
  total_pending: number;
  total_under_review: number;
  total_approved_this_month: number;
  total_rejected_this_month: number;
  average_review_time_days: number;
  pending_overdue: number;
}

export class PropertyApprovalService {
  /**
   * Get all pending property approvals
   */
  static async getPendingApprovals(page = 1, limit = 10): Promise<{
    approvals: PropertyApproval[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response: any = await apiClient.get('/admin/property-approvals/', {
        page,
        page_size: limit,
        status: 'pending'
      });

      // DRF paginated response: { count, next, previous, results }.
      // There is no `pagination` sub-object — build one from `count`.
      const results = response?.results ?? [];
      const total = Number(response?.count ?? results.length);
      return {
        approvals: results.map((approval: any) => ({
          ...approval,
          submitted_at: new Date(approval.submitted_at),
          reviewed_at: approval.reviewed_at ? new Date(approval.reviewed_at) : undefined,
          approved_at: approval.approved_at ? new Date(approval.approved_at) : undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      throw error;
    }
  }

  /**
   * Get all property approvals with filtering
   */
  static async getAllApprovals(
    page = 1,
    limit = 10,
    status?: string,
    search?: string
  ): Promise<{
    approvals: PropertyApproval[];
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
      if (search) params.search = search;

      const response: any = await apiClient.get('/admin/property-approvals/', params);

      const results = response?.results ?? [];
      const total = Number(response?.count ?? results.length);
      return {
        approvals: results.map((approval: any) => ({
          ...approval,
          submitted_at: new Date(approval.submitted_at),
          reviewed_at: approval.reviewed_at ? new Date(approval.reviewed_at) : undefined,
          approved_at: approval.approved_at ? new Date(approval.approved_at) : undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      throw error;
    }
  }

  /**
   * Get specific property approval details
   */
  static async getApprovalDetails(propertyId: string): Promise<PropertyApproval> {
    try {
      const response = await apiClient.get(`/admin/property-approvals/${propertyId}/`);

      return {
        ...response,
        submitted_at: new Date(response.submitted_at),
        reviewed_at: response.reviewed_at ? new Date(response.reviewed_at) : undefined,
        approved_at: response.approved_at ? new Date(response.approved_at) : undefined,
      };
    } catch (error) {
      console.error('Failed to fetch approval details:', error);
      throw error;
    }
  }

  /**
   * Process approval action (approve/reject/request changes)
   */
  static async processApproval(
    propertyId: string,
    action: ApprovalAction
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post(`/properties/${propertyId}/approve/`, action);
      return response;
    } catch (error) {
      console.error('Failed to process approval:', error);
      throw error;
    }
  }

  /**
   * Get approval statistics for dashboard
   */
  static async getApprovalStats(): Promise<ApprovalStats> {
    try {
      const response = await apiClient.get('/admin/property-approvals/stats/');
      return response;
    } catch (error) {
      console.error('Failed to fetch approval stats:', error);

      // Return default stats on error
      return {
        total_pending: 0,
        total_under_review: 0,
        total_approved_this_month: 0,
        total_rejected_this_month: 0,
        average_review_time_days: 0,
        pending_overdue: 0
      };
    }
  }

  /**
   * Assign reviewer to property
   */
  static async assignReviewer(
    propertyId: string,
    reviewerId: string
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post(`/admin/property-approvals/${propertyId}/assign/`, {
        reviewer_id: reviewerId
      });
      return response;
    } catch (error) {
      console.error('Failed to assign reviewer:', error);
      throw error;
    }
  }

  /**
   * Get property owner's approval status
   */
  static async getOwnerApprovalStatus(propertyId: string): Promise<PropertyApproval | null> {
    try {
      const response = await apiClient.get(`/properties/${propertyId}/approval-status/`);

      return {
        ...response,
        submitted_at: new Date(response.submitted_at),
        reviewed_at: response.reviewed_at ? new Date(response.reviewed_at) : undefined,
        approved_at: response.approved_at ? new Date(response.approved_at) : undefined,
      };
    } catch (error) {
      if (error?.response?.status === 404) {
        return null; // No approval record yet
      }
      console.error('Failed to fetch approval status:', error);
      throw error;
    }
  }

  /**
   * Submit property for approval
   */
  static async submitForApproval(propertyId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post(`/properties/${propertyId}/submit-for-approval/`);
      return response;
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      throw error;
    }
  }

  /**
   * Download property document
   */
  static async downloadDocument(documentId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/properties/documents/${documentId}/download/`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Failed to download document:', error);
      throw error;
    }
  }

  /**
   * Upload additional verification document
   */
  static async uploadVerificationDocument(
    propertyId: string,
    file: File,
    documentType: string,
    description?: string
  ): Promise<{ message: string; document_id: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      formData.append('property_id', propertyId);
      if (description) {
        formData.append('description', description);
      }

      const response = await apiClient.post('/properties/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response;
    } catch (error) {
      console.error('Failed to upload verification document:', error);
      throw error;
    }
  }
}

export default PropertyApprovalService;

// Re-export types for better module resolution
export type { PropertyApproval, ApprovalAction, ApprovalStats };