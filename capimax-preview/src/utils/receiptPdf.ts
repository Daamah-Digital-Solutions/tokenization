/**
 * Client-side PDF generation for the purchase receipt.
 *
 * Replaces the old plain-text (.txt) "download", which the client reported as
 * looking bad next to the styled on-screen preview (client edit #12). jsPDF is
 * imported dynamically so it is only pulled into the bundle the first time a
 * user actually downloads a receipt — it never weighs down the initial load.
 *
 * The layout is drawn programmatically (vector text + rules), so the output is
 * deterministic and always renders cleanly regardless of theme, fonts, or CSP.
 */

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
}

// Real company data (see i18n common.json regulatoryBody1/2).
const COMPANY = {
  operator: 'Capimax Real Estate Technologies',
  assetHolder: 'Capimax Asset Structure',
  jurisdiction: 'State of Wyoming, United States',
  website: 'capimaxrt.tech',
  support: 'support@capimaxrt.com',
};

function defaultReceiptNumber(txId: string, when: Date): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, '0');
  const d = String(when.getDate()).padStart(2, '0');
  const tail = (txId || '').replace(/-/g, '').slice(-6).toUpperCase() || 'RECEIPT';
  return `RCP-${y}${m}${d}-${tail}`;
}

const money = (n?: number): string =>
  `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const EMERALD: [number, number, number] = [16, 185, 129];
const DARK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];

export async function downloadReceiptPdf(data: ReceiptPdfData): Promise<void> {
  // Dynamic import keeps jsPDF out of the main bundle.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const right = margin + contentWidth;
  const when = data.date ?? new Date();
  const receiptNo = data.receiptNumber || defaultReceiptNumber(data.transactionId, when);

  // Build a QR encoding the key receipt facts so it can be visually verified.
  let qrDataUrl: string | null = null;
  try {
    const QRCode = await import('qrcode');
    qrDataUrl = await QRCode.toDataURL(
      `Capimax RT Receipt | No: ${receiptNo} | TX: ${data.transactionId} | ` +
        `Property: ${data.property.title} | Amount: ${money(data.purchase.amount)} | ` +
        `Tokens: ${data.purchase.tokens} | ${when.toISOString().slice(0, 10)}`,
      { margin: 1, width: 240, errorCorrectionLevel: 'M' },
    );
  } catch (_) {
    qrDataUrl = null;
  }

  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...EMERALD);
    doc.text(title, margin, y + 8);
    y += 14;
    doc.setDrawColor(...EMERALD);
    doc.setLineWidth(1);
    doc.line(margin, y, right, y);
    y += 16;
  };

  const row = (label: string, value: string) => {
    ensureSpace(24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(value, right, y, { align: 'right' });
    y += 8;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, y, right, y);
    y += 12;
  };

  // ---- Brand header band --------------------------------------------------
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageWidth, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('CAPIMAX', margin, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Real Estate Tokenization Platform', margin, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Purchase Receipt', right, 40, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Receipt No: ${receiptNo}`, right, 56, { align: 'right' });
  doc.text(`TX: ${data.transactionId}`, right, 70, { align: 'right' });

  // QR badge on the header band.
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 26, 14, 52, 52);
    } catch (_) {
      /* non-fatal */
    }
  }

  y = 122;

  // ---- Transaction information -------------------------------------------
  sectionTitle('Transaction Information');
  row('Transaction ID', data.transactionId);
  row('Date & Time', `${when.toLocaleDateString()} ${when.toLocaleTimeString()}`);
  if (data.purchase.paymentMethod) {
    const pm = data.purchase.paymentMethod === 'crypto' ? 'Cryptocurrency' : 'Fiat Currency';
    row('Payment Method', pm);
  }
  row('Status', data.status ?? 'Confirmed');

  // ---- Owner information (only when real data is supplied) ----------------
  if (data.owner && (data.owner.name || data.owner.id)) {
    sectionTitle('Owner Information');
    if (data.owner.name) row('Name', data.owner.name);
    if (data.owner.id) row('Owner ID', data.owner.id);
  }

  // ---- Property ownership details ----------------------------------------
  sectionTitle('Property Ownership Details');
  row('Property', data.property.title);
  if (data.property.location) row('Location', data.property.location);
  if (data.property.propertyType) {
    const t = data.property.propertyType;
    row('Property Type', t.charAt(0).toUpperCase() + t.slice(1));
  }
  row('Token Price', money(data.property.tokenPrice));
  if (data.property.totalValue) row('Total Property Value', money(data.property.totalValue));

  y += 4;
  row('Purchase Amount', money(data.purchase.amount));
  row('Tokens Purchased', data.purchase.tokens.toLocaleString());
  if (typeof data.purchase.ownershipPercentage === 'number') {
    row('Ownership Share', `${data.purchase.ownershipPercentage.toFixed(4)}%`);
  }

  // ---- Return projections -------------------------------------------------
  if (data.returns) {
    sectionTitle('Return Projections');
    if (typeof data.returns.totalROI === 'number') {
      row('Estimated Annual ROI', `${data.returns.totalROI.toFixed(1)}%`);
    }
    if (typeof data.returns.netAnnualReturn === 'number') {
      row('Estimated Annual Return', money(data.returns.netAnnualReturn));
    }
    if (typeof data.returns.quarterlyDividend === 'number') {
      row('Quarterly Dividend', money(data.returns.quarterlyDividend));
    }
    if (data.returns.nextDividendDate) {
      row('Next Dividend', data.returns.nextDividendDate.toLocaleDateString());
    }
  }

  // ---- Disclaimer ---------------------------------------------------------
  ensureSpace(70);
  y += 4;
  doc.setFillColor(255, 251, 235); // amber-50
  const disclaimer =
    'Disclaimer: Projected returns are estimates based on current market conditions and ' +
    'historical performance. Actual returns may vary and are not guaranteed. All real estate ' +
    'ownership carries risk, including potential loss of principal.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const wrapped = doc.splitTextToSize(disclaimer, contentWidth - 24);
  const boxHeight = wrapped.length * 11 + 20;
  doc.rect(margin, y, contentWidth, boxHeight, 'F');
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text(wrapped, margin + 12, y + 15);
  y += boxHeight + 20;

  // ---- Footer -------------------------------------------------------------
  ensureSpace(60);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(margin, y, right, y);
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(COMPANY.operator, pageWidth / 2, y, { align: 'center' });
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Registered in the ${COMPANY.jurisdiction}. Assets held under ${COMPANY.assetHolder}.`,
    pageWidth / 2,
    y,
    { align: 'center' },
  );
  y += 11;
  doc.text(
    `${COMPANY.website}  ·  ${data.supportEmail || COMPANY.support}`,
    pageWidth / 2,
    y,
    { align: 'center' },
  );
  y += 14;
  doc.setFontSize(9);
  doc.text(
    'This receipt is official confirmation of your real estate token purchase.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 12;
  if (data.blockchainHash) {
    doc.setTextColor(...DARK);
    doc.text(`Blockchain TX: ${data.blockchainHash}`, pageWidth / 2, y, { align: 'center' });
    y += 12;
  }
  doc.setTextColor(...MUTED);
  doc.text(`Generated ${when.toLocaleString()}`, pageWidth / 2, y, { align: 'center' });

  doc.save(`${receiptNo}.pdf`);
}
