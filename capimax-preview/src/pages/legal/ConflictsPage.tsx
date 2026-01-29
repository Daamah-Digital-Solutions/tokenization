import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const ConflictsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Conflicts of Interest Policy"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT seeks to identify and manage conflicts of interest.
        </p>

        <h2>Potential Conflicts</h2>
        <ul>
          <li>Relationships with developers, service providers, or affiliates;</li>
          <li>Financial or commercial interests.</li>
        </ul>

        <h2>Mitigation Measures</h2>
        <ul>
          <li>Disclosure requirements;</li>
          <li>Internal controls;</li>
          <li>Separation of decision-making processes.</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
};
