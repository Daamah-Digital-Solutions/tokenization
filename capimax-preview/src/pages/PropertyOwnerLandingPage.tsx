import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  FileCheck,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle2,
  Send
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTranslation } from 'react-i18next';

interface ListingRequestForm {
  propertyType: string;
  propertyName: string;
  propertyAddress: string;
  city: string;
  country: string;
  estimatedValue: string;
  currency: string;
  fundingGoal: string;
  minimumInvestment: string;
  ownerType: string;
  ownerName: string;
  companyName: string;
  email: string;
  phone: string;
  agreeToTerms: boolean;
  agreeToReview: boolean;
}

export const PropertyOwnerLandingPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const [formData, setFormData] = useState<ListingRequestForm>({
    propertyType: '',
    propertyName: '',
    propertyAddress: '',
    city: '',
    country: '',
    estimatedValue: '',
    currency: 'USD',
    fundingGoal: '',
    minimumInvestment: '',
    ownerType: '',
    ownerName: '',
    companyName: '',
    email: '',
    phone: '',
    agreeToTerms: false,
    agreeToReview: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const benefits = [
    {
      icon: Users,
      title: t('ownerLanding.benefits.funding.title'),
      description: t('ownerLanding.benefits.funding.description')
    },
    {
      icon: FileCheck,
      title: t('ownerLanding.benefits.marketing.title'),
      description: t('ownerLanding.benefits.marketing.description')
    },
    {
      icon: TrendingUp,
      title: t('ownerLanding.benefits.lifecycle.title'),
      description: t('ownerLanding.benefits.lifecycle.description')
    },
    {
      icon: Shield,
      title: t('ownerLanding.benefits.control.title'),
      description: t('ownerLanding.benefits.control.description')
    },
    {
      icon: Building2,
      title: t('ownerLanding.benefits.liquidity.title'),
      description: t('ownerLanding.benefits.liquidity.description')
    }
  ];

  const steps = [
    {
      number: 1,
      title: t('ownerLanding.steps.submit.title'),
      description: t('ownerLanding.steps.submit.description')
    },
    {
      number: 2,
      title: t('ownerLanding.steps.review.title'),
      description: t('ownerLanding.steps.review.description')
    },
    {
      number: 3,
      title: t('ownerLanding.steps.spv.title'),
      description: t('ownerLanding.steps.spv.description')
    },
    {
      number: 4,
      title: t('ownerLanding.steps.valuation.title'),
      description: t('ownerLanding.steps.valuation.description')
    },
    {
      number: 5,
      title: t('ownerLanding.steps.offering.title'),
      description: t('ownerLanding.steps.offering.description')
    },
    {
      number: 6,
      title: t('ownerLanding.steps.opening.title'),
      description: t('ownerLanding.steps.opening.description')
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-bold text-white mb-6"
            >
              {t('ownerLanding.heroTitle')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-slate-300 mb-8"
            >
              {t('ownerLanding.heroText')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="#listing-form"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
              >
                {t('ownerLanding.listProperty')}
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </a>
              <button
                onClick={() => navigateToPage('/how-it-works')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 hover:border-white/50 text-white font-semibold rounded-xl transition-colors"
              >
                {t('ownerLanding.learnMore')}
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              {t('ownerLanding.benefitsTitle')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t('ownerLanding.benefitsSubtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {benefit.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              {t('ownerLanding.howTitle')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t('ownerLanding.howSubtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SPV Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                {t('ownerLanding.spvTitle')}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                {t('ownerLanding.spvText')}
              </p>
              <ul className="space-y-4">
                {[
                  t('ownerLanding.spvPoints.risk'),
                  t('ownerLanding.spvPoints.governance'),
                  t('ownerLanding.spvPoints.ownability'),
                  t('ownerLanding.spvPoints.exit')
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigateToPage('/spv')}
                className="mt-8 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                {t('ownerLanding.spvLearnMore')}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                {t('ownerLanding.spvSummaryTitle')}
              </h3>
              <div className="space-y-4">
                {[
                  { label: t('ownerLanding.spvSummary.riskLabel'), value: t('ownerLanding.spvSummary.riskValue') },
                  { label: t('ownerLanding.spvSummary.separationLabel'), value: t('ownerLanding.spvSummary.separationValue') },
                  { label: t('ownerLanding.spvSummary.governanceLabel'), value: t('ownerLanding.spvSummary.governanceValue') },
                  { label: t('ownerLanding.spvSummary.documentationLabel'), value: t('ownerLanding.spvSummary.documentationValue') },
                  { label: t('ownerLanding.spvSummary.exitLabel'), value: t('ownerLanding.spvSummary.exitValue') }
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700 last:border-0">
                    <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Listing Request Form */}
      <section id="listing-form" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              {t('ownerLanding.formTitle')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {t('ownerLanding.formSubtitle')}
            </p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {t('ownerLanding.successTitle')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {t('ownerLanding.successText')}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
              {/* Property Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {t('ownerLanding.form.propertySection')}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.propertyType')}
                    </label>
                    <select
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">{t('ownerLanding.form.selectType')}</option>
                      <option value="residential">{t('ownerLanding.form.types.residential')}</option>
                      <option value="commercial">{t('ownerLanding.form.types.commercial')}</option>
                      <option value="mixed">{t('ownerLanding.form.types.mixed')}</option>
                      <option value="land">{t('ownerLanding.form.types.land')}</option>
                      <option value="development">{t('ownerLanding.form.types.development')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.propertyName')}
                    </label>
                    <input
                      type="text"
                      name="propertyName"
                      value={formData.propertyName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.propertyAddress')}
                    </label>
                    <input
                      type="text"
                      name="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.city')}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.country')}
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.estimatedValue')}
                    </label>
                    <input
                      type="number"
                      name="estimatedValue"
                      value={formData.estimatedValue}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.currency')}
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Funding Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {t('ownerLanding.form.fundingSection')}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.fundingGoal')}
                    </label>
                    <input
                      type="number"
                      name="fundingGoal"
                      value={formData.fundingGoal}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.minimumPurchase')}
                    </label>
                    <input
                      type="number"
                      name="minimumInvestment"
                      value={formData.minimumInvestment}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {t('ownerLanding.form.ownerSection')}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.ownerType')}
                    </label>
                    <select
                      name="ownerType"
                      value={formData.ownerType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">{t('ownerLanding.form.selectType')}</option>
                      <option value="individual">{t('ownerLanding.form.ownerTypes.individual')}</option>
                      <option value="company">{t('ownerLanding.form.ownerTypes.company')}</option>
                      <option value="developer">{t('ownerLanding.form.ownerTypes.developer')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.fullName')}
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.companyName')}
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('ownerLanding.form.phone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Agreements */}
              <div className="mb-8 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t('ownerLanding.form.agreePrefix')} <button type="button" onClick={() => navigateToPage('/legal/terms')} className="text-emerald-600 dark:text-emerald-400 hover:underline">{t('ownerLanding.form.terms')}</button> {t('ownerLanding.form.and')} <button type="button" onClick={() => navigateToPage('/legal/privacy')} className="text-emerald-600 dark:text-emerald-400 hover:underline">{t('ownerLanding.form.privacy')}</button>. *
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeToReview"
                    checked={formData.agreeToReview}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t('ownerLanding.form.agreeReview')} *
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-semibold rounded-xl transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('ownerLanding.form.submitting')}
                  </>
                ) : (
                  <>
                    {t('ownerLanding.form.submit')}
                    <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};
