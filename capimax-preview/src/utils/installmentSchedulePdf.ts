/**
 * Installment schedule PDFs (client round 3, #18 #19) in the official
 * Capimax RT document design and the user's language:
 *
 *   * the property page — the published plan for the chosen number of
 *     shares (down payment + every installment with its date and amount);
 *   * the dashboard — a buyer's plan statement with each installment's
 *     status, and a receipt for each paid installment.
 */

import i18n from '../i18n/config';
import type { ScheduleRow } from './paymentPlan';
import { docT, newOfficialDocument, codeLabel } from './pdf/statements';
import { documentReference, pdfDate, pdfMoney, pdfShortDate } from './pdf/officialDocument';

export type InstallmentScheduleRow = ScheduleRow;

export interface InstallmentSchedulePdfData {
  propertyName: string;
  location?: string;
  tokens: number;
  tokenPrice: number;
  totalAmount: number;
  /** English label kept for older callers; the document uses `frequency` when given. */
  frequencyLabel: string;
  frequency?: string;
  downPayment?: number;
  rows: ScheduleRow[];
  /** Dashboard statement: investor + plan reference + paid amount. */
  investorName?: string;
  investorEmail?: string;
  planReference?: string;
  paidAmount?: number;
  title?: string;
  notes?: string;
  generatedAt?: Date;
  lang?: string;
}

export async function downloadInstallmentSchedulePdf(data: InstallmentSchedulePdfData): Promise<void> {
  const lang = data.lang || i18n.language || 'en';
  const t = docT(lang);
  const tp = i18n.getFixedT(lang.startsWith('ar') ? 'ar' : 'en', 'plan');
  const when = data.generatedAt ?? new Date();
  const isStatement = data.paidAmount !== undefined;
  const ref = documentReference(isStatement ? 'IPS' : 'SCH', data.planReference || data.propertyName.replace(/\W/g, ''), when);
  const title = (isStatement ? t('titles.installmentStatement') : t('titles.installmentSchedule')) as string;
  const doc = await newOfficialDocument(lang, title, ref, data.propertyName);

  doc.holder({
    label: isStatement ? (t('holder.accountHolder') as string) : (t('receipt.property') as string),
    name: isStatement ? (data.investorName || '—') : data.propertyName,
    rows: [
      ...(isStatement && data.investorEmail ? [[t('holder.email') as string, data.investorEmail] as [string, string]] : []),
      ...(data.location ? [[t('receipt.location') as string, data.location] as [string, string]] : []),
    ],
    meta: [
      [t('holder.documentNo') as string, ref],
      [t('holder.issued') as string, pdfDate(when, lang)],
      ...(data.planReference ? [[t('receipt.plan') as string, data.planReference.slice(0, 18)] as [string, string]] : []),
    ],
  });

  const regular = data.rows.filter((r) => r.kind === 'installment');
  const freq = data.frequency ? (tp(`frequency.${data.frequency}`) as string) : data.frequencyLabel;
  doc.summary([
    [t('summary.total') as string, pdfMoney(data.totalAmount), true],
    [tp('calculator.downPayment') as string, data.downPayment ? pdfMoney(data.downPayment) : (tp('calculator.noDownPayment') as string)],
    [`${tp('calculator.installment')} (${freq})`, regular.length ? pdfMoney(regular[0].amount) : '—'],
    [t('receipt.shares') as string, data.tokens.toLocaleString('en-US')],
    ...(isStatement
      ? [[t('cols.paid') as string, pdfMoney(data.paidAmount)] as [string, string],
         [t('summary.remaining') as string, pdfMoney(Math.max(0, data.totalAmount - (data.paidAmount || 0)))] as [string, string]]
      : [[t('cols.progress') as string, String(data.rows.length)] as [string, string],
         [t('receipt.pricePerShare') as string, pdfMoney(data.tokenPrice)] as [string, string]]),
  ]);

  doc.section(t('sections.schedule') as string);
  let n = 0;
  const withStatus = data.rows.some((r) => !!r.status);
  doc.table([
    { key: 'number', header: t('cols.number') as string, weight: 0.4 },
    { key: 'payment', header: t('cols.payment') as string, weight: 1.3 },
    { key: 'due', header: t('cols.dueDate') as string, weight: 1 },
    { key: 'amount', header: t('cols.amount') as string, weight: 1, align: 'right' },
    ...(withStatus
      ? [{ key: 'status', header: t('cols.status') as string, weight: 1, tone: 'status' as const },
         { key: 'paid', header: t('receipt.paidOn') as string, weight: 1 }]
      : []),
    { key: 'remaining', header: t('cols.remaining') as string, weight: 1, align: 'right' },
  ], data.rows.map((r) => {
    if (r.kind === 'installment') n += 1;
    return {
      number: String(r.number),
      payment: r.kind === 'down_payment' ? (t('types.down_payment') as string) : `${t('types.installment')} ${n}`,
      due: pdfShortDate(r.dueDate, lang),
      amount: pdfMoney(r.amount),
      status: r.status ? codeLabel(t, 'status', r.status) : '',
      paid: r.paidAt ? pdfShortDate(r.paidAt, lang) : '',
      remaining: pdfMoney(r.remaining),
    };
  }));

  if (data.notes) {
    doc.section(tp('schedule.notes') as string);
    doc.paragraph(data.notes, 8.8);
  }
  doc.paragraph((isStatement ? t('receipt.receiptNote') : tp('schedule.estimateNote')) as string, 7.8);
  const slug = data.propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  doc.save(`capimax-rt-installments-${slug || 'property'}.pdf`);
}

