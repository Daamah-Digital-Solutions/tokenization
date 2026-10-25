import { apiClient } from '../api/ApiClient';

/**
 * KYCService — wraps the backend `kyc/` app (capimax_backend/kyc/urls.py).
 *
 *   GET    /kyc/status/                 — full status: profile, documents, next steps
 *   GET    /kyc/personal-info/          — DOB / nationality / residency
 *   PATCH  /kyc/personal-info/
 *   POST   /kyc/documents/upload/       — upload OR replace a document of a type
 *   DELETE /kyc/documents/<id>/
 *   GET    /kyc/documents/<id>/file/    — authenticated file download
 *   POST   /kyc/submit/                 — submit for review
 *   GET    /kyc/config/                 — 'internal' wizard or 'sumsub' WebSDK
 *   POST   /kyc/sumsub/access-token/    — Sumsub WebSDK token
 *
 * Errors come back as ApiError with a stable `code` (KYC_UNDER_REVIEW,
 * KYC_INCOMPLETE, …) that the UI translates.
 */

export type KYCProfileStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';

export type KYCDocumentType =
  | 'passport'
  | 'national_id'
  | 'driving_license'
  | 'utility_bill'
  | 'bank_statement'
  | 'proof_of_address'
  | 'selfie'
  | 'video_verification';

export type KYCDocumentStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'resubmission_required';

export type KYCGroupKey = 'identity' | 'selfie' | 'address' | 'video';

export interface KYCServerDocument {
  id: string;
  document_type: KYCDocumentType;
  status: KYCDocumentStatus;
  file_name: string;
  file_size: number;
  file_url: string | null;
  rejection_reason: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface KYCGroupState {
  key: KYCGroupKey;
  types: KYCDocumentType[];
  state: 'missing' | 'rejected' | 'uploaded' | 'approved';
  rejection_reasons: Array<{ document_type: KYCDocumentType; reason: string }>;
}

export interface KYCNextStep {
  step: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface KYCCompletionStatus {
  can_submit: boolean;
  is_complete: boolean;
  completion_percentage: number;
  groups: KYCGroupState[];
  optional_groups: KYCGroupState[];
  missing_groups: KYCGroupKey[];
  rejected_groups: KYCGroupKey[];
  missing_personal_info: Array<'date_of_birth' | 'residency_country'>;
  next_steps: KYCNextStep[];
}

export interface KYCStatusPayload {
  status: KYCProfileStatus;
  verification_level: 'basic' | 'enhanced' | 'premium';
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string;
  nationality: string;
  investment_limit: string | null;
  expires_at: string | null;
  is_verified: boolean;
  documents: KYCServerDocument[];
  completion_status: KYCCompletionStatus;
  public_notes: Array<{ note: string; note_type: string; created_at: string }>;
  provider: 'internal' | 'sumsub';
}

export interface KYCPersonalInfo {
  date_of_birth: string | null;
  country: string;
  nationality: string;
  first_name: string;
  last_name: string;
}

/** Kept for the services barrel export (older callers). */
export type KYCStatusResponse = KYCStatusPayload;
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

/**
 * What the user should see, derived from the profile status + documents.
 * 'action_required' = the profile is back in PENDING because a reviewer
 * flagged documents (as opposed to a user who simply hasn't submitted yet).
 */
export type KYCUiState =
  | 'not_started'
  | 'pending'
  | 'action_required'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export const deriveKYCUiState = (payload: KYCStatusPayload | null): KYCUiState => {
  if (!payload) return 'not_started';
  switch (payload.status) {
    case 'approved':
      return 'approved';
    case 'in_review':
      return 'in_review';
    case 'rejected':
      return 'rejected';
    case 'expired':
      return 'expired';
    default:
      if (payload.completion_status?.rejected_groups?.length || payload.rejection_reason) {
        return 'action_required';
      }
      return payload.documents?.length ? 'pending' : 'not_started';
  }
};

export class KYCService {
  static getStatus(): Promise<KYCStatusPayload> {
    return apiClient.get<KYCStatusPayload>('/kyc/status/');
  }

  /** @deprecated use getStatus() */
  static getKYCStatus(): Promise<KYCStatusPayload> {
    return KYCService.getStatus();
  }

  static getPersonalInfo(): Promise<KYCPersonalInfo> {
    return apiClient.get<KYCPersonalInfo>('/kyc/personal-info/');
  }

  static savePersonalInfo(data: {
    date_of_birth: string;
    nationality: string;
    residency_country: string;
  }): Promise<unknown> {
    return apiClient.patch('/kyc/personal-info/', data);
  }

  /** Upload a document; a second upload of the same type replaces the first. */
  static uploadDocument(documentType: KYCDocumentType, file: File): Promise<KYCServerDocument> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    formData.append('file_name', file.name);
    return apiClient.uploadFile<KYCServerDocument>('/kyc/documents/upload/', formData);
  }

  static deleteDocument(documentId: string): Promise<unknown> {
    return apiClient.delete(`/kyc/documents/${documentId}/`);
  }

  /** Submit for review. Resolves with the refreshed status payload. */
  static async submitForReview(): Promise<KYCStatusPayload | null> {
    const result: any = await apiClient.post('/kyc/submit/');
    // ApiClient unwraps `{success, data}` envelopes; tolerate either shape.
    return (result && result.status ? result : result?.data) ?? null;
  }

  static getConfig(): Promise<{ provider: 'internal' | 'sumsub' }> {
    return apiClient.get('/kyc/config/');
  }

  static async getSumsubToken(): Promise<string> {
    const result = await apiClient.post<{ token: string }>('/kyc/sumsub/access-token/');
    return result.token;
  }
}

export default KYCService;
