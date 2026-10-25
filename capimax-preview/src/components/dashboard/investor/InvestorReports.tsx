/**
 * Investor → "Reports": official statements (client edit #10, round 3 #16).
 *
 * Every statement the client asked for, as an official Capimax RT PDF for a
 * chosen period and in the chosen language: wallet, transactions,
 * investments and owned properties (+ the transactions CSV). The figures
 * come from /documents/statements/<kind>/ so they match the ledgers.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, Building2, Download, FileSpreadsheet, Landmark, Loader2, ReceiptText, Wallet,
} from 'lucide-react';
import { StatementService, type StatementKind } from '../../../services/documents/StatementService';
import { downloadStatementPdf } from '../../../utils/pdf/statements';

type Preset = 'month' | 'quarter' | 'year' | 'all';

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function presetRange(preset: Preset): { from: string; to: string } {
  const today = new Date();
  const to = iso(today);
  if (preset === 'month') return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  if (preset === 'quarter') return { from: iso(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())), to };
  if (preset === 'year') return { from: iso(new Date(today.getFullYear(), 0, 1)), to };
  return { from: '', to };
}

const CARDS: Array<{ kind: StatementKind; icon: React.ElementType }> = [
  { kind: 'wallet', icon: Wallet },
  { kind: 'transactions', icon: ReceiptText },
  { kind: 'investments', icon: Landmark },
  { kind: 'holdings', icon: Building2 },
];

export const InvestorReports: React.FC = () => {
  const { t, i18n } = useTranslation('docs');
  const [preset, setPreset] = useState<Preset>('all');
  const [range, setRange] = useState(presetRange('all'));
  const [docLang, setDocLang] = useState<string>(i18n.language?.startsWith('ar') ? 'ar' : 'en');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    setRange(presetRange(p));
  };

  const download = async (kind: StatementKind) => {
    setError(null);
    setBusy(kind);
    try {
      const data = await StatementService.get(kind, range.from || undefined, range.to || undefined);
      await downloadStatementPdf(data, docLang);
    } catch (e: any) {
      console.error('Statement failed:', e);
      setError(t('ui.error') as string);
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setError(null);
    setBusy('csv');
    try {
      const blob = await StatementService.transactionsCsv(range.from || undefined, range.to || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capimax-rt-transactions-${range.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(t('ui.error') as string);
    } finally {
      setBusy(null);
    }
  };

  const presets: Preset[] = useMemo(() => ['month', 'quarter', 'year', 'all'], []);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('ui.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('ui.subtitle')}</p>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('ui.period')}</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => choosePreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    preset === p
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t(`ui.presets.${p}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                {t('ui.from')}
                <input
                  type="date"
                  value={range.from}
                  onChange={(e) => { setPreset('all'); setRange((r) => ({ ...r, from: e.target.value })); }}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                {t('ui.to')}
                <input
                  type="date"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </label>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('ui.language')}</div>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {(['en', 'ar'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setDocLang(l)}
                  className={`px-4 py-1.5 text-sm font-medium ${
                    docLang === l ? 'bg-slate-900 text-white dark:bg-emerald-600' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {l === 'en' ? t('ui.english') : t('ui.arabic')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CARDS.map(({ kind, icon: Icon }) => (
          <div key={kind} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {i18n.getFixedT(docLang, 'docs')(`titles.${kind}`)}
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">{t(`ui.descriptions.${kind}`)}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => download(kind)}
                disabled={!!busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 transition-colors"
              >
                {busy === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {busy === kind ? t('ui.preparing') : t('ui.download')}
              </button>
              {kind === 'transactions' && (
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={!!busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 font-medium px-4 py-2.5 transition-colors"
                >
                  {busy === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  {t('ui.csv')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvestorReports;
