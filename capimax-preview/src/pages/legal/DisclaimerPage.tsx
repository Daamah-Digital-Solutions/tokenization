import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const DisclaimerPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Platform Disclaimer"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT is a technology-based platform designed to facilitate the structuring, presentation, and administration of tokenized real estate ownership opportunities through Special Purpose Vehicles (SPVs).
        </p>

        <h2>Capimax RT does not:</h2>
        <ul>
          <li>Act as a bank, broker-dealer, financial adviser, fiduciary, or custodian;</li>
          <li>Provide financial, legal, tax, or investment advice;</li>
          <li>Guarantee returns, liquidity, or capital preservation.</li>
        </ul>

        <p>
          All information made available on the platform is provided for informational purposes only and is based on data supplied by asset owners, developers, SPVs, and third-party service providers. While reasonable efforts are made to ensure accuracy, completeness, and timeliness, Capimax RT makes no representations or warranties of any kind, express or implied, regarding the reliability or accuracy of such information.
        </p>

        <h2>Owners are solely responsible for:</h2>
        <ul>
          <li>Conducting their own independent due diligence;</li>
          <li>Consulting licensed professional advisers;</li>
          <li>Assessing suitability, risks, and legal implications.</li>
        </ul>

        <p className="legal-emphasis">
          Use of the platform constitutes acceptance of this Disclaimer and all associated legal documents.
        </p>
      </section>
    </LegalPageLayout>
  );
};
