import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const SecurityPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Security Policy"
      lastUpdated="January 2026"
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          Capimax RT is committed to maintaining the highest standards of security to
          protect your personal information, financial data, and investments. This
          Security Policy outlines the measures we take to safeguard our platform and
          your data.
        </p>
      </section>

      <section>
        <h2>2. Our Security Commitment</h2>
        <p>We are committed to:</p>
        <ul>
          <li>Protecting the confidentiality, integrity, and availability of data;</li>
          <li>Implementing industry-leading security practices;</li>
          <li>Continuously monitoring and improving our security posture;</li>
          <li>Complying with applicable security regulations and standards;</li>
          <li>Transparently communicating about security matters.</li>
        </ul>
      </section>

      <section>
        <h2>3. Data Protection</h2>

        <h3>3.1 Encryption</h3>
        <ul>
          <li><strong>In Transit:</strong> All data transmitted between your device and our servers is encrypted using TLS 1.3;</li>
          <li><strong>At Rest:</strong> Sensitive data stored on our servers is encrypted using AES-256 encryption;</li>
          <li><strong>End-to-End:</strong> Critical operations use additional end-to-end encryption.</li>
        </ul>

        <h3>3.2 Data Storage</h3>
        <ul>
          <li>Data is stored in secure, access-controlled environments;</li>
          <li>Regular backups are maintained with geographic redundancy;</li>
          <li>Strict data retention and deletion policies are enforced;</li>
          <li>Physical security controls protect data centers.</li>
        </ul>
      </section>

      <section>
        <h2>4. Access Controls</h2>

        <h3>4.1 User Authentication</h3>
        <ul>
          <li>Strong password requirements;</li>
          <li>Two-Factor Authentication (2FA) available and recommended;</li>
          <li>Session management with automatic timeouts;</li>
          <li>Login attempt monitoring and lockout protection.</li>
        </ul>

        <h3>4.2 Internal Access</h3>
        <ul>
          <li>Role-based access control (RBAC);</li>
          <li>Principle of least privilege;</li>
          <li>Multi-factor authentication for all staff;</li>
          <li>Regular access reviews and audits;</li>
          <li>Logging and monitoring of all access.</li>
        </ul>
      </section>

      <section>
        <h2>5. Infrastructure Security</h2>

        <h3>5.1 Network Security</h3>
        <ul>
          <li>Firewalls and intrusion detection/prevention systems;</li>
          <li>DDoS protection;</li>
          <li>Network segmentation;</li>
          <li>Regular vulnerability scanning;</li>
          <li>Penetration testing by third parties.</li>
        </ul>

        <h3>5.2 Application Security</h3>
        <ul>
          <li>Secure development lifecycle (SDLC);</li>
          <li>Code reviews and security testing;</li>
          <li>Regular security updates and patching;</li>
          <li>Web Application Firewall (WAF);</li>
          <li>API security controls.</li>
        </ul>
      </section>

      <section>
        <h2>6. Monitoring and Detection</h2>
        <ul>
          <li>24/7 security monitoring;</li>
          <li>Security Information and Event Management (SIEM);</li>
          <li>Anomaly detection systems;</li>
          <li>Real-time alerting for suspicious activities;</li>
          <li>User behavior analytics.</li>
        </ul>
      </section>

      <section>
        <h2>7. Incident Response</h2>

        <h3>7.1 Incident Management</h3>
        <p>We maintain a comprehensive incident response plan including:</p>
        <ul>
          <li>Defined incident classification and escalation procedures;</li>
          <li>Dedicated incident response team;</li>
          <li>Communication protocols;</li>
          <li>Post-incident analysis and improvement.</li>
        </ul>

        <h3>7.2 Breach Notification</h3>
        <p>In the event of a security breach affecting your data:</p>
        <ul>
          <li>We will notify affected users promptly;</li>
          <li>We will inform relevant regulatory authorities as required;</li>
          <li>We will provide guidance on protective measures;</li>
          <li>We will conduct a thorough investigation.</li>
        </ul>
      </section>

      <section>
        <h2>8. Third-Party Security</h2>
        <p>We ensure our partners and vendors meet our security standards through:</p>
        <ul>
          <li>Security assessments before engagement;</li>
          <li>Contractual security requirements;</li>
          <li>Regular compliance verification;</li>
          <li>Data processing agreements;</li>
          <li>Ongoing monitoring.</li>
        </ul>
      </section>

      <section>
        <h2>9. Employee Security</h2>
        <ul>
          <li>Background checks for all employees;</li>
          <li>Regular security awareness training;</li>
          <li>Clear security policies and procedures;</li>
          <li>Secure remote working protocols;</li>
          <li>Clean desk and clear screen policies.</li>
        </ul>
      </section>

      <section>
        <h2>10. Your Security Responsibilities</h2>
        <p>To help protect your account, we recommend:</p>
        <ul>
          <li>Using a strong, unique password;</li>
          <li>Enabling Two-Factor Authentication (2FA);</li>
          <li>Not sharing your login credentials;</li>
          <li>Logging out when using shared devices;</li>
          <li>Keeping your devices and software updated;</li>
          <li>Being vigilant against phishing attempts;</li>
          <li>Reporting suspicious activities immediately.</li>
        </ul>
      </section>

      <section>
        <h2>11. Security Standards and Certifications</h2>
        <p>We align our security practices with:</p>
        <ul>
          <li>ISO 27001 Information Security Management;</li>
          <li>SOC 2 Type II compliance;</li>
          <li>PCI DSS for payment processing;</li>
          <li>GDPR requirements for data protection;</li>
          <li>Industry best practices and frameworks.</li>
        </ul>
      </section>

      <section>
        <h2>12. Bug Bounty Program</h2>
        <p>
          We welcome responsible disclosure of security vulnerabilities. If you
          discover a potential security issue, please report it to{' '}
          <a href="mailto:security@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            security@capimax.com
          </a>
        </p>
        <p>We commit to:</p>
        <ul>
          <li>Acknowledging receipt within 24 hours;</li>
          <li>Providing regular updates on our investigation;</li>
          <li>Not taking legal action against good-faith reporters;</li>
          <li>Recognizing researchers who help improve our security.</li>
        </ul>
      </section>

      <section>
        <h2>13. Updates to This Policy</h2>
        <p>
          We regularly review and update our security practices and this policy.
          Significant changes will be communicated through the platform.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          For security-related inquiries, please contact our Security Team at{' '}
          <a href="mailto:security@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            security@capimax.com
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
};
