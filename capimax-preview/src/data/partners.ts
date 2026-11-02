/**
 * The partners shown on the Partners page (client voice notes, Nov 2026: "the new partners
 * are on the BRX partners page, take them from there"). The same register as Capimax BRX
 * and PropShare (the client's Partner Content Register, 2026), section by section and in
 * its order, with the same logos (src/assets/partners) and links.
 *
 * Names stay as the companies write them; each partner's role, description and market,
 * and each section's title, are in the brokerui translations under
 * partnersPage.sections / partnersPage.list / partnersPage.markets (en, ar, fr).
 * "Other Approved Banks" is a category that fills as banks are approved, not a company:
 * it has no site and no role line.
 */

import aetheraDevelopment from '../assets/partners/aethera-development.webp';
import assuraxInsurance from '../assets/partners/assurax-insurance.webp';
import cimGlobalFinancial from '../assets/partners/cim-global-financial.webp';
import covertechInsurance from '../assets/partners/covertech-insurance.webp';
import crestmarkGlobal from '../assets/partners/crestmark-global.webp';
import crownFacilities from '../assets/partners/crown-facilities.webp';
import elevateProperties from '../assets/partners/elevate-properties.webp';
import eliteGateProperties from '../assets/partners/elite-gate-properties.webp';
import lexcrestGlobalLegal from '../assets/partners/lexcrest-global-legal.webp';
import mercury from '../assets/partners/mercury.webp';
import novaDigitalFinance from '../assets/partners/nova-digital-finance.webp';
import nowpayments from '../assets/partners/nowpayments.webp';
import otherApprovedBanks from '../assets/partners/other-approved-banks.webp';
import paypal from '../assets/partners/paypal.webp';
import primeStoneGlobal from '../assets/partners/prime-stone-global.webp';
import priminnHotels from '../assets/partners/priminn-hotels.webp';
import proofAnchor from '../assets/partners/proof-anchor.webp';
import revolutBusiness from '../assets/partners/revolut-business.webp';
import stripe from '../assets/partners/stripe.webp';
import sumsub from '../assets/partners/sumsub.webp';
import valoraEstatesGlobal from '../assets/partners/valora-estates-global.webp';
import verdeaEstates from '../assets/partners/verdea-estates.webp';
import westoriaCapitalEstates from '../assets/partners/westoria-capital-estates.webp';
import wiseBusiness from '../assets/partners/wise-business.webp';

export type PartnerSectionKey =
  | 'payments'
  | 'identity'
  | 'banking'
  | 'advisory'
  | 'insurance'
  | 'developers'
  | 'operations'
  | 'tokenization';

export interface Partner {
  /** Translation key under partnersPage.list */
  key: string;
  name: string;
  section: PartnerSectionKey;
  /** Translation key under partnersPage.markets */
  market: string;
  url?: string;
  logo: string;
  /** false: no role line ("Other Approved Banks") */
  hasRole?: boolean;
}

export const PARTNER_SECTION_KEYS: PartnerSectionKey[] = [
  'payments', 'identity', 'banking', 'advisory', 'insurance', 'developers', 'operations', 'tokenization',
];

export const PARTNERS: Partner[] = [
  // Payments and digital asset payments
  { key: 'stripe', name: 'Stripe', section: 'payments', market: 'global', url: 'https://stripe.com', logo: stripe },
  { key: 'paypal', name: 'PayPal', section: 'payments', market: 'global', url: 'https://www.paypal.com', logo: paypal },
  { key: 'nowpayments', name: 'NOWPayments', section: 'payments', market: 'global', url: 'https://nowpayments.io', logo: nowpayments },
  // Identity verification and compliance
  { key: 'sumsub', name: 'Sumsub', section: 'identity', market: 'global', url: 'https://sumsub.com', logo: sumsub },
  // Banking and treasury rails
  { key: 'mercury', name: 'Mercury', section: 'banking', market: 'unitedStates', url: 'https://mercury.com', logo: mercury },
  { key: 'revolutBusiness', name: 'Revolut Business', section: 'banking', market: 'international', url: 'https://www.revolut.com/business', logo: revolutBusiness },
  { key: 'wiseBusiness', name: 'Wise Business', section: 'banking', market: 'international', url: 'https://wise.com/business', logo: wiseBusiness },
  { key: 'otherApprovedBanks', name: 'Other Approved Banks', section: 'banking', market: 'multipleJurisdictions', logo: otherApprovedBanks, hasRole: false },
  // Finance, valuation, legal and risk
  { key: 'novaDigitalFinance', name: 'Nova Digital Finance', section: 'advisory', market: 'capimaxEcosystem', url: 'https://novadf.com', logo: novaDigitalFinance },
  { key: 'cimGlobalFinancial', name: 'CIM Global Financial', section: 'advisory', market: 'ukAndUs', url: 'https://www.cimglobalfinancial.com', logo: cimGlobalFinancial },
  { key: 'lexcrestGlobalLegal', name: 'LexCrest Global Legal', section: 'advisory', market: 'global', url: 'https://lexcrestlegal.xyz', logo: lexcrestGlobalLegal },
  // Insurance and asset protection
  { key: 'covertechInsurance', name: 'CoverTech Insurance', section: 'insurance', market: 'global', url: 'https://www.covertechinsurance.com', logo: covertechInsurance },
  { key: 'assuraxInsurance', name: 'Assurax Insurance', section: 'insurance', market: 'international', url: 'https://assuraxinsurance.com', logo: assuraxInsurance },
  // Real estate development partners
  { key: 'westoriaCapitalEstates', name: 'Westoria Capital Estates', section: 'developers', market: 'unitedStates', url: 'https://westoriacapital.com', logo: westoriaCapitalEstates },
  { key: 'crestmarkGlobal', name: 'Crestmark Global', section: 'developers', market: 'unitedKingdom', url: 'https://crestmarkglobal.com', logo: crestmarkGlobal },
  { key: 'valoraEstatesGlobal', name: 'Valora Estates Global', section: 'developers', market: 'spain', url: 'https://valoraestatesglobal.com', logo: valoraEstatesGlobal },
  { key: 'verdeaEstates', name: 'Verdea Estates', section: 'developers', market: 'georgia', url: 'https://verdeaestates.com', logo: verdeaEstates },
  { key: 'aetheraDevelopment', name: 'Aethera Development', section: 'developers', market: 'greece', url: 'https://aetheradevelopment.com', logo: aetheraDevelopment },
  { key: 'elevateProperties', name: 'Elevate Properties Pte. Ltd', section: 'developers', market: 'singapore', url: 'https://elevateproperties.world', logo: elevateProperties },
  { key: 'primeStoneGlobal', name: 'Prime Stone Global', section: 'developers', market: 'southAfrica', url: 'https://primestoneglobal.dev', logo: primeStoneGlobal },
  // Hospitality, property and facility management
  { key: 'priminnHotels', name: 'Priminn Hotels', section: 'operations', market: 'international', url: 'https://priminnhotels.com', logo: priminnHotels },
  { key: 'eliteGateProperties', name: 'Elite Gate Properties', section: 'operations', market: 'international', url: 'https://elitegateproperties.com', logo: eliteGateProperties },
  { key: 'crownFacilities', name: 'Crown Facilities', section: 'operations', market: 'global', url: 'https://crownfm.online', logo: crownFacilities },
  // Tokenization and verification
  { key: 'proofAnchor', name: 'Proof Anchor', section: 'tokenization', market: 'global', url: 'https://www.proofanchor.io', logo: proofAnchor, hasRole: false },
];

/** "example.com/path" for showing where a link goes. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}
