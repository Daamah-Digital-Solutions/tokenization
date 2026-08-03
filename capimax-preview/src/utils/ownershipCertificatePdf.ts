/**
 * Client-side "Certificate of Ownership" PDF (client edit #8).
 *
 * A professional, PropShare/BRX-style certificate generated per property from
 * the investor's holdings. Drawn programmatically (vector text + rules) so the
 * output is deterministic and CSP-safe, with an embedded QR code and a stable
 * certificate number. jsPDF + qrcode are imported dynamically so they never
 * weigh down the initial bundle.
 */

import { getBrandLogoDark } from './brandLogo';

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
}

const money = (n?: number): string =>
  `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const EMERALD: [number, number, number] = [5, 150, 105];
const EMERALD_LIGHT: [number, number, number] = [16, 185, 129];
const DARK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const GOLD: [number, number, number] = [180, 140, 60];

export async function downloadOwnershipCertificatePdf(
  data: OwnershipCertificateData,
): Promise<void> {
  const [{ jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const when = data.issueDate ?? new Date();

  // ---- Decorative double border ------------------------------------------
  doc.setDrawColor(...EMERALD);
  doc.setLineWidth(3);
  doc.rect(24, 24, pageWidth - 48, pageHeight - 48);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.rect(32, 32, pageWidth - 64, pageHeight - 64);

  const cx = pageWidth / 2;

  // ---- Header — real logo, with a wordmark fallback -----------------------
  const logo = await getBrandLogoDark();
  if (logo) {
    const lw = 140;
    const lh = lw / (logo.aspect || 3.8);
    doc.addImage(logo.dataUrl, 'PNG', cx - lw / 2, 58, lw, lh);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...EMERALD);
    doc.text('CAPIMAX', cx, 84, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text('Real Estate Tokenization Platform', cx, 104, { align: 'center' });

  doc.setDrawColor(...EMERALD_LIGHT);
  doc.setLineWidth(0.8);
  doc.line(cx - 90, 112, cx + 90, 112);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...DARK);
  doc.text('Certificate of Ownership', cx, 150, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text('This is to certify that', cx, 186, { align: 'center' });

  // ---- Investor name ------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...EMERALD);
  doc.text(data.investorName || 'Investor', cx, 214, { align: 'center' });

  // ---- Statement ----------------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  const statement =
    `is the registered holder of ${data.tokens.toLocaleString()} ownership token(s), ` +
    `representing an ${data.ownershipPercentage.toFixed(4)}% fractional ownership interest in the property:`;
  const wrapped = doc.splitTextToSize(statement, pageWidth - 160);
  doc.text(wrapped, cx, 240, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...DARK);
  doc.text(data.property.title, cx, 240 + wrapped.length * 15 + 10, { align: 'center' });
  if (data.property.location) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(data.property.location, cx, 240 + wrapped.length * 15 + 28, { align: 'center' });
  }

  // ---- Details grid -------------------------------------------------------
  const gridTop = 340;
  const leftX = 70;
  const rightX = cx + 20;
  const rowH = 30;

  const pair = (x: number, yy: number, label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...DARK);
    doc.text(value, x, yy + 15);
  };

  pair(leftX, gridTop, 'Property Number', data.property.reference);
  pair(rightX, gridTop, 'Certificate Number', data.certificateNumber);
  pair(leftX, gridTop + rowH * 2, 'Number of Shares', data.tokens.toLocaleString());
  pair(rightX, gridTop + rowH * 2, 'Ownership Percentage', `${data.ownershipPercentage.toFixed(4)}%`);
  pair(leftX, gridTop + rowH * 4, 'Investment Value', money(data.investmentValue));
  pair(
    rightX,
    gridTop + rowH * 4,
    'Amount Paid',
    money(typeof data.amountPaid === 'number' ? data.amountPaid : data.investmentValue),
  );
  pair(leftX, gridTop + rowH * 6, 'Issue Date', when.toLocaleDateString());
  if (typeof data.totalTokens === 'number' && data.totalTokens > 0) {
    pair(
      rightX,
      gridTop + rowH * 6,
      'Total Property Tokens',
      data.totalTokens.toLocaleString(),
    );
  }

  // ---- QR code ------------------------------------------------------------
  try {
    const qrDataUrl = await QRCode.toDataURL(data.qrPayload, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
    });
    const qrSize = 96;
    const qrX = leftX;
    const qrY = gridTop + rowH * 7 + 6;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Scan to verify', qrX, qrY + qrSize + 12);
  } catch (_) {
    /* QR generation failed — certificate is still valid without it */
  }

  // ---- Signature block ----------------------------------------------------
  const sigY = gridTop + rowH * 7 + 78;
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.6);
  doc.line(rightX, sigY, rightX + 150, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('Capimax RT', rightX, sigY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text('Authorized Issuer', rightX, sigY + 28);

  // ---- Footer -------------------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const footer =
    'This certificate evidences a fractional, tokenized ownership interest recorded on the ' +
    'Capimax RT platform. It is issued for informational purposes and does not by itself ' +
    'constitute a transferable security instrument.';
  const fWrapped = doc.splitTextToSize(footer, pageWidth - 120);
  doc.text(fWrapped, cx, pageHeight - 70, { align: 'center' });
  doc.setTextColor(...MUTED);
  doc.text(`Generated ${when.toLocaleString()}`, cx, pageHeight - 46, { align: 'center' });

  doc.save(`ownership-certificate-${data.certificateNumber}.pdf`);
}
