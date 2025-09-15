import { apiClient } from '../api/ApiClient';
import type { 
  ConstructionMilestone,
  InstallmentPayment,
  InstallmentStatus,
  Property 
} from '../api/types';

export interface ConstructionProject {
  id: string;
  property_id: string;
  property: Property;
  total_milestones: number;
  completed_milestones: number;
  overall_progress: number;
  estimated_completion: Date;
  actual_start_date?: Date;
  projected_completion_date: Date;
  construction_cost: number;
  cost_overrun: number;
  cost_savings: number;
  contractor_info: {
    name: string;
    license: string;
    contact: string;
    rating: number;
  };
  status: 'not_started' | 'in_progress' | 'delayed' | 'completed' | 'on_hold';
  created_at: Date;
  updated_at: Date;
}

export interface MilestoneUpdate {
  title: string;
  description: string;
  images?: File[];
  documents?: File[];
  completion_percentage?: number;
  notes?: string;
  issues?: string;
  next_steps?: string;
}

export interface ConstructionReport {
  id: string;
  milestone_id: string;
  report_type: 'progress' | 'quality' | 'safety' | 'financial';
  title: string;
  content: string;
  images: string[];
  documents: string[];
  reporter: {
    name: string;
    role: string;
    company: string;
  };
  created_at: Date;
}

export interface QualityInspection {
  id: string;
  milestone_id: string;
  inspector: {
    name: string;
    license: string;
    company: string;
  };
  inspection_date: Date;
  checklist_items: Array<{
    item: string;
    status: 'pass' | 'fail' | 'needs_attention';
    notes?: string;
  }>;
  overall_rating: number;
  issues_found: string[];
  recommendations: string[];
  approved: boolean;
  certificate_url?: string;
  next_inspection_date?: Date;
}

export interface InstallmentSchedule {
  property_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installments: Array<{
    installment_number: number;
    amount: number;
    due_date: Date;
    milestone_trigger: string;
    status: InstallmentStatus;
    paid_date?: Date;
    description: string;
  }>;
}

export class ConstructionService {
  /**
   * Get construction project details
   */
  static async getConstructionProject(propertyId: string): Promise<ConstructionProject> {
    try {
      return await apiClient.get<ConstructionProject>(`/construction/projects/${propertyId}`);
    } catch (error) {
      console.error('Failed to get construction project:', error);
      throw error;
    }
  }

  /**
   * Get all construction milestones for a property
   */
  static async getMilestones(propertyId: string): Promise<ConstructionMilestone[]> {
    try {
      return await apiClient.get<ConstructionMilestone[]>(`/construction/${propertyId}/milestones`);
    } catch (error) {
      console.error('Failed to get construction milestones:', error);
      throw error;
    }
  }

  /**
   * Get specific milestone details
   */
  static async getMilestone(milestoneId: string): Promise<ConstructionMilestone> {
    try {
      return await apiClient.get<ConstructionMilestone>(`/construction/milestones/${milestoneId}`);
    } catch (error) {
      console.error('Failed to get milestone details:', error);
      throw error;
    }
  }

  /**
   * Update milestone progress (contractor/admin only)
   */
  static async updateMilestone(milestoneId: string, update: MilestoneUpdate): Promise<ConstructionMilestone> {
    try {
      const formData = new FormData();
      formData.append('title', update.title);
      formData.append('description', update.description);
      
      if (update.completion_percentage !== undefined) {
        formData.append('completion_percentage', update.completion_percentage.toString());
      }
      
      if (update.notes) formData.append('notes', update.notes);
      if (update.issues) formData.append('issues', update.issues);
      if (update.next_steps) formData.append('next_steps', update.next_steps);

      if (update.images) {
        update.images.forEach((image, index) => {
          formData.append(`images[${index}]`, image);
        });
      }

      if (update.documents) {
        update.documents.forEach((doc, index) => {
          formData.append(`documents[${index}]`, doc);
        });
      }

      return await apiClient.uploadFile(`/construction/milestones/${milestoneId}`, formData);
    } catch (error) {
      console.error('Failed to update milestone:', error);
      throw error;
    }
  }

  /**
   * Mark milestone as completed
   */
  static async completeMilestone(milestoneId: string): Promise<{
    milestone: ConstructionMilestone;
    triggered_payments: string[];
    message: string;
  }> {
    try {
      return await apiClient.post(`/construction/milestones/${milestoneId}/complete`);
    } catch (error) {
      console.error('Failed to complete milestone:', error);
      throw error;
    }
  }

