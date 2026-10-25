import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplets, TrendingUp, Shield, DollarSign, CheckCircle, XCircle,
  Building2, BarChart3, Clock, Users, ArrowRight, FileText, Settings,
  Banknote, Scale, Briefcase, AlertTriangle
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';
import { Button } from '../components/ui/Button';
import { LPApplicationForm } from '../components/liquidity-provider/LPApplicationForm';
import { useTranslation, Trans } from 'react-i18next';

const howItWorksSteps = [
  {
    step: 1,
    title: 'Submit Application',
    description: 'The liquidity provider submits an official application through the platform',
    icon: FileText
  },
  {
    step: 2,
    title: 'KYB Verification',
    description: 'Undergoes KYB (Know Your Business) process and operational assessment',
    icon: Shield
  },
  {
    step: 3,
    title: 'Define Parameters',
    description: 'Define target assets, liquidity limits, and pricing policy (discount/spread)',
    icon: Settings
  },
  {
    step: 4,
    title: 'Dashboard Activation',
    description: 'A dedicated control panel is activated for managing operations',
    icon: BarChart3
  },
  {
    step: 5,
    title: 'Receive Requests',
    description: 'Receive exit requests from owners wishing to sell their units',
    icon: Users
  },
  {
    step: 6,
    title: 'Review & Execute',
    description: 'Approve or reject requests according to your policies and execute purchases',
    icon: CheckCircle
  }
];

const profitSources = [
  {
    icon: TrendingUp,
    title: 'Price Difference',
    description: 'Buy at discount (spread) from owners seeking early exit'
  },
  {
    icon: DollarSign,
    title: 'Exit Service Fees',
    description: 'Charge service fees for processing exit transactions (if applicable)'
  },
  {
    icon: Banknote,
    title: 'Secondary Market Resale',
    description: 'Resell acquired units in the secondary market at market price'
  },
  {
    icon: Clock,
    title: 'Hold & Earn Returns',
    description: 'Temporarily hold units and benefit from dividend distributions'
  }
];

const notObligatedTo = [
  'Buy all exit requests',
  'Maintain fixed pricing',
  'Execute within specific timeframes',
  'Guarantee permanent liquidity'
];

const operationalBenefits = [
  'Independent control panel',
  'Full control over pricing, assets, limits, approvals',
  'Real-time reports and analytics'
];

const financialBenefits = [
  'Opportunity to buy units at a discount',
  'Ownership portfolio diversification',
  'Profit from price differences',
  'Complete flexibility in reselling'
];

const legalBenefits = [
  'No redemption obligations',
  'Not managing platform funds',
  'Working as an independent party',
  'Complete clarity in contracts'
];

