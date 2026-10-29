import React, { useEffect, useState } from 'react';
import { pushPropertyTab, readPropertyTab, subscribePropertyTab } from '../../utils/propertyTab';
import { constructionStageLabel } from '../../utils/constructionStage';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import {
  MapPin,
  Star,
  Users,
  Building,
  Building2,
  Shield,
  Clock,
  DollarSign,
  Calculator,
  Eye,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Award,
  CheckCircle,
  BarChart3,
  Home,
  CreditCard,
  CalendarDays,
  Briefcase,
  Boxes,
  Activity,
  Scale,
  Globe,
  ExternalLink,
  Lock,
  Folder,
  TrendingUp,
  Calendar,
  Percent,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { Button } from '../ui/Button';
import { RichText } from '../ui/RichText';
import { cn } from '../../utils/cn';
import type { Property, PropertyDocuments } from '../../services/api/types';
import { PROPERTY_PLACEHOLDER, handleImageFallback } from '../../utils/imageFallback';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Layers, TrendingUp as PriceUp } from 'lucide-react';
import { PaymentPlanSection, PriceTiersCard } from './PaymentPlanSection';
import { usePaymentOptions } from '../purchase/PaymentMethodList';
import {
  DeveloperCard,
  FinancialStudyCard,
  InsuranceCard,
  ReturnsCard,
  ValuationCard,
} from './ListingDetailsSections';
import { buildSchedule, fallbackPlan, formatMoney, formatPlanDate, parseDate } from '../../utils/paymentPlan';
import { uiLocale } from '../../utils/locale';

// Wyoming Secretary of State business search (client round 4, #6; same link as Capimax BRX)
const WYOMING_BUSINESS_SEARCH = 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx';

interface PropertyDetailEnhancedProps {
  property: Property;
  analytics?: any;
  investors?: any[];
  documents?: PropertyDocuments[];
  isUnderConstruction?: boolean;
  constructionProgressData?: any;
  onInvestClick?: (tokenCount?: number, method?: 'cash' | 'installments', installmentCount?: number) => void;
  onImageClick?: (index: number) => void;
  currentImageIndex?: number;
}

type TabId = 'overview' | 'plan' | 'financials' | 'studies' | 'insurance' | 'analytics' | 'spv' | 'blockchain' | 'documents' | 'location';
const TAB_IDS: TabId[] = ['overview', 'plan', 'financials', 'studies', 'insurance', 'analytics', 'spv', 'blockchain', 'documents', 'location'];
const asTab = (value: string): TabId => (TAB_IDS.includes(value as TabId) ? (value as TabId) : 'overview');


const hasFinancialStudy = (details: any) =>
  !!(details?.financial_study?.summary || details?.financial_study?.documents?.length);

const EmptySection: React.FC<{ icon: React.ElementType; title: string; text: string }> = ({ icon: Icon, title, text }) => (
  <Card className="p-10 text-center">
    <Icon className="w-10 h-10 mx-auto mb-3 text-gray-400" />
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{title}</h2>
    <p className="text-gray-500 dark:text-gray-400">{text}</p>
  </Card>
);

