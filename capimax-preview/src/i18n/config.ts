import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enProperties from './locales/en/properties.json';
import enLegal from './locales/en/legal.json';

import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arNavigation from './locales/ar/navigation.json';
import arProperties from './locales/ar/properties.json';
import arLegal from './locales/ar/legal.json';

// Define resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    properties: enProperties,
    legal: enLegal,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    navigation: arNavigation,
    properties: arProperties,
    legal: arLegal,
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
    ns: ['common', 'auth', 'navigation', 'properties', 'legal'],

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
