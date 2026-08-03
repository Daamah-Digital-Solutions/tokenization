/**
 * Rasterize the Capimax brand SVG logo to a PNG data URL for embedding in
 * jsPDF documents (receipts, certificates). jsPDF's addImage doesn't take SVG,
 * and our logo SVGs carry only a viewBox (no width/height), so a plain <img>
 * would rasterize at 0/default size. We fetch the SVG text, inject explicit
 * width/height from the viewBox aspect ratio, then draw it to a canvas.
 *
 * Always fails soft (returns null) so callers keep their text wordmark fallback.
 */

// Dark logo (dark ink) — for light/white backgrounds (e.g. the certificate).
import darkLogoUrl from '../assets/tokenization_capi max tokenization uk dark   copy.svg';
// Light logo (white ink) — for dark/colored backgrounds (e.g. the receipt band).
import lightLogoUrl from '../assets/tokenization_capi max  tokenization light  uk  copy.svg';

export interface RasterLogo {
  dataUrl: string;
  width: number;
  height: number;
  aspect: number;
}

async function rasterize(url: string, targetW = 640): Promise<RasterLogo | null> {
  try {
    if (typeof document === 'undefined') return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    let svg = await res.text();

    // Aspect ratio from the viewBox (fallback ~3.8:1 for the Capimax mark).
    let aspect = 3.8;
    const vb = svg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
    if (vb) {
      const p = vb[1].trim().split(/[\s,]+/).map(Number);
      if (p.length === 4 && p[2] > 0 && p[3] > 0) aspect = p[2] / p[3];
    }

    const width = targetW;
    const height = Math.max(1, Math.round(targetW / aspect));

    // Ensure the root <svg> has an intrinsic size so it rasterizes correctly.
    if (!/<svg[^>]*\swidth\s*=/.test(svg)) {
      svg = svg.replace(/<svg\b/i, `<svg width="${width}" height="${height}"`);
    }

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const dataUrl = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve(null);
      };
      img.src = blobUrl;
    });

    if (!dataUrl) return null;
    return { dataUrl, width, height, aspect };
  } catch {
    return null;
  }
}

let _dark: RasterLogo | null | undefined;
let _light: RasterLogo | null | undefined;

/** Dark-ink logo for light backgrounds. Cached after first load. */
export async function getBrandLogoDark(): Promise<RasterLogo | null> {
  if (_dark === undefined) _dark = await rasterize(darkLogoUrl);
  return _dark;
}

/** White-ink logo for dark/colored backgrounds. Cached after first load. */
export async function getBrandLogoLight(): Promise<RasterLogo | null> {
  if (_light === undefined) _light = await rasterize(lightLogoUrl);
  return _light;
}