export const PropertyDetailEnhanced: React.FC<PropertyDetailEnhancedProps> = ({
  property,
  analytics,
  investors = [],
  documents = [],
  isUnderConstruction = false,
  constructionProgressData,
  onInvestClick,
  onImageClick,
  currentImageIndex: externalImageIndex
}) => {
  const [internalImageIndex, setInternalImageIndex] = useState(0);
  const [tokenCount, setTokenCount] = useState(1);
  // The open section is in the URL, so Back returns to the previous section of
  // this property instead of the property list (client, additional fixes #4).
  const [activeTab, setActiveTabState] = useState<TabId>(() => asTab(readPropertyTab()));
  useEffect(() => subscribePropertyTab((tab) => setActiveTabState(asTab(tab))), []);
  const setActiveTab = (tab: TabId) => pushPropertyTab(tab);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showSpvVerify, setShowSpvVerify] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);

  const { t: tPlan, i18n } = useTranslation('plan');
  // Live fee rates from the admin settings (PropShare model), never hard-coded.
  const feeRates = usePaymentOptions().data?.fees;
  const { t } = useTranslation('propui');
  const isAr = i18n.language?.startsWith('ar');
  const details = property.listing_details;
  // Purchase methods + schedule set by the admin (client round 3, #18 #20).
  const plan = details?.payment_plan ?? fallbackPlan(property as any);

  const currentImageIndex = externalImageIndex ?? internalImageIndex;
  const setCurrentImageIndex = onImageClick ?? setInternalImageIndex;

  // Helper functions
  const isReadyProperty = property.property_category === 'ready_property';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(uiLocale(i18n.language), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const fundingPercentage = property.total_tokens > 0 ?
    Math.round((property.tokens_sold / property.total_tokens) * 100) : 0;

  const tabs = [
    { id: 'overview' as const, label: t('detail.tabs.overview'), icon: Eye },
    { id: 'plan' as const, label: tPlan('tab'), icon: CalendarClock },
    { id: 'financials' as const, label: t('detail.tabs.financials'), icon: BarChart3 },
    // Their own sections, out of Financials (client, additional fixes #1)
    { id: 'studies' as const, label: t('detail.tabs.studies'), icon: FileText },
    { id: 'insurance' as const, label: t('detail.tabs.insurance'), icon: Shield },
    { id: 'analytics' as const, label: t('detail.tabs.analytics'), icon: Activity },
    { id: 'spv' as const, label: t('detail.tabs.spv'), icon: Briefcase },
    { id: 'blockchain' as const, label: t('detail.tabs.blockchain'), icon: Boxes },
    { id: 'documents' as const, label: t('detail.tabs.documents'), icon: Folder },
    { id: 'location' as const, label: t('detail.tabs.location'), icon: MapPin },
  ];

  const nextImage = () => {
    if (property.images?.length > 1) {
      setCurrentImageIndex((currentImageIndex + 1) % property.images.length);
    }
  };

  const previousImage = () => {
    if (property.images?.length > 1) {
      setCurrentImageIndex((currentImageIndex - 1 + property.images.length) % property.images.length);
    }
  };

  const availableTokens = property.total_tokens - property.tokens_sold;

  const calculateReturns = () => {
    const investmentAmount = tokenCount * property.token_price;
    const returnRate = property.expected_return || 10;
    const annualReturn = (investmentAmount * returnRate) / 100;
    const quarterlyDividend = annualReturn / 4;
    const monthlyDividend = annualReturn / 12;
    return { investmentAmount, annualReturn, quarterlyDividend, monthlyDividend };
  };

  const { investmentAmount, annualReturn, quarterlyDividend, monthlyDividend } = calculateReturns();

  // Per-installment amount for the sidebar's "buy in installments" button
  // (the plan's longest option, i.e. the lowest installment).
  const sidebarInstallment = (() => {
    if (!plan.allows_installments) return 0;
    const count = plan.installment_count || plan.count_options?.[plan.count_options.length - 1] || 12;
    const rows = buildSchedule(investmentAmount, {
      downPaymentPercent: Number(plan.down_payment_percent) || 0,
      count,
      frequency: plan.frequency,
      firstDueDate: parseDate(plan.first_due_date),
    });
    return rows.find((r) => r.kind === 'installment')?.amount || 0;
  })();

  // SPV Information — the backend `spv` block (legal entity, else the legacy
  // spv_* fields). Nothing is made up: a missing value reads "pending".
  const spvAny = property as any;
  const spv = spvAny.spv || null;
  const pending = t('detail.spv.pendingValue');
  const spvInfo = {
    name: spv?.name || pending,
    jurisdiction: spv?.jurisdiction || (spv?.is_wyoming !== false ? t('detail.spv.wyoming') : pending),
    formationDate: spv?.formation_date ? formatDate(String(spv.formation_date)) : pending,
    registrationNumber: spv?.registration_number || pending,
    legalStructure: spv?.entity_type || t('detail.spv.legalStructureValue'),
    status: spv?.status_display || (spv?.registration_number ? t('detail.spv.statusValue') : pending),
    managingDirector: t('detail.spv.managingDirectorValue'),
    auditor: t('detail.spv.auditorValue'),
    custodian: spvAny.spv_bank_name || t('detail.spv.custodianValue'),
    hasRealRegistration: !!spv?.registration_number,
    registryUrl: spv?.registry_url || (spv?.is_wyoming === false ? null : WYOMING_BUSINESS_SEARCH),
  };
  const [filingCopied, setFilingCopied] = useState(false);
  const copyFilingId = () => {
    if (!spvInfo.hasRealRegistration) return;
    navigator.clipboard?.writeText(spvInfo.registrationNumber).then(() => {
      setFilingCopied(true);
      window.setTimeout(() => setFilingCopied(false), 2000);
    });
  };

  // Distribution schedule
  const distributionSchedule = [
    { quarter: 'Q1', month: 'March', status: 'upcoming' },
    { quarter: 'Q2', month: 'June', status: 'upcoming' },
    { quarter: 'Q3', month: 'September', status: 'upcoming' },
    { quarter: 'Q4', month: 'December', status: 'upcoming' },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-8">
      {/* Image Gallery */}
      <Card className="overflow-hidden">
        <div className="relative h-96 md:h-[500px]">
          <img
            src={property.images?.[currentImageIndex] || PROPERTY_PLACEHOLDER}
            alt={property.title}
            className="w-full h-full object-cover"
            onError={handleImageFallback}
          />

          {/* Image Navigation */}
          {property.images && property.images.length > 1 && (
            <>
              <button
                onClick={previousImage}
                aria-label={t('detail.prevImage')}
                className="absolute start-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>

              <button
                onClick={nextImage}
                aria-label={t('detail.nextImage')}
                className="absolute end-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>

              {/* Image Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      currentImageIndex === index
                        ? "bg-white scale-125"
                        : "bg-white/50 hover:bg-white/75"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Status Badges */}
          <div className="absolute top-4 start-4 flex gap-2">
            {fundingPercentage < 50 && (
              <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Award className="w-3 h-3" />
                {t('detail.badges.featured')}
              </div>
            )}

            {/* Property Category Badge */}
            {isUnderConstruction ? (
              <div className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {t('detail.badges.underConstruction')}
              </div>
            ) : isReadyProperty && property.rental_income_active ? (
              <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {t('detail.badges.incomeActive')}
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Home className="w-3 h-3" />
                {t('detail.badges.ready')}
              </div>
            )}
          </div>

          {/* Quick Stats Overlay */}
          <div className="absolute bottom-4 end-4 flex gap-2">
            <div className="px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-gray-900 dark:text-white">4.5</span>
              </div>
            </div>
            <div className="px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">{property.investor_count || investors.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {property.images && property.images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto">
            {property.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  currentImageIndex === index
                    ? "border-emerald-500"
                    : "border-transparent hover:border-gray-300"
                )}
              >
                <img
                  src={image}
                  alt={t('detail.imageAlt', { title: property.title, n: index + 1 })}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Tab Navigation */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Property Info */}
                <Card className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {property.title}
                      </h1>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span className="text-lg">{property.city}, {property.state || property.country}</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('detail.propertyType')}</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {property.property_type ? t(`types.${property.property_type}`, { defaultValue: property.property_type.replace('_', ' ').toUpperCase() }) : ''}
                      </div>
                    </div>
                  </div>

                  <RichText text={property.description} className="mb-8" />

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 p-4 rounded-xl">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {formatCurrency(property.total_value)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.totalValue')}</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {formatCurrency(property.token_price)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.perShare')}</div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {formatPercentage(property.expected_return || 0)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {isUnderConstruction ? t('detail.expectedReturn') : t('detail.annualReturn')}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {property.rental_yield ? formatPercentage(property.rental_yield) : t('detail.na')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.rentalYield')}</div>
                    </div>
                  </div>
                </Card>

                {/* Progress Section */}
                <Card className="p-8">
                  {isUnderConstruction ? (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <Text variant="bodyLarge" weight="semibold">{t('detail.constructionProgress')}</Text>
                        <Text variant="bodyLarge" weight="bold" className="text-orange-600 dark:text-orange-400">
                          {formatPercentage(property.construction_progress || 0)}
                        </Text>
                      </div>

                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${property.construction_progress || 0}%` }}
                          transition={{ duration: 2, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r rtl:bg-gradient-to-l from-orange-500 to-red-500 rounded-full relative"
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </motion.div>
                      </div>

                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-6">
                        <span>{constructionStageLabel(property.construction_status_display) || t('detail.inProgress')}</span>
                        <span>{t('detail.expected', { date: property.expected_completion_date ? formatDate(property.expected_completion_date) : t('detail.tbd') })}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Funding Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Text variant="bodyLarge" weight="semibold">{t('detail.fundingProgress')}</Text>
                      <Text variant="bodyLarge" weight="bold" className="text-emerald-600 dark:text-emerald-400">
                        {t('detail.percentComplete', { percent: fundingPercentage })}
                      </Text>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fundingPercentage}%` }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r rtl:bg-gradient-to-l from-emerald-500 to-green-500 rounded-full relative"
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </motion.div>
                    </div>

                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{t('detail.sharesSold', { n: property.tokens_sold?.toLocaleString() })}</span>
                      <span>{t('detail.sharesAvailable', { n: (property.total_tokens - property.tokens_sold)?.toLocaleString() })}</span>
                    </div>
                  </div>
                </Card>

                {/* Upcoming price phase (admin note #2) */}
                {details?.next_price_change && (
                  <div className="flex items-start gap-3 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-4">
                    <PriceUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      {tPlan('tiers.nextChange', {
                        price: formatMoney(details.next_price_change.price_per_token),
                        date: formatPlanDate(details.next_price_change.effective_from, i18n.language),
                        label: details.next_price_change.label,
                      })}
                    </p>
                  </div>
                )}

                {/* Payment plan: purchase methods + full installment schedule
                    + PDF, as set by the admin (client round 3, #18 #20). */}
                <PaymentPlanSection
                  property={property}
                  plan={plan}
                  initialShares={tokenCount}
                  onBuy={(shares, method, count) => onInvestClick?.(shares, method, count)}
                />

                <DeveloperCard details={details} />

                {/* Distribution Schedule */}
                <Card className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      {t('detail.distributionSchedule')}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {isReadyProperty ? t('detail.monthlyDistributions') : t('detail.quarterlyDistributions')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {distributionSchedule.map((dist, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"
                      >
                        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {t(`detail.quarters.${dist.quarter}`)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t(`detail.months.${dist.month}`)}
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            {t('detail.scheduled')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Ownership Calculator */}
                <Card className="sticky top-24">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-600" />
                      {t('calculator.title')}
                    </h3>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('calculator.numberOfShares')}
                        </label>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {t('calculator.perShare', { price: formatCurrency(property.token_price) })}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={tokenCount}
                        onChange={(e) => setTokenCount(Math.max(1, Math.min(Math.floor(Number(e.target.value) || 1), availableTokens)))}
                        min={1}
                        max={availableTokens}
                        step={1}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-semibold text-center"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('detail.availableShares', { n: availableTokens.toLocaleString() })}
                      </p>
                      {/* Quick token select */}
                      <div className="flex gap-2 mt-2">
                        {[1, 5, 10, 25].filter(n => n <= availableTokens).map((count) => (
                          <button
                            key={count}
                            onClick={() => setTokenCount(count)}
                            className={cn(
                              "flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-all",
                              tokenCount === count
                                ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                            )}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('calculator.yourOwnership')}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('detail.sidebar.shares')}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{tokenCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('detail.sidebar.totalCost')}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(investmentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('detail.sidebar.ownership')}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {((tokenCount / property.total_tokens) * 100).toFixed(4)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('detail.sidebar.annualReturn')}</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(annualReturn)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {isReadyProperty ? t('detail.sidebar.monthlyDividend') : t('detail.sidebar.quarterlyDividend')}
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(isReadyProperty ? monthlyDividend : quarterlyDividend)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {plan.allows_cash && (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => onInvestClick?.(tokenCount, 'cash')}
                      >
                        {tPlan('buy.cash', { count: tokenCount, total: formatCurrency(investmentAmount) })}
                      </Button>
                    )}
                    {plan.allows_installments && (
                      <Button
                        variant={plan.allows_cash ? 'outline' : 'primary'}
                        size="lg"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => onInvestClick?.(tokenCount, 'installments')}
                      >
                        <Layers className="w-4 h-4" />
                        {tPlan('buy.installments', {
                          amount: formatMoney(sidebarInstallment),
                          per: tPlan(`per.${plan.frequency}`),
                        })}
                      </Button>
                    )}
                    {plan.allows_installments && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('plan')}
                        className="w-full text-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {tPlan('buy.viewPlan')}
                      </button>
                    )}
                  </div>
                </Card>

                {/* Trust Indicators */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.trust.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">{t('detail.trust.regulatory')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">{t('detail.trust.verified')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Lock className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">{t('detail.trust.spv')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Scale className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">{t('detail.trust.valuation')}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-8">
              <PaymentPlanSection
                property={property}
                plan={plan}
                initialShares={tokenCount}
                onBuy={(shares, method, count) => onInvestClick?.(shares, method, count)}
              />
              <PriceTiersCard tiers={details?.price_tiers || []} />
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-8">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
                {t('detail.fin.title')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Ownership Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.fin.ownershipMetrics')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.sharePrice')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.token_price)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.totalShares')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{property.total_tokens?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.availableShares')}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{(property.total_tokens - property.tokens_sold)?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.minOwnership')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.token_price)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.expectedYield')}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPercentage(property.expected_return || 10)}</span>
                    </div>
                  </div>
                </div>

                {/* Property Financials */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.fin.propertyFinancials')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.propertyValue')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.total_value)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.rentalYield')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatPercentage(property.rental_yield || 0)}</span>
                    </div>
                    {property.monthly_rental_income && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.monthlyRent')}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(property.monthly_rental_income)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.managementFee')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{feeRates ? `${Number(feeRates.management_fee_pct)}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.fin.platformFee')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{feeRates ? `${Number(feeRates.platform_fee_pct)}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Admin-maintained listing details (admin note #2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ReturnsCard details={details} />
              <ValuationCard details={details} />
            </div>
            <PriceTiersCard tiers={details?.price_tiers || []} />
            </div>
          )}

          {activeTab === 'studies' && (
            hasFinancialStudy(details)
              ? <FinancialStudyCard details={details} />
              : <EmptySection icon={FileText} title={t('detail.tabs.studies')} text={t('detail.studiesEmpty')} />
          )}

          {activeTab === 'insurance' && (
            details?.insurance
              ? <InsuranceCard details={details} />
              : <EmptySection icon={Shield} title={t('detail.tabs.insurance')} text={t('detail.insuranceEmpty')} />
          )}

          {activeTab === 'analytics' && (() => {
            const a: any = analytics || {};
            const pm: any = a.performance_metrics || {};
            const annual = Number(property.expected_return) || 0;
            const monthly = annual / 12;
            const occupancy = Number(property.occupancy_rate);
            const rentalYield = Number(property.rental_yield) || 0;
            const roiProj =
              Number(a.roi_projection) ||
              (annual && rentalYield ? (annual + rentalYield) / 2 : annual || rentalYield);
            const origVal = Number(pm.original_value) || Number(property.total_value) || 0;
            const curVal = Number(pm.current_valuation) || origVal;
            const capitalGrowth = origVal ? ((curVal - origVal) / origVal) * 100 : 0;
            const rawMonthly = Array.isArray(a.monthly_investment_data) ? a.monthly_investment_data : [];
            let cum = 0;
            const timeline = rawMonthly.map((d: any) => {
              cum += Number(d.investment_amount) || 0;
              return { month: String(d.month || '').slice(2), invested: Math.round(cum) };
            });
            const money = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;
            const pct = (n: number) => `${(n || 0).toFixed(2)}%`;
            const tiles: [string, string][] = [
              [t('detail.an.annualReturn'), pct(annual)],
              [t('detail.an.monthlyReturn'), pct(monthly)],
              [t('detail.an.occupancy'), isNaN(occupancy) ? '—' : pct(occupancy)],
              [t('detail.an.roi'), pct(roiProj)],
              [t('detail.an.capitalGrowth'), pct(capitalGrowth)],
              [t('detail.rentalYield'), pct(rentalYield)],
            ];
            return (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-emerald-600" />
                  {t('detail.an.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('detail.an.subtitle')}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {tiles.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="text-base font-bold mt-0.5 text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Property value growth */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('detail.an.initialValue')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{money(origVal)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('detail.an.currentValuation')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{money(curVal)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">{t('detail.an.capitalGrowth')}</p>
                    <p className={`text-lg font-bold ${capitalGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {capitalGrowth >= 0 ? '+' : ''}{pct(capitalGrowth)}
                    </p>
                  </div>
                </div>

                {/* Investment timeline chart */}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('detail.an.timeline')}</h3>
                {timeline.length > 0 && cum > 0 ? (
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeline} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => t('units.thousand', { v: (v / 1000).toFixed(0) })} />
                        <RTooltip formatter={(v: any) => [money(Number(v)), t('detail.an.cumulative')]} />
                        <Area type="monotone" dataKey="invested" stroke="#10b981" strokeWidth={2} fill="url(#invGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-10 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('detail.an.empty')}
                    </p>
                  </div>
                )}
              </Card>
            );
          })()}

          {activeTab === 'spv' && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-emerald-600" />
                {t('detail.spv.title')}
              </h2>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 mb-8">
                <p className="text-emerald-800 dark:text-emerald-200">
                  {t('detail.spv.intro')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.spv.details')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.spv.name')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.spv.jurisdiction')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.jurisdiction}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.spv.formationDate')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.formationDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.spv.registrationNumber')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.registrationNumber}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.spv.providers')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.spv.managingDirector')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.managingDirector}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.spv.auditor')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.auditor}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">{t('detail.spv.custodian')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.custodian}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button
                  variant="outline"
                  className="me-4"
                  onClick={() => setActiveTab('documents')}
                >
                  <FileText className="w-4 h-4 me-2" />
                  {t('detail.spv.viewDocuments')}
                </Button>
                <Button variant="ghost" onClick={() => setShowSpvVerify(true)}>
                  <ExternalLink className="w-4 h-4 me-2" />
                  {t('detail.spv.verify')}
                </Button>
              </div>

              {/* Company registration verification modal */}
              {showSpvVerify && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                  onClick={() => setShowSpvVerify(false)}
                >
                  <div
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                          {t('detail.spv.companyRegistration')}
                        </h3>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {spvInfo.hasRealRegistration ? t('detail.spv.verifiedOnRecord') : t('detail.spv.registrationDetails')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      {[
                        [t('detail.spv.legalEntity'), spvInfo.name],
                        [t('detail.spv.registrationNumber'), spvInfo.registrationNumber],
                        [t('detail.spv.jurisdiction'), spvInfo.jurisdiction],
                        [t('detail.spv.formationDate'), spvInfo.formationDate],
                        [t('detail.spv.legalStructure'), spvInfo.legalStructure],
                        [t('detail.spv.status'), spvInfo.status],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <span className="text-slate-500 dark:text-slate-400">{label}</span>
                          <span className="text-slate-900 dark:text-white font-medium text-end break-all">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                      {spvInfo.hasRealRegistration
                        ? t('detail.spv.registeredNote')
                        : t('detail.spv.pendingNote')}
                    </p>

                    {spvInfo.registryUrl && (
                      <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3 text-xs text-slate-600 dark:text-slate-300">
                        <p>{t('detail.spv.wyomingHowTo')}</p>
                        {spvInfo.hasRealRegistration && (
                          <button
                            type="button"
                            onClick={copyFilingId}
                            className="mt-2 inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            {filingCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {filingCopied ? t('detail.spv.copied') : t('detail.spv.copyFilingId', { id: spvInfo.registrationNumber })}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-5 flex gap-3">
                      {spvInfo.registryUrl && (
                        <a
                          href={spvInfo.registryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t('detail.spv.lookup')}
                        </a>
                      )}
                      <button
                        onClick={() => setShowSpvVerify(false)}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 text-sm transition-colors"
                      >
                        {t('detail.close')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'blockchain' && (() => {
            const bc: any = (property as any).blockchain;
            const base = bc?.explorer_url ? String(bc.explorer_url).replace(/\/$/, '') : null;
            const addrUrl = base && bc?.contract_address ? `${base}/address/${bc.contract_address}` : null;
            const txReal = bc?.deployment_transaction && !/^0x0+$/i.test(bc.deployment_transaction);
            const txUrl = base && txReal ? `${base}/tx/${bc.deployment_transaction}` : null;
            return (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Boxes className="w-6 h-6 text-emerald-600" />
                  {t('detail.bc.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('detail.bc.intro')}
                </p>

                {bc && bc.contract_address ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        [t('detail.bc.network'), bc.network || t('detail.bc.blockchain')],
                        [t('detail.bc.chainId'), bc.chain_id != null ? String(bc.chain_id) : '—'],
                        [t('detail.bc.contractStatus'), bc.status ? t(`detail.bc.statuses.${String(bc.status).toLowerCase()}`, { defaultValue: String(bc.status).replace(/^\w/, (c: string) => c.toUpperCase()) }) : t('detail.bc.statuses.active')],
                        [t('detail.bc.verification'), bc.is_verified ? t('detail.bc.verified') : t('detail.bc.onChain')],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                          <p className="text-sm font-semibold mt-0.5 text-gray-900 dark:text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                      <div className="flex items-start justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{t('detail.bc.tokenContract')}</span>
                        <span className="flex items-center gap-2 min-w-0">
                          <code className="font-mono text-sm text-gray-800 dark:text-gray-100 break-all">{bc.contract_address}</code>
                          <button
                            type="button"
                            onClick={() => { try { navigator.clipboard?.writeText(bc.contract_address); setCopiedContract(true); setTimeout(() => setCopiedContract(false), 1500); } catch (_) {} }}
                            className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            {copiedContract ? t('detail.bc.copied') : t('detail.bc.copy')}
                          </button>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('detail.bc.tokenId')}</span>
                        <code className="font-mono text-sm text-gray-800 dark:text-gray-100">{bc.token_id != null ? bc.token_id : '—'}</code>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('detail.bc.tokenStandard')}</span>
                        <code className="font-mono text-sm text-gray-800 dark:text-gray-100">ERC-1155</code>
                      </div>
                      <div className="flex items-start justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{t('detail.bc.deploymentTx')}</span>
                        {txUrl ? (
                          <a href={txUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all text-end">
                            {bc.deployment_transaction}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">{t('detail.bc.notRecorded')}</span>
                        )}
                      </div>
                      {bc.deployment_block != null && (
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{t('detail.bc.deploymentBlock')}</span>
                          <code className="font-mono text-sm text-gray-800 dark:text-gray-100">{bc.deployment_block}</code>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={addrUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition-colors ${addrUrl ? '' : 'pointer-events-none opacity-50'}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('detail.bc.viewOnExplorer')}
                      </a>
                      {addrUrl && (
                        <a
                          href={`${addrUrl}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          {t('detail.bc.verifyContract')}
                        </a>
                      )}
                    </div>
                    {bc.is_testnet && (
                      <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                        {t('detail.bc.testnet')}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">{t('detail.bc.emptyTitle')}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('detail.bc.emptyBody')}
                    </p>
                  </div>
                )}
              </Card>
            );
          })()}

          {activeTab === 'documents' && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Folder className="w-6 h-6 text-emerald-600" />
                {t('detail.dr.title')}
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                {t('detail.dr.intro')}
              </p>

              {/*
                Replaced a hardcoded category list ("Title Deed", "Operating
                Agreement", etc. — pure UI mock with no onClick) with a real
                grouping over the `documents` prop. Documents are bucketed by
                their backend `type` field and each one wires the Download
                button to its actual file URL.
              */}
              {!Array.isArray(documents) || documents.length === 0 ? (
                <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('detail.dr.emptyTitle')}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('detail.dr.emptyBody')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Friendlier labels for the raw backend `type` strings.
                    const typeLabels: Record<string, string> = {
                      ownership: t('detail.dr.types.ownership'),
                      legal: t('detail.dr.types.legal'),
                      financial: t('detail.dr.types.financial'),
                      valuation: t('detail.dr.types.valuation'),
                      insurance: t('detail.dr.types.insurance'),
                      spv: t('detail.dr.types.spv'),
                      construction: t('detail.dr.types.construction'),
                      management: t('detail.dr.types.management'),
                      technical: t('detail.dr.types.technical'),
                      owner_identity: t('detail.dr.types.owner_identity'),
                      company_registration: t('detail.dr.types.company_registration'),
                      permits: t('detail.dr.types.permits'),
                      other: t('detail.dr.types.other'),
                    };
                    const typeIcons: Record<string, any> = {
                      ownership: FileText,
                      legal: Shield,
                      financial: TrendingUp,
                      valuation: BarChart3,
                      insurance: Shield,
                      spv: Briefcase,
                      construction: Folder,
                      management: Briefcase,
                      technical: Folder,
                      owner_identity: Shield,
                      company_registration: Briefcase,
                      permits: Shield,
                      other: FileText,
                    };

                    // Bucket documents by type.
                    const grouped: Record<string, PropertyDocuments[]> = {};
                    for (const doc of documents) {
                      const key = (doc.type || 'other').toLowerCase();
                      (grouped[key] = grouped[key] || []).push(doc);
                    }

                    const handleDownload = (doc: PropertyDocuments) => {
                      if (!doc.url) {
                        alert(t('detail.dr.noUrl'));
                        return;
                      }
                      const a = document.createElement('a');
                      a.href = doc.url;
                      a.download = doc.name || 'document';
                      a.target = '_blank';
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    };

                    return Object.entries(grouped).map(([type, docs]) => {
                      const Icon = typeIcons[type] || FileText;
                      const title = typeLabels[type] || type.replace(/_/g, ' ');
                      const isExpanded = expandedSection === title;

                      return (
                        <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleSection(title)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="text-start">
                                <div className="font-semibold text-gray-900 dark:text-white capitalize">{title}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.dr.count', { count: docs.length })}</div>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 space-y-2">
                                  {docs.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <div className="text-gray-700 dark:text-gray-300 truncate">{doc.name}</div>
                                          {doc.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                              {doc.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {doc.url && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                                            title={t('detail.dr.view')}
                                            aria-label={t('detail.dr.viewName', { name: doc.name })}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDownload(doc)}
                                          title={t('detail.dr.download')}
                                          aria-label={t('detail.dr.downloadName', { name: doc.name })}
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-800 dark:text-yellow-200">{t('detail.dr.verifiedAccess')}</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      {t('detail.dr.verifiedAccessBody')}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'location' && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-600" />
                {t('detail.loc.title')}
              </h2>

              {/* Map Placeholder */}
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 flex items-center justify-center">
                <div className="text-center">
                  <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">{t('detail.loc.map')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">{property.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.loc.address')}</h3>
                  <div className="space-y-2 text-gray-600 dark:text-gray-400">
                    <p>{property.address}</p>
                    <p>{property.city}, {property.state}</p>
                    <p>{property.country} {property.zip_code}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('detail.loc.amenities')}</h3>
                  <div className="space-y-2 text-gray-600 dark:text-gray-400">
                    <p>• {t('detail.loc.shopping', { km: '0.5' })}</p>
                    <p>• {t('detail.loc.transport', { km: '0.2' })}</p>
                    <p>• {t('detail.loc.schools', { km: '1.0' })}</p>
                    <p>• {t('detail.loc.hospital', { km: '2.0' })}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
