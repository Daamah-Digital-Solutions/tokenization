import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SecondaryMarketDashboard } from '../components/marketplace/SecondaryMarketDashboard';

export const MarketplacePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Secondary Market | Capimax - Trading Platform</title>
        <meta
          name="description"
          content="Trade property tokens on the Capimax secondary market. Buy and sell real estate tokens with instant settlement."
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