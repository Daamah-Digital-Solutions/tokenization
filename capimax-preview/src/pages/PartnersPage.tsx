import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, Building2, ConciergeBell, CreditCard, Handshake, Landmark, Scale, ShieldCheck,
  Umbrella, Users,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';
import { Button } from '../components/ui/Button';
import { PartnerCard } from '../components/partners/PartnerCard';
import { PARTNERS, PARTNER_SECTION_KEYS, type PartnerSectionKey } from '../data/partners';
import { useRouter } from '../utils/router';
import { useTranslation } from 'react-i18next';

import { COMPANY } from '../utils/company';

/**
 * The Partners page: the client's partner register (src/data/partners.ts, the same as
 * Capimax BRX and PropShare — client voice notes, Nov 2026), one section per kind of
 * partner, filterable by section.
 */

type FilterCategory = 'all' | PartnerSectionKey;

const SECTION_ICONS: Record<FilterCategory, typeof Building2> = {
  all: Users,
  payments: CreditCard,
  identity: ShieldCheck,
  banking: Landmark,
  advisory: Scale,
  insurance: Umbrella,
  developers: Building2,
  operations: ConciergeBell,
  tokenization: BadgeCheck,
};

const categoryTabs: FilterCategory[] = ['all', ...PARTNER_SECTION_KEYS];

export const PartnersPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useTranslation('brokerui');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const shownSections = activeCategory === 'all' ? PARTNER_SECTION_KEYS : [activeCategory];
  const partnerCounts = Object.fromEntries(categoryTabs.map((key) => [
    key, key === 'all' ? PARTNERS.length : PARTNERS.filter((p) => p.section === key).length,
  ])) as Record<FilterCategory, number>;

  const chooseCategory = (key: FilterCategory) => {
    setActiveCategory(key);
    document.getElementById('partners-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Helmet>
        <title>{t('partnersPage.metaTitle')}</title>
        <meta
          name="description"
          content={t('partnersPage.metaDescription')}
        />
        <meta name="keywords" content="real estate partners, property developers, financial management, insurance, property management, Capimax RT" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />

        <main className="relative pt-16">
          {/* Hero Section */}
          <section className="relative py-20 lg:py-28 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="absolute -top-40 -end-40 w-80 h-80 bg-gradient-to-r from-emerald-400/10 to-blue-400/10 dark:from-emerald-500/10 dark:to-blue-500/10 rounded-full blur-3xl"
              />
              <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-40 -start-40 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl"
              />
            </div>

            <Container>
              <div className="relative z-10 text-center max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 mb-6"
                >
                  <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{t('partnersPage.badge')}</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6"
                >
                  {t('partnersPage.heroTitle1')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                    {t('partnersPage.heroTitle2')}
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto"
                >
                  {t('partnersPage.heroDesc')}
                </motion.p>
              </div>
            </Container>
          </section>

          {/* Category Tabs */}
          <Section variant="default" size="sm">
            <div className="flex flex-wrap justify-center gap-3">
              {categoryTabs.map((tab) => {
                const IconComponent = SECTION_ICONS[tab];
                const isActive = activeCategory === tab;
                return (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveCategory(tab)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300
                      ${isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                      }
                    `}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{t(`partnersPage.sections.${tab}.label`)}</span>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }
                    `}>
                      {partnerCounts[tab]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </Section>

          {/* Partners, section by section */}
          <Section variant="default" size="xl">
            <div id="partners-list" className="scroll-mt-24" />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-14"
              >
                {shownSections.map((section) => {
                  const IconComponent = SECTION_ICONS[section];
                  const members = PARTNERS.filter((p) => p.section === section);
                  return (
                    <section key={section} aria-labelledby={`partners-${section}`}>
                      <div className="flex items-start gap-3 mb-6">
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h2 id={`partners-${section}`} className="text-2xl font-bold text-slate-900 dark:text-white">
                            {t(`partnersPage.sections.${section}.label`)}
                          </h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t(`partnersPage.sections.${section}.description`)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {members.map((partner) => (
                          <PartnerCard
                            key={partner.key}
                            name={partner.name}
                            logo={partner.logo}
                            role={partner.hasRole === false ? undefined : t(`partnersPage.list.${partner.key}.role`)}
                            description={t(`partnersPage.list.${partner.key}.description`)}
                            market={t(`partnersPage.markets.${partner.market}`)}
                            website={partner.url}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </Section>

          {/* Partner Categories Overview */}
          <Section variant="gradient" size="xl" backgroundPattern>
            <div className="text-center mb-12">
              <Heading level="h2" size="3xl" align="center" className="mb-4">
                {t('partnersPage.categoriesTitle')}
              </Heading>
              <Text variant="bodyLarge" color="secondary" align="center" className="max-w-2xl mx-auto" as="p">
                {t('partnersPage.categoriesDesc')}
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PARTNER_SECTION_KEYS.map((category, index) => {
                const IconComponent = SECTION_ICONS[category];
                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => chooseCategory(category)}
                    className="group cursor-pointer p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {t(`partnersPage.sections.${category}.label`)}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          {t(`partnersPage.sections.${category}.description`)}
                        </p>
                        <p className="mt-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          {t('partnersPage.partnerCount', { count: partnerCounts[category] })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Become a Partner CTA */}
          <Section variant="dark" size="xl" backgroundElements>
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Heading level="h2" size="3xl" align="center" className="text-white">
                  {t('partnersPage.ctaTitle')}
                </Heading>
                <Text variant="bodyLarge" align="center" className="text-white/80" as="p">
                  {t('partnersPage.ctaDesc')}
                </Text>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100"
                    onClick={() => navigate('contact')}
                  >
                    {t('partnersPage.contactUs')}
                    <ArrowRight className="ms-2 w-5 h-5 rtl:rotate-180" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => navigate('broker-program')}
                  >
                    {t('partnersPage.brokerProgram')}
                  </Button>
                </div>
                <Text variant="caption" align="center" className="text-white/60 pt-4" as="p">
                  {t('partnersPage.inquiries')}{' '}
                  <a href={`mailto:${COMPANY.email}`} className="text-emerald-400 hover:underline">
                    {COMPANY.email}
                  </a>
                </Text>
              </motion.div>
            </div>
          </Section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PartnersPage;
