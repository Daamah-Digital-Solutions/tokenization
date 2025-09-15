import { apiClient } from '../api/ApiClient';
import type { 
  KYCDocument, 
  KYCDocumentUploadData,
  DocumentType,
  DocumentStatus,
  KYCStatus
} from '../api/types';

export interface KYCStatusResponse {
  overall_status: KYCStatus;
  documents: KYCDocument[];
  required_documents: DocumentType[];
  optional_documents: DocumentType[];
  completion_percentage: number;
  next_steps: string[];
  estimated_review_time: string;
}

export interface LivenessCheckData {
  selfie_image: File;
  challenge_type: 'blink' | 'smile' | 'turn_head';
  challenge_response: string;
}

export interface AddressVerificationData {
  document: File;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export class KYCService {
  /**
   * Get KYC status and documents
   */
  static async getKYCStatus(): Promise<KYCStatusResponse> {
    try {
      return await apiClient.get<KYCStatusResponse>('/kyc/status');
    } catch (error) {
      console.error('Failed to get KYC status:', error);
      throw error;
    }
  }

  /**
   * Upload KYC document
   */
  static async uploadDocument(uploadData: KYCDocumentUploadData): Promise<KYCDocument> {
    try {
      const formData = new FormData();
      formData.append('document', uploadData.file);
      formData.append('document_type', uploadData.document_type);
      
      if (uploadData.metadata) {
        formData.append('metadata', JSON.stringify(uploadData.metadata));
      }

      return await apiClient.uploadFile<KYCDocument>('/kyc/documents', formData);
    } catch (error) {
      console.error('Failed to upload KYC document:', error);
      throw error;
    }
  }

  /**
   * Get all user's KYC documents
   */
  static async getDocuments(): Promise<KYCDocument[]> {
    try {
      return await apiClient.get<KYCDocument[]>('/kyc/documents');
    } catch (error) {
      console.error('Failed to get KYC documents:', error);
      throw error;
    }
  }

  /**
   * Get specific KYC document
   */
  static async getDocument(documentId: string): Promise<KYCDocument> {
    try {
      return await apiClient.get<KYCDocument>(`/kyc/documents/${documentId}`);
    } catch (error) {
      console.error('Failed to get KYC document:', error);
      throw error;
    }
  }

  /**
   * Delete KYC document
   */
  static async deleteDocument(documentId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/kyc/documents/${documentId}`);
    } catch (error) {
      console.error('Failed to delete KYC document:', error);
      throw error;
    }
  }

  /**
   * Replace KYC document
   */
  static async replaceDocument(documentId: string, newFile: File): Promise<KYCDocument> {
    try {
      const formData = new FormData();
      formData.append('document', newFile);

      return await apiClient.uploadFile<KYCDocument>(`/kyc/documents/${documentId}/replace`, formData);
    } catch (error) {
      console.error('Failed to replace KYC document:', error);
      throw error;
    }
  }

  /**
   * Submit KYC for review
   */
  static async submitForReview(): Promise<{ 
    message: string; 
    submission_id: string; 
    estimated_review_time: string; 
  }> {
    try {
      return await apiClient.post('/kyc/submit');
    } catch (error) {
      console.error('Failed to submit KYC for review:', error);
      throw error;
    }
  }

  /**
   * Perform liveness check
   */
  static async performLivenessCheck(data: LivenessCheckData): Promise<{
    success: boolean;
    confidence_score: number;
    session_id: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('selfie_image', data.selfie_image);
      formData.append('challenge_type', data.challenge_type);
      formData.append('challenge_response', data.challenge_response);

      return await apiClient.uploadFile('/kyc/liveness', formData);
    } catch (error) {
      console.error('Failed to perform liveness check:', error);
      throw error;
    }
  }

  /**
   * Verify address with document
   */
  static async verifyAddress(data: AddressVerificationData): Promise<{
    success: boolean;
    extracted_address: {
      line_1: string;
      line_2?: string;
      city: string;
      state?: string;
      postal_code: string;
      country: string;
    };
    confidence_score: number;
  }> {
    try {
      const formData = new FormData();
      formData.append('document', data.document);
      formData.append('address_line_1', data.address_line_1);
      if (data.address_line_2) formData.append('address_line_2', data.address_line_2);
      formData.append('city', data.city);
      if (data.state) formData.append('state', data.state);
      formData.append('postal_code', data.postal_code);
      formData.append('country', data.country);

      return await apiClient.uploadFile('/kyc/address-verification', formData);
    } catch (error) {
      console.error('Failed to verify address:', error);
      throw error;
    }
  }

  /**
   * Get document requirements for specific country
   */
  static async getDocumentRequirements(country: string): Promise<{
    required_documents: DocumentType[];
    optional_documents: DocumentType[];
    country_specific_requirements: string[];
    supported_document_formats: string[];
  }> {
    try {
      return await apiClient.get(`/kyc/requirements/${country}`);
    } catch (error) {
      console.error('Failed to get document requirements:', error);
      throw error;
    }
  }

  /**
   * Pre-validate document before upload
   */
  static async validateDocument(file: File, documentType: DocumentType): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
    file_quality_score: number;
  }> {
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', documentType);

      return await apiClient.uploadFile('/kyc/validate-document', formData);
    } catch (error) {
      console.error('Failed to validate document:', error);
      throw error;
    }
  }

  /**
   * Get KYC review history
   */
  static async getReviewHistory(): Promise<Array<{
    id: string;
    submitted_at: Date;
    reviewed_at?: Date;
    status: DocumentStatus;
    reviewer_comments?: string;
    documents_reviewed: string[];
    next_steps?: string[];
  }>> {
    try {
      return await apiClient.get('/kyc/review-history');
    } catch (error) {
      console.error('Failed to get review history:', error);
      throw error;
    }
  }

  /**
   * Appeal KYC rejection
   */
  static async appealRejection(
    rejectionId: string,
    appealReason: string,
    additionalDocuments?: File[]
  ): Promise<{ 
    appeal_id: string; 
    message: string; 
    estimated_review_time: string; 
  }> {
    try {
      const formData = new FormData();
      formData.append('rejection_id', rejectionId);
      formData.append('appeal_reason', appealReason);

      if (additionalDocuments) {
        additionalDocuments.forEach((file, index) => {
          formData.append(`additional_documents[${index}]`, file);
        });
      }

      return await apiClient.uploadFile('/kyc/appeal', formData);
    } catch (error) {
      console.error('Failed to appeal KYC rejection:', error);
      throw error;
    }
  }

  /**
   * Request expedited review (premium feature)
   */
  static async requestExpeditedReview(): Promise<{
    message: string;
    additional_fee: number;
    currency: string;
    estimated_review_time: string;
    payment_required: boolean;
  }> {
    try {
      return await apiClient.post('/kyc/expedited-review');
    } catch (error) {
      console.error('Failed to request expedited review:', error);
      throw error;
    }
  }

  /**
   * Get supported countries for KYC
   */
  static async getSupportedCountries(): Promise<Array<{
    code: string;
    name: string;
    supported_documents: DocumentType[];
    processing_time_days: number;
    additional_requirements?: string[];
  }>> {
    try {
      return await apiClient.get('/kyc/supported-countries');
    } catch (error) {
      console.error('Failed to get supported countries:', error);
      throw error;
    }
  }

  /**
   * Check if user can invest (KYC requirement check)
   */
  static async checkInvestmentEligibility(): Promise<{
    eligible: boolean;
    kyc_required: boolean;
    missing_documents: DocumentType[];
    max_investment_amount?: number;
    restrictions?: string[];
  }> {
    try {
      return await apiClient.get('/kyc/investment-eligibility');
    } catch (error) {
      console.error('Failed to check investment eligibility:', error);
      throw error;
    }
  }
}

export default KYCService;