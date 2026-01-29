import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const RiskDisclosurePage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Investment Risk Disclosure"
      lastUpdated="January 2026"
    >
      <section>
        <h2>Important Notice</h2>
        <p>
          Investing through Capimax RT involves significant risks, including the potential
          loss of part or all of the invested capital. Prospective investors must carefully
          review and understand the following non-exhaustive risk factors before making
          any investment decision.
        </p>
      </section>

      <section>
        <h2>2.1 Market Risk</h2>
        <p>
          The value of real estate assets may fluctuate due to economic conditions, interest
          rates, inflation, supply and demand dynamics, and geopolitical events. Property
          values can decrease significantly, and there is no guarantee that investments will
          appreciate or even maintain their original value.
        </p>
      </section>

      <section>
        <h2>2.2 Liquidity Risk</h2>
        <ul>
          <li>Tokenized investment units may be illiquid.</li>
          <li>The secondary market does not guarantee active trading or buyers.</li>
          <li>Liquidity provider arrangements (if any) are optional, limited, and subject to conditions.</li>
          <li>Investors may not be able to sell their investment units when desired.</li>
          <li>There may be significant waiting periods for exit opportunities.</li>
        </ul>
      </section>

      <section>
        <h2>2.3 No Guaranteed Exit</h2>
        <p>
          There is no assurance that investors will be able to exit their investments at
          a desired time or price. Exit opportunities depend on market conditions, buyer
          availability, and platform operations.
        </p>
      </section>

      <section>
        <h2>2.4 Regulatory & Legal Risk</h2>
        <p>Changes in laws, regulations, or enforcement practices may:</p>
        <ul>
          <li>Restrict access to the platform;</li>
          <li>Affect investor eligibility;</li>
          <li>Impact the legality or structure of tokenized offerings;</li>
          <li>Require changes to investment terms or structures;</li>
          <li>Result in additional compliance costs or requirements.</li>
        </ul>
      </section>

      <section>
        <h2>2.5 Operational Risk</h2>
        <p>Risks may arise from:</p>
        <ul>
          <li>Errors or failures by SPVs, property managers, valuation firms, insurers, or payment providers;</li>
          <li>Technology failures, cybersecurity incidents, or data breaches;</li>
          <li>Administrative errors or miscommunications;</li>
          <li>Platform downtime or maintenance periods;</li>
          <li>Changes in service provider relationships.</li>
        </ul>
      </section>

      <section>
        <h2>2.6 Counterparty Risk</h2>
        <p>
          SPVs, developers, property managers, or other service providers may default,
          become insolvent, or fail to perform contractual obligations. Such failures
          could result in delays, reduced distributions, or loss of invested capital.
        </p>
      </section>

      <section>
        <h2>2.7 Valuation Risk</h2>
        <p>
          Valuations are based on assumptions and methodologies that may not reflect future
          market conditions or realizable prices. Property valuations can change significantly
          over time, and actual sale prices may differ materially from appraised values.
        </p>
      </section>

      <section>
        <h2>2.8 Income and Distribution Risk</h2>
        <ul>
          <li>Rental income and distributions are not guaranteed;</li>
          <li>Income may vary based on occupancy rates, tenant defaults, and market conditions;</li>
          <li>Distributions may be delayed or suspended;</li>
          <li>Operating costs may exceed expectations, reducing distributable income.</li>
        </ul>
      </section>

      <section>
        <h2>2.9 Development and Construction Risk</h2>
        <p>For properties under development:</p>
        <ul>
          <li>Construction delays may occur;</li>
          <li>Costs may exceed budgets;</li>
          <li>Projects may not be completed;</li>
          <li>Final property values may differ from projections;</li>
          <li>Regulatory approvals may not be obtained.</li>
        </ul>
      </section>

      <section>
        <h2>2.10 Currency and Cross-Border Risk</h2>
        <p>
          Investments may involve exposure to foreign currencies and jurisdictions.
          Exchange rate fluctuations, cross-border tax implications, and varying legal
          frameworks may impact investment returns.
        </p>
      </section>

      <section>
        <h2>2.11 Force Majeure</h2>
        <p>
          Events beyond control (natural disasters, pandemics, wars, civil unrest, government
          actions) may materially impact asset performance, platform operations, or investor
          returns. Such events are unpredictable and may result in significant losses.
        </p>
      </section>

      <section>
        <h2>2.12 Concentration Risk</h2>
        <p>
          Investing in a single property or limited number of properties may result in
          higher risk compared to diversified portfolios. Investors should consider their
          overall portfolio allocation carefully.
        </p>
      </section>

      <section>
        <h2>Acknowledgment</h2>
        <p>
          <strong>
            By proceeding with any investment through Capimax RT, investors acknowledge
            full understanding and acceptance of these risks. Investors confirm that they
            have read and understood this Risk Disclosure, have sought independent
            professional advice where appropriate, and accept that they may lose part
            or all of their invested capital.
          </strong>
        </p>
      </section>
    </LegalPageLayout>
  );
};