export const LiquidityProviderPage: React.FC = () => {
  const { t } = useTranslation('brokerui');
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  return (
    <>
      <Helmet>
        <title>{t('lpPage.metaTitle')}</title>
        <meta
          name="description"
          content={t('lpPage.metaDescription')}
        />
        <meta name="keywords" content="liquidity provider, real estate ownership, exit liquidity, tokenized assets, Capimax RT" />
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
                className="absolute -top-40 -end-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl"
              />
              <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-40 -start-40 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-full blur-3xl"
              />
            </div>

            <Container>
              <div className="relative z-10 text-center max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-6"
                >
                  <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('lpPage.badge')}</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6"
                >
                  {t('lpPage.heroTitle')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                    {t('lpPage.brand')}
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-8"
                >
                  {t('lpPage.heroDesc')}
                </motion.p>

                {/* Important Notice */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 text-start max-w-3xl mx-auto mb-8"
                >
                  <div className="flex gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">{t('lpPage.noticeTitle')}</h3>
                      <p className="text-amber-700 dark:text-amber-300 text-sm">
                        <Trans t={t} i18nKey="lpPage.noticeDesc" components={{ strong: <strong /> }} />
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Button
                    size="lg"
                    onClick={() => setShowApplicationForm(true)}
                    className="px-8"
                  >
                    {t('lpPage.applyNow')}
                    <ArrowRight className="ms-2 w-5 h-5 rtl:rotate-180" />
                  </Button>
                </motion.div>
              </div>
            </Container>
          </section>

          {/* How It Works */}
          <Section variant="default" size="xl">
            <div className="text-center mb-12">
              <Heading level="h2" size="3xl" align="center" className="mb-4">
                {t('lpPage.howTitle')}
              </Heading>
              <Text variant="bodyLarge" color="secondary" align="center" className="max-w-2xl mx-auto" as="p">
                {t('lpPage.howDesc')}
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {howItWorksSteps.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="absolute -top-3 -start-3 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {t(`lpPage.steps.s${item.step}.title`, { defaultValue: item.title })}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {t(`lpPage.steps.s${item.step}.description`, { defaultValue: item.description })}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Business Model */}
          <Section variant="gradient" size="xl" backgroundPattern>
            <div className="text-center mb-12">
              <Heading level="h2" size="3xl" align="center" className="mb-4">
                {t('lpPage.modelTitle')}
              </Heading>
              <Text variant="bodyLarge" color="secondary" align="center" className="max-w-2xl mx-auto" as="p">
                {t('lpPage.modelDesc')}
              </Text>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Profit Sources */}
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  {t('lpPage.profitSources')}
                </h3>
                <div className="space-y-4">
                  {profitSources.map((source, index) => {
                    const IconComponent = source.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{t(`lpPage.profit.p${index}.title`, { defaultValue: source.title })}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{t(`lpPage.profit.p${index}.description`, { defaultValue: source.description })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Not Obligated To */}
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  {t('lpPage.notObligatedTitle')}
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <ul className="space-y-4">
                    {notObligatedTo.map((item, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{t(`lpPage.notObligated.n${index}`, { defaultValue: item })}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t('lpPage.controlNote')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Benefits */}
          <Section variant="default" size="xl">
            <div className="text-center mb-12">
              <Heading level="h2" size="3xl" align="center" className="mb-4">
                {t('lpPage.benefitsTitle')}
              </Heading>
              <Text variant="bodyLarge" color="secondary" align="center" className="max-w-2xl mx-auto" as="p">
                {t('lpPage.benefitsDesc')}
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Operational Benefits */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                  <Settings className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  {t('lpPage.operational')}
                </h3>
                <ul className="space-y-3">
                  {operationalBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600 dark:text-slate-400 text-sm">{t(`lpPage.operationalList.o${index}`, { defaultValue: benefit })}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Financial Benefits */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                  <DollarSign className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  {t('lpPage.financial')}
                </h3>
                <ul className="space-y-3">
                  {financialBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600 dark:text-slate-400 text-sm">{t(`lpPage.financialList.f${index}`, { defaultValue: benefit })}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Benefits */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  {t('lpPage.legal')}
                </h3>
                <ul className="space-y-3">
                  {legalBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600 dark:text-slate-400 text-sm">{t(`lpPage.legalList.l${index}`, { defaultValue: benefit })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* Application Form Modal */}
          <AnimatePresence>
            {showApplicationForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowApplicationForm(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-3xl my-8"
                >
                  <LPApplicationForm
                    onSuccess={() => {
                      setTimeout(() => setShowApplicationForm(false), 3000);
                    }}
                    onCancel={() => setShowApplicationForm(false)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA Section */}
          <Section variant="dark" size="xl" backgroundElements>
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Heading level="h2" size="3xl" align="center" className="text-white">
                  {t('lpPage.ctaTitle')}
                </Heading>
                <Text variant="bodyLarge" align="center" className="text-white/80" as="p">
                  {t('lpPage.ctaDesc')}
                </Text>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100"
                    onClick={() => setShowApplicationForm(true)}
                  >
                    {t('lpPage.applyNow')}
                    <ArrowRight className="ms-2 w-5 h-5 rtl:rotate-180" />
                  </Button>
                </div>
                <Text variant="caption" align="center" className="text-white/60 pt-4" as="p">
                  {t('lpPage.inquiries')}{' '}
                  <a href="mailto:liquidity@capimaxrt.com" className="text-emerald-400 hover:underline">
                    liquidity@capimaxrt.com
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

export default LiquidityProviderPage;