  /**
   * Submit milestone for verification
   */
  static async submitForVerification(milestoneId: string): Promise<{ message: string; verification_id: string }> {
    try {
      return await apiClient.post(`/construction/milestones/${milestoneId}/submit`);
    } catch (error) {
      console.error('Failed to submit milestone for verification:', error);
      throw error;
    }
  }

  /**
   * Get milestone reports
   */
  static async getMilestoneReports(milestoneId: string): Promise<ConstructionReport[]> {
    try {
      return await apiClient.get<ConstructionReport[]>(`/construction/milestones/${milestoneId}/reports`);
    } catch (error) {
      console.error('Failed to get milestone reports:', error);
      throw error;
    }
  }

  /**
   * Add progress report
   */
  static async addProgressReport(milestoneId: string, report: {
    report_type: 'progress' | 'quality' | 'safety' | 'financial';
    title: string;
    content: string;
    images?: File[];
    documents?: File[];
  }): Promise<ConstructionReport> {
    try {
      const formData = new FormData();
      formData.append('report_type', report.report_type);
      formData.append('title', report.title);
      formData.append('content', report.content);

      if (report.images) {
        report.images.forEach((image, index) => {
          formData.append(`images[${index}]`, image);
        });
      }

      if (report.documents) {
        report.documents.forEach((doc, index) => {
          formData.append(`documents[${index}]`, doc);
        });
      }

      return await apiClient.uploadFile(`/construction/milestones/${milestoneId}/reports`, formData);
    } catch (error) {
      console.error('Failed to add progress report:', error);
      throw error;
    }
  }

  /**
   * Get quality inspections for a milestone
   */
  static async getInspections(milestoneId: string): Promise<QualityInspection[]> {
    try {
      return await apiClient.get<QualityInspection[]>(`/construction/milestones/${milestoneId}/inspections`);
    } catch (error) {
      console.error('Failed to get quality inspections:', error);
      throw error;
    }
  }

  /**
   * Schedule quality inspection
   */
  static async scheduleInspection(milestoneId: string, inspection: {
    inspector_id: string;
    inspection_date: Date;
    inspection_type: 'quality' | 'safety' | 'code_compliance';
    checklist_template?: string;
  }): Promise<{ inspection_id: string; message: string }> {
    try {
      return await apiClient.post(`/construction/milestones/${milestoneId}/inspections`, inspection);
    } catch (error) {
      console.error('Failed to schedule inspection:', error);
      throw error;
    }
  }

  /**
   * Submit inspection results
   */
  static async submitInspectionResults(inspectionId: string, results: {
    checklist_items: Array<{
      item: string;
      status: 'pass' | 'fail' | 'needs_attention';
      notes?: string;
    }>;
    overall_rating: number;
    issues_found: string[];
    recommendations: string[];
    approved: boolean;
    photos?: File[];
    certificate?: File;
  }): Promise<QualityInspection> {
    try {
      const formData = new FormData();
      formData.append('checklist_items', JSON.stringify(results.checklist_items));
      formData.append('overall_rating', results.overall_rating.toString());
      formData.append('issues_found', JSON.stringify(results.issues_found));
      formData.append('recommendations', JSON.stringify(results.recommendations));
      formData.append('approved', results.approved.toString());

      if (results.photos) {
        results.photos.forEach((photo, index) => {
          formData.append(`photos[${index}]`, photo);
        });
      }

      if (results.certificate) {
        formData.append('certificate', results.certificate);
      }

      return await apiClient.uploadFile(`/construction/inspections/${inspectionId}/results`, formData);
    } catch (error) {
      console.error('Failed to submit inspection results:', error);
      throw error;
    }
  }

  /**
   * Get installment payment schedule
   */
  static async getInstallmentSchedule(propertyId: string): Promise<InstallmentSchedule> {
    try {
      return await apiClient.get<InstallmentSchedule>(`/construction/${propertyId}/installments`);
    } catch (error) {
      console.error('Failed to get installment schedule:', error);
      throw error;
    }
  }

  /**
   * Get user's installment payments
   */
  static async getUserInstallments(propertyId: string): Promise<InstallmentPayment[]> {
    try {
      return await apiClient.get<InstallmentPayment[]>(`/construction/${propertyId}/my-installments`);
    } catch (error) {
      console.error('Failed to get user installments:', error);
      throw error;
    }
  }

  /**
   * Pay installment
   */
  static async payInstallment(
    installmentId: string,
    paymentMethod: {
      type: string;
      currency: string;
      wallet_address?: string;
      card_token?: string;
    }
  ): Promise<{
    payment_id: string;
    status: string;
    amount: number;
    currency: string;
    message: string;
  }> {
    try {
      return await apiClient.post(`/construction/installments/${installmentId}/pay`, { payment_method: paymentMethod });
    } catch (error) {
      console.error('Failed to pay installment:', error);
      throw error;
    }
  }

