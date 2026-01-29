import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CookiesPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Cookies Policy"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT uses cookies and similar technologies to enhance user experience.
        </p>

        <h2>Types of Cookies</h2>
        <ul>
          <li>Essential cookies;</li>
          <li>Performance and analytics cookies;</li>
          <li>Functional cookies.</li>
        </ul>

        <p>
          Users may manage cookie preferences via browser settings.
        </p>
      </section>
    </LegalPageLayout>
  );
};
