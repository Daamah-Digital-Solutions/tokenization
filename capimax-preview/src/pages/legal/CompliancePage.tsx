import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CompliancePage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Compliance Overview"
      lastUpdated="January 2026"
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          Capimax RT is committed to maintaining the highest standards of regulatory
          compliance and ethical conduct. This Compliance Overview outlines our approach
          to meeting legal and regulatory requirements across all jurisdictions in which
          we operate.
        </p>
      </section>

      <section>
        <h2>2. Regulatory Framework</h2>
        <p>Capimax RT operates within a comprehensive regulatory framework that includes:</p>
        <ul>
          <li>Anti-Money Laundering (AML) regulations;</li>
          <li>Know Your Customer (KYC) requirements;</li>
          <li>Know Your Business (KYB) procedures;</li>
          <li>Data protection and privacy laws;</li>
          <li>Securities and investment regulations;</li>
          <li>Consumer protection laws;</li>
          <li>Cross-border transaction regulations.</li>
        </ul>
      </section>

      <section>
        <h2>3. Platform Role</h2>
        <p>
          As a technology platform facilitating tokenized real estate investments through
          SPVs, Capimax RT maintains strict compliance protocols while operating as:
        </p>
        <ul>
          <li>A technology infrastructure provider;</li>
          <li>A facilitator of investment documentation and disclosures;</li>
          <li>An administrator of investor verification processes;</li>
          <li>A coordinator of SPV-related operations.</li>
        </ul>
        <p>
          Capimax RT does not act as a broker-dealer, investment adviser, or financial
          institution.
        </p>
      </section>

      <section>
        <h2>4. User Verification</h2>
        <p>All platform users undergo verification processes including:</p>
        <ul>
          <li>Identity verification (KYC) for individual investors;</li>
          <li>Business verification (KYB) for corporate entities;</li>
          <li>Accreditation verification where required;</li>
          <li>Ongoing monitoring and periodic re-verification;</li>
          <li>Sanctions screening against global watchlists.</li>
        </ul>
      </section>

      <section>
        <h2>5. Transaction Monitoring</h2>
        <p>Capimax RT implements comprehensive transaction monitoring systems to:</p>
        <ul>
          <li>Detect suspicious activities;</li>
          <li>Identify unusual transaction patterns;</li>
          <li>Monitor for potential money laundering indicators;</li>
          <li>Report suspicious activities to appropriate authorities;</li>
          <li>Maintain detailed transaction records.</li>
        </ul>
      </section>

      <section>
        <h2>6. Data Protection</h2>
        <p>
          We are committed to protecting user data in accordance with applicable data
          protection laws, including GDPR and other regional requirements. Our data
          protection measures include:
        </p>
        <ul>
          <li>Encryption of sensitive data;</li>
          <li>Access controls and authentication;</li>
          <li>Regular security audits;</li>
          <li>Data minimization principles;</li>
          <li>Secure data storage and transmission.</li>
        </ul>
      </section>

      <section>
        <h2>7. Third-Party Compliance</h2>
        <p>
          All third-party service providers, including SPV managers, property managers,
          valuation firms, and payment processors, are subject to:
        </p>
        <ul>
          <li>Due diligence assessment;</li>
          <li>Contractual compliance obligations;</li>
          <li>Periodic compliance reviews;</li>
          <li>Performance monitoring.</li>
        </ul>
      </section>

      <section>
        <h2>8. Jurisdictional Compliance</h2>
        <p>
          Capimax RT ensures compliance with the laws and regulations of each jurisdiction
          in which it operates. This includes:
        </p>
        <ul>
          <li>Obtaining necessary licenses and registrations;</li>
          <li>Adhering to local investment regulations;</li>
          <li>Implementing jurisdiction-specific requirements;</li>
          <li>Working with local legal counsel.</li>
        </ul>
      </section>

      <section>
        <h2>9. Compliance Training</h2>
        <p>
          All Capimax RT staff receive regular compliance training covering:
        </p>
        <ul>
          <li>AML and KYC procedures;</li>
          <li>Data protection requirements;</li>
          <li>Ethical conduct standards;</li>
          <li>Regulatory updates and changes;</li>
          <li>Internal policies and procedures.</li>
        </ul>
      </section>

      <section>
        <h2>10. Reporting and Disclosure</h2>
        <p>
          Capimax RT maintains transparent reporting practices including:
        </p>
        <ul>
          <li>Regulatory filings as required;</li>
          <li>Suspicious activity reports (SARs);</li>
          <li>Annual compliance reviews;</li>
          <li>User notifications of material changes.</li>
        </ul>
      </section>

      <section>
        <h2>11. Continuous Improvement</h2>
        <p>
          We continuously review and enhance our compliance framework to address:
        </p>
        <ul>
          <li>Regulatory changes and updates;</li>
          <li>Industry best practices;</li>
          <li>Emerging risks and threats;</li>
          <li>Technological advancements;</li>
          <li>Feedback from regulators and auditors.</li>
        </ul>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          For compliance-related inquiries, please contact our Compliance Team at{' '}
          <a href="mailto:compliance@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            compliance@capimax.com
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
};
