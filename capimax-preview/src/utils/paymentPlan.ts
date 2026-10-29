import { uiLocale } from './locale';
/**
 * Payment plans, price phases and listing details (client round 3, #18 #19
 * #20 and admin note #2).
 *
 * `buildSchedule` mirrors `properties/payment_plan.build_schedule` on the
 * backend exactly (down payment on the start date, then N equal
 * installments every period, the last one absorbing rounding) so the
 * schedule a buyer sees on the property page is the plan created at
 * checkout.
 */

export type PurchaseMethods = 'cash' | 'installments' | 'both';
export type PlanFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface PaymentPlanConfig {
  purchase_methods: PurchaseMethods;
  allows_cash: boolean;
  allows_installments: boolean;
  down_payment_percent: number | string;
  installment_count: number | null;
  count_options: number[];
  frequency: PlanFrequency;
  first_due_date: string | null;
  max_period_months: number | null;
  notes: string;
  minimum_installment: number | string;
}

export interface PriceTier {
  label: string;
  price_per_token: number | string;
  effective_from: string;
  effective_to: string | null;
  notes: string;
  is_current: boolean;
  is_upcoming: boolean;
}

export interface ListingDocument {
  id: number | string;
  name: string;
  document_type?: string;
  description?: string;
  size?: number;
  uploaded_at?: string;
  document_url: string | null;
}

export interface ValuationRow {
  current_value: number | string;
  valuation_date: string;
  method: string;
  appraiser: string;
  report_url: string | null;
  notes: string;
}

export interface ListingDetails {
  payment_plan: PaymentPlanConfig;
  price_tiers: PriceTier[];
  next_price_change: { label: string; price_per_token: number | string; effective_from: string } | null;
  developer: {
    name: string;
    description: string;
    website: string;
    established_year: number | null;
    projects_completed: number | null;
    contact_email: string;
    contact_phone: string;
  } | null;
  returns: {
    expected_return: number | string | null;
    rental_yield: number | string | null;
    expected_appreciation_rate: number | string | null;
    projected_annual_rental_income: number | string | null;
    monthly_rental_income: number | string | null;
    notes: string;
  };
  financial_study: { summary: string; documents: ListingDocument[] };
  valuation: { latest: ValuationRow | null; history: ValuationRow[]; documents: ListingDocument[] };
  insurance: {
    provider?: string;
    policy_number?: string;
    coverage?: string;
    coverage_amount?: number | string | null;
    expiry_date?: string | null;
    documents: ListingDocument[];
  } | null;
}

export interface ScheduleRow {
  number: number;
  kind: 'down_payment' | 'installment';
  dueDate: Date;
  amount: number;
  percent: number;
  remaining: number;
  /** Only on a buyer's plan (dashboard). */
  status?: 'paid' | 'due' | 'overdue' | 'upcoming' | 'cancelled';
  paidAt?: string | null;
  paymentId?: string | null;
}

export const FREQUENCY_MONTHS: Record<PlanFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** Add months the way dateutil.relativedelta does (clamped to month end). */
export const addMonths = (base: Date, months: number): Date => {
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(base.getDate(), lastDay));
  return target;
};

/** Parse a backend "YYYY-MM-DD" as a local date (no timezone shift). */
export const parseDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export function buildSchedule(
  total: number,
  opts: {
    downPaymentPercent?: number;
    count: number;
    frequency?: PlanFrequency;
    startDate?: Date;
    firstDueDate?: Date | null;
  },
): ScheduleRow[] {
  const totalC = cents(Math.max(0, total));
  const start = opts.startDate ?? new Date();
  const step = FREQUENCY_MONTHS[opts.frequency || 'monthly'] || 1;
  const downPct = Math.max(0, Number(opts.downPaymentPercent) || 0);
  const count = Math.max(1, Math.floor(opts.count || 1));

  const rows: ScheduleRow[] = [];
  const down = downPct > 0 ? cents((totalC * downPct) / 100) : 0;
  if (down > 0) {
    rows.push({ number: 1, kind: 'down_payment', dueDate: start, amount: down, percent: cents(downPct), remaining: 0 });
  }
  const remainingTotal = cents(totalC - down);
  const regular = cents(remainingTotal / count);
  const first = opts.firstDueDate ?? (down > 0 ? addMonths(start, step) : start);
  let allocated = 0;
  for (let i = 0; i < count; i++) {
    const amount = i < count - 1 ? regular : cents(remainingTotal - allocated);
    allocated = cents(allocated + amount);
    rows.push({
      number: rows.length + 1,
      kind: 'installment',
      dueDate: addMonths(first, step * i),
      amount,
      percent: totalC ? cents((amount / totalC) * 100) : 0,
      remaining: 0,
    });
  }
  let paid = 0;
  for (const row of rows) {
    paid = cents(paid + row.amount);
    row.remaining = Math.max(0, cents(totalC - paid));
  }
  return rows;
}

/** Plan config for properties whose API predates listing_details. */
export function fallbackPlan(property: {
  supports_installments?: boolean;
  installment_period_months?: number | null;
}): PaymentPlanConfig {
  const allowsInstallments = !!property.supports_installments;
  const max = Math.max(1, Number(property.installment_period_months) || 12);
  const options = Array.from(new Set([3, 6, 12, max].filter((n) => n <= max))).sort((a, b) => a - b);
  return {
    purchase_methods: allowsInstallments ? 'both' : 'cash',
    allows_cash: true,
    allows_installments: allowsInstallments,
    down_payment_percent: 0,
    installment_count: null,
    count_options: allowsInstallments ? options : [],
    frequency: 'monthly',
    first_due_date: null,
    max_period_months: property.installment_period_months ?? null,
    notes: '',
    minimum_installment: 100,
  };
}

/** Schedule rows from a buyer's plan API (`schedule` field) with remaining totals. */
export function rowsFromPlanSchedule(schedule: any[] | undefined, total: number): ScheduleRow[] {
  if (!Array.isArray(schedule)) return [];
  let paid = 0;
  return schedule.map((r) => {
    const amount = Number(r.amount) || 0;
    paid = cents(paid + amount);
    return {
      number: r.number,
      kind: r.kind === 'down_payment' ? 'down_payment' : 'installment',
      dueDate: parseDate(r.due_date) || new Date(),
      amount,
      percent: Number(r.percent) || 0,
      remaining: Math.max(0, cents(total - paid)),
      status: r.status,
      paidAt: r.paid_at,
      paymentId: r.payment_id,
    };
  });
}

export const formatMoney = (n: number | string | null | undefined, digits = 2, locale = 'en-US'): string => {
  const v = Number(n);
  return `$${(isFinite(v) ? v : 0).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

export const formatPlanDate = (d: Date | string | null | undefined, lang = 'en'): string => {
  const date = parseDate(d as any);
  if (!date) return '—';
  return date.toLocaleDateString(uiLocale(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