export interface InstallmentReceiptPdfData {
  propertyName: string;
  location?: string;
  investorName?: string;
  investorEmail?: string;
  planReference: string;
  paymentReference?: string | null;
  label: string;
  kind?: 'down_payment' | 'installment';
  installmentNumber?: number;
  number: number;
  totalPayments: number;
  amount: number;
  dueDate: Date;
  paidAt: Date;
  remainingAfter: number;
  lang?: string;
}

/** Receipt for one paid installment (client round 3, #14 / #19). */
export async function downloadInstallmentReceiptPdf(data: InstallmentReceiptPdfData): Promise<void> {
  const lang = data.lang || i18n.language || 'en';
  const t = docT(lang);
  const ref = documentReference('IRC', data.paymentReference || `${data.planReference}${data.number}`, data.paidAt);
  const doc = await newOfficialDocument(lang, t('titles.installmentReceipt') as string, ref, data.propertyName);
  const label = data.kind === 'down_payment'
    ? (t('types.down_payment') as string)
    : data.installmentNumber ? `${t('types.installment')} ${data.installmentNumber}` : data.label;

  doc.holder({
    label: t('receipt.paidBy') as string,
    name: data.investorName || data.investorEmail || '—',
    rows: data.investorEmail && data.investorName ? [[t('holder.email') as string, data.investorEmail]] : [],
    meta: [
      [t('receipt.receiptNo') as string, ref],
      [t('receipt.paidOn') as string, pdfDate(data.paidAt, lang)],
      [t('receipt.status') as string, codeLabel(t, 'status', 'paid')],
    ],
  });
  doc.summary([
    [t('receipt.amount') as string, pdfMoney(data.amount), true],
    [t('receipt.installment') as string, `${label} · ${t('receipt.of', { n: data.number, total: data.totalPayments })}`],
    [t('receipt.remainingAfter') as string, pdfMoney(data.remainingAfter)],
  ]);
  doc.section(t('sections.details') as string);
  doc.kv([
    [t('receipt.property') as string, data.propertyName, true],
    ...(data.location ? [[t('receipt.location') as string, data.location] as [string, string]] : []),
    [t('receipt.plan') as string, data.planReference],
    ...(data.paymentReference ? [[t('receipt.transactionId') as string, data.paymentReference] as [string, string]] : []),
    [t('receipt.dueDate') as string, pdfDate(data.dueDate, lang)],
    [t('receipt.paidFrom') as string, codeLabel(t, 'methods', 'wallet')],
  ]);
  doc.paragraph(t('receipt.receiptNote') as string, 7.8);
  doc.save(`capimax-rt-installment-receipt-${data.number}.pdf`);
}
