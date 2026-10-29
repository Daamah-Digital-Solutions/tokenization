/**
 * The site's languages (client round 4, E5): English, Arabic, French.
 * One place for "which locale formats dates / numbers" and "is this
 * right-to-left", so a new language is added here and not in 80 components.
 */

export const LANGUAGES = ['en', 'ar', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

/** The site language of an i18next language code ('fr-FR' -> 'fr'); English when unknown. */
export function baseLanguage(lng?: string | null): Language {
  const base = (lng || '').toLowerCase().split('-')[0];
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Language) : 'en';
}

/** The Intl locale for dates and numbers in that language. */
export function uiLocale(lng?: string | null, english = 'en-US'): string {
  return { ar: 'ar-EG', fr: 'fr-FR', en: english }[baseLanguage(lng)];
}

export const isRtl = (lng?: string | null) => baseLanguage(lng) === 'ar';
