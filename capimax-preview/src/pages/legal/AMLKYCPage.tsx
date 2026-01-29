import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const AMLKYCPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="AML / KYC / KYB Public Summary"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT maintains a robust AML/CFT framework.
        </p>

        <h2>Key Elements</h2>
        <ul>
          <li>Customer identification and verification;</li>
          <li>Ongoing monitoring;</li>
          <li>Transaction screening;</li>
          <li>Reporting of suspicious activity.</li>
        </ul>

        <p className="legal-emphasis">
          Failure to comply may result in account suspension or termination.
        </p>
      </section>
    </LegalPageLayout>
  );
};
