import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const SecurityPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Information Security Overview"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT implements industry-standard security measures, including:
        </p>

        <ul>
          <li>Two-factor authentication (2FA);</li>
          <li>Role-based access controls;</li>
          <li>Encryption of data in transit and at rest;</li>
          <li>Regular security monitoring and audits;</li>
          <li>Incident response and recovery plans.</li>
        </ul>

        <p className="legal-emphasis">
          Despite best efforts, no system is entirely immune from risk, and users acknowledge residual cybersecurity risks.
        </p>
      </section>
    </LegalPageLayout>
  );
};
