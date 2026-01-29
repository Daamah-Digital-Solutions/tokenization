import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const DisclaimerPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Platform Disclaimer"
      lastUpdated="January 2026"
    >
      <section>
        <h2>1. About Capimax RT</h2>
        <p>
          Capimax RT is a technology-based platform designed to facilitate the structuring,
          presentation, and administration of tokenized real estate investment opportunities
          through Special Purpose Vehicles (SPVs).
        </p>
      </section>

      <section>
        <h2>2. What Capimax RT Does NOT Do</h2>
        <p>Capimax RT does not:</p>
        <ul>
          <li>Act as a bank, broker-dealer, investment adviser, fiduciary, or custodian;</li>
          <li>Provide investment, legal, tax, or financial advice;</li>
          <li>Guarantee returns, liquidity, or capital preservation;</li>
          <li>Manage investor funds directly;</li>
          <li>Act as a securities exchange or regulated marketplace;</li>
          <li>Make investment decisions on behalf of users.</li>
        </ul>
      </section>

      <section>
        <h2>3. Information Disclaimer</h2>
        <p>
          All information made available on the platform is provided for informational
          purposes only and is based on data supplied by asset owners, developers, SPVs,
          and third-party service providers. While reasonable efforts are made to ensure
          accuracy, completeness, and timeliness, Capimax RT makes no representations or
          warranties of any kind, express or implied, regarding the reliability or accuracy
          of such information.
        </p>
        <p>
          The platform does not independently verify all information provided by third parties
          and cannot guarantee that such information is free from errors, omissions, or
          misrepresentations.
        </p>
      </section>

      <section>
        <h2>4. Investor Responsibilities</h2>
        <p>Investors are solely responsible for:</p>
        <ul>
          <li>Conducting their own independent due diligence;</li>
          <li>Consulting licensed professional advisers (legal, tax, financial);</li>
          <li>Assessing suitability, risks, and legal implications of any investment;</li>
          <li>Understanding the nature and structure of SPV investments;</li>
          <li>Reviewing all offering documents, disclosures, and risk factors;</li>
          <li>Making informed investment decisions based on their own analysis.</li>
        </ul>
      </section>

      <section>
        <h2>5. No Fiduciary Relationship</h2>
        <p>
          Use of the platform does not create a fiduciary, advisory, or professional
          relationship between Capimax RT and any user. The platform operates as a
          technology infrastructure provider only.
        </p>
      </section>

      <section>
        <h2>6. Third-Party Content</h2>
        <p>
          The platform may contain links to third-party websites, content, or services.
          Capimax RT does not endorse, control, or assume responsibility for any third-party
          content or services. Users access such content at their own risk.
        </p>
      </section>

      <section>
        <h2>7. Regulatory Status</h2>
        <p>
          Capimax RT operates within applicable legal and regulatory frameworks. However,
          the regulatory treatment of tokenized securities and real estate investments varies
          by jurisdiction. Users are responsible for ensuring their participation complies
          with local laws and regulations.
        </p>
      </section>

      <section>
        <h2>8. Acceptance</h2>
        <p>
          Use of the platform constitutes acceptance of this Disclaimer and all associated
          legal documents, including the Terms & Conditions, Privacy Policy, and Risk
          Disclosure. Users who do not agree with these terms should not use the platform.
        </p>
      </section>

      <section>
        <h2>9. Modifications</h2>
        <p>
          Capimax RT reserves the right to modify this Disclaimer at any time. Changes
          will be effective upon posting to the platform. Continued use of the platform
          after changes constitutes acceptance of the modified Disclaimer.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          For questions regarding this Disclaimer, please contact us at{' '}
          <a href="mailto:legal@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            legal@capimax.com
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
};
