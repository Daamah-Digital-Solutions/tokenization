import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CompliancePage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Regulatory & Compliance Framework"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT operates as a technology and infrastructure platform and applies a compliance-first approach aligned with international best practices.
        </p>

        <h2>3.1 Compliance Objectives</h2>
        <ul>
          <li>Prevent money laundering and financial crime;</li>
          <li>Protect platform integrity;</li>
          <li>Ensure lawful participation by eligible users.</li>
        </ul>

        <h2>3.2 KYC / KYB</h2>
        <p>All users must complete identity verification:</p>
        <ul>
          <li>Individuals: government-issued identification, proof of address;</li>
          <li>Entities: corporate documents, ownership structure, authorized signatories.</li>
        </ul>

        <h2>3.3 Sanctions & Screening</h2>
        <p>The platform conducts screening against:</p>
        <ul>
          <li>International sanctions lists;</li>
          <li>Politically Exposed Persons (PEP) databases;</li>
          <li>Watchlists from reputable providers.</li>
        </ul>

        <h2>3.4 Jurisdictional Restrictions</h2>
        <p>Access may be restricted based on:</p>
        <ul>
          <li>Country of residence;</li>
          <li>Citizenship;</li>
          <li>Applicable local laws.</li>
        </ul>

        <h2>3.5 Investor Classification</h2>
        <p>
          Certain offerings may be limited to specific investor categories (e.g., professional, qualified, or accredited investors).
        </p>

        <h2>3.6 Record Keeping</h2>
        <p>
          Capimax RT maintains compliance records, audit logs, and transaction histories in accordance with applicable legal requirements.
        </p>
      </section>
    </LegalPageLayout>
  );
};
