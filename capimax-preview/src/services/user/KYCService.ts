import { apiClient } from '../api/ApiClient';
import type {
  KYCDocument,
  KYCDocumentUploadData,
  DocumentType,
  DocumentStatus,
  KYCStatus
} from '../api/types';

/**
 * KYCService — wraps the backend `kyc/` app.
 *
 * Real routes (see capimax_backend/kyc/urls.py):
 *   /kyc/status/                       — current profile + completion %
 *   /kyc/submit/                       — submit for review
 *   /kyc/documents/                    — list, create
 *   /kyc/documents/upload/             — dedicated upload action
 *   /kyc/documents/<id>/               — retrieve/delete
 *   /kyc/documents/<id>/{approve,reject,ocr}/
 *   /kyc/biometric/{start,complete}/   — liveness flow (session-based, not single-shot)
 *   /kyc/compliance/run/               — trigger compliance checks
 *   /kyc/personal-info/                — DOB + address collection
 *   /kyc/requirements/                 — global requirements (no country param)
 *   /kyc/analytics/                    — aggregate metrics (admin)
 *
 * Methods in this class that have no backend route throw with a clear
 * message rather than silently 404 — see each method's doc comment.
 */
const KYC_NOT_IMPLEMENTED = (method: string, hint?: string): never => {
  const detail = hint ? ` ${hint}` : '';
  throw new Error(`KYCService.${method} is not implemented on the backend.${detail}`);
};

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
      return await apiClient.get<KYCStatusResponse>('/kyc/status/');
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

      // Backend endpoint: POST /kyc/documents/upload/ — dedicated upload route
      return await apiClient.uploadFile<KYCDocument>('/kyc/documents/upload/', formData);
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
      return await apiClient.get<KYCDocument[]>('/kyc/documents/');
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
      return await apiClient.get<KYCDocument>(`/kyc/documents/${documentId}/`);
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
      return await apiClient.delete(`/kyc/documents/${documentId}/`);
    } catch (error) {
      console.error('Failed to delete KYC document:', error);
      throw error;
    }
  }

  /**
   * Replace KYC document.
   *
   * Backend has no `replace` action — to replace, delete the existing
   * document and upload a new one with `uploadDocument`. Doing this here
   * silently would create two side effects (delete + upload) with no
   * atomicity, so we throw and require callers to be explicit.
   */
  static async replaceDocument(_documentId: string, _newFile: File): Promise<KYCDocument> {
    return KYC_NOT_IMPLEMENTED(
      'replaceDocument',
      'Delete the old document first, then call uploadDocument with the new file.'
    );
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
      return await apiClient.post('/kyc/submit/');
    } catch (error) {
      console.error('Failed to submit KYC for review:', error);
      throw error;
    }
  }

  /**
   * Perform liveness check.
   *
   * Backend uses a two-step biometric session (`/kyc/biometric/start/` +
   * `/complete/`), not a single-shot endpoint. Callers should wire those
   * directly via the BiometricVerificationViewSet — a single-call wrapper
   * would lose the session id that `start` returns and `complete` needs.
   */
  static async performLivenessCheck(_data: LivenessCheckData): Promise<{
    success: boolean;
    confidence_score: number;
    session_id: string;
  }> {
    return KYC_NOT_IMPLEMENTED(
      'performLivenessCheck',
      'Use the two-step /kyc/biometric/start/ then /kyc/biometric/complete/ flow.'
    );
  }

  /**
   * Verify address with document.
   *
   * No dedicated endpoint — address verification is part of the document
   * compliance run (`/kyc/compliance/run/`) and uses the address from
   * the personal-info payload (`/kyc/personal-info/`).
   */
  static async verifyAddress(_data: AddressVerificationData): Promise<{
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
    return KYC_NOT_IMPLEMENTED(
      'verifyAddress',
      'Update personal info, upload proof-of-address document, and run compliance.'
    );
  }

  /**
   * Get document requirements.
   *
   * Backend exposes a single `/kyc/requirements/` endpoint — there is no
   * per-country variant. The `country` argument is accepted for forward
   * compatibility but is currently ignored.
   */
  static async getDocumentRequirements(_country?: string): Promise<{
    required_documents: DocumentType[];
    optional_documents: DocumentType[];
    country_specific_requirements: string[];
    supported_document_formats: string[];
  }> {
    try {
      return await apiClient.get('/kyc/requirements/');
    } catch (error) {
      console.error('Failed to get document requirements:', error);
      throw error;
    }
  }

  /**
   * Pre-validate document before upload.
   *
   * No backend endpoint. Validation happens server-side after upload via
   * OCR (`/kyc/documents/<id>/ocr/`) and compliance run.
   */
  static async validateDocument(_file: File, _documentType: DocumentType): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
    file_quality_score: number;
  }> {
    return KYC_NOT_IMPLEMENTED(
      'validateDocument',
      'Upload the document and check the OCR/compliance result.'
    );
  }

  /**
   * Get KYC review history.
   *
   * No endpoint surfaces a per-user review log. Admins see this via
   * `/kyc/<id>/audit/`, which is admin-scoped.
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
    return KYC_NOT_IMPLEMENTED('getReviewHistory');
  }

  /**
   * Appeal KYC rejection. Phantom — no backend endpoint.
   */
  static async appealRejection(
    _rejectionId: string,
    _appealReason: string,
    _additionalDocuments?: File[]
  ): Promise<{
    appeal_id: string;
    message: string;
    estimated_review_time: string;
  }> {
    return KYC_NOT_IMPLEMENTED('appealRejection');
  }

  /**
   * Request expedited review. Phantom — no backend endpoint.
   */
  static async requestExpeditedReview(): Promise<{
    message: string;
    additional_fee: number;
    currency: string;
    estimated_review_time: string;
    payment_required: boolean;
  }> {
    return KYC_NOT_IMPLEMENTED('requestExpeditedReview');
  }

  /**
   * Get supported countries for KYC. Phantom — no backend endpoint.
   */
  static async getSupportedCountries(): Promise<Array<{
    code: string;
    name: string;
    supported_documents: DocumentType[];
    processing_time_days: number;
    additional_requirements?: string[];
  }>> {
    return KYC_NOT_IMPLEMENTED('getSupportedCountries');
  }

  /**
   * Check investment eligibility.
   *
   * No dedicated endpoint. The compliance gate runs server-side at
   * investment-creation time and returns structured errors — front-end
   * gating should call `getKYCStatus()` and inspect `overall_status`
   * instead of pre-checking.
   */
  static async checkInvestmentEligibility(): Promise<{
    eligible: boolean;
    kyc_required: boolean;
    missing_documents: DocumentType[];
    max_investment_amount?: number;
    restrictions?: string[];
  }> {
    return KYC_NOT_IMPLEMENTED(
      'checkInvestmentEligibility',
      'Check getKYCStatus().overall_status === "approved" instead.'
    );
  }
}

export default KYCService;