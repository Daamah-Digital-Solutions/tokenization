import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const ComplaintsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Complaints & Dispute Resolution Policy"
      lastUpdated="January 2026"
    >
      <section className="legal-section">
        <h2>Complaints Handling</h2>
        <p>
          Users may submit complaints through designated support channels.
        </p>

        <h2>Resolution Process</h2>
        <ul>
          <li>Acknowledgment of receipt;</li>
          <li>Internal investigation;</li>
          <li>Written response within a reasonable timeframe.</li>
        </ul>

        <h2>Dispute Resolution</h2>
        <p>Disputes may be resolved through:</p>
        <ul>
          <li>Negotiation;</li>
          <li>Mediation;</li>
          <li>Arbitration or courts, as specified in the Terms.</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
};
