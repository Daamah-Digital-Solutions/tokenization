import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SecondaryMarketDashboard } from '../components/marketplace/SecondaryMarketDashboard';
import { useTranslation } from 'react-i18next';

export const MarketplacePage: React.FC = () => {
  const { t } = useTranslation('market');
  return (
    <>
      <Helmet>
        <title>{t('page.metaTitle')}</title>
        <meta
          name="description"
          content={t('page.metaDescription')}
        />
        <meta name="keywords" content="secondary market, property trading, real estate tokens, token trading" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="pt-16">
          <SecondaryMarketDashboard />
        </main>
        <Footer />
      </div>
    </>
  );
};