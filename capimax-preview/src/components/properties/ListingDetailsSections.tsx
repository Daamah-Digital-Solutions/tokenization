/**
 * Listing details the admin maintains for a property (admin note #2):
 * developer, returns, financial study, valuation and insurance — each with
 * its public documents. Every card renders nothing when there is no data,
 * so properties that haven't been filled in yet show no empty boxes.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Download, FileText, Globe, LineChart, Mail, Phone, Scale, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney, formatPlanDate, type ListingDetails, type ListingDocument } from '../../utils/paymentPlan';

const Box: React.FC<{ icon: any; title: string; className?: string; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  className = '',
  children,
}) => (
  <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8', className)}>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      {title}
    </h3>
    {children}
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-start gap-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white text-end">{value}</span>
  </div>
);

const has = (v: unknown) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && isNaN(v));
const pct = (v: unknown) => `${Number(v).toFixed(2).replace(/\.00$/, '')}%`;

export const DocumentLinks: React.FC<{ documents?: ListingDocument[] }> = ({ documents }) => {
  const { t } = useTranslation('plan');
  const docs = (documents || []).filter((d) => d.document_url);
  if (!docs.length) return null;
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{t('documents.files')}</div>
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id}>
            <a
              href={d.document_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 min-w-0">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Download className="w-3.5 h-3.5" />
                {t('documents.download')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const DeveloperCard: React.FC<{ details?: ListingDetails | null; className?: string }> = ({ details, className }) => {
  const { t } = useTranslation('plan');
  const dev = details?.developer;
  if (!dev?.name) return null;
  const site = dev.website && /^https?:\/\//i.test(dev.website) ? dev.website : dev.website ? `https://${dev.website}` : '';
  return (
    <Box icon={Building2} title={t('developer.title')} className={className}>
      <div className="text-xl font-semibold text-gray-900 dark:text-white">{dev.name}</div>
      {dev.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line leading-relaxed">{dev.description}</p>}
      <div className="mt-4">
        {has(dev.established_year) && <Row label={t('developer.established')} value={dev.established_year} />}
        {has(dev.projects_completed) && <Row label={t('developer.projects')} value={dev.projects_completed} />}
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        {site && (
          <a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            <Globe className="w-4 h-4" />
            {t('developer.website')}
          </a>
        )}
        {dev.contact_email && (
          <a href={`mailto:${dev.contact_email}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            <Mail className="w-4 h-4" />
            <span dir="ltr">{dev.contact_email}</span>
          </a>
        )}
        {dev.contact_phone && (
          <a href={`tel:${dev.contact_phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            <Phone className="w-4 h-4" />
            <span dir="ltr">{dev.contact_phone}</span>
          </a>
        )}
      </div>
    </Box>
  );
};

export const ReturnsCard: React.FC<{ details?: ListingDetails | null; className?: string }> = ({ details, className }) => {
  const { t } = useTranslation('plan');
  const r = details?.returns;
  if (!r) return null;
  const rows = [
    has(r.expected_return) && Number(r.expected_return) > 0 && <Row key="er" label={t('returns.expectedReturn')} value={pct(r.expected_return)} />,
    has(r.rental_yield) && Number(r.rental_yield) > 0 && <Row key="ry" label={t('returns.rentalYield')} value={pct(r.rental_yield)} />,
    has(r.expected_appreciation_rate) && <Row key="ap" label={t('returns.appreciation')} value={pct(r.expected_appreciation_rate)} />,
    has(r.projected_annual_rental_income) && <Row key="ar" label={t('returns.annualRent')} value={formatMoney(r.projected_annual_rental_income, 0)} />,
    has(r.monthly_rental_income) && Number(r.monthly_rental_income) > 0 && <Row key="mr" label={t('returns.monthlyRent')} value={formatMoney(r.monthly_rental_income, 0)} />,
  ].filter(Boolean);
  if (!rows.length && !r.notes) return null;
  return (
    <Box icon={LineChart} title={t('returns.title')} className={className}>
      {rows}
      {r.notes && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{t('returns.notes')}</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{r.notes}</p>
        </div>
      )}
    </Box>
  );
};

export const FinancialStudyCard: React.FC<{ details?: ListingDetails | null; className?: string }> = ({ details, className }) => {
  const { t } = useTranslation('plan');
  const fs = details?.financial_study;
  if (!fs || (!fs.summary && !fs.documents?.length)) return null;
  return (
    <Box icon={FileText} title={t('financialStudy.title')} className={className}>
      {fs.summary && <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{fs.summary}</p>}
      <DocumentLinks documents={fs.documents} />
    </Box>
  );
};

export const ValuationCard: React.FC<{ details?: ListingDetails | null; className?: string }> = ({ details, className }) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const v = details?.valuation;
  if (!v || (!v.latest && !v.documents?.length)) return null;
  const methodLabel = (m: string) => t(`valuation.methods.${m}`, { defaultValue: m });
  return (
    <Box icon={Scale} title={t('valuation.title')} className={className}>
      {v.latest && (
        <>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('valuation.latest')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{formatMoney(v.latest.current_value, 0)}</div>
          <Row label={t('valuation.date')} value={formatPlanDate(v.latest.valuation_date, lang)} />
          {v.latest.method && <Row label={t('valuation.method')} value={methodLabel(v.latest.method)} />}
          {v.latest.appraiser && <Row label={t('valuation.appraiser')} value={v.latest.appraiser} />}
          {v.latest.report_url && (
            <a
              href={v.latest.report_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <Download className="w-4 h-4" />
              {t('valuation.report')}
            </a>
          )}
        </>
      )}
      {v.history?.length > 1 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{t('valuation.history')}</div>
          {v.history.slice(1).map((h, i) => (
            <Row key={i} label={formatPlanDate(h.valuation_date, lang)} value={formatMoney(h.current_value, 0)} />
          ))}
        </div>
      )}
      <DocumentLinks documents={v.documents} />
    </Box>
  );
};

export const InsuranceCard: React.FC<{ details?: ListingDetails | null; className?: string }> = ({ details, className }) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const ins = details?.insurance;
  if (!ins) return null;
  return (
    <Box icon={ShieldCheck} title={t('insurance.title')} className={className}>
      {ins.provider && <Row label={t('insurance.provider')} value={ins.provider} />}
      {ins.policy_number && <Row label={t('insurance.policy')} value={<span dir="ltr">{ins.policy_number}</span>} />}
      {has(ins.coverage_amount) && <Row label={t('insurance.coverageAmount')} value={formatMoney(ins.coverage_amount, 0)} />}
      {ins.expiry_date && <Row label={t('insurance.expiry')} value={formatPlanDate(ins.expiry_date, lang)} />}
      {ins.coverage && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{t('insurance.coverage')}</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{ins.coverage}</p>
        </div>
      )}
      <DocumentLinks documents={ins.documents} />
    </Box>
  );
};
