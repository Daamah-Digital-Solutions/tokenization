/**
 * Verification Center inside the dashboard (client round 4, #7; modelled on
 * Capimax BRX): check a certificate by code, see your identity verification,
 * look up each property's owning company in the Wyoming registry and its token
 * contract on the explorer, and reach Capimax Trust for ecosystem documents.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Award, Building2, ExternalLink, Copy, CheckCircle, UserCheck, BadgeCheck } from 'lucide-react';
import { CertificateService } from '../../services/certificates/CertificateService';
import { KYCService } from '../../services/user/KYCService';
import { useRouter } from '../../utils/router';
import { CertificateCheckForm } from '../../pages/VerifyCertificatePage';

const TRUST_URL = 'https://www.capimax.pro';

const Card: React.FC<{ icon: React.ElementType; title: string; text?: string; children?: React.ReactNode; className?: string }> = ({ icon: Icon, title, text, children, className }) => (
  <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 ${className || ''}`}>
    <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
        <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      </span>
      {title}
    </h3>
    {text && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

const CopyId: React.FC<{ value: string }> = ({ value }) => {
  const { t } = useTranslation('certs');
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1500); })}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
    >
      {done ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? t('center.copied') : t('center.copy')}
    </button>
  );
};

export const VerificationCenterPanel: React.FC<{ onOpenCertificates?: () => void }> = ({ onOpenCertificates }) => {
  const { t } = useTranslation('certs');
  const { navigate } = useRouter();
  const registry = useQuery({ queryKey: ['certificate-registrations'], queryFn: () => CertificateService.registrations() });
  const kyc = useQuery({ queryKey: ['kyc-status-vc'], queryFn: () => KYCService.getStatus(), retry: false });
  const kycStatus = (kyc.data?.status as string) || 'not_started';

  const openCode = (code: string) => {
    window.open(CertificateService.verifyPath(code), '_blank', 'noopener');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          {t('center.title')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('center.subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card icon={Award} title={t('center.certTitle')} text={t('center.certText')}>
          <CertificateCheckForm onSubmit={openCode} />
          {onOpenCertificates && (
            <button onClick={onOpenCertificates} className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
              {t('center.myCerts')} →
            </button>
          )}
        </Card>

        <Card icon={UserCheck} title={t('center.kycTitle')}>
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              kycStatus === 'approved'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            }`}>
              {kycStatus === 'approved' && <BadgeCheck className="w-4 h-4" />}
              {t(`center.kycStatus.${kycStatus}`, { defaultValue: kycStatus })}
            </span>
            <button onClick={() => navigate('kyc')} className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
              {t('center.kycOpen')}
            </button>
          </div>
        </Card>
      </div>

      <Card icon={Building2} title={t('center.registryTitle')} text={t('center.registryText')}>
        {registry.data && registry.data.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {registry.data.map((r) => (
              <div key={r.property_id} className="py-3 grid gap-2 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{r.property_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {t('center.spv')}: {r.spv_name || '—'}
                  </p>
                </div>
                <div className="min-w-0 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  {r.filing_id && (
                    <div className="flex items-center gap-2">
                      <span>{t('center.filingId')}: <span className="font-mono" dir="ltr">{r.filing_id}</span></span>
                      <CopyId value={r.filing_id} />
                    </div>
                  )}
                  <div className="truncate">
                    {t('center.contract')}:{' '}
                    {r.contract_address ? (
                      r.contract_explorer_url ? (
                        <a href={r.contract_explorer_url} target="_blank" rel="noopener noreferrer" className="font-mono text-emerald-700 dark:text-emerald-400 hover:underline" dir="ltr">
                          {r.contract_address.slice(0, 10)}…{r.contract_address.slice(-6)}
                        </a>
                      ) : <span className="font-mono" dir="ltr">{r.contract_address.slice(0, 10)}…{r.contract_address.slice(-6)}</span>
                    ) : t('center.noContract')}
                  </div>
                </div>
                {r.registry_url && (
                  <a href={r.registry_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <ExternalLink className="w-4 h-4" />{t('center.searchRegistry')}
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{registry.isLoading ? '…' : t('center.registryEmpty')}</p>
        )}
      </Card>

      <Card icon={ShieldCheck} title={t('center.trustTitle')} text={t('center.trustText')}>
        <a href={TRUST_URL} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90">
          <ExternalLink className="w-4 h-4" />{t('center.trustCta')}
        </a>
      </Card>
    </div>
  );
};

export default VerificationCenterPanel;
