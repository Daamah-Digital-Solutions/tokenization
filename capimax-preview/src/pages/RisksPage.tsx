import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const RisksPage: React.FC = () => {
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title="Ownership Risks & Owner Disclosures"
      subtitle="Understanding ownership risks and platform commitments"
    >
      <section className="info-section">
        <p className="info-intro">
          This section aims to raise awareness and protect both owners and the platform through clear disclosures.
        </p>

        <h2>Key Risk Categories</h2>

        <h3>Market and Valuation Risk</h3>
        <p>
          The value of real estate assets may fluctuate due to economic conditions, interest rates, inflation, supply and demand dynamics, and geopolitical events.
        </p>

        <h3>Liquidity Risk</h3>
        <p>
          Tokenized ownership units may be illiquid. The secondary market does not guarantee active trading or buyers. Liquidity provider arrangements (if any) are optional, limited, and subject to conditions.
        </p>

        <h3>Operational and Management Risk</h3>
        <p>
          Risks may arise from errors or failures by SPVs, property managers, valuation firms, insurers, or payment providers. Technology failures, cybersecurity incidents, or data breaches may also occur.
        </p>

        <h3>Regulatory and Legal Risk</h3>
        <p>
          Changes in laws, regulations, or enforcement practices may restrict access to the platform, affect owner eligibility, or impact the legality or structure of tokenized offerings.
        </p>

        <h3>Counterparty Risk</h3>
        <p>
          SPVs, developers, or service providers may default, become insolvent, or fail to perform contractual obligations.
        </p>

        <h3>Force Majeure Events</h3>
        <p>
          Events beyond control such as natural disasters, pandemics, wars, and government actions may materially impact asset performance.
        </p>

        <div className="info-warning">
          <strong>Ownership Warning:</strong> All real estate ownership involves risk, including the potential loss of part or all of the capital used to purchase. Prospective owners must carefully review and understand all risk factors before making any purchase decision.
        </div>

        <h2>Capimax RT Commitment</h2>
        <ul className="check-list">
          <li>Full disclosure of risks and material information</li>
          <li>No performance promises or guarantees</li>
          <li>No misleading marketing or advertising</li>
          <li>Owner education and transparency</li>
        </ul>

        <h2>Related Resources</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/legal/risk-disclosure')}>
            Full Risk Disclosure
          </button>
          <button className="link-button" onClick={() => navigateToPage('/legal/disclaimer')}>
            Platform Disclaimer
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/faq')}>
            FAQ
          </button>
        </div>
      </section>
    </InfoPageLayout>
  );
};
