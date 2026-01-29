import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="January 2026"
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          Capimax RT ("we," "us," or "our") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your
          information when you use our platform and services.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>

        <h3>2.1 Personal Information</h3>
        <p>We may collect the following personal information:</p>
        <ul>
          <li>Full name and contact details (email, phone, address);</li>
          <li>Date of birth and nationality;</li>
          <li>Government-issued identification documents;</li>
          <li>Financial information (bank accounts, payment details);</li>
          <li>Investment preferences and history;</li>
          <li>Employment and income information;</li>
          <li>Tax identification numbers.</li>
        </ul>

        <h3>2.2 Technical Information</h3>
        <p>We automatically collect:</p>
        <ul>
          <li>IP address and device information;</li>
          <li>Browser type and version;</li>
          <li>Operating system;</li>
          <li>Usage data and analytics;</li>
          <li>Cookies and similar technologies.</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain our services;</li>
          <li>Process your registration and verify your identity (KYC);</li>
          <li>Facilitate investment transactions;</li>
          <li>Communicate with you about your account and investments;</li>
          <li>Comply with legal and regulatory requirements;</li>
          <li>Prevent fraud and enhance security;</li>
          <li>Improve our platform and services;</li>
          <li>Send marketing communications (with your consent).</li>
        </ul>
      </section>

      <section>
        <h2>4. Legal Basis for Processing</h2>
        <p>We process your personal data based on:</p>
        <ul>
          <li><strong>Contract:</strong> Processing necessary to provide our services;</li>
          <li><strong>Legal Obligation:</strong> Processing required by law (AML, KYC);</li>
          <li><strong>Legitimate Interest:</strong> Processing for business purposes;</li>
          <li><strong>Consent:</strong> Processing with your explicit permission.</li>
        </ul>
      </section>

      <section>
        <h2>5. Information Sharing</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>SPVs and Asset Managers:</strong> To facilitate your investments;</li>
          <li><strong>Service Providers:</strong> Payment processors, KYC providers, cloud services;</li>
          <li><strong>Regulatory Authorities:</strong> When required by law;</li>
          <li><strong>Professional Advisers:</strong> Legal, accounting, and audit services;</li>
          <li><strong>Business Partners:</strong> With your consent.</li>
        </ul>
        <p>
          We do not sell your personal information to third parties.
        </p>
      </section>

      <section>
        <h2>6. International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries outside your
          residence. We ensure appropriate safeguards are in place, including:
        </p>
        <ul>
          <li>Standard contractual clauses;</li>
          <li>Data processing agreements;</li>
          <li>Compliance with applicable data protection laws.</li>
        </ul>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p>We retain your personal information for:</p>
        <ul>
          <li>The duration of our relationship with you;</li>
          <li>As required by applicable laws and regulations;</li>
          <li>To resolve disputes and enforce agreements;</li>
          <li>For legitimate business purposes.</li>
        </ul>
        <p>
          Typically, we retain records for a minimum of 5-7 years after account closure
          to comply with regulatory requirements.
        </p>
      </section>

      <section>
        <h2>8. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal data;</li>
          <li><strong>Rectification:</strong> Correct inaccurate or incomplete data;</li>
          <li><strong>Erasure:</strong> Request deletion of your data (subject to legal requirements);</li>
          <li><strong>Restriction:</strong> Limit how we process your data;</li>
          <li><strong>Portability:</strong> Receive your data in a portable format;</li>
          <li><strong>Objection:</strong> Object to certain processing activities;</li>
          <li><strong>Withdraw Consent:</strong> Withdraw previously given consent.</li>
        </ul>
        <p>
          To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            privacy@capimax.com
          </a>
        </p>
      </section>

      <section>
        <h2>9. Data Security</h2>
        <p>We implement appropriate security measures including:</p>
        <ul>
          <li>Encryption of data in transit and at rest;</li>
          <li>Access controls and authentication;</li>
          <li>Regular security assessments;</li>
          <li>Employee training on data protection;</li>
          <li>Incident response procedures.</li>
        </ul>
      </section>

      <section>
        <h2>10. Cookies and Tracking</h2>
        <p>
          We use cookies and similar technologies to enhance your experience. For details,
          please refer to our{' '}
          <a href="/legal/cookies" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Cookies Policy
          </a>.
        </p>
      </section>

      <section>
        <h2>11. Children's Privacy</h2>
        <p>
          Our platform is not intended for individuals under 18 years of age. We do not
          knowingly collect personal information from children.
        </p>
      </section>

      <section>
        <h2>12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. We will notify you of significant
          changes through the platform or by email. Your continued use of our services
          constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>13. Contact Us</h2>
        <p>
          For privacy-related questions or requests, contact our Data Protection Officer at:
        </p>
        <ul>
          <li>Email: <a href="mailto:privacy@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">privacy@capimax.com</a></li>
          <li>Address: Capimax RT, Data Protection Office</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
};
