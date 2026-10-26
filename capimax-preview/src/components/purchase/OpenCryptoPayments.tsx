import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bitcoin, ExternalLink } from 'lucide-react';
import { PurchaseService } from '../../services/purchase/PurchaseService';
import { rememberPendingPurchase } from '../../utils/pendingPayment';

/** Crypto payments started in the last 24 h and not finished — open their NOWPayments page again. */
export const OpenCryptoPayments: React.FC = () => {
  const { t, i18n } = useTranslation('checkout');
  const { data: open = [] } = useQuery({
    queryKey: ['crypto-open'],
    queryFn: () => PurchaseService.openCrypto(),
    refetchInterval: 60_000,
  });
  if (!open.length) return null;
  const when = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4" data-testid="open-crypto">
      <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200 mb-2">
        <Bitcoin className="w-4 h-4" />
        {t('openCrypto.title')}
      </div>
      <ul className="space-y-2">
        {open.map((p) => (
          <li key={p.payment_id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-amber-900 dark:text-amber-100">
              {t('openCrypto.body', {
                amount: `$${Number(p.amount).toFixed(2)}`,
                what: p.property_title ? t('openCrypto.purchase', { title: p.property_title }) : t('openCrypto.deposit'),
                when: when(p.created_at),
              })}
            </span>
            <a
              href={p.checkout_url}
              onClick={() => rememberPendingPurchase(undefined, p.payment_id)}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-medium"
            >
              {t('openCrypto.resume')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OpenCryptoPayments;
