/**
 * Buying shares for cash, the PropShare way.
 *
 *   1. shares + payment method → the server's quote (shares, platform fee,
 *      Pronova discount, total) — nothing is priced here;
 *   2. a confirm step with the same numbers;
 *   3. the wallet pays at once; card / Apple Pay / Google Pay / Pronova /
 *      crypto go to the provider's secure page (the shares are held 30
 *      minutes and confirmed only by the provider); bank transfer and Nova
 *      Sukuk ask for the document, and the shares stay held until our team
 *      reviews it.
 *
 * Installment plans keep their own flow (InvestmentFlow).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, Minus, Plus, ShieldCheck, Upload, X } from 'lucide-react';
import { PaymentMethodList, usePaymentOptions } from './PaymentMethodList';
import { PurchaseService, type Purchase, type PurchaseQuote } from '../../services/purchase/PurchaseService';
import { PaymentService } from '../../services/payment/PaymentService';
import { apiClient } from '../../services/api/ApiClient';
import { payMethod, methodLive, type PayMethodId } from '../../utils/paymentMethods';
import { rememberPendingPurchase } from '../../utils/pendingPayment';
import { cn } from '../../utils/cn';

interface PlatformBankAccount {
  id: string;
  label?: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  bank_address?: string;
  bank_country?: string;
  currency?: string;
}

interface Props {
  property: { id: string; title: string; token_price: number | string; tokens_available?: number };
  initialShares?: number;
  onClose: () => void;
  /** On closing, after a purchase completed or was sent for review (refresh the property). */
  onComplete?: () => void;
  onGoToPortfolio?: () => void;
}

type Step = 'form' | 'confirm' | 'proof' | 'done' | 'submitted';

