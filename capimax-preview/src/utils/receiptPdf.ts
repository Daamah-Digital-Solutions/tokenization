/**
 * Purchase receipt PDF (client edit #12, round 3 #15) in the official
 * Capimax RT document design and the user's language.
 *
 * jsPDF is imported dynamically by the document template, so it is only
 * pulled in the first time a user downloads a document.
 */

import i18n from '../i18n/config';
import { docT, newOfficialDocument, codeLabel } from './pdf/statements';
import { documentReference, pdfDate, pdfMoney } from './pdf/officialDocument';

export interface ReceiptPdfData {
  transactionId: string;
  date?: Date;
  status?: string;
  property: {
    title: string;
    location?: string;
    propertyType?: string;
    tokenPrice: number;
    totalValue?: number;
  };
  purchase: {
    amount: number;
    tokens: number;
    ownershipPercentage?: number;
    paymentMethod?: string;
  };
  returns?: {
    netAnnualReturn?: number;
    quarterlyDividend?: number;
    totalROI?: number;
    nextDividendDate?: Date;
  };
  /** Only rendered when supplied — never fabricate owner identity. */
  owner?: { name?: string; id?: string };
  blockchainHash?: string | null;
  supportEmail?: string;
  /** Human receipt reference. Derived from date + tx when not supplied. */
  receiptNumber?: string;
  website?: string;
  lang?: string;
}

const METHOD_CODES: Record<string, string> = { fiat: 'credit_card', crypto: 'cryptocurrency', bank: 'bank_transfer' };

export async function downloadReceiptPdf(data: ReceiptPdfData): Promise<void> {
  const lang = data.lang || i18n.language || 'en';
  const t = docT(lang);
  const when = data.date ?? new Date();
  const receiptNo = data.receiptNumber || documentReference('RCP', data.transactionId, when);
  const doc = await newOfficialDocument(lang, t('titles.receipt') as string, receiptNo, data.property.title);

  doc.holder({
    label: t('receipt.paidBy') as string,
    name: data.owner?.name || '—',
    rows: data.owner?.id ? [[t('holder.accountId') as string, data.owner.id]] : [],
    meta: [
      [t('receipt.receiptNo') as string, receiptNo],
      [t('receipt.dateTime') as string, `${pdfDate(when, lang)} ${when.toTimeString().slice(0, 5)}`],
      [t('receipt.status') as string, data.status ? codeLabel(t, 'status', data.status.toLowerCase()) : (t('receipt.confirmed') as string)],
    ],
  });
  doc.summary([
    [t('receipt.amount') as string, pdfMoney(data.purchase.amount), true],
    [t('receipt.shares') as string, data.purchase.tokens.toLocaleString('en-US')],
    [t('receipt.ownership') as string,
      typeof data.purchase.ownershipPercentage === 'number' ? `${data.purchase.ownershipPercentage.toFixed(4)}%` : '—'],
  ]);

  doc.section(t('receipt.transaction') as string);
  const method = data.purchase.paymentMethod ? METHOD_CODES[data.purchase.paymentMethod] || data.purchase.paymentMethod : '';
  doc.kv([
    [t('receipt.transactionId') as string, data.transactionId],
    ...(method ? [[t('cols.method') as string, codeLabel(t, 'methods', method)] as [string, string]] : []),
    ...(data.blockchainHash ? [[t('receipt.blockchain') as string, data.blockchainHash] as [string, string]] : []),
  ]);

  doc.section(t('receipt.purchaseDetails') as string);
  doc.kv([
    [t('receipt.property') as string, data.property.title, true],
    ...(data.property.location ? [[t('receipt.location') as string, data.property.location] as [string, string]] : []),
    ...(data.property.propertyType ? [[t('receipt.propertyType') as string, data.property.propertyType.replace(/_/g, ' ')] as [string, string]] : []),
    [t('receipt.pricePerShare') as string, pdfMoney(data.property.tokenPrice)],
    ...(data.property.totalValue ? [[t('receipt.totalValue') as string, pdfMoney(data.property.totalValue)] as [string, string]] : []),
  ]);

  if (data.returns) {
    const r = data.returns;
    const rows: Array<[string, string]> = [];
    if (typeof r.totalROI === 'number') rows.push([t('receipt.estimatedRoi') as string, `${r.totalROI.toFixed(1)}%`]);
    if (typeof r.netAnnualReturn === 'number') rows.push([t('receipt.annualReturn') as string, pdfMoney(r.netAnnualReturn)]);
    if (typeof r.quarterlyDividend === 'number') rows.push([t('receipt.quarterlyDividend') as string, pdfMoney(r.quarterlyDividend)]);
    if (r.nextDividendDate) rows.push([t('receipt.nextDividend') as string, pdfDate(r.nextDividendDate, lang)]);
    if (rows.length) {
      doc.section(t('receipt.projections') as string);
      doc.kv(rows);
      doc.paragraph(t('receipt.disclaimer') as string, 7.8);
    }
  }
  doc.paragraph(t('receipt.receiptNote') as string, 7.8);
  doc.save(`capimax-rt-receipt-${receiptNo}.pdf`);
}
