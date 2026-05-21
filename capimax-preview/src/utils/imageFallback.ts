/**
 * Shared image-fallback helpers.
 *
 * Previously, several property cards / grids / modals followed the pattern:
 *
 *     <img
 *       src={property.image || '/images/placeholder-property.jpg'}
 *       onError={(e) => { e.target.src = '/images/placeholder-property.jpg'; }}
 *     />
 *
 * The fallback URLs (`/default-property.jpg`, `/images/placeholder-property.jpg`)
 * don't exist in `public/`, so the fallback itself 404'd — which fired
 * onError again, which set the same broken URL, which 404'd again, in an
 * infinite loop that spammed the console with thousands of failed
 * requests.
 *
 * This module gives us:
 *   - `PROPERTY_PLACEHOLDER` — an inline SVG data URI. Renders instantly,
 *     never makes a network request, can never 404.
 *   - `handleImageFallback(e)` — an idempotent onError handler. The first
 *     call swaps the src to the placeholder; subsequent fires on the same
 *     element are no-ops (guard via a data-attribute), so even if a future
 *     fallback URL ever breaks again, the page can't loop.
 */

import type { SyntheticEvent } from 'react';

export const PROPERTY_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">' +
      '<defs>' +
        '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="#cbd5e1"/>' +
          '<stop offset="100%" stop-color="#94a3b8"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<rect width="800" height="500" fill="url(#g)"/>' +
      '<g fill="#f1f5f9" transform="translate(330 175)">' +
        '<path d="M70 0 L140 50 V140 H0 V50 Z" opacity="0.85"/>' +
        '<rect x="50" y="80" width="40" height="60" fill="#94a3b8"/>' +
      '</g>' +
      '<text x="400" y="370" text-anchor="middle" ' +
        'font-family="Arial,sans-serif" font-size="22" fill="#f1f5f9">' +
        'Property image unavailable</text>' +
    '</svg>'
  );

/**
 * Idempotent onError handler for <img> elements.
 * Use on any property-image <img> tag whose src may 404. Safe to set
 * unconditionally — guards against re-firing via a data-attribute.
 */
export function handleImageFallback(
  e: SyntheticEvent<HTMLImageElement, Event>,
): void {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = PROPERTY_PLACEHOLDER;
}
