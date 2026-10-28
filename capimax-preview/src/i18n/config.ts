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
import enCerts from './locales/en/certs.json';
// Wave 15 language sweep (client round 3, #10)
import enDashboardW15 from './locales/en/dashboard.json';
import enAdminW15 from './locales/en/admin.json';
import enOwneruiW15 from './locales/en/ownerui.json';
import enPaymentsW15 from './locales/en/payments.json';
import enInvestW15 from './locales/en/invest.json';
import enPropuiW15 from './locales/en/propui.json';
import enMarketW15 from './locales/en/market.json';
import enBrokeruiW15 from './locales/en/brokerui.json';
import enUiW15 from './locales/en/ui.json';
import enSharedW15 from './locales/en/shared.json';
import enPagesW15 from './locales/en/pages.json';
import enCheckout from './locales/en/checkout.json';

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
import arCerts from './locales/ar/certs.json';
import arDashboardW15 from './locales/ar/dashboard.json';
import arAdminW15 from './locales/ar/admin.json';
import arOwneruiW15 from './locales/ar/ownerui.json';
import arPaymentsW15 from './locales/ar/payments.json';
import arInvestW15 from './locales/ar/invest.json';
import arPropuiW15 from './locales/ar/propui.json';
import arMarketW15 from './locales/ar/market.json';
import arBrokeruiW15 from './locales/ar/brokerui.json';
import arUiW15 from './locales/ar/ui.json';
import arSharedW15 from './locales/ar/shared.json';
import arPagesW15 from './locales/ar/pages.json';
import arCheckout from './locales/ar/checkout.json';

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
    certs: enCerts,
    dashboard: enDashboardW15,
    admin: enAdminW15,
    ownerui: enOwneruiW15,
    payments: enPaymentsW15,
    invest: enInvestW15,
    propui: enPropuiW15,
    market: enMarketW15,
    brokerui: enBrokeruiW15,
    ui: enUiW15,
    shared: enSharedW15,
    pages: enPagesW15,
    checkout: enCheckout,
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
    certs: arCerts,
    dashboard: arDashboardW15,
    admin: arAdminW15,
    ownerui: arOwneruiW15,
    payments: arPaymentsW15,
    invest: arInvestW15,
    propui: arPropuiW15,
    market: arMarketW15,
    brokerui: arBrokeruiW15,
    ui: arUiW15,
    shared: arSharedW15,
    pages: arPagesW15,
    checkout: arCheckout,
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
    ns: ['common', 'auth', 'navigation', 'properties', 'legal', 'kyc', 'owner', 'partners', 'plan', 'docs', 'site', 'certs', 'dashboard', 'admin', 'ownerui', 'payments', 'invest', 'propui', 'market', 'brokerui', 'ui', 'shared', 'pages', 'checkout'],

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
