import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { MarketplaceDashboard } from '../components/marketplace/MarketplaceDashboard';

export const MarketplacePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Secondary Market | Capimax - Trade Tokenized Real Estate</title>
        <meta
          name="description"
          content="Trade tokenized real estate on the Capimax secondary market. Buy and sell property tokens, participate in auctions, and access liquidity for your investments."
        />
        <meta name="keywords" content="secondary market, real estate tokens, property trading, tokenization, liquidity" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
        <Navbar />

        <main>
          <MarketplaceDashboard />
        </main>

        <Footer />
      </div>
    </>
  );
};