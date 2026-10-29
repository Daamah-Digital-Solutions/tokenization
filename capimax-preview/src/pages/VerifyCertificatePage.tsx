/**
 * Public certificate verification (client round 4, #5) — the page the QR code
 * on every certificate opens: /verify/<code>. No login. Also reachable as
 * /verify (with a form) from the Verification Center.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Search, SearchX, RefreshCw } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { CertificateDetails, useCertDate } from '../components/certificates/CertificateDetails';
import { CertificateService, type CertificateRecord } from '../services/certificates/CertificateService';

function codeFromUrl(): string {
  const m = window.location.pathname.match(/^\/verify\/([^/]+)\/?$/);
  if (m) return decodeURIComponent(m[1]);
  return new URLSearchParams(window.location.search).get('code') || '';
}

export const CertificateCheckForm: React.FC<{ initial?: string; onSubmit: (code: string) => void; busy?: boolean }> = ({ initial = '', onSubmit, busy }) => {
  const { t } = useTranslation('certs');
  const [code, setCode] = useState(initial);
  useEffect(() => setCode(initial), [initial]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) onSubmit(code.trim());
      }}
      className="flex flex-col sm:flex-row gap-2"
    >
      <label className="sr-only" htmlFor="certificate-code">{t('verify.inputLabel')}</label>
      <input
        id="certificate-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t('verify.placeholder')}
        dir="ltr"
        className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white"
      >
        {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        {busy ? t('verify.checking') : t('verify.submit')}
      </button>
    </form>
  );
};

const VerifyCertificatePage: React.FC = () => {
  const { t } = useTranslation('certs');
  const fmt = useCertDate();
  const [code, setCode] = useState(codeFromUrl());
  const [cert, setCert] = useState<CertificateRecord | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'missing' | 'error'>(code ? 'loading' : 'idle');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const check = (value: string) => {
    setCode(value);
    setState('loading');
    window.history.replaceState(null, '', `/verify/${encodeURIComponent(value)}`);
    CertificateService.verify(value)
      .then((c) => {
        setCert(c);
        setState('found');
        setCheckedAt(new Date());
      })
      .catch((err: any) => {
        setCert(null);
        setState(err?.status === 404 || err?.statusCode === 404 || /not found/i.test(err?.message || '') ? 'missing' : 'error');
      });
  };

  useEffect(() => {
    if (code) check(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900">
      <Navbar />
      <main className="pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t('verify.title')}</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{t('verify.subtitle')}</p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
            <CertificateCheckForm initial={code} onSubmit={check} busy={state === 'loading'} />
          </div>

          {state === 'found' && cert && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 sm:p-6 space-y-4">
              {cert.status !== 'revoked' && (
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />{t('verify.genuine')}
                </p>
              )}
              <CertificateDetails cert={cert} />
              {checkedAt && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  {t('verify.verifiedAt', { date: `${fmt(checkedAt.toISOString())} ${checkedAt.toLocaleTimeString()}` })}
                </p>
              )}
            </div>
          )}

          {state === 'missing' && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 p-8 text-center">
              <SearchX className="w-10 h-10 mx-auto mb-3 text-red-500" />
              <p className="font-semibold text-slate-900 dark:text-white">{t('verify.notFoundTitle')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('verify.notFoundText')}</p>
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 text-center">
              {t('verify.error')}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyCertificatePage;
