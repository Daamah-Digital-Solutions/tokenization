import { apiClient } from '../api/ApiClient';

/**
 * ConstructionService — wraps the `construction/` Django app.
 *
 * Real backend routes (see capimax_backend/construction/urls.py):
 *   /construction/<property_id>/milestones/              CRUD via nested ViewSet
 *   /construction/<property_id>/milestones/<id>/          detail
 *   /construction/<property_id>/progress/                 progress overview
 *   /construction/<property_id>/milestones/<id>/updates/  progress updates (POST)
 *   /construction/<property_id>/milestones/<id>/images/   image uploads (POST)
 *   /construction/<property_id>/milestones/<id>/documents/ doc uploads (POST)
 *
 * Anything else this service used to call (project endpoints, inspections,
 * installment schedules, issues, subscribe, timeline, analytics, etc.) is
 * phantom — see each method for the equivalent real flow (where one exists).
 *
 * Phantom methods throw with a descriptive error rather than silently 404,
 * so the UI surfaces the gap instead of rendering empty data.
 */
const CONSTRUCTION_NOT_IMPLEMENTED = (method: string, hint?: string): never => {
  const detail = hint ? ` ${hint}` : '';
  throw new Error(`ConstructionService.${method} is not implemented on the backend.${detail}`);
};
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
   * Get construction project details.
   *
   * Phantom — no `/construction/projects/<id>/` endpoint. The "project"
   * concept lives on the `Property` model; use PropertyService.getProperty()
   * combined with `getConstructionProgress()` below.
   */
  static async getConstructionProject(_propertyId: string): Promise<ConstructionProject> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getConstructionProject',
      'Use PropertyService.getProperty() plus getConstructionProgress() instead.'
    );
  }

  /**
   * Construction progress overview (real endpoint).
   */
  static async getConstructionProgress(propertyId: string): Promise<any> {
    try {
      return await apiClient.get(`/construction/${propertyId}/progress/`);
    } catch (error) {
      console.error('Failed to get construction progress:', error);
      throw error;
    }
  }

  /**
   * Get all construction milestones for a property.
   */
  static async getMilestones(propertyId: string): Promise<ConstructionMilestone[]> {
    try {
      // Backend exposes milestones nested under property — note the
      // trailing slash, without which Django redirects POST/PATCH bodies
      // away. The router returns a DRF paginated list, so unwrap results
      // for the existing caller signature.
      const response: any = await apiClient.get(`/construction/${propertyId}/milestones/`);
      return Array.isArray(response) ? response : (response?.results ?? []);
    } catch (error) {
      console.error('Failed to get construction milestones:', error);
      throw error;
    }
  }

  /**
   * Get specific milestone details.
   *
   * Backend requires both property_id and milestone_id in the path —
   * the legacy single-id signature has no way to resolve the property.
   */
  static async getMilestone(_milestoneId: string): Promise<ConstructionMilestone> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getMilestone',
      'Use getMilestoneNested(propertyId, milestoneId) — the backend route is nested.'
    );
  }

  /**
   * Get a milestone via the nested URL pattern.
   */
  static async getMilestoneNested(
    propertyId: string,
    milestoneId: string
  ): Promise<ConstructionMilestone> {
    try {
      return await apiClient.get<ConstructionMilestone>(
        `/construction/${propertyId}/milestones/${milestoneId}/`
      );
    } catch (error) {
      console.error('Failed to get milestone details:', error);
      throw error;
    }
  }

  /**
   * Update milestone progress (contractor/admin only).
   *
   * Phantom — backend requires the nested URL `/construction/<propertyId>/
   * milestones/<milestoneId>/`. Use updateMilestoneNested() below.
   */
  static async updateMilestone(_milestoneId: string, _update: MilestoneUpdate): Promise<ConstructionMilestone> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'updateMilestone',
      'Use updateMilestoneNested(propertyId, milestoneId, update) — the path is nested.'
    );
  }

  /**
   * Update a milestone via the nested URL pattern.
   */
  static async updateMilestoneNested(
    propertyId: string,
    milestoneId: string,
    update: MilestoneUpdate
  ): Promise<ConstructionMilestone> {
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

      return await apiClient.uploadFile(
        `/construction/${propertyId}/milestones/${milestoneId}/`,
        formData
      );
    } catch (error) {
      console.error('Failed to update milestone:', error);
      throw error;
    }
  }

  /**
   * Mark milestone as completed.
   *
   * Phantom — there's no `complete` action on the milestone ViewSet.
   * Completing means PATCHing `completion_percentage: 100` via
   * updateMilestoneNested().
   */
  static async completeMilestone(_milestoneId: string): Promise<{
    milestone: ConstructionMilestone;
    triggered_payments: string[];
    message: string;
  }> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'completeMilestone',
      'PATCH completion_percentage: 100 via updateMilestoneNested().'
    );
  }

  /**
   * Submit milestone for verification.
   *
   * Phantom — no `/submit` action exists. Verification follows from
   * marking the milestone complete and admin review.
   */
  static async submitForVerification(_milestoneId: string): Promise<{ message: string; verification_id: string }> {
    return CONSTRUCTION_NOT_IMPLEMENTED('submitForVerification');
  }

  /**
   * Get milestone reports.
   *
   * Phantom — no `/reports` action. The closest equivalent is the
   * milestone `updates` log; use `addMilestoneUpdate()` and list updates
   * via the property progress endpoint.
   */
  static async getMilestoneReports(_milestoneId: string): Promise<ConstructionReport[]> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getMilestoneReports',
      'List milestone updates via getConstructionProgress() instead.'
    );
  }

  /**
   * Add progress report.
   *
   * Phantom — the legacy `/milestones/<id>/reports` route doesn't exist.
   * Use `addMilestoneUpdateNested(propertyId, milestoneId, ...)` which
   * posts to `/construction/<propertyId>/milestones/<milestoneId>/updates/`.
   */
  static async addProgressReport(_milestoneId: string, _report: {
    report_type: 'progress' | 'quality' | 'safety' | 'financial';
    title: string;
    content: string;
    images?: File[];
    documents?: File[];
  }): Promise<ConstructionReport> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'addProgressReport',
      'Use addMilestoneUpdateNested(propertyId, milestoneId, update) instead.'
    );
  }

  /**
   * Post a milestone update via the real nested URL. Mirrors the
   * backend `MilestoneUpdateCreateView`.
   */
  static async addMilestoneUpdateNested(
    propertyId: string,
    milestoneId: string,
    update: {
      title: string;
      content?: string;
      completion_percentage?: number;
      images?: File[];
      documents?: File[];
    }
  ): Promise<ConstructionReport> {
    const formData = new FormData();
    formData.append('title', update.title);
    if (update.content) formData.append('content', update.content);
    if (update.completion_percentage !== undefined) {
      formData.append('completion_percentage', String(update.completion_percentage));
    }
    update.images?.forEach((img, i) => formData.append(`images[${i}]`, img));
    update.documents?.forEach((doc, i) => formData.append(`documents[${i}]`, doc));
    return apiClient.uploadFile(
      `/construction/${propertyId}/milestones/${milestoneId}/updates/`,
      formData
    );
  }

  /**
   * Quality inspections — phantom. No `inspections` endpoint exists.
   * Quality data lives in milestone update text for now; if inspection
   * tracking becomes a real feature it needs its own backend app.
   */
  static async getInspections(_milestoneId: string): Promise<QualityInspection[]> {
    return CONSTRUCTION_NOT_IMPLEMENTED('getInspections');
  }

  static async scheduleInspection(_milestoneId: string, _inspection: {
    inspector_id: string;
    inspection_date: Date;
    inspection_type: 'quality' | 'safety' | 'code_compliance';
    checklist_template?: string;
  }): Promise<{ inspection_id: string; message: string }> {
    return CONSTRUCTION_NOT_IMPLEMENTED('scheduleInspection');
  }

  static async submitInspectionResults(_inspectionId: string, _results: {
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
    return CONSTRUCTION_NOT_IMPLEMENTED('submitInspectionResults');
  }

  /**
   * Installment schedule + payment — phantom under `/construction/`.
   *
   * The real installment system lives in the `properties` app (under
   * construction-installments) and in the `investments` app (for the
   * funding-installment variant). Callers should pick the right one:
   *   - Property build-phase installments  →  PropertyService / construction
   *     ViewSet via /properties/installments/
   *   - Investment payment installments    →  investments app
   */
  static async getInstallmentSchedule(_propertyId: string): Promise<InstallmentSchedule> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getInstallmentSchedule',
      'Use /properties/installments/?property=<propertyId> instead.'
    );
  }

  static async getUserInstallments(_propertyId: string): Promise<InstallmentPayment[]> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getUserInstallments',
      'Use /properties/installments/?user=me&property=<propertyId> instead.'
    );
  }

  static async payInstallment(
    _installmentId: string,
    _paymentMethod: {
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
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'payInstallment',
      'Use the construction-installment ViewSet process-payment action under /properties/installments/.'
    );
  }

  /**
   * Construction timeline — phantom. Aggregate from milestone updates
   * + progress overview instead.
   */
  static async getConstructionTimeline(_propertyId: string): Promise<Array<{
    date: Date;
    event_type: 'milestone_start' | 'milestone_complete' | 'inspection' | 'payment' | 'issue' | 'update';
    title: string;
    description: string;
    milestone_id?: string;
    status: 'completed' | 'current' | 'upcoming';
    images?: string[];
  }>> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getConstructionTimeline',
      'Compose from getConstructionProgress() and per-milestone updates.'
    );
  }

  /**
   * Construction analytics — phantom. Use property analytics endpoint
   * (`/properties/<id>/analytics/`) which surfaces overall progress.
   */
  static async getConstructionAnalytics(_propertyId: string): Promise<{
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
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getConstructionAnalytics',
      'Use PropertyService.getPropertyAnalytics(propertyId) instead.'
    );
  }

  /**
   * Construction issues — phantom. No issue-tracking model exists.
   */
  static async reportIssue(_propertyId: string, _issue: {
    type: 'quality' | 'safety' | 'schedule' | 'budget' | 'weather' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    milestone_id?: string;
    images?: File[];
    location?: string;
  }): Promise<{ issue_id: string; message: string }> {
    return CONSTRUCTION_NOT_IMPLEMENTED('reportIssue');
  }

  static async getConstructionIssues(_propertyId: string, _status?: string): Promise<Array<{
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
    return CONSTRUCTION_NOT_IMPLEMENTED('getConstructionIssues');
  }

  /**
   * Subscribe/unsubscribe to construction updates — phantom.
   * Use PropertyService.subscribeToUpdates() instead; property updates
   * include construction milestones.
   */
  static async subscribeToUpdates(_propertyId: string): Promise<{ message: string }> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'subscribeToUpdates',
      'Use PropertyService.subscribeToUpdates(propertyId) — property subscriptions cover construction updates.'
    );
  }

  static async unsubscribeFromUpdates(_propertyId: string): Promise<{ message: string }> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'unsubscribeFromUpdates',
      'Use PropertyService.unsubscribeFromUpdates(propertyId).'
    );
  }

  /**
   * Construction documents — phantom under `/construction/<id>/documents/`.
   * Documents attach to specific milestones; use the nested URL.
   */
  static async getConstructionDocuments(_propertyId: string): Promise<Array<{
    id: string;
    name: string;
    type: 'blueprint' | 'permit' | 'contract' | 'inspection_report' | 'photo' | 'other';
    url: string;
    size: number;
    uploaded_at: Date;
    uploaded_by: string;
    milestone_id?: string;
  }>> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'getConstructionDocuments',
      'List per-milestone documents via getMilestones() and the data-room endpoint.'
    );
  }

  /**
   * Upload a milestone document via the real nested URL.
   *
   * Mirrors the backend `MilestoneDocumentUploadView` — requires both
   * the property id and the milestone id, plus a typed name.
   */
  static async uploadMilestoneDocument(
    propertyId: string,
    milestoneId: string,
    document: {
      file: File;
      type: 'blueprint' | 'permit' | 'contract' | 'inspection_report' | 'photo' | 'other';
      name: string;
      description?: string;
    }
  ): Promise<{ document_id: string; url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', document.file);
    formData.append('type', document.type);
    formData.append('name', document.name);
    if (document.description) formData.append('description', document.description);
    return apiClient.uploadFile(
      `/construction/${propertyId}/milestones/${milestoneId}/documents/`,
      formData
    );
  }

  /**
   * Legacy upload helper — phantom under the un-nested path.
   */
  static async uploadDocument(_propertyId: string, _document: {
    file: File;
    type: 'blueprint' | 'permit' | 'contract' | 'inspection_report' | 'photo' | 'other';
    name: string;
    description?: string;
    milestone_id?: string;
  }): Promise<{ document_id: string; url: string; message: string }> {
    return CONSTRUCTION_NOT_IMPLEMENTED(
      'uploadDocument',
      'Use uploadMilestoneDocument(propertyId, milestoneId, ...) — uploads are nested under a milestone.'
    );
  }
}

export default ConstructionService;