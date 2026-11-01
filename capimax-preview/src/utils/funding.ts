/**
 * How far a property is sold, the same on every card and on the property page
 * (client: "Funding progress stays at 0%"). A few shares of a large property are
 * a tiny percentage: rounded to a whole number they showed 0% and an empty bar.
 */

export interface FundingNumbers {
  tokens_sold?: number | string | null;
  /** Sold shares + shares held by running installment plans (from the API). */
  shares_taken?: number | string | null;
  total_tokens?: number | string | null;
}

export const sharesTaken = (p: FundingNumbers): number => Number(p.shares_taken ?? p.tokens_sold) || 0;

export function fundingPercent(taken: number, total: number): number {
  return total > 0 ? Math.min((taken / total) * 100, 100) : 0;
}

/** "0", "<0.01", "0.25", "3.5", "42" — the sign is the caller's. */
export function formatFundingPercent(taken: number, total: number): string {
  const pct = fundingPercent(taken, total);
  if (pct <= 0) return '0';
  if (pct < 0.01) return '<0.01';
  if (pct < 1) return pct.toFixed(2);
  if (pct < 10) return String(Number(pct.toFixed(1)));
  return String(Math.round(pct));
}

/** Width of the progress bar: any sale shows, even a tiny one. */
export function fundingBarWidth(taken: number, total: number): string {
  const pct = fundingPercent(taken, total);
  return `${pct > 0 ? Math.max(pct, 1.5) : 0}%`;
}
