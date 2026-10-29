/**
 * The four official account statements (client round 3, #16), drawn with
 * the shared document design. Data comes from StatementService; labels
 * come from the `docs` translations in the document's language (which can
 * differ from the UI language).
 */

import i18n from '../../i18n/config';
import type { StatementData, StatementKind } from '../../services/documents/StatementService';
import { OfficialDocument, documentReference, pdfDate, pdfMoney, pdfShortDate, type Column } from './officialDocument';
import { baseLanguage } from '../locale';

const PREFIX: Record<StatementKind, string> = {
  wallet: 'WST',
  transactions: 'TXS',
  investments: 'INV',
  holdings: 'OWN',
};

export function docT(lang: string) {
  return i18n.getFixedT(baseLanguage(lang), 'docs');
}

/** Translate a code from a group (types / methods / status / category), falling back to a readable form. */
export function codeLabel(t: ReturnType<typeof docT>, group: string, code: string | undefined | null): string {
  if (!code) return '';
  const readable = code.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return t(`${group}.${code}`, { defaultValue: readable }) as string;
}

export async function newOfficialDocument(lang: string, title: string, reference: string, subtitle?: string) {
  const t = docT(lang);
  return OfficialDocument.create({
    title,
    reference,
    subtitle,
    lang,
    note: t('note') as string,
    pageLabel: (page, total) => t('page', { page, total }) as string,
    continuedLabel: t('continued') as string,
  });
}

