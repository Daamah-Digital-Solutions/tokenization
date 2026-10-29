/**
 * The official Capimax RT document design (client round 3, #15).
 *
 * One look for every PDF the platform issues — statements, receipts,
 * schedules, reports — matching the document standard of the other Capimax
 * platforms: A4 cream page, dark-teal / gold double frame with corner
 * flourishes, the official logo, the document title, an account-holder
 * panel, a summary panel, then sections of label/value rows or striped
 * tables whose header repeats on every page. Each page ends with the
 * company line and "<document no.> • Page X of Y • capimaxrt.tech".
 *
 * Arabic: documents can be issued in Arabic (right-to-left, mirrored
 * layout). Arabic text is drawn with a Latin+Arabic subset of DejaVu Sans
 * (public/fonts, same font as the other Capimax platforms' documents) —
 * jsPDF joins the letters into presentation forms, which this font covers,
 * and orders the text right-to-left.
 *
 * This module only lays out what the caller passes; it never computes
 * figures.
 */

import type { jsPDF as JsPDF } from 'jspdf';
import { getBrandLogoDark } from '../brandLogo';
import { COMPANY } from '../company';

type RGB = [number, number, number];
const INK: RGB = [10, 41, 40];
const GREEN_D: RGB = [29, 122, 78];
const LINK: RGB = [21, 94, 117];
const GOLD: RGB = [197, 154, 46];
const GOLD_L: RGB = [230, 203, 122];
const MUTED: RGB = [95, 107, 106];
const PANEL: RGB = [241, 246, 243];
const CREAM: RGB = [253, 252, 248];
const RED: RGB = [178, 58, 46];
const AMBER: RGB = [183, 121, 31];
const WHITE: RGB = [255, 255, 255];

const W = 595.28;
const H = 841.89;
const CX = W / 2;
const LEFT = 58;
const RIGHT = W - 58;
const CONTENT_W = RIGHT - LEFT;
const BOTTOM = 112;

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export type Align = 'left' | 'right' | 'center';

export interface Column {
  key: string;
  header: string;
  weight?: number;
  align?: Align;
  wrap?: boolean;
  /** 'signed': negatives red / positives green. 'status': coloured by status word. */
  tone?: 'signed' | 'status';
}

export interface HolderInfo {
  label: string;
  name: string;
  rows?: Array<[string, string]>;
  /** Right side of the panel: document no. / issued / period … */
  meta: Array<[string, string]>;
}

export interface DocumentOptions {
  title: string;
  reference: string;
  subtitle?: string;
  /** Short note printed above the footer on every page. */
  note?: string;
  lang?: string;
  /** Translated "Page {{page}} of {{total}}" and "(continued)". */
  pageLabel?: (page: number, total: number) => string;
  continuedLabel?: string;
}

const STATUS_TONE: Record<string, RGB> = {
  paid: GREEN_D, completed: GREEN_D, confirmed: GREEN_D, credited: GREEN_D, active: GREEN_D,
  approved: GREEN_D, succeeded: GREEN_D, 'مدفوع': GREEN_D, 'مكتمل': GREEN_D, 'مؤكد': GREEN_D,
  pending: AMBER, processing: AMBER, upcoming: AMBER, due: AMBER, 'قيد الانتظار': AMBER, 'قادم': AMBER,
  'مستحق': AMBER, overdue: RED, failed: RED, rejected: RED, 'متأخر': RED, 'فشل': RED, 'مرفوض': RED,
  cancelled: MUTED, canceled: MUTED, 'ملغي': MUTED,
};

let fontCache: { regular: string; bold: string } | null = null;

