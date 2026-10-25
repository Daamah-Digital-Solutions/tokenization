import { apiClient } from '../api/ApiClient';

/**
 * Owner / developer inbox (client round 3, #23) and submission actions.
 * Backend: capimax_backend/properties/views.py OwnerMessagesView & friends.
 */

export type OwnerMessageCategory =
  | 'general'
  | 'review_note'
  | 'document_request'
  | 'changes_requested'
  | 'approval_result'
  | 'publication'
  | 'reply';

export interface OwnerMessage {
  id: string;
  property: string | null;
  property_title: string | null;
  sender_role: 'admin' | 'owner' | 'system';
  sender_name: string;
  category: OwnerMessageCategory;
  subject: string;
  body: string;
  /** Arabic version of system-generated messages (may be empty). */
  subject_ar?: string;
  body_ar?: string;
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

export const OWNER_UPLOADABLE_DOC_TYPES = [
  'ownership',
  'owner_identity',
  'company_registration',
  'permits',
  'valuation',
  'insurance',
  'financial',
  'other',
] as const;

export class OwnerMessagesService {
  static async list(propertyId?: string): Promise<{ results: OwnerMessage[]; unread_count: number }> {
    const data: any = await apiClient.get('/properties/owner/messages/', propertyId ? { property: propertyId } : undefined);
    return { results: data?.results || [], unread_count: data?.unread_count || 0 };
  }

  static send(propertyId: string | null, body: string, attachment?: File | null): Promise<unknown> {
    const fd = new FormData();
    fd.append('body', body);
    if (propertyId) fd.append('property', propertyId);
    if (attachment) fd.append('attachment', attachment);
    return apiClient.uploadFile('/properties/owner/messages/', fd);
  }

  static markRead(propertyId?: string | null): Promise<unknown> {
    return apiClient.post('/properties/owner/messages/read/', propertyId ? { property: propertyId } : {});
  }

  static resubmit(propertyId: string): Promise<unknown> {
    return apiClient.post(`/properties/${propertyId}/submit-for-approval/`);
  }

  static uploadDocument(propertyId: string, documentType: string, file: File, label: string): Promise<unknown> {
    const fd = new FormData();
    fd.append('document', file);
    fd.append('name', `${label} — ${file.name}`.slice(0, 250));
    fd.append('document_type', documentType);
    return apiClient.uploadFile(`/properties/${propertyId}/documents/`, fd);
  }
}

export default OwnerMessagesService;
