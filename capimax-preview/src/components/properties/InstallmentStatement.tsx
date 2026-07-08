/**
 * InstallmentStatement — the installment plan shown on an under-construction
 * property's detail page (client edit #3a).
 *
 * Renders an indicative, equal-installment projection (total ÷ months, no down
 * payment — mirroring ConstructionInstallmentCreateSerializer on the backend so
 * the numbers here match the plan created at checkout) plus a downloadable PDF.
 *
 * Display/estimate only — it charges nothing. Actually buying in installments
 * and paying them happens in the investment flow and the dashboard.
 */

import React, { useMemo, useState } from 'react';
import { CalendarClock, Coins, Download, CheckCircle2 } from 'lucide-react';
import {
  downloadInstallmentSchedulePdf,
  InstallmentScheduleRow,
} from '../../utils/installmentSchedulePdf';

interface InstallmentStatementProperty {
  title: string;
  city?: string;
  country?: string;
  token_price: number | string;
  total_tokens?: number;
  tokens_sold?: number;
  minimum_investment?: number | string;
  installment_period_months?: number;
}

interface InstallmentStatementProps {
  property: InstallmentStatementProperty;
  className?: string;
}

const money = (n: number): string =>
  `$${(isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money0 = (n: number): string =>
  `$${Math.round(isFinite(n) ? n : 0).toLocaleString('en-US')}`;

const addMonths = (base: Date, n: number): Date => {
  const d = new Date(base.getFullYear(), base.getMonth() + n, base.getDate());
  return d;
};
const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const InstallmentStatement: React.FC<InstallmentStatementProps> = ({ property, className = '' }) => {
  const tokenPrice = Math.max(0, Number(property.token_price) || 0);
  const availableTokens = Math.max(
    0,
    (Number(property.total_tokens) || 0) - (Number(property.tokens_sold) || 0),
  );
  const maxMonths = Math.max(2, Number(property.installment_period_months) || 12);

  // A sensible starting amount: the property minimum if published, else ~10
  // tokens, always at least one token's worth.
  const defaultAmount = useMemo(() => {
    const min = Number(property.minimum_investment) || 0;
    if (min > 0) return min;
    return tokenPrice > 0 ? tokenPrice * 10 : 0;
  }, [property.minimum_investment, tokenPrice]);

  const [amount, setAmount] = useState<string>(defaultAmount ? String(Math.round(defaultAmount)) : '');
  const [months, setMonths] = useState<number>(Math.min(12, maxMonths));

  const amountValue = Math.max(0, Number(amount) || 0);

  // Align the amount to a whole number of tokens (you can only own whole
  // tokens), then recompute the plan off that token-aligned total.
  const { tokens, totalAmount, installmentAmount, rows } = useMemo(() => {
    const rawTokens = tokenPrice > 0 ? Math.round(amountValue / tokenPrice) : 0;
    let tk = Math.max(1, rawTokens);
    if (availableTokens > 0) tk = Math.min(tk, availableTokens);
    const total = tk * tokenPrice;
    const n = Math.max(1, Math.min(months, maxMonths));
    const per = total / n;

    const start = new Date();
    const list: InstallmentScheduleRow[] = [];
    let paid = 0;
    for (let i = 1; i <= n; i++) {
      // Absorb rounding into the final payment so the schedule sums to total.
      const amt = i === n ? Math.max(0, total - paid) : Math.round(per * 100) / 100;
      paid += amt;
      list.push({
        number: i,
        dueDate: addMonths(start, i),
        amount: amt,
        remaining: Math.max(0, Math.round((total - paid) * 100) / 100),
      });
    }
    return { tokens: tk, totalAmount: total, installmentAmount: per, rows: list };
  }, [amountValue, tokenPrice, availableTokens, months, maxMonths]);

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInstallmentSchedulePdf({
        propertyName: property.title,
        location: [property.city, property.country].filter(Boolean).join(', ') || undefined,
        tokens,
        tokenPrice,
        totalAmount,
        months: rows.length,
        frequencyLabel: 'Monthly',
        installmentAmount,
        rows,
      });
    } catch (e) {
      // Non-fatal — the on-screen schedule is still available.
      console.error('Installment PDF generation failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  const monthOptions = useMemo(() => {
    const opts = [3, 6, 12, 18, 24, 36, 48, 60].filter((m) => m <= maxMonths);
    if (!opts.includes(maxMonths)) opts.push(maxMonths);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }, [maxMonths]);

  if (tokenPrice <= 0) return null;

  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              Installment Plan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Own this property in equal monthly payments
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap">
          Available
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
        No down payment — pay in equal instalments over up to{' '}
        <strong>{maxMonths} months</strong>. Your token ownership is released gradually as you pay.
      </p>

      {/* Calculator inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Amount to own (USD)
          </label>
          <input
            type="number"
            min={tokenPrice}
            step={tokenPrice || 1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-400 mt-1">
            ≈ {tokens.toLocaleString()} token{tokens === 1 ? '' : 's'} · {money0(totalAmount)}
            {availableTokens > 0 && tokens >= availableTokens ? ' (max available)' : ''}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Number of months
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m} months
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Monthly payments</p>
        </div>
      </div>

      {/* Highlight */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-100 dark:border-emerald-900/40 p-4 mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {money(installmentAmount)}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / month</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {rows.length} payments · {money0(totalAmount)} total · no down payment
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Coins className="w-4 h-4 text-emerald-500" />
          {tokens.toLocaleString()} tokens
        </div>
      </div>

      {/* Schedule table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-5">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Due date</div>
          <div className="col-span-3 text-right">Amount</div>
          <div className="col-span-3 text-right">Remaining</div>
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <div key={r.number} className="grid grid-cols-12 gap-2 px-4 py-2 text-sm">
              <div className="col-span-1 text-gray-400">{r.number}</div>
              <div className="col-span-5 text-gray-700 dark:text-gray-300">{fmtDate(r.dueDate)}</div>
              <div className="col-span-3 text-right font-medium text-gray-900 dark:text-white">
                {money(r.amount)}
              </div>
              <div className="col-span-3 text-right text-gray-500 dark:text-gray-400">
                {money(r.remaining)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Estimate only — final terms confirmed at checkout
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
};

export default InstallmentStatement;
