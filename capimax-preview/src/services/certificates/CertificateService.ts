/**
 * Ownership certificates (client round 4, #5) — issued by the backend for every
 * paid holding; the QR on the PDF opens /verify/<verification_code>.
 */

import { apiClient } from '../api/ApiClient';

export type CertificateStatus = 'provisional' | 'final' | 'revoked';

export interface CertificateRecord {
  id?: string;
  property_id?: string | null;
  investment_id?: string | null;
  installment_plan_id?: string | null;
  certificate_id: string;
  status: CertificateStatus;
  issue_date: string;
  subscription_date: string | null;
  finalized_at: string | null;
  investor_name: string;
  investor_id_masked: string;
  spv_name: string;
  spv_registration_ref: string;
  spv_jurisdiction: string;
  spv_registry_url: string | null;
  property_name: string;
  property_location: string;
  units: number;
  total_units: number;
  unit_price: string;
  investment_amount: string;
  ownership_percentage: string;
  acquisition: string;
  holder_wallet: string;
  contract_address: string;
  token_standard: string;
  token_id: string;
  network_name: string;
  chain_id: number | null;
  contract_explorer_url: string;
  mint_tx_hash: string;
  mint_tx_url: string;
  authorized_signatory: string;
  digital_signature_hash: string;
  verification_code: string;
  verification_url: string;
  revoked_at: string | null;
  revocation_reason: string;
  replaced_by_certificate_id: string | null;
}

export interface Registration {
  property_id: string;
  property_name: string;
  spv_name: string;
  filing_id: string;
  jurisdiction: string;
  registry_url: string | null;
  contract_address: string;
  network_name: string;
  contract_explorer_url: string;
}

const asList = <T,>(res: any): T[] => (Array.isArray(res) ? res : res?.results ?? res?.data ?? []);

export const CertificateService = {
  async mine(): Promise<CertificateRecord[]> {
    return asList<CertificateRecord>(await apiClient.get('/certificates/'));
  },

  /** Public — by the QR code or the printed certificate ID. */
  async verify(code: string): Promise<CertificateRecord> {
    return await apiClient.get(`/certificates/verify/${encodeURIComponent(code.trim())}/`);
  },

  async registrations(): Promise<Registration[]> {
    return asList<Registration>(await apiClient.get('/certificates/registrations/'));
  },

  /** The page the QR opens (same origin as the app). */
  verifyPath(code: string): string {
    return `/verify/${encodeURIComponent(code)}`;
  },
};

export default CertificateService;