  /**
   * Get construction timeline
   */
  static async getConstructionTimeline(propertyId: string): Promise<Array<{
    date: Date;
    event_type: 'milestone_start' | 'milestone_complete' | 'inspection' | 'payment' | 'issue' | 'update';
    title: string;
    description: string;
    milestone_id?: string;
    status: 'completed' | 'current' | 'upcoming';
    images?: string[];
  }>> {
    try {
      return await apiClient.get(`/construction/${propertyId}/timeline`);
    } catch (error) {
      console.error('Failed to get construction timeline:', error);
      throw error;
    }
  }

  /**
   * Get construction analytics
   */
  static async getConstructionAnalytics(propertyId: string): Promise<{
    overall_progress: number;
    schedule_performance: 'ahead' | 'on_time' | 'delayed';
    days_ahead_behind: number;
    budget_performance: {
      original_budget: number;
      current_estimate: number;
      spent_to_date: number;
      variance_percentage: number;
    };
    quality_score: number;
    safety_incidents: number;
    milestone_completion_rate: number;
    recent_activity_count: number;
  }> {
    try {
      return await apiClient.get(`/construction/${propertyId}/analytics`);
    } catch (error) {
      console.error('Failed to get construction analytics:', error);
      throw error;
    }
  }

  /**
   * Report construction issue
   */
  static async reportIssue(propertyId: string, issue: {
    type: 'quality' | 'safety' | 'schedule' | 'budget' | 'weather' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    milestone_id?: string;
    images?: File[];
    location?: string;
  }): Promise<{ issue_id: string; message: string }> {
    try {
      const formData = new FormData();
      formData.append('type', issue.type);
      formData.append('severity', issue.severity);
      formData.append('title', issue.title);
      formData.append('description', issue.description);
      
      if (issue.milestone_id) formData.append('milestone_id', issue.milestone_id);
      if (issue.location) formData.append('location', issue.location);

      if (issue.images) {
        issue.images.forEach((image, index) => {
          formData.append(`images[${index}]`, image);
        });
      }

      return await apiClient.uploadFile(`/construction/${propertyId}/issues`, formData);
    } catch (error) {
      console.error('Failed to report construction issue:', error);
      throw error;
    }
  }

  /**
   * Get construction issues
   */
  static async getConstructionIssues(propertyId: string, status?: string): Promise<Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    reported_by: string;
    assigned_to?: string;
    created_at: Date;
    resolved_at?: Date;
    images: string[];
  }>> {
    try {
      const params: any = {};
      if (status) params.status = status;

      return await apiClient.get(`/construction/${propertyId}/issues`, params);
    } catch (error) {
      console.error('Failed to get construction issues:', error);
      throw error;
    }
  }

  /**
   * Subscribe to construction updates
   */
  static async subscribeToUpdates(propertyId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/construction/${propertyId}/subscribe`);
    } catch (error) {
      console.error('Failed to subscribe to construction updates:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from construction updates
   */
  static async unsubscribeFromUpdates(propertyId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/construction/${propertyId}/subscribe`);
    } catch (error) {
      console.error('Failed to unsubscribe from construction updates:', error);
      throw error;
    }
  }

  /**
   * Get construction documents
   */
  static async getConstructionDocuments(propertyId: string): Promise<Array<{
    id: string;
    name: string;
    type: 'blueprint' | 'permit' | 'contract' | 'inspection_report' | 'photo' | 'other';
    url: string;
    size: number;
    uploaded_at: Date;
    uploaded_by: string;
    milestone_id?: string;
  }>> {
    try {
      return await apiClient.get(`/construction/${propertyId}/documents`);
    } catch (error) {
      console.error('Failed to get construction documents:', error);
      throw error;
    }
  }

  /**
   * Upload construction document
   */
  static async uploadDocument(propertyId: string, document: {
    file: File;
    type: 'blueprint' | 'permit' | 'contract' | 'inspection_report' | 'photo' | 'other';
    name: string;
    description?: string;
    milestone_id?: string;
  }): Promise<{ document_id: string; url: string; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', document.file);
      formData.append('type', document.type);
      formData.append('name', document.name);
      
      if (document.description) formData.append('description', document.description);
      if (document.milestone_id) formData.append('milestone_id', document.milestone_id);

      return await apiClient.uploadFile(`/construction/${propertyId}/documents`, formData);
    } catch (error) {
      console.error('Failed to upload construction document:', error);
      throw error;
    }
  }
}

export default ConstructionService;