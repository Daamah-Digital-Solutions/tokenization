/**
 * Client-side PDF generation for the investor "Ownership Statement".
 *
 * Powers the Reports section of the investor dashboard (client edit #10). Built
 * entirely from data the dashboard already has (holdings from
 * InvestmentService.getUserInvestments), so it needs no new backend endpoint.
 * jsPDF is imported dynamically so it stays out of the main bundle.
 */

export interface PortfolioHoldingRow {
  property: string;
  location?: string;
  tokens: number;
  purchaseValue: number;
  currentValue: number;
}

export interface PortfolioPdfData {
  generatedAt?: Date;
  investorName?: string;
  holdings: PortfolioHoldingRow[];
}

const money = (n: number): string =>
  `$${Math.round(n).toLocaleString('en-US')}`;

const EMERALD: [number, number, number] = [16, 185, 129];
const DARK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];
const HEADER_BG: [number, number, number] = [243, 244, 246];

export async function downloadPortfolioPdf(data: PortfolioPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const when = data.generatedAt ?? new Date();

  // Column layout (property gets the remaining space).
  const colTokens = margin + contentWidth - 3 * 90;
  const colPurchased = colTokens + 90;
  const colCurrent = colPurchased + 90;
  const rowRight = margin + contentWidth;

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
  doc.text('Ownership Statement', rowRight, 46, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated ${when.toLocaleDateString()}`, rowRight, 64, { align: 'right' });

  let y = 120;
  if (data.investorName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('Statement for', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(data.investorName, margin + 70, y);
    y += 22;
  }

  // ---- Table header -------------------------------------------------------
  const drawHeader = () => {
    doc.setFillColor(...HEADER_BG);
    doc.rect(margin, y - 12, contentWidth, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('PROPERTY', margin + 6, y + 3);
    doc.text('TOKENS', colTokens + 84, y + 3, { align: 'right' });
    doc.text('PURCHASED', colPurchased + 84, y + 3, { align: 'right' });
    doc.text('CURRENT', colCurrent + 84, y + 3, { align: 'right' });
    y += 22;
  };
  drawHeader();

  // ---- Rows ---------------------------------------------------------------
  let totalPurchased = 0;
  let totalCurrent = 0;

  doc.setFontSize(10);
  for (const h of data.holdings) {
    if (y > pageHeight - margin - 60) {
      doc.addPage();
      y = margin + 10;
      drawHeader();
    }
    totalPurchased += h.purchaseValue;
    totalCurrent += h.currentValue;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const name = doc.splitTextToSize(h.property, colTokens - margin - 16)[0] || h.property;
    doc.text(name, margin + 6, y);
    if (h.location) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(h.location, colTokens - margin - 16)[0] || h.location, margin + 6, y + 11);
      doc.setFontSize(10);
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(h.tokens.toLocaleString(), colTokens + 84, y, { align: 'right' });
    doc.text(money(h.purchaseValue), colPurchased + 84, y, { align: 'right' });
    doc.text(money(h.currentValue), colCurrent + 84, y, { align: 'right' });

    y += h.location ? 24 : 18;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 6, rowRight, y - 6);
  }

  // ---- Totals -------------------------------------------------------------
  y += 6;
  const change =
    totalPurchased > 0 ? ((totalCurrent - totalPurchased) / totalPurchased) * 100 : 0;
  doc.setDrawColor(...EMERALD);
  doc.setLineWidth(1);
  doc.line(margin, y - 14, rowRight, y - 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('TOTAL', margin + 6, y);
  doc.text(money(totalPurchased), colPurchased + 84, y, { align: 'right' });
  doc.text(money(totalCurrent), colCurrent + 84, y, { align: 'right' });
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...(change >= 0 ? EMERALD : [220, 38, 38] as [number, number, number]));
  doc.text(
    `Overall change since purchase: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
    rowRight,
    y,
    { align: 'right' },
  );

  // ---- Footer -------------------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const disclaimer =
    'This statement is for information only. "Current" values reflect the latest token price ' +
    'and are estimates, not a guarantee of realisable value. Generated ' + when.toLocaleString() + '.';
  const wrapped = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(wrapped, margin, pageHeight - margin - wrapped.length * 10);

  doc.save(`ownership-statement-${when.toISOString().split('T')[0]}.pdf`);
}
