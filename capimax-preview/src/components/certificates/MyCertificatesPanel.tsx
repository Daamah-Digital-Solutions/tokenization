/**
 * "My Certificates" (client round 4, #4): one ownership certificate per holding,
 * issued by the backend. View the record, download the official PDF (with the
 * verification QR), copy / open the public verification link.
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award, Download, Eye, Link2, RefreshCw, X, ExternalLink, CheckCircle } from 'lucide-react';
import { CertificateService, type CertificateRecord } from '../../services/certificates/CertificateService';
import { certificateVerifyUrl, downloadCertificatePdf } from '../../utils/pdf/certificatePdf';
import { CertificateDetails, CertificateStatusBadge, money, percent, useCertDate } from './CertificateDetails';

export const MyCertificatesPanel: React.FC = () => {
  const { t } = useTranslation('certs');
  const fmt = useCertDate();
  const [open, setOpen] = useState<CertificateRecord | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => CertificateService.mine(),
    refetchOnMount: 'always',
  });

  const active = useMemo(() => data.filter((c) => c.status !== 'revoked'), [data]);
  const revoked = useMemo(() => data.filter((c) => c.status === 'revoked'), [data]);
  const shown = showRevoked ? [...active, ...revoked] : active;

  const download = async (cert: CertificateRecord) => {
    setBusy(cert.certificate_id);
    setError(null);
    try {
      await downloadCertificatePdf(cert);
    } catch {
      setError(t('mine.pdfError'));
    } finally {
      setBusy(null);
    }
  };

  const copyLink = (cert: CertificateRecord) => {
    navigator.clipboard?.writeText(certificateVerifyUrl(cert)).then(() => {
      setCopied(cert.certificate_id);
      window.setTimeout(() => setCopied(null), 1800);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            {t('mine.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('mine.subtitle')}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={t('mine.refresh')}
          aria-label={t('mine.refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {(error || isError) && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error || t('mine.loadError')}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
          {t('mine.loading')}
        </div>
      ) : !data.length ? (
        <div className="py-16 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <Award className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">{t('mine.emptyTitle')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{t('mine.emptyText')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((cert) => (
            <div
              key={cert.certificate_id}
              className={`rounded-2xl border bg-white dark:bg-slate-800 p-5 flex flex-col gap-4 ${
                cert.status === 'revoked' ? 'border-slate-200 dark:border-slate-700 opacity-75' : 'border-emerald-200/70 dark:border-emerald-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{cert.property_name}</p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5" dir="ltr">{cert.certificate_id}</p>
                </div>
                <CertificateStatusBadge status={cert.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 p-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{cert.units.toLocaleString('en-US')}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('details.units')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 p-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{percent(cert.ownership_percentage)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('details.ownership')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 p-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{money(cert.investment_amount)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('details.amount')}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('mine.issued', { date: fmt(cert.issue_date) })}</p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <button
                  onClick={() => setOpen(cert)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Eye className="w-4 h-4" />{t('mine.view')}
                </button>
                <button
                  onClick={() => download(cert)}
                  disabled={busy === cert.certificate_id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white"
                >
                  <Download className="w-4 h-4" />{busy === cert.certificate_id ? t('mine.downloading') : t('mine.download')}
                </button>
                <button
                  onClick={() => copyLink(cert)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  {copied === cert.certificate_id ? <CheckCircle className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  {copied === cert.certificate_id ? t('mine.copied') : t('mine.copyLink')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {revoked.length > 0 && (
        <button
          onClick={() => setShowRevoked((v) => !v)}
          className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
        >
          {showRevoked ? t('mine.hideRevoked') : t('mine.showRevoked', { count: revoked.length })}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={() => setOpen(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl my-8 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={open.certificate_id}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{open.property_name}</h3>
              <button onClick={() => setOpen(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={t('details.close')}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <CertificateDetails cert={open} />
            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              <a
                href={certificateVerifyUrl(open)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ExternalLink className="w-4 h-4" />{t('mine.openVerify')}
              </a>
              <button
                onClick={() => download(open)}
                disabled={busy === open.certificate_id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-2 text-sm font-medium text-white"
              >
                <Download className="w-4 h-4" />{busy === open.certificate_id ? t('mine.downloading') : t('mine.download')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCertificatesPanel;
