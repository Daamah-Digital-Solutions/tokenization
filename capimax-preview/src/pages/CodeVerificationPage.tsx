import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, XCircle, RefreshCw, ArrowLeft, Mail, Info } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/auth/AuthService';
import { useRouter } from '../utils/router';

/**
 * 6-digit email verification (client round 3, #2).
 *
 * "Send a new code" used to call an endpoint that required a login the user
 * couldn't have yet, so it always failed; the page also claimed the code
 * expired in 5 minutes (the server used 15). Now: resend works for
 * unverified users (by email), the code is valid for 30 minutes, resends are
 * spaced by a 60-second cooldown, and Gmail's Spam/Promotions tip is shown.
 */

type VerificationState = 'pending' | 'verifying' | 'success' | 'error';

const CODE_TTL_SECONDS = 30 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

export const CodeVerificationPage: React.FC = () => {
  const { t, i18n } = useTranslation('auth');
  const isAr = (i18n.language || 'en').startsWith('ar');
  const { navigate } = useRouter();
  const { login } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';
  const justResent = urlParams.get('sent') === '1';

  const [state, setState] = useState<VerificationState>('pending');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(
    justResent ? { tone: 'info', text: t('codeVerification.notVerifiedNotice') } : null,
  );
  const [isResending, setIsResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(CODE_TTL_SECONDS);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('register');
  }, [email, navigate]);

  // One ticking clock for both the code validity and the resend cooldown.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpiresIn((s) => Math.max(0, s - 1));
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setDigits = (digits: string) => {
    const next = digits.slice(0, 6).split('');
    while (next.length < 6) next.push('');
    setCode(next);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleInputChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      // Mobile keyboards / SMS autofill paste the whole code into one box.
      setDigits(digits);
      return;
    }
    const next = [...code];
    next[index] = digits;
    setCode(next);
    if (digits && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...code];
      if (code[index]) {
        next[index] = '';
      } else if (index > 0) {
        next[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      }
      setCode(next);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setDigits(e.clipboardData.getData('text').replace(/\D/g, ''));
  };

  const isCodeComplete = code.every((d) => d !== '');

  const handleVerifyCode = async () => {
    if (!isCodeComplete) return;
    try {
      setState('verifying');
      setNotice(null);
      const response = await AuthService.verifyEmailCode(email, code.join(''));
      if (!response.user || !response.token) throw new Error('Invalid response from server');
      setState('success');
      await login(email, '', undefined, {
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
      });
      window.setTimeout(() => navigate('dashboard'), 1500);
    } catch {
      setNotice({ tone: 'error', text: t('codeVerification.invalid') });
      setState('error');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendCode = async () => {
    try {
      setIsResending(true);
      await AuthService.resendEmailVerification(email);
      setNotice({ tone: 'info', text: t('codeVerification.resent') });
      setState('pending');
      setExpiresIn(CODE_TTL_SECONDS);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      if (error?.code === 'RESEND_COOLDOWN') {
        const wait = Number(error?.details?.retry_after) || RESEND_COOLDOWN_SECONDS;
        setCooldown(wait);
        setNotice({ tone: 'error', text: t('codeVerification.cooldown', { seconds: wait }) });
      } else {
        setNotice({ tone: 'error', text: t('codeVerification.sendFailed') });
      }
    } finally {
      setIsResending(false);
    }
  };

  if (state === 'success') {
    return (
      <AuthLayout title={t('codeVerification.title')} subtitle={t('codeVerification.subtitle')}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          dir={isAr ? 'rtl' : 'ltr'}
          className="text-center space-y-5 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
        >
          <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('codeVerification.successTitle')}</h2>
          <p className="text-slate-600 dark:text-slate-400">{t('codeVerification.successMsg')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('codeVerification.redirecting')}</p>
          <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('codeVerification.title')} subtitle={t('codeVerification.subtitle')}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        dir={isAr ? 'rtl' : 'ltr'}
        className="text-center space-y-6 p-5 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
      >
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${state === 'error' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
          {state === 'error' ? <XCircle className="w-10 h-10 text-red-500" /> : <Shield className="w-10 h-10 text-blue-500" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {state === 'error' ? t('codeVerification.failedTitle') : t('codeVerification.heading')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-3">{t('codeVerification.sentTo')}</p>
          <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Mail className="w-4 h-4 text-slate-500 shrink-0" />
            <span dir="ltr" className="font-medium text-slate-700 dark:text-slate-300 break-all">{email}</span>
          </div>
        </div>

        {notice && (
          <div
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={notice.tone === 'error'
              ? 'p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300'
              : 'p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300'}
          >
            {notice.text}
          </div>
        )}

        <div className="space-y-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('codeVerification.enterCode')}
          </label>
          {/* Digits always run left-to-right, also in Arabic. */}
          <div dir="ltr" className="flex justify-center gap-2 sm:gap-3">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                aria-label={`${index + 1}`}
                className="w-11 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all"
                autoComplete="one-time-code"
              />
            ))}
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleVerifyCode}
            disabled={!isCodeComplete || state === 'verifying'}
            isLoading={state === 'verifying'}
            className="w-full"
          >
            {state === 'verifying' ? t('codeVerification.verifying') : t('codeVerification.verify')}
          </Button>
        </div>

        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 text-start">
          <li className="flex gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />{t('codeVerification.tipSpam')}</li>
          <li className="flex gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            {expiresIn > 0 ? t('codeVerification.tipExpires', { time: formatTime(expiresIn) }) : t('codeVerification.tipExpired')}
          </li>
          <li className="flex gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />{t('codeVerification.tipLatest')}</li>
        </ul>

        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleResendCode}
            isLoading={isResending}
            disabled={isResending || cooldown > 0}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 me-2" />
            {cooldown > 0 ? t('codeVerification.resendIn', { time: formatTime(cooldown) }) : t('codeVerification.resend')}
          </Button>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" size="lg" onClick={() => navigate('register')} className="flex-1">
              <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
              {t('codeVerification.back')}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate('login')} className="flex-1">
              {t('codeVerification.signIn')}
            </Button>
          </div>
        </div>
      </motion.div>
    </AuthLayout>
  );
};
