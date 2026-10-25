/**
 * Client-side PDF of an installment schedule (client round 3, #18 / #19).
 *
 * Two uses:
 *   * the property page — the published plan for the chosen number of shares
 *     (down payment + installments with dates and amounts);
 *   * the dashboard — a buyer's own plan, with each installment's status and
 *     payment date.
 *
 * jsPDF is imported dynamically so it stays out of the main bundle.
 */

import type { ScheduleRow } from './paymentPlan';

export type InstallmentScheduleRow = ScheduleRow;

export interface InstallmentSchedulePdfData {
  propertyName: string;
  location?: string;
  tokens: number;
  tokenPrice: number;
  totalAmount: number;
  frequencyLabel: string;
  downPayment?: number;
  rows: ScheduleRow[];
  /** Dashboard statement: investor + plan reference + paid/remaining totals. */
  investorName?: string;
  planReference?: string;
  paidAmount?: number;
  title?: string;
  notes?: string;
  generatedAt?: Date;
}

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
const money2 = (n: number): string =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMERALD: [number, number, number] = [16, 185, 129];
const NAVY: [number, number, number] = [15, 23, 42];
const DARK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];
const HEADER_BG: [number, number, number] = [243, 244, 246];
const STATUS_COLORS: Record<string, [number, number, number]> = {
  paid: [5, 150, 105],
  due: [217, 119, 6],
  overdue: [220, 38, 38],
  upcoming: [107, 114, 128],
  cancelled: [107, 114, 128],
};
const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  due: 'Due now',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  cancelled: 'Cancelled',
};

