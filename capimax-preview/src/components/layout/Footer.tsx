/**
 * Site footer (client round 3, #11): headquarters address, phone numbers
 * and email (same as the other Capimax platforms), every link translated,
 * the legal & regulatory status, and the Capimax RT legal disclaimer above
 * the copyright line.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { COMPANY } from '../../utils/company';
import CapiMaxLightLogo from '../../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../../assets/tokenization_capi max tokenization uk dark   copy.svg';

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

const FOOTER_LINKS: Record<string, Array<{ key: string; href: string }>> = {
  platform: [
    { key: 'properties', href: '/properties' },
    { key: 'marketplace', href: '/marketplace' },
    { key: 'liquidityProvider', href: '/liquidity-provider' },
    { key: 'howItWorks', href: '/how-it-works' },
    { key: 'partners', href: '/partners' },
    { key: 'brokerProgram', href: '/broker-program' },
    { key: 'about', href: '/about' },
  ],
  learn: [
    { key: 'tokenization', href: '/tokenization' },
    { key: 'spv', href: '/spv' },
    { key: 'ownersGuide', href: '/investor-guide' },
    { key: 'dataRoom', href: '/data-room' },
    { key: 'risks', href: '/risks' },
    { key: 'faq', href: '/faq' },
    { key: 'propertyOwners', href: '/property-owner' },
  ],
  guides: [
    { key: 'rtGuide', href: '/capimax-rt-guide' },
    { key: 'ownershipGuide', href: '/investment-guide' },
    { key: 'strategies', href: '/investment-strategies' },
    { key: 'coOwnerGuide', href: '/investor-guide' },
    { key: 'developerGuide', href: '/developer-guide' },
    { key: 'brokerGuide', href: '/broker-guide' },
    { key: 'lpGuide', href: '/lp-guide' },
    { key: 'technology', href: '/technology' },
    { key: 'documentCenter', href: '/document-center' },
    { key: 'verificationCenter', href: '/verification-center' },
  ],
  legal: [
    { key: 'privacy', href: '/legal/privacy' },
    { key: 'terms', href: '/legal/terms' },
    { key: 'riskDisclosure', href: '/legal/risk-disclosure' },
    { key: 'disclaimer', href: '/legal/disclaimer' },
    { key: 'compliance', href: '/legal/compliance' },
    { key: 'cookies', href: '/legal/cookies' },
    { key: 'amlKyc', href: '/legal/aml-kyc' },
    { key: 'security', href: '/legal/security' },
  ],
  help: [
    { key: 'support', href: '/support' },
    { key: 'contact', href: '/contact' },
    { key: 'faq', href: '/faq' },
  ],
};

export const Footer: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation('site');
  const { t: tc } = useTranslation();

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const linkClass = 'text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 text-sm';
  const [us1, us2, uk] = COMPANY.phones;

  return (
    <footer className="bg-navy-50 dark:bg-navy-900 border-t border-navy-200 dark:border-navy-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="py-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
          {/* Brand + contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="col-span-2 md:col-span-3 lg:col-span-1"
          >
            <img src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo} alt="Capimax RT" className="h-8 w-auto mb-4" />
            <p className="text-navy-600 dark:text-navy-300 leading-relaxed text-sm mb-5">{t('footer.tagline')}</p>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-navy-500 dark:text-navy-400 font-semibold mb-1.5">
                  {t('footer.headquarters')}
                </p>
                <address className="not-italic text-navy-700 dark:text-navy-200 leading-relaxed flex gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  <span dir="ltr" className="text-start">
                    8 The Green, Ste R<br />
                    Dover, Kent, DE 19901<br />
                    {t('footer.unitedStates')}
                  </span>
                </address>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-navy-200/70 dark:border-navy-800">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-navy-500 dark:text-navy-400 font-semibold mb-1">
                    {t('footer.unitedStates')}
                  </p>
                  {[us1, us2].map((p) => (
                    <a key={p} href={telHref(p)} dir="ltr" className="flex items-center gap-1.5 text-navy-700 dark:text-navy-200 hover:text-emerald-600 text-[13px]">
                      <Phone className="w-3 h-3" />{p}
                    </a>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-navy-500 dark:text-navy-400 font-semibold mb-1">
                    {t('footer.unitedKingdom')}
                  </p>
                  <a href={telHref(uk)} dir="ltr" className="flex items-center gap-1.5 text-navy-700 dark:text-navy-200 hover:text-emerald-600 text-[13px]">
                    <Phone className="w-3 h-3" />{uk}
                  </a>
                </div>
              </div>
              <a
                href={`mailto:${COMPANY.email}`}
                className="flex items-center gap-2 text-navy-700 dark:text-navy-200 hover:text-emerald-600 pt-3 border-t border-navy-200/70 dark:border-navy-800"
              >
                <Mail className="w-4 h-4 text-emerald-600" />
                <span dir="ltr">{COMPANY.email}</span>
              </a>
            </div>
          </motion.div>

          {Object.entries(FOOTER_LINKS).map(([section, links], index) => (
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (index + 1) * 0.08 }}
            >
              <h3 className="text-sm font-semibold mb-4 text-navy-900 dark:text-white uppercase tracking-wide">
                {t(`footer.sections.${section}`)}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={`${section}-${link.key}`}>
                    <a href={link.href} onClick={(e) => go(e, link.href)} className={linkClass}>
                      {t(`footer.links.${link.key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Legal & regulatory status (client edit #15) */}
        <div className="py-6 border-t border-navy-200 dark:border-navy-800">
          <h3 className="text-xs font-semibold mb-2 text-navy-900 dark:text-white uppercase tracking-wide">
            {tc('footer.regulatoryTitle')}
          </h3>
          <p className="text-navy-500 dark:text-navy-400 text-xs leading-relaxed">{tc('footer.regulatoryBody1')}</p>
          <p className="text-navy-500 dark:text-navy-400 text-xs leading-relaxed mt-2">{tc('footer.regulatoryBody2')}</p>
        </div>

        {/* Legal disclaimer (client round 3, #11) */}
        <section
          aria-labelledby="legal-disclaimer-title"
          className="py-6 border-t border-navy-200 dark:border-navy-800 space-y-2.5 text-xs leading-relaxed text-navy-500 dark:text-navy-400"
        >
          <h3 id="legal-disclaimer-title" className="text-xs font-semibold text-navy-900 dark:text-white uppercase tracking-wide">
            {t('footer.disclaimerTitle')}
          </h3>
          <p>{t('footer.disclaimer1')}</p>
          <p>{t('footer.disclaimer2')}</p>
          <p>{t('footer.disclaimer3')}</p>
          <p>{t('footer.disclaimer4')}</p>
          <p>
            <Trans
              t={t}
              i18nKey="footer.disclaimer5"
              components={{
                terms: <a href="/legal/terms" onClick={(e) => go(e, '/legal/terms')} className="underline underline-offset-2 hover:text-emerald-600" />,
                privacy: <a href="/legal/privacy" onClick={(e) => go(e, '/legal/privacy')} className="underline underline-offset-2 hover:text-emerald-600" />,
              }}
            />
          </p>
        </section>

        <div className="py-6 border-t border-navy-200 dark:border-navy-800 text-navy-500 dark:text-navy-400 text-sm text-center md:text-start">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
};
