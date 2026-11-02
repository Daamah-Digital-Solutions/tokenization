import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { cn } from '../../utils/cn';
import { baseLanguage } from '../../utils/locale';
import { Button } from '../ui/Button';
import { LiquidityProviderService, type LPStatement as Statement } from '../../services/liquidity-provider/LiquidityProviderService';
import { codeLabel, docT, newOfficialDocument } from '../../utils/pdf/statements';
import { documentReference, pdfDate, pdfMoney, pdfShortDate } from '../../utils/pdf/officialDocument';

/**
 * The liquidity provider's statement (client voice notes, round 5), in its own
 * dashboard: for a period, what it bought from investors, what it sold on the
 * secondary market, money in and out of its wallet and the balances — with a
 * PDF (the official document design) and a CSV download.
 */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const presets = () => {
  const now = new Date();
  return {
    thisMonth: [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)],
    lastMonth: [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))],
    thisYear: [iso(new Date(now.getFullYear(), 0, 1)), iso(now)],
  } as Record<string, [string, string]>;
};

const csvCell = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const LPStatement: React.FC = () => {
  const { t, i18n } = useTranslation('partners');
  const lang = baseLanguage(i18n.language);
  const money = (v: string | number) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(v || 0));
  const day = (v: string) => new Date(v).toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });

  const ranges = useMemo(presets, []);
  const [range, setRange] = useState<[string, string]>(ranges.thisMonth);
  const [pdfBusy, setPdfBusy] = useState(false);
  const q = useQuery({
    queryKey: ['lp', 'statement', range[0], range[1]],
    queryFn: () => LiquidityProviderService.getStatement(range[0], range[1]),
    retry: 1,
  });
  const st = q.data;

  const downloadCsv = (s: Statement) => {
    const rows: (string | number)[][] = [
      [t('lp.statement.title'), s.provider],
      [t('lp.statement.period'), `${s.from} – ${s.to}`],
      [t('lp.statement.opening'), s.opening_balance],
      [t('lp.statement.closing'), s.closing_balance],
      [],
      [t('lp.statement.bought')],
      ['date', 'reference', 'property', 'shares', 'price', 'total', 'fee'],
      ...s.bought.map((r) => [r.date.slice(0, 10), r.reference, r.property, r.shares, r.price, r.total, r.fee]),
      [],
      [t('lp.statement.sold')],
      ['date', 'reference', 'property', 'shares', 'price', 'total'],
      ...s.sold.map((r) => [r.date.slice(0, 10), r.reference, r.property, r.shares, r.price, r.total]),
      [],
      [t('lp.statement.wallet')],
      ['date', 'type', 'description', 'amount', 'balance'],
      ...s.lines.map((r) => [r.date.slice(0, 19).replace('T', ' '), r.type, r.description, r.amount, r.balance]),
    ];
    const blob = new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `liquidity-provider-statement-${s.from}-${s.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPdf = async (s: Statement) => {
    setPdfBusy(true);
    try {
      const pt = i18n.getFixedT(lang, 'partners');
      const dt = docT(lang);
      const ref = documentReference('LPS', s.provider.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase(), new Date());
      const period = pt('lp.statement.periodText', { from: pdfDate(s.from, lang), to: pdfDate(s.to, lang) }) as string;
      const doc = await newOfficialDocument(lang, pt('lp.statement.title') as string, ref, period);
      doc.holder({
        label: pt('lp.profileTitle') as string,
        name: s.provider,
        meta: [[dt('holder.documentNo') as string, ref], [dt('holder.issued') as string, pdfDate(new Date(), lang)],
          [dt('holder.period') as string, period]],
      });
      doc.summary([
        [pt('lp.statement.opening') as string, pdfMoney(s.opening_balance)],
        [pt('lp.statement.closing') as string, pdfMoney(s.closing_balance), true],
        [pt('lp.statement.boughtPaid') as string, pdfMoney(s.summary.bought_paid)],
        [pt('lp.statement.soldReceived') as string, pdfMoney(s.summary.sold_received)],
        [pt('lp.statement.deposits') as string, pdfMoney(s.summary.deposits)],
        [pt('lp.statement.withdrawals') as string, pdfMoney(s.summary.withdrawals)],
      ]);
      const c = (k: string) => pt(`lp.statement.cols.${k}`) as string;
      doc.section(pt('lp.statement.bought') as string);
      doc.table([
        { key: 'date', header: c('date'), weight: 1.1 }, { key: 'property', header: c('property'), weight: 2.4, wrap: true },
        { key: 'shares', header: c('shares'), align: 'right' }, { key: 'price', header: c('price'), align: 'right' },
        { key: 'total', header: c('total'), align: 'right' }, { key: 'fee', header: c('fee'), align: 'right' },
      ], s.bought.map((r) => ({ date: pdfShortDate(r.date, lang), property: r.property, shares: String(r.shares),
        price: pdfMoney(r.price), total: pdfMoney(r.total), fee: pdfMoney(r.fee) })), { empty: pt('lp.statement.none') as string });
      doc.section(pt('lp.statement.sold') as string);
      doc.table([
        { key: 'date', header: c('date'), weight: 1.1 }, { key: 'property', header: c('property'), weight: 2.4, wrap: true },
        { key: 'shares', header: c('shares'), align: 'right' }, { key: 'price', header: c('price'), align: 'right' },
        { key: 'total', header: c('total'), align: 'right' },
      ], s.sold.map((r) => ({ date: pdfShortDate(r.date, lang), property: r.property, shares: String(r.shares),
        price: pdfMoney(r.price), total: pdfMoney(r.total) })), { empty: pt('lp.statement.none') as string });
      doc.section(pt('lp.statement.wallet') as string);
      doc.table([
        { key: 'date', header: c('date'), weight: 1.1 }, { key: 'type', header: c('type'), weight: 1.3 },
        { key: 'description', header: c('description'), weight: 3, wrap: true },
        { key: 'amount', header: c('amount'), align: 'right', tone: 'signed' }, { key: 'balance', header: c('balance'), align: 'right' },
      ], s.lines.map((r) => ({ date: pdfShortDate(r.date, lang), type: codeLabel(dt, 'types', r.type),
        description: r.description, amount: pdfMoney(r.amount, true), balance: pdfMoney(r.balance) })),
      { empty: pt('lp.statement.none') as string });
      doc.save(`liquidity-provider-statement-${s.from}-${s.to}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  };

  const tiles = st ? [
    [t('lp.statement.opening'), money(st.opening_balance)],
    [t('lp.statement.boughtPaid'), `${money(st.summary.bought_paid)} · ${t('lp.statement.deals', { count: st.summary.bought_deals })}`],
    [t('lp.statement.soldReceived'), `${money(st.summary.sold_received)} · ${t('lp.statement.deals', { count: st.summary.sold_deals })}`],
    [t('lp.statement.deposits'), money(st.summary.deposits)],
    [t('lp.statement.withdrawals'), money(st.summary.withdrawals)],
    [t('lp.statement.closing'), money(st.closing_balance)],
  ] : [];

  const table = (cols: string[], rows: React.ReactNode[][]) => rows.length === 0 ? (
    <p className="py-6 text-center text-sm text-neutral-500 dark:text-slate-400">{t('lp.statement.none')}</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-neutral-500 border-b border-neutral-200 dark:border-slate-700">
            {cols.map((k) => <th key={k} className="py-2 px-3 font-medium text-start whitespace-nowrap">{t(`lp.statement.cols.${k}`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-neutral-100 dark:border-slate-700/60">
              {r.map((cell, j) => <td key={j} className="py-2.5 px-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const section = (title: string, body: React.ReactNode) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <h4 className="px-5 py-3 border-b border-neutral-200 dark:border-slate-700 font-semibold text-neutral-900 dark:text-slate-100">{title}</h4>
      <div className="p-2 sm:p-4">{body}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyan-600" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('lp.statement.title')}</h3>
            <p className="text-sm text-neutral-500 dark:text-slate-400">{t('lp.statement.desc')}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!st} onClick={() => st && downloadCsv(st)}>
              <FileSpreadsheet className="w-4 h-4 me-1" />CSV
            </Button>
            <Button size="sm" variant="primary" disabled={!st || pdfBusy} onClick={() => st && downloadPdf(st)}>
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Download className="w-4 h-4 me-1" />}PDF
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {Object.entries(ranges).map(([key, r]) => (
            <button key={key} type="button" onClick={() => setRange(r)}
                    className={cn('px-3 py-1.5 rounded-full text-sm border',
                      range[0] === r[0] && range[1] === r[1]
                        ? 'bg-cyan-600 border-cyan-600 text-white'
                        : 'border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300')}>
              {t(`lp.statement.${key}`)}
            </button>
          ))}
          <label className="text-sm text-neutral-600 dark:text-slate-300">
            {t('lp.statement.from')}
            <input type="date" value={range[0]} max={range[1]} onChange={(e) => e.target.value && setRange([e.target.value, range[1]])}
                   className="ms-2 px-2 py-1 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
          <label className="text-sm text-neutral-600 dark:text-slate-300">
            {t('lp.statement.to')}
            <input type="date" value={range[1]} min={range[0]} onChange={(e) => e.target.value && setRange([range[0], e.target.value])}
                   className="ms-2 px-2 py-1 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
        </div>
      </div>

      {q.isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto my-10 text-neutral-400" />
      ) : q.isError || !st ? (
        <p className="text-center text-sm text-red-600">{(q.error as any)?.message || t('lp.requests.failed')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {tiles.map(([label, value]) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-4">
                <p className="text-xs text-neutral-500 dark:text-slate-400">{label}</p>
                <p className="mt-1 font-semibold text-neutral-900 dark:text-slate-100">{value}</p>
              </div>
            ))}
          </div>
          {section(t('lp.statement.bought'), table(['date', 'reference', 'property', 'shares', 'price', 'total', 'fee'],
            st.bought.map((r) => [day(r.date), <span className="font-mono text-xs">{r.reference}</span>, r.property, r.shares, money(r.price), money(r.total), money(r.fee)])))}
          {section(t('lp.statement.sold'), table(['date', 'reference', 'property', 'shares', 'price', 'total'],
            st.sold.map((r) => [day(r.date), <span className="font-mono text-xs">{r.reference}</span>, r.property, r.shares, money(r.price), money(r.total)])))}
          {section(t('lp.statement.wallet'), table(['date', 'type', 'description', 'amount', 'balance'],
            st.lines.map((r) => [day(r.date), codeLabel(docT(lang), 'types', r.type), r.description,
              <span className={Number(r.amount) < 0 ? 'text-red-600' : 'text-emerald-700'}>{money(r.amount)}</span>, money(r.balance)])))}
        </>
      )}
    </div>
  );
};

export default LPStatement;
