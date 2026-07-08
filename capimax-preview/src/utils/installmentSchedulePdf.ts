/**
 * Client-side PDF generation for the property "Installment Plan" statement
 * (client edit #3a).
 *
 * Under-construction property pages show an installment projection so a buyer
 * can see how paying in monthly instalments would look, and download it as a
 * PDF. The projection uses equal instalments (total ÷ months, no down payment),
 * which mirrors ConstructionInstallmentCreateSerializer on the backend so the
 * numbers a buyer sees here match the plan actually created at checkout.
 *
 * jsPDF is imported dynamically so it stays out of the main bundle.
 */

export interface InstallmentScheduleRow {
  number: number;
  dueDate: Date;
  amount: number;
  remaining: number;
}

export interface InstallmentSchedulePdfData {
  propertyName: string;
  location?: string;
  tokens: number;
  tokenPrice: number;
  totalAmount: number;
  months: number;
  frequencyLabel: string;
  installmentAmount: number;
  rows: InstallmentScheduleRow[];
  generatedAt?: Date;
}

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
const money2 = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMERALD: [number, number, number] = [16, 185, 129];
const NAVY: [number, number, number] = [15, 23, 42];
const DARK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];
const HEADER_BG: [number, number, number] = [243, 244, 246];

const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export async function downloadInstallmentSchedulePdf(
  data: InstallmentSchedulePdfData,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const rowRight = margin + contentWidth;
  const when = data.generatedAt ?? new Date();

  // ---- Brand header band --------------------------------------------------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('CAPIMAX RT', margin, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Real Estate Ownership Platform', margin, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Installment Plan', rowRight, 46, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated ${when.toLocaleDateString()}`, rowRight, 64, { align: 'right' });

  // ---- Property + plan summary -------------------------------------------
  let y = 122;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...DARK);
  doc.text(doc.splitTextToSize(data.propertyName, contentWidth)[0] || data.propertyName, margin, y);
  y += 16;
  if (data.location) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(data.location, margin, y);
    y += 8;
  }
  y += 14;

  // Summary box
  const boxH = 68;
  doc.setFillColor(...HEADER_BG);
  doc.roundedRect(margin, y, contentWidth, boxH, 6, 6, 'F');
  const quarter = contentWidth / 4;
  const cell = (i: number, label: string, value: string) => {
    const cx = margin + quarter * i + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...EMERALD);
    doc.text(value, cx, y + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), cx, y + 46);
  };
  cell(0, 'Total Price', money(data.totalAmount));
  cell(1, `${data.frequencyLabel} Payment`, money2(data.installmentAmount));
  cell(2, 'Payments', String(data.months));
  cell(3, 'Tokens', data.tokens.toLocaleString());
  y += boxH + 24;

  // ---- Schedule table -----------------------------------------------------
  const colNo = margin + 6;
  const colDate = margin + 70;
  const colAmount = margin + contentWidth - 200;
  const colRemaining = rowRight - 6;

  const drawHeader = () => {
    doc.setFillColor(...HEADER_BG);
    doc.rect(margin, y - 12, contentWidth, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('#', colNo, y + 3);
    doc.text('DUE DATE', colDate, y + 3);
    doc.text('AMOUNT', colAmount + 90, y + 3, { align: 'right' });
    doc.text('REMAINING', colRemaining, y + 3, { align: 'right' });
    y += 24;
  };
  drawHeader();

  doc.setFontSize(10);
  for (const r of data.rows) {
    if (y > pageHeight - margin - 70) {
      doc.addPage();
      y = margin + 10;
      drawHeader();
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(String(r.number), colNo, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDate(r.dueDate), colDate, y);
    doc.text(money2(r.amount), colAmount + 90, y, { align: 'right' });
    doc.setTextColor(...MUTED);
    doc.text(money2(r.remaining), colRemaining, y, { align: 'right' });
    y += 16;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 5, rowRight, y - 5);
  }

  // ---- Footer / disclaimer -----------------------------------------------
  const disclaimer =
    'This is an indicative installment estimate for an under-construction property, shown for ' +
    'information only. Instalments are equal payments with no down payment; the final schedule ' +
    'and any fees are confirmed at checkout. Token ownership is released as payments are made. ' +
    'Generated ' + when.toLocaleString() + '.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const wrapped = doc.splitTextToSize(disclaimer, contentWidth);
  const fy = Math.min(y + 24, pageHeight - margin - wrapped.length * 10);
  doc.text(wrapped, margin, fy);

  const slug = data.propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  doc.save(`installment-plan-${slug || 'property'}.pdf`);
}