const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export async function downloadInstallmentSchedulePdf(data: InstallmentSchedulePdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const rowRight = margin + contentWidth;
  const when = data.generatedAt ?? new Date();
  const withStatus = data.rows.some((r) => !!r.status);

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
  doc.text(data.title || 'Installment Schedule', rowRight, 46, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Issued ${fmtDate(when)}`, rowRight, 64, { align: 'right' });

  // ---- Property + plan summary -------------------------------------------
  let y = 122;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...DARK);
  doc.text(doc.splitTextToSize(data.propertyName, contentWidth)[0] || data.propertyName, margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const meta = [
    data.location,
    data.investorName ? `Investor: ${data.investorName}` : undefined,
    data.planReference ? `Plan ref: ${data.planReference}` : undefined,
  ].filter(Boolean).join('   ·   ');
  if (meta) {
    doc.text(doc.splitTextToSize(meta, contentWidth), margin, y);
    y += 8;
  }
  y += 14;

  const regular = data.rows.filter((r) => r.kind === 'installment');
  const cells: Array<[string, string]> = [
    ['Total price', money(data.totalAmount)],
    ['Down payment', data.downPayment ? money2(data.downPayment) : 'None'],
    [`${data.frequencyLabel} installment`, regular.length ? money2(regular[0].amount) : '—'],
    ['Payments', String(data.rows.length)],
    ['Shares', data.tokens.toLocaleString('en-US')],
  ];
  if (data.paidAmount !== undefined) {
    cells.splice(3, 2, ['Paid', money2(data.paidAmount)], ['Remaining', money2(Math.max(0, data.totalAmount - data.paidAmount))]);
  }
  const boxH = 68;
  doc.setFillColor(...HEADER_BG);
  doc.roundedRect(margin, y, contentWidth, boxH, 6, 6, 'F');
  const cellW = contentWidth / cells.length;
  cells.forEach(([label, value], i) => {
    const cx = margin + cellW * i + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...EMERALD);
    doc.text(value, cx, y + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), cx, y + 46);
  });
  y += boxH + 24;

  // ---- Schedule table -----------------------------------------------------
  const colNo = margin + 6;
  const colType = margin + 34;
  const colDate = margin + 140;
  const colAmount = withStatus ? margin + 330 : margin + 360;
  const colStatus = margin + 350;
  const colRemaining = rowRight - 6;

  const drawHeader = () => {
    doc.setFillColor(...HEADER_BG);
    doc.rect(margin, y - 12, contentWidth, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text('#', colNo, y + 3);
    doc.text('PAYMENT', colType, y + 3);
    doc.text('DUE DATE', colDate, y + 3);
    doc.text('AMOUNT', colAmount, y + 3, { align: 'right' });
    if (withStatus) doc.text('STATUS', colStatus, y + 3);
    doc.text('REMAINING', colRemaining, y + 3, { align: 'right' });
    y += 24;
  };
  drawHeader();

  doc.setFontSize(9.5);
  let installmentNo = 0;
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
    if (r.kind === 'installment') installmentNo += 1;
    doc.text(r.kind === 'down_payment' ? 'Down payment' : `Installment ${installmentNo}`, colType, y);
    doc.text(fmtDate(r.dueDate), colDate, y);
    doc.text(money2(r.amount), colAmount, y, { align: 'right' });
    if (withStatus && r.status) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(STATUS_COLORS[r.status] || MUTED));
      const label = STATUS_LABELS[r.status] || r.status;
      const paid = r.status === 'paid' && r.paidAt ? ` ${fmtDate(new Date(r.paidAt))}` : '';
      doc.text(label + paid, colStatus, y);
      doc.setFont('helvetica', 'normal');
    }
    doc.setTextColor(...MUTED);
    doc.text(money2(r.remaining), colRemaining, y, { align: 'right' });
    y += 16;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 5, rowRight, y - 5);
  }

  // ---- Notes + disclaimer -------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const parts = [
    data.notes ? `Plan terms: ${data.notes}` : '',
    withStatus
      ? 'This statement reflects payments recorded on Capimax RT at the issue date. Shares are released as installments are paid.'
      : 'Schedule as published for this property on the issue date, for the number of shares shown. Final terms are confirmed when the plan is created; shares are released as installments are paid.',
    `Issued ${when.toLocaleString('en-US')}.`,
  ].filter(Boolean);
  const wrapped = doc.splitTextToSize(parts.join(' '), contentWidth);
  if (y + 24 + wrapped.length * 10 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.text(wrapped, margin, y + 24);

  const slug = data.propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  doc.save(`installment-schedule-${slug || 'property'}.pdf`);
}

export interface InstallmentReceiptPdfData {
  propertyName: string;
  location?: string;
  investorName?: string;
  investorEmail?: string;
  planReference: string;
  paymentReference?: string | null;
  label: string;
  number: number;
  totalPayments: number;
  amount: number;
  dueDate: Date;
  paidAt: Date;
  remainingAfter: number;
}

/** Receipt for one paid installment (client round 3, #14 / #19). */
export async function downloadInstallmentReceiptPdf(data: InstallmentReceiptPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const right = pageWidth - margin;

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
  doc.text('Payment Receipt', right, 46, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Issued ${fmtDate(new Date())}`, right, 64, { align: 'right' });

  let y = 130;
  doc.setTextColor(...EMERALD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PAID', margin, y);
  doc.setTextColor(...DARK);
  doc.setFontSize(26);
  doc.text(money2(data.amount), margin, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`${data.label} (${data.number} of ${data.totalPayments})`, margin, y + 48);
  y += 80;

  const rows: Array<[string, string]> = [
    ['Property', data.propertyName],
    ['Location', data.location || '-'],
    ['Investor', [data.investorName, data.investorEmail].filter(Boolean).join(' - ') || '-'],
    ['Plan reference', data.planReference],
    ['Payment reference', data.paymentReference || '-'],
    ['Due date', fmtDate(data.dueDate)],
    ['Paid on', fmtDate(data.paidAt)],
    ['Paid from', 'Capimax RT wallet'],
    ['Remaining on the plan', money2(data.remainingAfter)],
  ];
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, y);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(doc.splitTextToSize(value, 300)[0] || value, right, y, { align: 'right' });
    y += 12;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, y, right, y);
    y += 16;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    doc.splitTextToSize(
      'This receipt confirms an installment recorded on Capimax RT. Shares are released to your account as installments are paid.',
      right - margin,
    ),
    margin,
    y + 16,
  );
  doc.save(`receipt-${data.planReference.slice(0, 8)}-${data.number}.pdf`);
}
