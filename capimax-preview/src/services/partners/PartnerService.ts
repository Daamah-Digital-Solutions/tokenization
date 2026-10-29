import { apiClient } from '../api/ApiClient';

/**
 * Broker / liquidity-provider status of the signed-in account (client round 4
 * follow-up): does it have the role, and where does its last application stand.
 */

export type PartnerKind = 'broker' | 'lp';

export interface PartnerApplicationSummary {
  id: string;
  status: 'pending' | 'under_review' | 'incomplete' | 'approved' | 'rejected' | 'withdrawn' | string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string;
}

export interface PartnerStatus {
  has_role: boolean;
  application: PartnerApplicationSummary | null;
}

const PATHS: Record<PartnerKind, string> = {
  broker: '/broker/applications/mine/',
  lp: '/liquidity-provider/applications/mine/',
};

/** The dashboard role each partner programme gives. */
export const PARTNER_ROLE: Record<PartnerKind, 'broker' | 'liquidity_provider'> = {
  broker: 'broker',
  lp: 'liquidity_provider',
};

/** Where each programme's application lives (route + params for the router). */
export const PARTNER_APPLY: Record<PartnerKind, { route: string; params?: Record<string, string> }> = {
  broker: { route: 'broker-application' },
  lp: { route: 'liquidity-provider', params: { apply: '1' } },
};

export const PARTNER_INFO_ROUTE: Record<PartnerKind, string> = {
  broker: 'broker-program',
  lp: 'liquidity-provider',
};

const OPEN = new Set(['pending', 'under_review', 'incomplete']);

export const isOpenApplication = (status?: string | null) => !!status && OPEN.has(status);

export const PartnerService = {
  status(kind: PartnerKind): Promise<PartnerStatus> {
    return apiClient.get<PartnerStatus>(PATHS[kind]);
  },

  /** Make the partner role the account's active one, so /dashboard opens it. */
  async activate(kind: PartnerKind, currentRole?: string): Promise<void> {
    const role = PARTNER_ROLE[kind];
    if (currentRole !== role) {
      await apiClient.post('/auth/roles/set-primary/', { role });
    }
  },
};
