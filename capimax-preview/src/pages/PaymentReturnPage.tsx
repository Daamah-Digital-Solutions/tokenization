/**
 * Where Stripe / NOWPayments send the member back:
 *   /payment-return?purchase=<investment>&payment=<id>[&cancelled=1]
 *   /payment-return?deposit=1&payment=<id>[&cancelled=1]
 *
 * Nothing is confirmed from the redirect itself — the server settles the
 * payment from the provider's webhook (or its own lookup, which each poll
 * here triggers). This page follows it until it is settled.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useRouter } from '../utils/router';
import { PurchaseService } from '../services/purchase/PurchaseService';
import { takePendingPayment } from '../utils/pendingPayment';

const POLL_MS = 3000;
const TIMEOUT_MS = 120_000;

const money = (v: number | string | null | undefined) =>
  `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Outcome = 'pending' | 'done' | 'refunded' | 'credited' | 'failed' | 'slow' | 'cancelled' | 'missing';

export const PaymentReturnPage: React.FC = () => {
  const { t } = useTranslation('checkout');
  const { navigate } = useRouter();
  const queryClient = useQueryClient();

  const [ret] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    const remembered = takePendingPayment();
    return {
      deposit: q.get('deposit') === '1',
      investmentId: q.get('purchase') || remembered?.investmentId || '',
      paymentId: q.get('payment') || remembered?.paymentId || '',
      cancelled: q.get('cancelled') === '1',
    };
  });
  const kind = ret.deposit ? 'deposit' : 'purchase';
  const following = !ret.cancelled && Boolean(ret.paymentId);

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!following) return;
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [following]);

  const { data, isError } = useQuery({
    queryKey: ['payment-return', ret.paymentId, ret.investmentId],
    queryFn: async () => {
      const [purchase, payment] = await Promise.all([
        ret.investmentId ? PurchaseService.status(ret.investmentId) : Promise.resolve(null),
        PurchaseService.paymentStatus(ret.paymentId),
      ]);
      return { purchase, payment };
    },
    enabled: following,
    refetchInterval: (query) => {
      const status = query.state.data?.payment?.status;
      return (status && status !== 'pending') || timedOut ? false : POLL_MS;
    },
    retry: false,
  });

  const payment = data?.payment;
  const purchase = data?.purchase;
  const credited = Number(payment?.credited || 0);
  let outcome: Outcome = 'pending';
  if (ret.cancelled) outcome = 'cancelled';
  else if (!following || isError) outcome = 'missing';
  else if (payment && payment.status === 'completed') outcome = purchase?.status === 'refunded' ? 'refunded' : 'done';
  else if (payment && payment.status !== 'pending') outcome = credited > 0 ? 'credited' : 'failed';
  else if (timedOut) outcome = 'slow';

  useEffect(() => {
    if (outcome === 'done' || outcome === 'refunded' || outcome === 'credited') {
      ['wallet-balance', 'investments', 'portfolio', 'notifications'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
    }
  }, [outcome]);

  const values = {
    count: purchase?.shares ?? 0,
    title: purchase?.property_title ?? '',
    amount: money(outcome === 'credited' ? credited : purchase?.total ?? payment?.amount),
    due: money(payment?.amount),
  };

  const tone =
    outcome === 'done'
      ? { icon: <CheckCircle2 className="w-12 h-12 text-emerald-600" />, ring: 'border-emerald-200 dark:border-emerald-800' }
      : outcome === 'failed' || outcome === 'missing'
        ? { icon: <XCircle className="w-12 h-12 text-red-500" />, ring: 'border-red-200 dark:border-red-800' }
        : outcome === 'pending'
          ? { icon: <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />, ring: 'border-slate-200 dark:border-slate-700' }
          : { icon: <AlertCircle className="w-12 h-12 text-amber-500" />, ring: 'border-amber-200 dark:border-amber-800' };

  const primary =
    'rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 transition-colors';
  const secondary =
    'rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-32 pb-20">
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${tone.ring} shadow-sm p-8 text-center`} data-testid="payment-return">
          <div className="flex justify-center mb-4">{tone.icon}</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t(`return.${kind}.${outcome}.title`, values)}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t(`return.${kind}.${outcome}.body`, values)}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {kind === 'purchase' ? (
              <button type="button" className={primary} onClick={() => navigate('dashboard', { view: 'portfolio' })}>
                {t('goPortfolio')}
              </button>
            ) : (
              <button type="button" className={primary} onClick={() => navigate('dashboard', { view: 'wallet' })}>
                {t('return.goWallet')}
              </button>
            )}
            <button type="button" className={secondary} onClick={() => navigate('properties')}>
              {t('return.browse')}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentReturnPage;
