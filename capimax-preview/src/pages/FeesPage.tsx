/**
 * Fees — every fee and discount of the platform, with the rates the admin
 * set (PropShare model). Read live from /purchases/methods/, so the page
 * never disagrees with what is actually charged.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { usePaymentOptions } from '../components/purchase/PaymentMethodList';

type Row = { key: string; rate: string | null };

export const FeesPage: React.FC = () => {
  const { t } = useTranslation('checkout');
  const { data, isLoading } = usePaymentOptions();
  const fees = data?.fees;
  const pct = (v?: string) => (v == null ? '…' : `${Number(v)}%`);

  const rows: Row[] = [
    { key: 'purchase', rate: pct(fees?.platform_fee_pct) },
    { key: 'installment', rate: pct(fees?.installment_fee_pct) },
    { key: 'resale', rate: pct(fees?.secondary_resale_fee_pct) },
    { key: 'management', rate: fees ? `${Number(fees.management_fee_pct)}% / ${t('fees.year')}` : '…' },
    { key: 'pronova', rate: fees ? `−${Number(fees.pronova_discount_pct)}%` : '…' },
    { key: 'reinvest', rate: fees ? `−${Number(fees.reinvest_discount_pct)}%` : '…' },
    { key: 'late', rate: t('fees.none') },
    { key: 'withdrawal', rate: t('fees.none') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      <Helmet>
        <title>{t('fees.title')} — Capimax RT</title>
      </Helmet>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('fees.title')}</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-8">{t('fees.intro')}</p>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto" data-testid="fees-table">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-start font-medium px-4 py-3">{t('fees.cols.fee')}</th>
                <th className="text-start font-medium px-4 py-3">{t('fees.cols.rate')}</th>
                <th className="text-start font-medium px-4 py-3">{t('fees.cols.who')}</th>
                <th className="text-start font-medium px-4 py-3">{t('fees.cols.when')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t(`fees.rows.${r.key}.name`)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap" dir="ltr">
                    {isLoading ? '…' : r.rate}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t(`fees.rows.${r.key}.who`)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t(`fees.rows.${r.key}.when`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">{t('fees.note')}</p>
      </main>
      <Footer />
    </div>
  );
};

export default FeesPage;
