import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enProperties from './locales/en/properties.json';
import enLegal from './locales/en/legal.json';
import enKyc from './locales/en/kyc.json';
import enOwner from './locales/en/owner.json';
import enPartners from './locales/en/partners.json';
import enPlan from './locales/en/plan.json';
import enDocs from './locales/en/docs.json';
import enSite from './locales/en/site.json';

import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arNavigation from './locales/ar/navigation.json';
import arProperties from './locales/ar/properties.json';
import arLegal from './locales/ar/legal.json';
import arKyc from './locales/ar/kyc.json';
import arOwner from './locales/ar/owner.json';
import arPartners from './locales/ar/partners.json';
import arPlan from './locales/ar/plan.json';
import arDocs from './locales/ar/docs.json';
import arSite from './locales/ar/site.json';

// Define resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    properties: enProperties,
    legal: enLegal,
    kyc: enKyc,
    owner: enOwner,
    partners: enPartners,
    plan: enPlan,
    docs: enDocs,
    site: enSite,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    navigation: arNavigation,
    properties: arProperties,
    legal: arLegal,
    kyc: arKyc,
    owner: arOwner,
    partners: arPartners,
    plan: arPlan,
    docs: arDocs,
    site: arSite,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'navigation', 'properties', 'legal', 'kyc', 'owner', 'partners', 'plan', 'docs', 'site'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'capimax-language',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: true,
    },
  });

// Function to update document direction based on language
export const updateDocumentDirection = (language: string) => {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = language;

  // Add/remove RTL class for Tailwind
  if (language === 'ar') {
    document.documentElement.classList.add('rtl');
  } else {
    document.documentElement.classList.remove('rtl');
  }
};

// Listen for language changes
i18n.on('languageChanged', (lng) => {
  updateDocumentDirection(lng);
  localStorage.setItem('capimax-language', lng);
});

// Set initial direction
updateDocumentDirection(i18n.language);

export default i18n;
