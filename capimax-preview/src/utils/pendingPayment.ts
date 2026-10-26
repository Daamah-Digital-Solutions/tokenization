/**
 * The purchase / deposit a member left for the provider's page. The return
 * link carries the ids too; this is the fallback when a provider drops them.
 */
const KEY = 'capimax.pending_payment';

export interface PendingPayment {
  paymentId: string;
  investmentId?: string;
}

export function rememberPendingPurchase(investmentId: string | undefined, paymentId: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ paymentId, investmentId }));
  } catch {
    /* private mode / blocked storage: the URL still carries the ids */
  }
}

export function takePendingPayment(): PendingPayment | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch {
    return null;
  }
}
