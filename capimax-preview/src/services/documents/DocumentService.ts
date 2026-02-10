import { apiClient } from '../api/ApiClient';

export interface Document {
  id: string;
  title: string;
  download_link: string;
  created_at: string;
}

export class DocumentService {
  static async getDocuments(): Promise<Document[]> {
    return await apiClient.get('/documents/');
  }
}