async function loadFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font ${url} unavailable`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export class OfficialDocument {
  private doc!: JsPDF;
  private y = 0;
  private rtl: boolean;
  private hasArabicFont = false;
  private repeatHeader: (() => void) | null = null;
  private logo: Awaited<ReturnType<typeof getBrandLogoDark>> = null;

  private constructor(private opts: DocumentOptions) {
    this.rtl = (opts.lang || 'en').startsWith('ar');
  }

  static async create(opts: DocumentOptions): Promise<OfficialDocument> {
    const d = new OfficialDocument(opts);
    await d.init();
    return d;
  }

  private async init() {
    const { jsPDF } = await import('jspdf');
    this.doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    try {
      if (!fontCache) {
        const [regular, bold] = await Promise.all([
          loadFontBase64('/fonts/DejaVuSans-ArabicLatin.ttf'),
          loadFontBase64('/fonts/DejaVuSans-Bold-ArabicLatin.ttf'),
        ]);
        fontCache = { regular, bold };
      }
      this.doc.addFileToVFS('DejaVuSans-ArabicLatin.ttf', fontCache.regular);
      this.doc.addFont('DejaVuSans-ArabicLatin.ttf', 'DejaVuAr', 'normal');
      this.doc.addFileToVFS('DejaVuSans-Bold-ArabicLatin.ttf', fontCache.bold);
      this.doc.addFont('DejaVuSans-Bold-ArabicLatin.ttf', 'DejaVuAr', 'bold');
      this.hasArabicFont = true;
    } catch (e) {
      // Without the font Arabic can't be drawn; English documents still work.
      console.warn('Arabic PDF font unavailable:', e);
    }
    this.logo = await getBrandLogoDark().catch(() => null);
    this.doc.setProperties({
      title: `${COMPANY.brand} — ${this.opts.title}`,
      subject: this.opts.reference,
      author: COMPANY.brand,
      creator: COMPANY.brand,
    });
    this.frame();
    this.y = this.firstHeader();
  }

  // ---------------------------------------------------------------- text
  /** Mirror an x position for right-to-left documents. */
  private X(x: number): number {
    return this.rtl ? W - x : x;
  }

  private A(align: Align): Align {
    if (!this.rtl || align === 'center') return align;
    return align === 'left' ? 'right' : 'left';
  }

  private font(text: string, bold: boolean) {
    const useArabicFont = this.hasArabicFont && (this.rtl || ARABIC.test(text));
    this.doc.setFont(useArabicFont ? 'DejaVuAr' : 'helvetica', bold ? 'bold' : 'normal');
    return useArabicFont;
  }

  private width(text: string, size: number, bold = false): number {
    this.font(text, bold);
    this.doc.setFontSize(size);
    return this.doc.getTextWidth(text);
  }

  private clip(text: string, size: number, maxW: number, bold = false): string {
    let s = text ?? '';
    if (this.width(s, size, bold) <= maxW) return s;
    while (s && this.width(s + '…', size, bold) > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  private wrap(text: string, size: number, maxW: number, maxLines?: number, bold = false): string[] {
    const words = (text ?? '').toString().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (this.width(trial, size, bold) <= maxW || !cur) cur = trial;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = this.clip(lines[maxLines - 1] + ' …', size, maxW, bold);
    }
    return lines.length ? lines : [''];
  }

  /** Draw text at logical x (mirrored in RTL) with logical alignment. */
  private text(s: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: RGB; align?: Align; raw?: boolean } = {}) {
    const str = s == null ? '' : String(s);
    const arabic = this.font(str, !!o.bold);
    this.doc.setFontSize(o.size ?? 9);
    this.doc.setTextColor(...(o.color ?? INK));
    const align = o.raw ? (o.align ?? 'left') : this.A(o.align ?? 'left');
    const px = o.raw ? x : this.X(x);
    const options: any = { align };
    if (arabic && ARABIC.test(str)) {
      // Logical (typed) Arabic → visual order for the page.
      Object.assign(options, { isInputVisual: false, isOutputVisual: true, isInputRtl: true, isOutputRtl: false });
    }
    this.doc.text(str, px, y, options);
  }

  // -------------------------------------------------------------- ornaments
  private diamond(x: number, y: number, d: number) {
    this.doc.setFillColor(...GOLD);
    this.doc.triangle(x, y - d, x + d, y, x, y + d, 'F');
    this.doc.triangle(x, y - d, x - d, y, x, y + d, 'F');
  }

  private divider(y: number, half: number) {
    const d = this.doc;
    d.setDrawColor(...GOLD);
    d.setLineWidth(0.8);
    d.line(CX - half, y, CX - 7, y);
    d.line(CX + 7, y, CX + half, y);
    this.diamond(CX, y, 3.2);
  }

  private corner(x: number, y: number, sx: number, sy: number) {
    const d = this.doc;
    d.setDrawColor(...GOLD);
    d.setLineWidth(1.1);
    d.line(x + sx * 9, y + sy * 9, x + sx * 32, y + sy * 9);
    d.line(x + sx * 9, y + sy * 9, x + sx * 9, y + sy * 32);
    this.diamond(x + sx * 9, y + sy * 9, 3);
  }

  /** Cream ground, faint diagonal watermark, double frame and corners (y grows downward). */
  private frame() {
    const d = this.doc;
    d.setFillColor(...CREAM);
    d.rect(0, 0, W, H, 'F');
    const anyDoc = d as any;
    if (anyDoc.GState) {
      d.saveGraphicsState();
      anyDoc.setGState(new anyDoc.GState({ opacity: 0.04 }));
      d.setFont('helvetica', 'bold');
      d.setFontSize(84);
      d.setTextColor(...INK);
      d.text('CAPIMAX RT', CX, H / 2 + 40, { align: 'center', angle: 35 });
      d.restoreGraphicsState();
    }
    d.setDrawColor(...INK);
    d.setLineWidth(2.6);
    d.roundedRect(26, 26, W - 52, H - 52, 9, 9, 'S');
    d.setDrawColor(...GOLD);
    d.setLineWidth(0.9);
    d.rect(35, 35, W - 70, H - 70, 'S');
    this.corner(39, 39, 1, 1);
    this.corner(W - 39, 39, -1, 1);
    this.corner(39, H - 39, 1, -1);
    this.corner(W - 39, H - 39, -1, -1);
  }

  private drawLogo(cx: number, top: number, w: number): number {
    if (this.logo) {
      const h = w / this.logo.aspect;
      this.doc.addImage(this.logo.dataUrl, 'PNG', cx - w / 2, top, w, h);
      return top + h;
    }
    this.text('CAPIMAX RT', cx, top + 24, { size: 18, bold: true, align: 'center', raw: true });
    return top + 30;
  }

  private firstHeader(): number {
    const bottom = this.drawLogo(CX, 52, 172);
    this.divider(bottom + 14, 150);
    this.text(this.opts.title, CX, bottom + 44, { size: 20, bold: true, align: 'center', raw: true });
    let y = bottom + 62;
    if (this.opts.subtitle) {
      this.text(this.opts.subtitle, CX, y, { size: 10, color: MUTED, align: 'center', raw: true });
      y += 14;
    }
    return y + 12;
  }

  private continuedHeader(): number {
    this.drawLogo(this.rtl ? RIGHT - 52 : LEFT + 52, 42, 104);
    const label = `${this.opts.title} ${this.opts.continuedLabel ?? '(continued)'}`;
    this.text(label, RIGHT, 60, { size: 10.5, bold: true, align: 'right' });
    this.doc.setDrawColor(...GOLD);
    this.doc.setLineWidth(0.8);
    this.doc.line(LEFT, 78, RIGHT, 78);
    return 98;
  }

  private footer(page: number, total: number) {
    let y = H - 94;
    if (this.opts.note) {
      for (const ln of this.wrap(this.opts.note, 7.2, 440, 3)) {
        this.text(ln, CX, y, { size: 7.2, color: MUTED, align: 'center', raw: true });
        y += 9.5;
      }
    }
    const company = `${COMPANY.operator} · ${COMPANY.address} · ${COMPANY.email} · ${COMPANY.phones[0]}`;
    this.text(this.clip(company, 6.6, CONTENT_W), CX, H - 70, { size: 6.6, color: MUTED, align: 'center', raw: true });
    this.doc.setDrawColor(...GOLD_L);
    this.doc.setLineWidth(0.6);
    this.doc.line(LEFT, H - 64, RIGHT, H - 64);
    const pageText = this.opts.pageLabel ? this.opts.pageLabel(page, total) : `Page ${page} of ${total}`;
    this.text(this.opts.reference, LEFT, H - 52, { size: 7.5, color: GOLD });
    this.text(pageText, CX, H - 52, { size: 7.5, color: GOLD, align: 'center', raw: true });
    this.text(COMPANY.website, RIGHT, H - 52, { size: 7.5, color: GOLD, align: 'right' });
  }

  private newPage() {
    this.doc.addPage();
    this.frame();
    this.y = this.continuedHeader();
    if (this.repeatHeader) this.repeatHeader();
  }

  private ensure(needed: number) {
    if (this.y + needed > H - BOTTOM) this.newPage();
  }

  // ----------------------------------------------------------------- blocks
  /** Account holder (left) and document facts (right) in a framed panel. */
  holder(h: HolderInfo) {
    const left: Array<[string, string, boolean]> = [[h.label, h.name, true], ...(h.rows || []).map(([a, b]) => [a, b, false] as [string, string, boolean])];
    const right = h.meta;
    const n = Math.max(left.length, right.length);
    const ph = 18 + n * 25;
    this.ensure(ph + 8);
    const top = this.y;
    const d = this.doc;
    d.setFillColor(...PANEL);
    d.setDrawColor(...GOLD);
    d.setLineWidth(0.7);
    d.roundedRect(LEFT, top, CONTENT_W, ph, 6, 6, 'FD');
    const split = LEFT + CONTENT_W * 0.6;
    let yy = top + 16;
    for (const [lab, val, strong] of left) {
      this.text(lab.toUpperCase(), LEFT + 14, yy, { size: 6.6, color: MUTED });
      this.text(this.clip(val || '—', strong ? 10 : 8.6, split - LEFT - 26, strong), LEFT + 14, yy + 11, { size: strong ? 10 : 8.6, bold: strong });
      yy += 25;
    }
    yy = top + 16;
    for (const [lab, val] of right) {
      this.text(lab.toUpperCase(), split + 12, yy, { size: 6.6, color: MUTED });
      this.text(this.clip(val || '—', 8.6, RIGHT - split - 24), split + 12, yy + 11, { size: 8.6 });
      yy += 25;
    }
    this.y = top + ph + 16;
  }

  /** A panel of figures: [label, value, strong?]. */
  summary(fields: Array<[string, string, boolean?]>, cols = 3) {
    if (!fields.length) return;
    const rows = Math.ceil(fields.length / cols);
    const ph = 14 + rows * 34;
    this.ensure(ph + 8);
    const top = this.y;
    const d = this.doc;
    d.setFillColor(...WHITE);
    d.setDrawColor(...GOLD);
    d.setLineWidth(0.7);
    d.roundedRect(LEFT, top, CONTENT_W, ph, 6, 6, 'FD');
    const cw = CONTENT_W / cols;
    fields.forEach(([label, value, strong], i) => {
      const x = LEFT + 14 + (i % cols) * cw;
      const yy = top + 18 + Math.floor(i / cols) * 34;
      this.text(label.toUpperCase(), x, yy, { size: 6.6, color: MUTED });
      this.text(this.clip(value, 10.5, cw - 22, true), x, yy + 14, { size: 10.5, bold: true, color: strong ? GREEN_D : INK });
    });
    this.y = top + ph + 18;
  }

  section(title: string, hint = '') {
    this.ensure(90);
    this.text(title, LEFT, this.y, { size: 11.5, bold: true });
    if (hint) this.text(hint, RIGHT, this.y, { size: 8, color: MUTED, align: 'right' });
    const d = this.doc;
    d.setDrawColor(...GOLD);
    d.setLineWidth(1.2);
    d.line(this.X(LEFT), this.y + 6, this.X(LEFT + 44), this.y + 6);
    d.setDrawColor(...GOLD_L);
    d.setLineWidth(0.5);
    d.line(this.X(LEFT + 44), this.y + 6, this.X(RIGHT), this.y + 6);
    this.y += 22;
  }

  /** Label / value lines (values wrap). A 4th item makes the value a clickable link. */
  kv(rows: Array<[string, string, boolean?, string?]>, labelW = 150) {
    for (const [label, value, strong, url] of rows) {
      const lines = this.wrap(value || '—', 9.2, CONTENT_W - labelW - 8, undefined, !!strong);
      this.ensure(14 * lines.length + 4);
      this.text(label, LEFT + 4, this.y, { size: 8.4, color: MUTED });
      for (const ln of lines) {
        this.text(ln, LEFT + labelW, this.y, { size: 9.2, bold: !!strong, color: url ? LINK : strong ? GREEN_D : INK });
        if (url) {
          const w = this.doc.getTextWidth(ln);
          const x = this.rtl ? this.X(LEFT + labelW) - w : LEFT + labelW;
          this.doc.link(x, this.y - 9, w, 12, { url });
        }
        this.y += 13.5;
      }
      this.y += 3;
    }
  }

  paragraph(text: string, size = 8.8, color: RGB = MUTED) {
    for (const ln of this.wrap(text, size, CONTENT_W)) {
      this.ensure(size + 6);
      this.text(ln, LEFT, this.y, { size, color });
      this.y += size + 4;
    }
    this.y += 4;
  }

  /** Striped table; the header repeats on every page it spans. */
  table(columns: Column[], rows: Array<Record<string, string>>, opts: { empty?: string; totals?: Record<string, string> } = {}) {
    const cols = this.rtl ? [...columns].reverse() : columns;
    const totalW = cols.reduce((s, c) => s + (c.weight ?? 1), 0) || 1;
    let x = LEFT;
    const xs = cols.map((c) => {
      const w = (CONTENT_W * (c.weight ?? 1)) / totalW;
      const r = { x, w };
      x += w;
      return r;
    });
    const pad = 5;
    const d = this.doc;
    // Table geometry is laid out physically (already reversed for RTL).
    const cellX = (i: number, align: Align) =>
      align === 'right' ? xs[i].x + xs[i].w - pad : align === 'center' ? xs[i].x + xs[i].w / 2 : xs[i].x + pad;
    const physAlign = (c: Column): Align => this.A(c.align ?? 'left');

    const header = () => {
      d.setFillColor(...INK);
      d.roundedRect(LEFT, this.y - 13, CONTENT_W, 19, 3, 3, 'F');
      cols.forEach((c, i) => {
        const a = physAlign(c);
        this.text(this.clip(c.header.toUpperCase(), 6.8, xs[i].w - 2 * pad, true), cellX(i, a), this.y, { size: 6.8, bold: true, color: WHITE, align: a, raw: true });
      });
      this.y += 21;
    };

    this.ensure(60);
    header();
    this.repeatHeader = header;
    if (!rows.length) {
      this.text(opts.empty || '—', LEFT + pad, this.y, { size: 9, color: MUTED });
      this.y += 18;
    }
    rows.forEach((row, ri) => {
      let nLines = 1;
      const cells = cols.map((c, i) => {
        const val = row[c.key] ?? '';
        const lines = c.wrap ? this.wrap(val, 8.2, xs[i].w - 2 * pad, 2) : [this.clip(val, 8.2, xs[i].w - 2 * pad)];
        nLines = Math.max(nLines, lines.length);
        return lines;
      });
      const rh = 8 + 10.5 * nLines;
      if (this.y + rh > H - BOTTOM) this.newPage();
      if (ri % 2) {
        d.setFillColor(...PANEL);
        d.rect(LEFT, this.y - 9, CONTENT_W, rh, 'F');
      }
      cols.forEach((c, i) => {
        const raw = row[c.key] ?? '';
        let color = INK;
        let bold = false;
        if (c.tone === 'signed' && raw) {
          color = raw.trim().startsWith('-') ? RED : GREEN_D;
          bold = true;
        } else if (c.tone === 'status') {
          color = STATUS_TONE[raw.trim().toLowerCase()] ?? INK;
          bold = true;
        }
        const a = physAlign(c);
        let ly = this.y;
        for (const ln of cells[i]) {
          this.text(ln, cellX(i, a), ly, { size: 8.2, color, bold, align: a, raw: true });
          ly += 10.5;
        }
      });
      this.y += rh;
    });
    this.repeatHeader = null;
    if (opts.totals) {
      this.ensure(24);
      d.setDrawColor(...GOLD);
      d.setLineWidth(0.9);
      d.line(LEFT, this.y - 7, RIGHT, this.y - 7);
      cols.forEach((c, i) => {
        const val = opts.totals![c.key];
        if (!val) return;
        const a = physAlign(c) === 'center' ? this.A('left') : physAlign(c);
        this.text(this.clip(val, 8.6, xs[i].w - 2 * pad, true), cellX(i, a), this.y + 6, { size: 8.6, bold: true, align: a, raw: true });
      });
      this.y += 24;
    }
    this.y += 10;
  }

  /** A centred image (e.g. a QR code) with an optional caption below. */
  image(dataUrl: string, size: number, caption?: string) {
    this.ensure(size + (caption ? 24 : 10));
    this.doc.addImage(dataUrl, 'PNG', CX - size / 2, this.y, size, size);
    this.y += size + 4;
    if (caption) {
      this.text(caption, CX, this.y + 8, { size: 7.5, color: MUTED, align: 'center', raw: true });
      this.y += 18;
    }
    this.y += 6;
  }

  /** Label / value lines with an image (a QR code) beside them — certificates. */
  kvWithImage(title: string, rows: Array<[string, string, boolean?]>, dataUrl: string, size: number, caption?: string, labelW = 120) {
    const gap = 18;
    const textW = CONTENT_W - size - gap;
    const lines = rows.map(([, value, strong]) => this.wrap(value || '—', 8.6, textW - labelW - 8, undefined, !!strong));
    const textH = lines.reduce((h, l) => h + 13 * l.length + 3, 0);
    const blockH = Math.max(textH, size + (caption ? 16 : 0));
    // heading and block stay on the same page
    if (this.y + 22 + blockH + 8 > H - BOTTOM) this.newPage();
    this.section(title);
    const top = this.y;
    // the image sits at the far end of the line (right in LTR, left in RTL)
    const imgLeft = this.rtl ? LEFT : RIGHT - size;
    this.doc.addImage(dataUrl, 'PNG', imgLeft, top - 8, size, size);
    if (caption) this.text(caption, imgLeft + size / 2, top + size, { size: 7.2, color: MUTED, align: 'center', raw: true });
    rows.forEach(([label, , strong], i) => {
      this.text(label, LEFT + 4, this.y, { size: 8, color: MUTED });
      for (const ln of lines[i]) {
        this.text(ln, LEFT + labelW, this.y, { size: 8.6, bold: !!strong, color: strong ? GREEN_D : INK });
        this.y += 13;
      }
      this.y += 3;
    });
    this.y = top + blockH + 8;
  }

  /** A centred, emphasised statement (certificates). */
  statement(text: string, size = 10.5) {
    for (const ln of this.wrap(text, size, CONTENT_W - 40)) {
      this.ensure(size + 8);
      this.text(ln, CX, this.y, { size, color: INK, align: 'center', raw: true });
      this.y += size + 5;
    }
    this.y += 8;
  }

  /** Add the footer to every page and download the file. */
  save(filename: string) {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.footer(p, total);
    }
    this.doc.save(filename);
  }

  /** For tests / previews. */
  output(): Blob {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.footer(p, total);
    }
    return this.doc.output('blob');
  }
}

/** Stable document numbers: <PREFIX>-<yyyymmdd>-<first 8 of the id>. */
export function documentReference(prefix: string, id?: string | number | null, when = new Date()): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, '0');
  const d = String(when.getDate()).padStart(2, '0');
  const tail = String(id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase() ||
    `${String(when.getHours()).padStart(2, '0')}${String(when.getMinutes()).padStart(2, '0')}`;
  return `${prefix}-${y}${m}${d}-${tail}`;
}

export const pdfMoney = (n: number | string | null | undefined, signed = false): string => {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  const text = `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (signed) return `${v >= 0 ? '+' : '-'}${text}`;
  return v < 0 ? `-${text}` : text;
};

export const pdfDate = (d: string | Date | null | undefined, lang = 'en'): string => {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString(lang.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Compact date for table cells (dd/mm/yyyy). */
export const pdfShortDate = (d: string | Date | null | undefined, lang = 'en'): string => {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString(lang.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
