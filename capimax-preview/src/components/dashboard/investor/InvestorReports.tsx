/**
 * Investor → "Reports" view.
 *
 * Surfaces the account reports as a top-level dashboard section instead of the
 * buried, non-functional "coming soon" stubs that used to live inside Settings
 * (client edit #10). Both reports are generated from data the dashboard already
 * has, so no new backend endpoint is required:
 *   • Ownership Statement (PDF)  — built from the investor's holdings.
 *   • Transaction History (CSV)  — via the existing export endpoint.
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Table, Download, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { InvestmentService } from '../../../services/investment/InvestmentService';
import { TransactionService } from '../../../services/transaction/TransactionService';
import { useUser } from '../../../contexts/AuthContext';
import { downloadPortfolioPdf, type PortfolioHoldingRow } from '../../../utils/portfolioPdf';

const formatCurrency = (n: number): string => `$${Math.round(n).toLocaleString()}`;

export const InvestorReports: React.FC = () => {
  const user = useUser();

  const investmentsQuery = useQuery({
    queryKey: ['investor-reports-holdings'],
    queryFn: () => InvestmentService.getUserInvestments(),
  });

  const rows: PortfolioHoldingRow[] = useMemo(() => {
    const holdings = investmentsQuery.data ?? [];
    return holdings.map((h: any) => {
      const tokens = h.tokens_total_owned || 0;
      const tokenPrice = Number(h.property?.token_price) || 0;
      const currentValue = tokenPrice > 0 ? tokenPrice * tokens : h.investment_amount || 0;
      const location = `${h.property?.city || ''}${
        h.property?.country ? ', ' + h.property.country : ''
      }`.replace(/^, /, '');
      return {
        property: h.property?.title || 'Property',
        location: location || undefined,
        tokens,
        purchaseValue: Number(h.investment_amount) || 0,
        currentValue,
      };
    });
  }, [investmentsQuery.data]);

  const totals = useMemo(() => {
    const purchased = rows.reduce((s, r) => s + r.purchaseValue, 0);
    const current = rows.reduce((s, r) => s + r.currentValue, 0);
    const change = purchased > 0 ? ((current - purchased) / purchased) * 100 : 0;
    return { purchased, current, change, count: rows.length };
  }, [rows]);

  const investorName = useMemo(() => {
    const u = user as any;
    if (!u) return undefined;
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return full || u.full_name || u.email || undefined;
  }, [user]);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    setError(null);
    setPdfBusy(true);
    try {
      await downloadPortfolioPdf({
        generatedAt: new Date(),
        investorName,
        holdings: rows,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not generate the statement. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  };

  const handleExportCsv = async () => {
    setError(null);
    setCsvBusy(true);
    try {
      const blob = await TransactionService.exportTransactions({});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Could not export transactions. Please try again.');
    } finally {
      setCsvBusy(false);
    }
  };

  const loadingHoldings = investmentsQuery.isLoading;
  const noHoldings = !loadingHoldings && rows.length === 0;

  return (
    <div className="space-y-6">
      {/* Header + portfolio summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reports</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Download your ownership statement and transaction history.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <Stat label="Properties" value={loadingHoldings ? '—' : String(totals.count)} />
          <Stat label="Total Purchased" value={loadingHoldings ? '—' : formatCurrency(totals.purchased)} />
          <Stat label="Current Value" value={loadingHoldings ? '—' : formatCurrency(totals.current)} />
          <Stat
            label="Change"
            value={loadingHoldings ? '—' : `${totals.change >= 0 ? '+' : ''}${totals.change.toFixed(2)}%`}
            positive={totals.change >= 0}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ReportCard
          icon={<FileText className="w-5 h-5" />}
          title="Ownership Statement"
          description="A PDF summary of every property you own — tokens held, amount paid, current value and overall change."
          actionLabel="Download PDF"
          busy={pdfBusy}
          disabled={loadingHoldings || noHoldings}
          disabledHint={noHoldings ? 'You don’t own any properties yet.' : undefined}
          onClick={handleDownloadPdf}
        />
        <ReportCard
          icon={<Table className="w-5 h-5" />}
          title="Transaction History"
          description="Export all of your transactions (purchases, dividends, withdrawals) as a CSV file for your records."
          actionLabel="Export CSV"
          busy={csvBusy}
          disabled={false}
          onClick={handleExportCsv}
        />
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; positive?: boolean }> = ({
  label,
  value,
  positive,
}) => (
  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-4">
    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <p
      className={
        'text-lg font-bold ' +
        (positive === undefined
          ? 'text-slate-900 dark:text-white'
          : positive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400')
      }
    >
      {value}
    </p>
  </div>
);

const ReportCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  busy: boolean;
  disabled: boolean;
  disabledHint?: string;
  onClick: () => void;
}> = ({ icon, title, description, actionLabel, busy, disabled, disabledHint, onClick }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
    </div>
    <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">{description}</p>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 transition-colors"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {busy ? 'Preparing…' : actionLabel}
    </button>
    {disabled && disabledHint && (
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{disabledHint}</p>
    )}
  </div>
);

export default InvestorReports;
