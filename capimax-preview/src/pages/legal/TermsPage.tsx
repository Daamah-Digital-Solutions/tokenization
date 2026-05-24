import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const TermsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Terms and Conditions of Use"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <h2>5.1 Scope of Service</h2>
        <p>
          Capimax RT provides digital tools to facilitate tokenized ownership administration.
        </p>

        <h2>5.2 User Obligations</h2>
        <p>Users must:</p>
        <ul>
          <li>Provide accurate information;</li>
          <li>Comply with laws and platform policies;</li>
          <li>Refrain from misuse or unauthorized activities.</li>
        </ul>

        <h2>5.3 Ownership Acknowledgment</h2>
        <p>Users acknowledge that:</p>
        <ul>
          <li>Tokenized real estate ownership is speculative;</li>
          <li>No returns or liquidity are guaranteed;</li>
          <li>Platform information does not constitute advice.</li>
        </ul>

        <h2>5.4 Fees</h2>
        <p>
          Fees may include listing fees, management fees, trading fees, and optional service fees, as disclosed prior to transactions.
        </p>

        <h2>5.5 Suspension & Termination</h2>
        <p>Capimax RT may suspend or terminate accounts for:</p>
        <ul>
          <li>Compliance violations;</li>
          <li>Fraud or misuse;</li>
          <li>Legal or regulatory requirements.</li>
        </ul>

        <h2>5.6 Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Capimax RT shall not be liable for indirect, incidental, or consequential losses.
        </p>

        <h2>5.7 Governing Law</h2>
        <p>
          These Terms are governed by the laws of the applicable jurisdiction specified by the platform.
        </p>
      </section>
    </LegalPageLayout>
  );
};
