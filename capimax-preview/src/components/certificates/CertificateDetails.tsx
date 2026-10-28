/**
 * One certificate record, laid out like the Capimax BRX verification page:
 * status, holder, property & SPV, investment, on-chain record, verification.
 * Shared by "My Certificates" and the public /verify page (client round 4, #5).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck, Clock, Ban, Building2, User, Coins, Link2, ShieldCheck, ExternalLink, Copy, CheckCircle,
} from 'lucide-react';
import type { CertificateRecord, CertificateStatus } from '../../services/certificates/CertificateService';
import { cn } from '../../utils/cn';

const STATUS_STYLE: Record<CertificateStatus, { icon: React.ElementType; cls: string }> = {
  final: { icon: BadgeCheck, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
  provisional: { icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' },
  revoked: { icon: Ban, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' },
};

export const CertificateStatusBadge: React.FC<{ status: CertificateStatus; className?: string }> = ({ status, className }) => {
  const { t } = useTranslation('certs');
  const { icon: Icon, cls } = STATUS_STYLE[status] || STATUS_STYLE.provisional;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', cls, className)}>
      <Icon className="w-3.5 h-3.5" />
      {t(`status.${status}`)}
    </span>
  );
};

export const money = (v: string | number) =>
  `$${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const percent = (v: string | number) => `${(Number(v) || 0).toFixed(4)}%`;

export function useCertDate() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US';
  return (d?: string | null) => (d ? new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
}

const Mono: React.FC<{ value: string; href?: string }> = ({ value, href }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(value).then(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  });
  return (
    <span className="inline-flex items-center gap-1.5 max-w-full">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-xs break-all text-emerald-700 dark:text-emerald-400 hover:underline" dir="ltr">
          {value}
        </a>
      ) : (
        <span className="font-mono text-xs break-all" dir="ltr">{value}</span>
      )}
      <button type="button" onClick={copy} className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="copy">
        {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
};

const Section: React.FC<{ icon: React.ElementType; title: string; rows: Array<[string, React.ReactNode] | false | null> }> = ({ icon: Icon, title, rows }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      {title}
    </h3>
    <dl className="space-y-2 text-sm">
      {rows.filter(Boolean).map((row) => {
        const [label, value] = row as [string, React.ReactNode];
        return (
          <div key={label} className="grid grid-cols-1 sm:grid-cols-[minmax(0,180px)_1fr] gap-x-4 gap-y-0.5">
            <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="text-slate-900 dark:text-slate-100 font-medium min-w-0 break-words">{value}</dd>
          </div>
        );
      })}
    </dl>
  </div>
);

export const CertificateDetails: React.FC<{ cert: CertificateRecord }> = ({ cert }) => {
  const { t } = useTranslation('certs');
  const { t: td } = useTranslation('docs');
  const fmt = useCertDate();
  const d = (k: string, o?: Record<string, unknown>) => t(`details.${k}`, o) as string;

  return (
    <div className="space-y-4">
      <div className={cn('rounded-xl border p-4', STATUS_STYLE[cert.status]?.cls)}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <CertificateStatusBadge status={cert.status} className="bg-white/70 dark:bg-slate-900/40" />
          <span className="font-mono text-sm font-semibold" dir="ltr">{cert.certificate_id}</span>
        </div>
        <p className="mt-2 text-sm">{t(`statusHint.${cert.status}`)}</p>
        {cert.status === 'revoked' && (
          <div className="mt-2 text-sm space-y-0.5">
            {cert.revoked_at && <p>{d('revokedOn', { date: fmt(cert.revoked_at) })}</p>}
            {cert.revocation_reason && <p>{d('reason')}: {cert.revocation_reason}</p>}
            {cert.replaced_by_certificate_id && <p>{d('replacedBy', { id: cert.replaced_by_certificate_id })}</p>}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section icon={User} title={d('investor')} rows={[
          [d('investorName'), cert.investor_name],
          [d('investorId'), <span dir="ltr">{cert.investor_id_masked}</span>],
          [d('issueDate'), fmt(cert.issue_date)],
          [d('subscriptionDate'), fmt(cert.subscription_date)],
          !!cert.finalized_at && [d('finalizedAt'), fmt(cert.finalized_at)],
        ]} />
        <Section icon={Building2} title={d('propertySpv')} rows={[
          [d('property'), cert.property_name],
          !!cert.property_location && [d('location'), cert.property_location],
          [d('spv'), cert.spv_name || d('pending')],
          [d('spvRef'), cert.spv_registration_ref ? <Mono value={cert.spv_registration_ref} /> : d('pending')],
          !!cert.spv_jurisdiction && [d('jurisdiction'), cert.spv_jurisdiction],
          !!cert.spv_registry_url && ['', (
            <a href={cert.spv_registry_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />{d('registry')}
            </a>
          )],
        ]} />
        <Section icon={Coins} title={d('investment')} rows={[
          [d('units'), `${cert.units.toLocaleString('en-US')}${cert.total_units ? ` / ${cert.total_units.toLocaleString('en-US')}` : ''}`],
          [d('ownership'), percent(cert.ownership_percentage)],
          [d('unitPrice'), money(cert.unit_price)],
          [d('amount'), money(cert.investment_amount)],
          [d('acquisition'), td(`cert.acq.${cert.acquisition}`, { defaultValue: cert.acquisition }) as string],
        ]} />
        <Section icon={Link2} title={d('onchain')} rows={[
          [d('wallet'), cert.holder_wallet ? <Mono value={cert.holder_wallet} /> : d('pending')],
          [d('contract'), cert.contract_address
            ? <Mono value={cert.contract_address} href={cert.contract_explorer_url || undefined} />
            : d('pendingDeployment')],
          [d('standard'), `${cert.token_standard}${cert.token_id ? ` #${cert.token_id}` : ''}`],
          !!cert.network_name && [d('network'), `${cert.network_name}${cert.chain_id ? ` (${cert.chain_id})` : ''}`],
          !!cert.mint_tx_hash && [d('mintTx'), <Mono value={cert.mint_tx_hash} href={cert.mint_tx_url || undefined} />],
        ]} />
      </div>

      <Section icon={ShieldCheck} title={d('verification')} rows={[
        [d('code'), <Mono value={cert.verification_code} />],
        [d('signature'), <Mono value={cert.digital_signature_hash} />],
        [d('signatory'), cert.authorized_signatory],
      ]} />
    </div>
  );
};

export default CertificateDetails;
