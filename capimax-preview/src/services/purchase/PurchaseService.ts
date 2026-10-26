/**
 * Buying shares the PropShare way — /purchases/.
 *
 * The server prices everything (whole shares, the platform fee, the Pronova
 * discount); the screen only shows its quote. Wallet purchases complete at
 * once; card / Pronova / crypto open the provider's secure page; bank transfer
 * and Nova Sukuk hold the shares until our team reviews the document.
 */

import { apiClient } from '../api/ApiClient';

export type PurchaseApiMethod = 'wallet' | 'reinvest' | 'card' | 'crypto' | 'pronova' | 'nova_sukuk' | 'bank';

export interface MethodAvailability {
  id: PurchaseApiMethod;
  available: boolean;
  discount_pct?: string;
  test_mode?: boolean;
}

export interface PaymentOptions {
  methods: MethodAvailability[];
  fees: {
    platform_fee_pct: string;
    installment_fee_pct: string;
    secondary_resale_fee_pct: string;
    management_fee_pct: string;
    pronova_discount_pct: string;
    reinvest_discount_pct: string;
  };
}

export interface PurchaseQuote {
  shares: number;
  unit_price: string;
  subtotal: string;
  platform_fee: string;
  platform_fee_pct: string;
  discount: string;
  discount_pct: string;
  total: string;
}

export interface Purchase {
  investment_id: string;
  status: string;
  method: PurchaseApiMethod;
  property_id: string;
  property_title: string;
  shares: number;
  unit_price: string | null;
  subtotal: string;
  platform_fee: string;
  total: string | null;
  reserved_until: string | null;
  payment_id: string | null;
  payment_status: string | null;
  checkout_url: string | null;
  next?: 'done' | 'checkout' | 'review';
  reference?: string;
}

export interface PaymentStatus {
  payment_id: string;
  status: string;
  amount: string;
  credited: string;
  purpose: string;
  investment_id: string | null;
}

export interface OpenCryptoPayment {
  payment_id: string;
  amount: string;
  purpose: string;
  coin: string | null;
  checkout_url: string;
  created_at: string;
  property_title: string | null;
}

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class PurchaseService {
  static methods(): Promise<PaymentOptions> {
    return apiClient.get('/purchases/methods/');
  }

  static quote(propertyId: string, amount: number | string, method: PurchaseApiMethod): Promise<PurchaseQuote> {
    return apiClient.post('/purchases/quote/', { property_id: propertyId, amount, method });
  }

  /**
   * Start a purchase. `idempotencyKey` should stay the same for retries of the
   * same click, so a double submit never buys twice.
   */
  static create(
    body: {
      property_id: string;
      amount: number | string;
      method: PurchaseApiMethod;
      expected_unit_price?: string;
      pay_currency?: string;
    },
    idempotencyKey: string = newKey(),
  ): Promise<Purchase> {
    return apiClient.post('/purchases/', body, { headers: { 'Idempotency-Key': idempotencyKey } });
  }

  static status(investmentId: string): Promise<Purchase> {
    return apiClient.get(`/purchases/${investmentId}/`);
  }

  static paymentStatus(paymentId: string): Promise<PaymentStatus> {
    return apiClient.get(`/purchases/payments/${paymentId}/`);
  }

  static submitProof(investmentId: string, file: File, extra: Record<string, string> = {}): Promise<Purchase> {
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(extra).forEach(([k, v]) => v && fd.append(k, v));
    return apiClient.post(`/purchases/${investmentId}/proof/`, fd);
  }

  static async coins(): Promise<string[]> {
    const res = await apiClient.get<{ coins: string[]; available: boolean }>('/purchases/crypto/coins/');
    return res?.coins ?? [];
  }

  static minimum(coin: string): Promise<{ coin: string; minimum_usd: string | null; minimum_coin?: string | null }> {
    return apiClient.get('/purchases/crypto/minimum/', { coin });
  }

  /** Rental returns that can be reinvested at the discount (deposits do not qualify). */
  static reinvest(): Promise<{ returns: string; discount_pct: string }> {
    return apiClient.get('/purchases/reinvest/');
  }

  static async openCrypto(): Promise<OpenCryptoPayment[]> {
    const res = await apiClient.get<{ payments: OpenCryptoPayment[] }>('/purchases/crypto/open/');
    return res?.payments ?? [];
  }

  static deposit(amount: number, method: 'card' | 'crypto', payCurrency?: string): Promise<{ payment_id: string; checkout_url: string }> {
    return apiClient.post('/purchases/deposit/', { amount, method, ...(payCurrency ? { pay_currency: payCurrency } : {}) });
  }

  static newIdempotencyKey = newKey;
}

export default PurchaseService;