const money = (v: number | string | null | undefined) =>
  `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The server's reason, in the member's language when we know the code. */
export function purchaseErrorText(t: (k: string, o?: any) => string, e: any): string {
  const code = e?.code as string | undefined;
  const d = e?.details || {};
  switch (code) {
    case 'AMOUNT_TOO_LOW':
      return t('errors.AMOUNT_TOO_LOW', { amount: money(d.minimum_amount), count: d.minimum_shares });
    case 'PRICE_CHANGED':
    case 'INSUFFICIENT_FUNDS':
    case 'INSUFFICIENT_SHARES':
    case 'PROPERTY_NOT_OPEN':
    case 'INSTALLMENTS_ONLY':
    case 'PAYMENTS_NOT_CONFIGURED':
    case 'KYC_REQUIRED':
    case 'PDF_REQUIRED':
    case 'FILE_TOO_LARGE':
    case 'FILE_REQUIRED':
    case 'NOT_ENOUGH_RETURNS':
      return t(`errors.${code}`);
    default:
      return e?.message || t('errors.generic');
  }
}

export const PurchaseModal: React.FC<Props> = ({ property, initialShares = 1, onClose, onComplete, onGoToPortfolio }) => {
  const { t } = useTranslation('checkout');
  const queryClient = useQueryClient();
  const unitPrice = Number(property.token_price) || 0;
  const maxShares = property.tokens_available && property.tokens_available > 0 ? property.tokens_available : undefined;

  const [shares, setShares] = useState(Math.max(1, initialShares));
  const [methodId, setMethodId] = useState<PayMethodId>('wallet');
  const [coin, setCoin] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  // one key per confirmed purchase: a double click or a retry never buys twice
  const idempotencyKey = useRef(PurchaseService.newIdempotencyKey());
  // Refresh the page behind only once this closes: reloading the property
  // while it is open would remount it and lose the confirmation.
  const finished = useRef(false);
  const close = () => {
    onClose();
    if (finished.current) onComplete?.();
  };

  const method = payMethod(methodId);
  const amount = (shares * unitPrice).toFixed(2);

  const { data: options } = usePaymentOptions();
  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => PaymentService.getWalletBalance(),
  });
  const walletBalance = walletData
    ? Number(walletData.total_value_usd) ||
      (walletData.balances || []).reduce((s: number, b: any) => s + (Number(b.available_balance) || 0), 0)
    : undefined;

  // If the default (wallet) is not live, move to the first method that is.
  useEffect(() => {
    if (!options || methodId === 'reinvest') return;
    if (!methodLive(options.methods, method)) {
      const first = (['card', 'crypto', 'bank', 'nova_sukuk'] as PayMethodId[]).find((id) =>
        methodLive(options.methods, payMethod(id)),
      );
      if (first) setMethodId(first);
    }
  }, [options]);

  // Rental returns can be reinvested at a discount (PropShare model).
  const { data: reinvest } = useQuery({
    queryKey: ['reinvest'],
    queryFn: () => PurchaseService.reinvest(),
    refetchOnMount: 'always',
  });
  const returns = Number(reinvest?.returns || 0);

  const quoteQuery = useQuery<PurchaseQuote>({
    queryKey: ['purchase-quote', property.id, amount, method.apiMethod],
    queryFn: () => PurchaseService.quote(property.id, amount, method.apiMethod),
    enabled: shares > 0 && unitPrice > 0,
    placeholderData: (prev) => prev,
    retry: false,
  });
  const quote = quoteQuery.data;
  const quoteError = quoteQuery.error ? purchaseErrorText(t, quoteQuery.error) : null;

  const { data: coins = [] } = useQuery({
    queryKey: ['crypto-coins'],
    queryFn: () => PurchaseService.coins(),
    enabled: method.apiMethod === 'crypto',
    staleTime: 600_000,
  });
  const popular = useMemo(() => {
    const first = ['usdttrc20', 'usdterc20', 'usdc', 'btc', 'eth', 'bnbbsc', 'trx', 'ltc', 'sol'];
    return [...first.filter((c) => coins.includes(c)), ...coins.filter((c) => !first.includes(c))];
  }, [coins]);
  useEffect(() => {
    if (method.apiMethod === 'crypto' && !coin && popular.length) setCoin(popular[0]);
  }, [method.apiMethod, popular]);
  const { data: minimum } = useQuery({
    queryKey: ['crypto-minimum', coin],
    queryFn: () => PurchaseService.minimum(coin),
    enabled: method.apiMethod === 'crypto' && Boolean(coin),
    staleTime: 300_000,
  });
  const belowCoinMinimum =
    method.apiMethod === 'crypto' && minimum?.minimum_usd != null && quote && Number(quote.total) < Number(minimum.minimum_usd);

  const total = quote ? Number(quote.total) : undefined;
  const walletShort = methodId === 'wallet' && walletBalance !== undefined && total !== undefined && walletBalance < total;
  const canReview =
    Boolean(quote) && !quoteError && !quoteQuery.isFetching && !walletShort && !belowCoinMinimum &&
    (method.apiMethod !== 'crypto' || Boolean(coin));

  const kind: 'done' | 'checkout' | 'review' =
    method.apiMethod === 'wallet' || method.apiMethod === 'reinvest' ? 'done' : method.apiMethod === 'bank' || method.apiMethod === 'nova_sukuk' ? 'review' : 'checkout';

  const setSharesSafe = (n: number) => {
    const v = Math.max(1, Math.floor(n || 1));
    setShares(maxShares ? Math.min(v, maxShares) : v);
    setError(null);
  };

  const refreshAfter = () => {
    ['wallet-balance', 'investments', 'portfolio', 'purchase-quote'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    );
  };

  const confirm = async () => {
    if (!quote) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await PurchaseService.create(
        {
          property_id: property.id,
          amount,
          method: method.apiMethod,
          expected_unit_price: quote.unit_price,
          ...(method.apiMethod === 'crypto' && coin ? { pay_currency: coin } : {}),
        },
        idempotencyKey.current,
      );
      setPurchase(res);
      if (res.next === 'checkout' && res.checkout_url) {
        if (res.payment_id) rememberPendingPurchase(res.investment_id, res.payment_id);
        window.location.assign(res.checkout_url);
        return; // leaving for the provider's page
      }
      if (res.next === 'review') {
        setStep('proof');
      } else {
        setStep('done');
        refreshAfter();
        finished.current = true;
      }
    } catch (e: any) {
      if (e?.code === 'PRICE_CHANGED') {
        setStep('form');
        quoteQuery.refetch();
      }
      // a new attempt after a refusal is a new purchase
      idempotencyKey.current = PurchaseService.newIdempotencyKey();
      setError(purchaseErrorText(t, e));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- proof step (bank transfer / Nova Sukuk) ----
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [bankAccounts, setBankAccounts] = useState<PlatformBankAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  useEffect(() => {
    if (step !== 'proof' || method.apiMethod !== 'bank' || bankAccounts.length) return;
    apiClient
      .get<{ accounts: PlatformBankAccount[] }>('/payments/wallet/bank-accounts/')
      .then((res) => {
        const list = res?.accounts || [];
        setBankAccounts(list);
        if (list[0]) setAccountId(list[0].id);
      })
      .catch(() => undefined);
  }, [step, method.apiMethod]);
  const account = bankAccounts.find((a) => a.id === accountId);

  const submitProof = async () => {
    if (!purchase || !file) {
      setError(t('errors.FILE_REQUIRED'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await PurchaseService.submitProof(purchase.investment_id, file, {
        reference: reference.trim(),
        ...(account ? { bank_name: account.bank_name } : {}),
      });
      setPurchase(res);
      setStep('submitted');
      refreshAfter();
      finished.current = true;
    } catch (e: any) {
      setError(purchaseErrorText(t, e));
    } finally {
      setSubmitting(false);
    }
  };

  const Row: React.FC<{ label: string; value: string; strong?: boolean; tone?: 'green' }> = ({ label, value, strong, tone }) => (
    <div className={cn('flex items-center justify-between py-1.5 text-sm', strong && 'pt-2.5 mt-1 border-t border-slate-200 dark:border-slate-700')}>
      <span className={cn('text-slate-600 dark:text-slate-400', strong && 'font-semibold text-slate-900 dark:text-white')}>{label}</span>
      <span
        className={cn(
          'font-medium text-slate-900 dark:text-white tabular-nums',
          strong && 'text-base font-bold',
          tone === 'green' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </span>
    </div>
  );

  const breakdown = quote && (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-4 py-2" data-testid="purchase-breakdown">
      <Row label={t('breakdown.shares', { count: quote.shares, price: money(quote.unit_price) })} value={money(quote.subtotal)} />
      {Number(quote.platform_fee_pct) > 0 && (
        <Row label={t('breakdown.fee', { pct: Number(quote.platform_fee_pct) })} value={money(quote.platform_fee)} />
      )}
      {Number(quote.discount) > 0 && (
        <Row label={t(method.apiMethod === 'reinvest' ? 'breakdown.reinvestDiscount' : 'breakdown.discount', { pct: Number(quote.discount_pct) })} value={`−${money(quote.discount)}`} tone="green" />
      )}
      <Row label={t('breakdown.total')} value={money(quote.total)} strong />
    </div>
  );

  const errorBox = error && (
    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300" role="alert">
      {error}
    </div>
  );

  const primary =
    'w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-4 py-3 transition-colors flex items-center justify-center gap-2';
  const secondary =
    'w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200';
  const inputClass =
    'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {step === 'confirm' ? t('confirm.title') : step === 'proof' ? t(`proof.${method.apiMethod}.title`) : t('title')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{property.title}</p>
          </div>
          <button type="button" onClick={close} aria-label={t('close')} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'form' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('shares')}</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSharesSafe(shares - 1)} className="p-2 rounded-lg border border-slate-300 dark:border-slate-600" aria-label={t('less')}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxShares}
                    value={shares}
                    onChange={(e) => setSharesSafe(Number(e.target.value))}
                    className={cn(inputClass, 'text-center')}
                    data-testid="purchase-shares"
                  />
                  <button type="button" onClick={() => setSharesSafe(shares + 1)} className="p-2 rounded-lg border border-slate-300 dark:border-slate-600" aria-label={t('more')}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('pricePerShare', { price: money(unitPrice) })}
                  {maxShares ? ` · ${t('available', { n: maxShares.toLocaleString() })}` : ''}
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('howYouPay')}</div>
                {returns > 0 && (
                  <button
                    type="button"
                    data-method="reinvest"
                    aria-pressed={methodId === 'reinvest'}
                    onClick={() => { setMethodId('reinvest'); setError(null); }}
                    className={cn(
                      'w-full mb-2 flex items-center justify-between gap-3 p-3.5 rounded-xl border text-start transition-colors',
                      methodId === 'reinvest'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{t('methods.reinvest.label')}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t('methods.reinvest.description', { amount: money(returns), pct: Number(reinvest?.discount_pct || 0) })}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-full shrink-0">
                      {t('methods.off', { pct: Number(reinvest?.discount_pct || 0) })}
                    </span>
                  </button>
                )}
                <PaymentMethodList value={methodId} onChange={(id) => { setMethodId(id); setError(null); }} walletBalance={walletBalance} total={total} />
              </div>

              {method.apiMethod === 'crypto' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('coin')}</label>
                  <select value={coin} onChange={(e) => setCoin(e.target.value)} className={inputClass} data-testid="purchase-coin">
                    {popular.map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                  {minimum?.minimum_usd != null && (
                    <p className={cn('text-xs mt-1', belowCoinMinimum ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400')}>
                      {t(belowCoinMinimum ? 'coinBelowMinimum' : 'coinMinimum', { amount: money(minimum.minimum_usd) })}
                    </p>
                  )}
                </div>
              )}

              {quoteQuery.isLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
              ) : quoteError ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                  {quoteError}
                </div>
              ) : (
                breakdown
              )}

              {walletShort && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{t('errors.INSUFFICIENT_FUNDS')}</p>
              )}
              {errorBox}

              <button type="button" className={primary} disabled={!canReview} onClick={() => { setError(null); setStep('confirm'); }} data-testid="purchase-review">
                {t('review')}
              </button>
            </>
          )}

          {step === 'confirm' && quote && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t('confirm.method')}</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {t(`methods.${methodId}.label`)}
                  {method.apiMethod === 'crypto' && coin ? ` · ${coin.toUpperCase()}` : ''}
                </span>
              </div>
              {breakdown}
              <p className="text-xs text-slate-500 dark:text-slate-400 flex gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{t(`confirm.note.${kind}`)}</span>
              </p>
              {errorBox}
              <button type="button" className={primary} disabled={submitting} onClick={confirm} data-testid="purchase-confirm">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t(`confirm.button.${kind}`)}
              </button>
              <button type="button" className={secondary} disabled={submitting} onClick={() => setStep('form')}>
                {t('back')}
              </button>
            </>
          )}

          {step === 'proof' && purchase && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t(`proof.${method.apiMethod}.intro`, { amount: money(purchase.total), count: purchase.shares })}
              </p>
              {method.apiMethod === 'bank' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-1">
                  {bankAccounts.length > 1 && (
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={cn(inputClass, 'mb-2')}>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{(a.label || a.bank_name) + (a.currency ? ` (${a.currency})` : '')}</option>
                      ))}
                    </select>
                  )}
                  {account ? (
                    [
                      ['accountHolder', account.account_holder_name],
                      ['bank', account.bank_name],
                      ['account', account.account_number],
                      ['swift', account.swift_code],
                      ['routing', account.routing_number],
                      ['bankAddress', account.bank_address],
                      ['currency', account.currency],
                    ]
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">{t(`proof.bank.${k}`)}</span>
                          <span className="font-medium text-slate-900 dark:text-white break-all text-end">{v}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-slate-500"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t(`proof.${method.apiMethod}.reference`)}
                </label>
                <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} maxLength={100} />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:border-emerald-400">
                <Upload className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                  {file ? file.name : t(`proof.${method.apiMethod}.file`)}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept={method.apiMethod === 'nova_sukuk' ? 'application/pdf' : 'application/pdf,image/*'}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  data-testid="purchase-proof-file"
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('proof.held')}</p>
              {errorBox}
              <button type="button" className={primary} disabled={submitting || !file} onClick={submitProof}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('proof.submit')}
              </button>
              <button type="button" className={secondary} onClick={close}>{t('proof.later')}</button>
            </>
          )}

          {(step === 'done' || step === 'submitted') && purchase && (
            <>
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {step === 'done' ? t('done.title') : t('submitted.title')}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {step === 'done'
                    ? t('done.body', { count: purchase.shares, title: purchase.property_title, amount: money(purchase.total) })
                    : t('submitted.body', { ref: purchase.reference || '' })}
                </p>
              </div>
              {onGoToPortfolio && (
                <button type="button" className={primary} onClick={onGoToPortfolio}>{t('goPortfolio')}</button>
              )}
              <button type="button" className={secondary} onClick={close}>{t('close')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseModal;