export async function downloadStatementPdf(data: StatementData, lang: string): Promise<void> {
  const t = docT(lang);
  const kind = data.kind;
  const now = new Date(data.generated_at || Date.now());
  const ref = documentReference(PREFIX[kind], data.holder.account_id, now);
  const period = t('subtitles.period', { from: pdfDate(data.period.from, lang), to: pdfDate(data.period.to, lang) }) as string;
  const doc = await newOfficialDocument(lang, t(`titles.${kind}`) as string, ref, period);

  doc.holder({
    label: t('holder.accountHolder') as string,
    name: data.holder.name,
    rows: [
      [t('holder.email') as string, data.holder.email],
      [t('holder.accountId') as string, data.holder.account_id],
    ],
    meta: [
      [t('holder.documentNo') as string, ref],
      [t('holder.issued') as string, `${pdfDate(now, lang)} ${now.toTimeString().slice(0, 5)}`],
      [t('holder.period') as string, period],
    ],
  });

  const s = data.summary || {};
  const c = (key: string) => t(`cols.${key}`) as string;

  if (kind === 'wallet') {
    doc.summary([
      [t('summary.openingBalance') as string, pdfMoney(s.opening_balance)],
      [t('summary.totalIn') as string, pdfMoney(s.total_in)],
      [t('summary.totalOut') as string, pdfMoney(s.total_out)],
      [t('summary.closingBalance') as string, pdfMoney(s.closing_balance), true],
      [t('summary.count') as string, String(s.count ?? 0)],
      [t('summary.availableNow') as string, pdfMoney(s.available_now)],
    ]);
    doc.section(t('sections.entries') as string);
    const cols: Column[] = [
      { key: 'date', header: c('date'), weight: 0.9 },
      { key: 'type', header: c('type'), weight: 1.3 },
      { key: 'description', header: c('description'), weight: 2, wrap: true },
      { key: 'amount', header: c('amount'), weight: 1, align: 'right', tone: 'signed' },
      { key: 'balance', header: c('balance'), weight: 1, align: 'right' },
      { key: 'reference', header: c('reference'), weight: 1 },
    ];
    doc.table(cols, data.rows.map((r) => ({
      date: pdfShortDate(r.date, lang),
      type: codeLabel(t, 'types', r.type),
      description: r.description,
      amount: pdfMoney(r.amount, true),
      balance: pdfMoney(r.balance),
      reference: r.reference,
    })), { empty: t('empty') as string });
  }

  if (kind === 'transactions') {
    doc.summary([
      [t('summary.invested') as string, pdfMoney(s.invested)],
      [t('summary.deposited') as string, pdfMoney(s.deposited)],
      [t('summary.received') as string, pdfMoney(s.received), true],
      [t('summary.withdrawn') as string, pdfMoney(s.withdrawn)],
      [t('summary.count') as string, String(s.count ?? 0)],
    ]);
    doc.section(t('sections.transactions') as string);
    doc.table([
      { key: 'date', header: c('date'), weight: 0.9 },
      { key: 'type', header: c('type'), weight: 1.3 },
      { key: 'description', header: c('description'), weight: 1.8, wrap: true },
      { key: 'method', header: c('method'), weight: 0.9 },
      { key: 'amount', header: c('amount'), weight: 1, align: 'right', tone: 'signed' },
      { key: 'status', header: c('status'), weight: 0.9, tone: 'status' },
      { key: 'reference', header: c('reference'), weight: 1 },
    ], data.rows.map((r) => ({
      date: pdfShortDate(r.date, lang),
      type: codeLabel(t, 'types', r.type),
      description: r.description,
      method: codeLabel(t, 'methods', r.method),
      amount: pdfMoney(r.amount, true),
      status: codeLabel(t, 'status', r.status),
      reference: r.reference,
    })), { empty: t('empty') as string });
  }

  if (kind === 'investments') {
    doc.summary([
      [t('summary.invested') as string, pdfMoney(s.invested), true],
      [t('summary.completed') as string, `${s.completed ?? 0} / ${s.count ?? 0}`],
      [t('summary.shares') as string, Number(s.shares || 0).toLocaleString('en-US')],
      [t('summary.plans') as string, String(s.plans ?? 0)],
      [t('summary.outstanding') as string, pdfMoney(s.plans_outstanding)],
    ]);
    doc.section(t('sections.investments') as string);
    doc.table([
      { key: 'date', header: c('date'), weight: 0.9 },
      { key: 'property', header: c('property'), weight: 2, wrap: true },
      { key: 'shares', header: c('shares'), weight: 0.7, align: 'right' },
      { key: 'price', header: c('price'), weight: 0.9, align: 'right' },
      { key: 'amount', header: c('amount'), weight: 1, align: 'right' },
      { key: 'method', header: c('method'), weight: 0.9 },
      { key: 'status', header: c('status'), weight: 0.9, tone: 'status' },
    ], data.rows.map((r) => ({
      date: pdfShortDate(r.date, lang),
      property: r.property,
      shares: Number(r.shares).toLocaleString('en-US'),
      price: pdfMoney(r.price),
      amount: pdfMoney(r.amount),
      method: codeLabel(t, 'methods', r.method),
      status: codeLabel(t, 'status', r.status),
    })), { empty: t('empty') as string });
    if (data.plans?.length) {
      doc.section(t('sections.plans') as string);
      doc.table([
        { key: 'property', header: c('property'), weight: 2, wrap: true },
        { key: 'total', header: c('total'), weight: 1, align: 'right' },
        { key: 'paid', header: c('paid'), weight: 1, align: 'right' },
        { key: 'remaining', header: c('remaining'), weight: 1, align: 'right' },
        { key: 'progress', header: c('progress'), weight: 0.8, align: 'center' },
        { key: 'next_due', header: c('nextDue'), weight: 0.9 },
        { key: 'status', header: c('status'), weight: 0.9, tone: 'status' },
      ], data.plans.map((p) => ({
        property: p.property,
        total: pdfMoney(p.total),
        paid: pdfMoney(p.paid),
        remaining: pdfMoney(p.remaining),
        progress: p.progress,
        next_due: p.next_due ? pdfShortDate(p.next_due, lang) : '—',
        status: codeLabel(t, 'status', p.status === 'pending' ? 'active' : p.status),
      })));
    }
  }

  if (kind === 'holdings') {
    doc.summary([
      [t('summary.properties') as string, String(s.properties ?? 0)],
      [t('summary.shares') as string, Number(s.shares || 0).toLocaleString('en-US')],
      [t('summary.cost') as string, pdfMoney(s.cost)],
      [t('summary.value') as string, pdfMoney(s.value), true],
      [t('summary.change') as string, `${Number(s.change_pct || 0) >= 0 ? '+' : ''}${Number(s.change_pct || 0).toFixed(2)}%`],
      [t('summary.monthlyIncome') as string, pdfMoney(s.monthly_income)],
    ]);
    doc.section(t('sections.holdings') as string);
    doc.table([
      { key: 'property', header: c('property'), weight: 1.8, wrap: true },
      { key: 'location', header: c('location'), weight: 1.1, wrap: true },
      { key: 'shares', header: c('shares'), weight: 0.7, align: 'right' },
      { key: 'ownership', header: c('ownership'), weight: 0.9, align: 'right' },
      { key: 'cost', header: c('cost'), weight: 1, align: 'right' },
      { key: 'value', header: c('value'), weight: 1, align: 'right' },
      { key: 'since', header: c('since'), weight: 0.9 },
    ], data.rows.map((r) => ({
      property: `${r.property}${r.category ? ` (${codeLabel(t, 'category', r.category)})` : ''}`,
      location: r.location,
      shares: Number(r.shares).toLocaleString('en-US'),
      ownership: `${Number(r.ownership).toFixed(4)}%`,
      cost: pdfMoney(r.cost),
      value: pdfMoney(r.value),
      since: pdfShortDate(r.since, lang),
    })), {
      empty: t('empty') as string,
      totals: { cost: pdfMoney(s.cost), value: pdfMoney(s.value) },
    });
    if (data.linked?.length) {
      doc.section(t('sections.linked') as string);
      doc.table([
        { key: 'property', header: c('property'), weight: 2, wrap: true },
        { key: 'shares', header: c('shares'), weight: 0.8, align: 'right' },
        { key: 'released', header: c('released'), weight: 0.8, align: 'right' },
        { key: 'paid', header: c('paid'), weight: 1, align: 'right' },
        { key: 'total', header: c('total'), weight: 1, align: 'right' },
        { key: 'status', header: c('status'), weight: 0.9, tone: 'status' },
      ], data.linked.map((p) => ({
        property: p.property,
        shares: p.shares,
        released: p.released,
        paid: pdfMoney(p.paid),
        total: pdfMoney(p.total),
        status: codeLabel(t, 'status', p.status === 'pending' ? 'active' : p.status),
      })));
    }
  }

  doc.save(`capimax-rt-${kind}-statement-${data.period.to}.pdf`);
}
