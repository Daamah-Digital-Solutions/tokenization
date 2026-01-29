import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT is committed to protecting personal data and respecting user privacy.
        </p>

        <h2>4.1 Data Collected</h2>
        <ul>
          <li>Identification data (name, ID, date of birth);</li>
          <li>Contact information;</li>
          <li>Compliance data (KYC/KYB);</li>
          <li>Transaction and usage data;</li>
          <li>Technical data (IP address, device, cookies).</li>
        </ul>

        <h2>4.2 Purpose of Processing</h2>
        <p>Data is processed to:</p>
        <ul>
          <li>Create and manage accounts;</li>
          <li>Fulfill compliance obligations;</li>
          <li>Facilitate platform operations;</li>
          <li>Improve services and security;</li>
          <li>Communicate with users.</li>
        </ul>

        <h2>4.3 Data Sharing</h2>
        <p>Data may be shared with:</p>
        <ul>
          <li>Compliance and KYC providers;</li>
          <li>Payment and technology partners;</li>
          <li>Legal or regulatory authorities when required by law.</li>
        </ul>

        <h2>4.4 Data Retention</h2>
        <p>
          Personal data is retained only for as long as necessary to meet legal, regulatory, and operational obligations.
        </p>

        <h2>4.5 User Rights</h2>
        <p>
          Users may request access, correction, or deletion of personal data, subject to legal limitations.
        </p>

        <h2>4.6 Data Security</h2>
        <p>
          Appropriate technical and organizational measures are implemented to safeguard personal data.
        </p>
      </section>
    </LegalPageLayout>
  );
};
