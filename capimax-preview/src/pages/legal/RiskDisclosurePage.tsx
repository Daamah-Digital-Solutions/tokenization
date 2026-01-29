import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const RiskDisclosurePage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Investment Risk Disclosure"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Investing through Capimax RT involves significant risks, including the potential loss of part or all of the invested capital. Prospective investors must carefully review and understand the following non-exhaustive risk factors.
        </p>

        <h2>2.1 Market Risk</h2>
        <p>
          The value of real estate assets may fluctuate due to economic conditions, interest rates, inflation, supply and demand dynamics, and geopolitical events.
        </p>

        <h2>2.2 Liquidity Risk</h2>
        <ul>
          <li>Tokenized investment units may be illiquid.</li>
          <li>The secondary market does not guarantee active trading or buyers.</li>
          <li>Liquidity provider arrangements (if any) are optional, limited, and subject to conditions.</li>
        </ul>

        <h2>2.3 No Guaranteed Exit</h2>
        <p>
          There is no assurance that investors will be able to exit their investments at a desired time or price.
        </p>

        <h2>2.4 Regulatory & Legal Risk</h2>
        <p>Changes in laws, regulations, or enforcement practices may:</p>
        <ul>
          <li>Restrict access to the platform;</li>
          <li>Affect investor eligibility;</li>
          <li>Impact the legality or structure of tokenized offerings.</li>
        </ul>

        <h2>2.5 Operational Risk</h2>
        <p>Risks may arise from:</p>
        <ul>
          <li>Errors or failures by SPVs, property managers, valuation firms, insurers, or payment providers;</li>
          <li>Technology failures, cybersecurity incidents, or data breaches.</li>
        </ul>

        <h2>2.6 Counterparty Risk</h2>
        <p>
          SPVs, developers, or service providers may default, become insolvent, or fail to perform contractual obligations.
        </p>

        <h2>2.7 Valuation Risk</h2>
        <p>
          Valuations are based on assumptions and methodologies that may not reflect future market conditions or realizable prices.
        </p>

        <h2>2.8 Force Majeure</h2>
        <p>
          Events beyond control (natural disasters, pandemics, wars, government actions) may materially impact asset performance.
        </p>

        <p className="legal-emphasis">
          By proceeding, investors acknowledge full understanding and acceptance of these risks.
        </p>
      </section>
    </LegalPageLayout>
  );
};
