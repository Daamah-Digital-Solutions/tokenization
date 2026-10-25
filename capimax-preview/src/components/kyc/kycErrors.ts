import type { TFunction } from 'i18next';

/**
 * Turn an ApiError from the KYC endpoints into a message in the UI language.
 * The backend sends a stable `code` (KYC_UNDER_REVIEW, KYC_INCOMPLETE, …);
 * anything unknown falls back to the server text (English UI) or a generic
 * translated message, never a bare "HTTP 400 Error".
 */
export const kycErrorMessage = (t: TFunction, err: any, language = 'en'): string => {
  const code = typeof err?.code === 'string' ? err.code : '';
  if (code) {
    const translated = t(`errors.${code}`, { ns: 'kyc', defaultValue: '' });
    if (translated) return translated;
  }
  const server = typeof err?.message === 'string' ? err.message : '';
  if (server && !server.startsWith('HTTP ') && !language.startsWith('ar')) return server;
  return t('errors.generic', { ns: 'kyc' });
};
