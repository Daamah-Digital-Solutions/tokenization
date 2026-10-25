import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { KYCService } from '../../services/user/KYCService';
import { kycErrorMessage } from './kycErrors';

/**
 * Sumsub WebSDK host (used when the backend reports provider = 'sumsub').
 * The SDK handles document capture, selfie / liveness and the camera
 * preview; Sumsub's webhook then updates the KYC status on our backend.
 * Docs: https://docs.sumsub.com/docs/get-started-with-web-sdk
 */

const SDK_URL = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';

declare global {
  interface Window {
    snsWebSdk?: any;
  }
}

let sdkPromise: Promise<void> | null = null;
const loadSdk = (): Promise<void> => {
  if (window.snsWebSdk) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        sdkPromise = null;
        reject(new Error('Sumsub SDK failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
};

interface SumsubVerificationProps {
  /** Called when the applicant submits or Sumsub reports a status change. */
  onStatusChange: () => void;
}

export const SumsubVerification: React.FC<SumsubVerificationProps> = ({ onStatusChange }) => {
  const { t, i18n } = useTranslation('kyc');
  const containerId = 'sumsub-websdk-container';
  const [state, setState] = useState<'loading' | 'ready' | 'submitted' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setError(null);

    (async () => {
      try {
        const [token] = await Promise.all([KYCService.getSumsubToken(), loadSdk()]);
        if (cancelled || !window.snsWebSdk) return;
        instanceRef.current = window.snsWebSdk
          .init(token, () => KYCService.getSumsubToken())
          .withConf({ lang: (i18n.language || 'en').startsWith('ar') ? 'ar' : 'en' })
          .withOptions({ addViewportTag: false, adaptIframeHeight: true })
          .on('idCheck.onApplicantSubmitted', () => {
            setState('submitted');
            onStatusChange();
          })
          .on('idCheck.onApplicantStatusChanged', () => onStatusChange())
          .on('idCheck.onError', () => setState('error'))
          .build();
        instanceRef.current.launch(`#${containerId}`);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(kycErrorMessage(t, err, i18n.language) || t('sumsub.error'));
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
      try {
        instanceRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, i18n.language]);

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 sm:p-8">
      <div className="flex items-start gap-3 mb-5">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('sumsub.title')}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('sumsub.desc')}</p>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-600 dark:text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          {t('sumsub.loading')}
        </div>
      )}

      {state === 'error' && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error || t('sumsub.error')}
          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAttempt((a) => a + 1)}>
            {t('page.retry')}
          </Button>
        </div>
      )}

      {state === 'submitted' && (
        <p className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-800 dark:text-emerald-200">
          {t('sumsub.submitted')}
        </p>
      )}

      <div id={containerId} className={state === 'loading' || state === 'error' ? 'hidden' : ''} />
    </div>
  );
};

export default SumsubVerification;
