/**
 * Capimax RT contact and legal details — one source for official documents
 * (PDF footers), the site footer and the contact / support pages
 * (client round 3, #11 #12 #15).
 */

export const COMPANY = {
  brand: 'Capimax RT',
  operator: 'Capimax Real Estate Technologies',
  assetHolder: 'Capimax Asset Structure',
  registration: 'Registered in the State of Wyoming, United States',
  address: '8 The Green, Ste R, Dover, Kent, DE 19901, United States',
  email: 'tech@capimaxholding.com',
  phones: ['+1 205 350 8771', '+1 205 350 8864', '+44 7577 370309'],
  website: 'capimaxrt.tech',
  websiteUrl: 'https://capimaxrt.tech',
} as const;

/** WhatsApp-able number for support links (digits only). */
export const SUPPORT_WHATSAPP = COMPANY.phones[0].replace(/[^\d]/g, '');
