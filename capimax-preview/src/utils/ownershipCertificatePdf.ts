/**
 * "Certificate of Ownership" PDF (client edit #8, round 3 #15) in the
 * official Capimax RT document design, in the user's language, with a QR
 * code and a stable certificate number.
 */

import i18n from '../i18n/config';
import { docT, newOfficialDocument } from './pdf/statements';
import { pdfDate, pdfMoney } from './pdf/officialDocument';

export interface OwnershipCertificateData {
  certificateNumber: string;
  investorName: string;
  property: {
    title: string;
    /** Short human-facing property number/reference. */
    reference: string;
    location?: string;
  };
  tokens: number;
  totalTokens?: number;
  ownershipPercentage: number; // percent, e.g. 1.2345
  investmentValue: number;
  amountPaid?: number;
  issueDate?: Date;
  /** Text encoded into the QR (e.g. a verify URL / cert summary). */
  qrPayload: string;
  lang?: string;
}

export async function downloadOwnershipCertificatePdf(data: OwnershipCertificateData): Promise<void> {
  const lang = data.lang || i18n.language || 'en';
  const t = docT(lang);
  const when = data.issueDate ?? new Date();
  const doc = await newOfficialDocument(lang, t('titles.certificate') as string, data.certificateNumber,
    data.property.title);

  doc.statement(t('certificate.intro') as string);
  doc.holder({
    label: t('certificate.holder') as string,
    name: data.investorName,
    rows: [[t('receipt.property') as string, data.property.title],
      ...(data.property.location ? [[t('receipt.location') as string, data.property.location] as [string, string]] : [])],
    meta: [
      [t('certificate.certificateNo') as string, data.certificateNumber],
      [t('certificate.issueDate') as string, pdfDate(when, lang)],
    ],
  });
  doc.summary([
    [t('receipt.shares') as string, data.tokens.toLocaleString('en-US'), true],
    [t('receipt.ownership') as string, `${data.ownershipPercentage.toFixed(4)}%`, true],
    [t('certificate.investmentValue') as string, pdfMoney(data.investmentValue)],
  ]);
  doc.section(t('sections.details') as string);
  doc.kv([
    [t('receipt.property') as string, data.property.title, true],
    [t('certificate.totalShares') as string, data.totalTokens ? data.totalTokens.toLocaleString('en-US') : '—'],
    [t('receipt.amount') as string, pdfMoney(data.amountPaid ?? data.investmentValue)],
    [t('certificate.certificateNo') as string, data.certificateNumber],
  ]);

  try {
    const QRCode = await import('qrcode');
    const qr = await QRCode.toDataURL(data.qrPayload, { margin: 1, width: 240, color: { dark: '#0A2928', light: '#FFFFFF' } });
    doc.image(qr, 92, t('certificate.scan') as string);
  } catch {
    // QR is a convenience; the certificate number identifies the document.
  }

  doc.save(`capimax-rt-certificate-${data.certificateNumber}.pdf`);
}
