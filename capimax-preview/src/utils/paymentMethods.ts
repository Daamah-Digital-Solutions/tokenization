import { Bitcoin, Building2, Coins, CreditCard, FileText, Smartphone, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MethodAvailability, PurchaseApiMethod } from '../services/purchase/PurchaseService';

/**
 * The ways to pay for shares — ONE list, in this order, on every property
 * (the PropShare model). A method whose provider is not set up is shown as
 * unavailable, never dropped.
 *
 * Card, Apple Pay, Google Pay and Pronova pay on Stripe's secure page (the
 * phone wallets show there on devices that support them); crypto on
 * NOWPayments' page; bank transfer and Nova Sukuk are reviewed by our team;
 * the wallet pays at once.
 */
export type PayMethodId =
  | 'wallet'
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'crypto'
  | 'pronova'
  | 'nova_sukuk'
  | 'bank';

export interface PayMethod {
  id: PayMethodId;
  icon: LucideIcon;
  /** What the server is sent: Apple / Google Pay are card payments on Stripe's page. */
  apiMethod: PurchaseApiMethod;
}

export const PAYMENT_METHODS: readonly PayMethod[] = [
  { id: 'wallet', icon: Wallet, apiMethod: 'wallet' },
  { id: 'card', icon: CreditCard, apiMethod: 'card' },
  { id: 'apple_pay', icon: Smartphone, apiMethod: 'card' },
  { id: 'google_pay', icon: Smartphone, apiMethod: 'card' },
  { id: 'crypto', icon: Bitcoin, apiMethod: 'crypto' },
  { id: 'pronova', icon: Coins, apiMethod: 'pronova' },
  { id: 'nova_sukuk', icon: FileText, apiMethod: 'nova_sukuk' },
  { id: 'bank', icon: Building2, apiMethod: 'bank' },
];

export function payMethod(id: PayMethodId): PayMethod {
  return PAYMENT_METHODS.find((m) => m.id === id) ?? PAYMENT_METHODS[0];
}

/** Whether the server has this rail live (unknown until it answers: offer it — the server still refuses a dead one). */
export function methodLive(methods: MethodAvailability[] | undefined, method: PayMethod): boolean {
  if (!methods) return true;
  return Boolean(methods.find((m) => m.id === method.apiMethod)?.available);
}

/** Apple Pay only exists in Safari on Apple devices with a card in Wallet. */
export function applePayOnThisDevice(): boolean {
  try {
    const session = (window as unknown as { ApplePaySession?: { canMakePayments?: () => boolean } })
      .ApplePaySession;
    return Boolean(session?.canMakePayments?.());
  } catch {
    return false;
  }
}
