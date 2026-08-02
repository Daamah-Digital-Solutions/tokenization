import { apiClient } from '../api/ApiClient';

export interface Document {
  id: string;
  title: string;
  download_link: string;
  created_at: string;
}

export interface InvestorDocument {
  id: string;
  kind: 'share_certificate' | 'subscription_agreement' | 'property_document';
  name: string;
  document_type: string;
  description?: string;
  download_url: string | null;
  generated: boolean;
  uploaded_at: string | null;
}

export interface InvestorPropertyDocuments {
  property: {
    id: string;
    title: string;
    location: string;
    image_url?: string;
    total_tokens: number;
  };
  holdings: {
    token_amount: number;
    ownership_percentage: string;
    total_invested: string;
    first_investment_date: string | null;
  };
  documents: InvestorDocument[];
}

export interface InvestorDocumentsResponse {
  properties: InvestorPropertyDocuments[];
  summary: { property_count: number; document_count: number };
}

export class DocumentService {
  static async getDocuments(): Promise<Document[]> {
    return await apiClient.get('/documents/');
  }

  /** All of the logged-in investor's documents, grouped per property. */
  static async getInvestorDocuments(): Promise<InvestorDocumentsResponse> {
    return await apiClient.get('/properties/investor/documents/');
  }
}
