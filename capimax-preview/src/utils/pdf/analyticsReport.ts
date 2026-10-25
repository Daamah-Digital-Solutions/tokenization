/**
 * Portfolio analytics report (client round 3, #17): everything the
 * analytics page shows — key figures, risk metrics, the performance series,
 * the asset allocation and income — in the official document design.
 */

import i18n from '../../i18n/config';
import { docT, newOfficialDocument } from './statements';
import { documentReference, pdfDate, pdfMoney } from './officialDocument';

export interface AnalyticsReportData {
  holderName: string;
  holderEmail?: string;
  periodLabel: string;
  portfolio: {
    total_value?: number;
    total_invested?: number;
    return_percentage?: number;
    monthly_dividends?: number;
    total_dividends?: number;
    properties_count?: number;
  };
  risk: Record<string, number>;
  performance: Array<Record<string, any>>;
  allocation: Array<{ name: string; value: number; amount: number; count: number }>;
  income: Array<Record<string, any>>;
  lang?: string;
}

const pct = (n: any) => `${(Number(n) || 0).toFixed(2)}%`;

export async function downloadAnalyticsReportPdf(data: AnalyticsReportData): Promise<void> {
  const lang = data.lang || i18n.language || 'en';
  const t = docT(lang);
  const now = new Date();
  const ref = documentReference('ANR', data.holderEmail || '', now);
  const doc = await newOfficialDocument(lang, t('titles.analytics') as string, ref, data.periodLabel);
  const p = data.portfolio;

  doc.holder({
    label: t('holder.accountHolder') as string,
    name: data.holderName,
    rows: data.holderEmail ? [[t('holder.email') as string, data.holderEmail]] : [],
    meta: [
      [t('holder.documentNo') as string, ref],
      [t('holder.issued') as string, pdfDate(now, lang)],
      [t('holder.period') as string, data.periodLabel],
    ],
  });
  doc.paragraph(t('analytics.intro') as string, 8.6);
  doc.summary([
    [t('analytics.totalValue') as string, pdfMoney(p.total_value), true],
    [t('analytics.totalInvested') as string, pdfMoney(p.total_invested)],
    [t('analytics.totalReturn') as string, pdfMoney((p.total_value || 0) - (p.total_invested || 0))],
    [t('analytics.roi') as string, pct(p.return_percentage)],
    [t('analytics.monthlyIncome') as string, pdfMoney(p.monthly_dividends)],
    [t('analytics.properties') as string, String(p.properties_count ?? data.allocation.reduce((s, a) => s + (a.count || 0), 0))],
  ]);

  const riskRows = Object.entries(data.risk || {}).map(([k, v]) => [
    k.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase()),
    /volatility|drawdown|var|alpha/i.test(k) ? pct(v) : (Number(v) || 0).toFixed(2),
  ] as [string, string]);
  if (riskRows.length) {
    doc.section(t('sections.performance') as string);
    doc.kv(riskRows, 170);
  }

  if (data.performance.length) {
    doc.table([
      { key: 'date', header: t('cols.period') as string, weight: 1 },
      { key: 'value', header: t('summary.value') as string, weight: 1, align: 'right' },
      { key: 'invested', header: t('summary.invested') as string, weight: 1, align: 'right' },
      { key: 'ret', header: t('analytics.totalReturn') as string, weight: 1, align: 'right', tone: 'signed' },
      { key: 'roi', header: t('analytics.roi') as string, weight: 0.8, align: 'right' },
      { key: 'div', header: t('types.dividend') as string, weight: 0.9, align: 'right' },
    ], data.performance.map((r) => ({
      date: String(r.date ?? r.period ?? ''),
      value: pdfMoney(r.portfolioValue ?? r.value),
      invested: pdfMoney(r.invested),
      ret: pdfMoney(r.return ?? 0, true),
      roi: pct(r.roi),
      div: pdfMoney(r.dividends ?? 0),
    })));
  }

  if (data.allocation.length) {
    doc.section(t('sections.allocation') as string);
    doc.table([
      { key: 'name', header: t('receipt.propertyType') as string, weight: 1.6 },
      { key: 'count', header: t('analytics.properties') as string, weight: 0.8, align: 'right' },
      { key: 'amount', header: t('summary.value') as string, weight: 1, align: 'right' },
      { key: 'value', header: '%', weight: 0.7, align: 'right' },
    ], data.allocation.map((a) => ({
      name: a.name,
      count: String(a.count ?? ''),
      amount: pdfMoney(a.amount),
      value: pct(a.value),
    })));
  }

  if (data.income.length) {
    doc.section(t('analytics.monthlyIncome') as string);
    doc.table([
      { key: 'period', header: t('cols.period') as string, weight: 1.2 },
      { key: 'amount', header: t('cols.amount') as string, weight: 1, align: 'right' },
    ], data.income.map((r) => ({
      period: String(r.month ?? r.date ?? r.period ?? ''),
      amount: pdfMoney(r.amount ?? r.income ?? r.dividends ?? r.value ?? 0),
    })));
  }

  doc.save(`capimax-rt-analytics-${now.toISOString().slice(0, 10)}.pdf`);
}
