import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const TokenizationPage: React.FC = () => {
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title="What Is Real Estate Tokenization?"
      subtitle="An educational explanation in plain, non-technical language"
    >
      <section className="info-section">
        <p className="info-intro">
          This section provides an educational explanation of real estate tokenization in plain, non-technical language for general users.
        </p>

        <h2>Definition</h2>
        <p>
          Real estate tokenization is a method of digitally representing economic participation rights in a real estate asset through structured investment units, allowing multiple investors to participate in a single asset without direct ownership of the physical property.
        </p>

        <h2>What Tokenization Enables</h2>
        <ul className="check-list">
          <li>Fractional investment access</li>
          <li>Lower capital entry thresholds</li>
          <li>Broader investor participation</li>
          <li>Improved transparency and record-keeping</li>
          <li>Organized secondary market trading</li>
        </ul>

        <h2>What Tokenization Does NOT Mean</h2>
        <ul className="cross-list">
          <li>It does not guarantee profits or income</li>
          <li>It does not eliminate investment risk</li>
          <li>It does not automatically confer land registry ownership</li>
          <li>It does not ensure immediate liquidity</li>
        </ul>

        <h2>Why Tokenization via Capimax RT</h2>
        <p>
          Capimax RT applies tokenization only within:
        </p>
        <ul>
          <li>Legally established SPVs</li>
          <li>Clearly defined contractual rights</li>
          <li>Full documentation and disclosures</li>
          <li>Structured compliance and governance</li>
        </ul>

        <div className="info-warning">
          Tokenization does not eliminate investment risks. All investments involve risk, including the potential loss of principal. Please review our Risk Disclosures before investing.
        </div>

        <h2>Learn More</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            What is SPV
          </button>
          <button className="link-button" onClick={() => navigateToPage('/how-it-works')}>
            How It Works
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            Risk Disclosures
          </button>
        </div>
      </section>
    </InfoPageLayout>
  );
};
