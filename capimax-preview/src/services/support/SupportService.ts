/**
 * Contact Us + support tickets (client round 3, #12 #13) — /support/.
 */

import { apiClient } from '../api/ApiClient';

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  topic: string;
  subject: string;
  message: string;
  language?: string;
  /** Honeypot — always empty for people. */
  website?: string;
}

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  category: 'investment' | 'payments' | 'account' | 'technical' | 'other';
  priority: 'low' | 'medium' | 'high';
  details: string;
  status: 'open' | 'pending' | 'resolved';
  created_at: string;
  updated_at: string;
  messages?: Array<{ id: string; from_support: boolean; body: string; created_at: string }>;
}

export class SupportService {
  static sendContact(payload: ContactPayload): Promise<{ reference: string }> {
    return apiClient.post('/support/contact/', payload);
  }

  static async listTickets(): Promise<{ tickets: SupportTicket[]; unresolved_count: number }> {
    return apiClient.get('/support/tickets/');
  }

  static openTicket(payload: Pick<SupportTicket, 'subject' | 'category' | 'priority' | 'details'>): Promise<SupportTicket> {
    return apiClient.post('/support/tickets/', payload);
  }

  static getTicket(id: string): Promise<SupportTicket> {
    return apiClient.get(`/support/tickets/${id}/`);
  }

  static reply(id: string, body: string): Promise<SupportTicket> {
    return apiClient.post(`/support/tickets/${id}/messages/`, { body });
  }
}
