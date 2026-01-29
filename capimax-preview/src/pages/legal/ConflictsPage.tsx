import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const ConflictsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Conflicts of Interest Policy"
      lastUpdated="January 2026"
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          Capimax RT is committed to identifying, preventing, and managing conflicts
          of interest that may arise in the course of our operations. This policy
          outlines our approach to ensuring fair treatment of all platform users and
          maintaining the integrity of our services.
        </p>
      </section>

      <section>
        <h2>2. Definition of Conflicts of Interest</h2>
        <p>
          A conflict of interest arises when Capimax RT, its employees, affiliates, or
          related parties have competing interests that could improperly influence their
          judgment, objectivity, or loyalty to platform users.
        </p>
      </section>

      <section>
        <h2>3. Types of Potential Conflicts</h2>
        <p>Potential conflicts of interest may include:</p>

        <h3>3.1 Related Party Transactions</h3>
        <ul>
          <li>Properties owned or developed by Capimax RT affiliates;</li>
          <li>Services provided by related companies;</li>
          <li>Investment by Capimax RT or its employees in listed properties.</li>
        </ul>

        <h3>3.2 Service Provider Relationships</h3>
        <ul>
          <li>Fees or commissions received from service providers;</li>
          <li>Exclusive arrangements with certain providers;</li>
          <li>Revenue sharing agreements.</li>
        </ul>

        <h3>3.3 Employee Conflicts</h3>
        <ul>
          <li>Personal investments in listed properties;</li>
          <li>Outside business interests;</li>
          <li>Receipt of gifts or entertainment from business partners.</li>
        </ul>

        <h3>3.4 Information Asymmetry</h3>
        <ul>
          <li>Access to non-public information;</li>
          <li>Preferential timing for investment opportunities;</li>
          <li>Advance knowledge of material events.</li>
        </ul>
      </section>

      <section>
        <h2>4. Conflict Management Procedures</h2>

        <h3>4.1 Identification</h3>
        <p>We maintain processes to identify potential conflicts, including:</p>
        <ul>
          <li>Regular conflict assessments;</li>
          <li>Disclosure requirements for employees and related parties;</li>
          <li>Review of business relationships;</li>
          <li>Monitoring of transactions.</li>
        </ul>

        <h3>4.2 Prevention</h3>
        <p>We implement preventive measures such as:</p>
        <ul>
          <li>Information barriers between business units;</li>
          <li>Restrictions on personal trading;</li>
          <li>Approval requirements for related party transactions;</li>
          <li>Independent review processes.</li>
        </ul>

        <h3>4.3 Management</h3>
        <p>When conflicts cannot be avoided, we manage them through:</p>
        <ul>
          <li>Disclosure to affected parties;</li>
          <li>Recusal from decision-making;</li>
          <li>Independent oversight;</li>
          <li>Fair allocation procedures.</li>
        </ul>
      </section>

      <section>
        <h2>5. Disclosure of Conflicts</h2>
        <p>We disclose relevant conflicts including:</p>
        <ul>
          <li>Relationships with property owners or developers;</li>
          <li>Financial interests in listed properties;</li>
          <li>Material service provider relationships;</li>
          <li>Any other conflicts that may affect users.</li>
        </ul>
        <p>
          Disclosures are made on property listing pages, in offering documents, and
          through platform notifications as appropriate.
        </p>
      </section>

      <section>
        <h2>6. Related Party Property Listings</h2>
        <p>
          When properties owned or developed by Capimax RT affiliates are listed on
          the platform:
        </p>
        <ul>
          <li>Clear disclosure is provided in all materials;</li>
          <li>Independent valuations are obtained;</li>
          <li>Terms are set at arm's length;</li>
          <li>Independent oversight is applied;</li>
          <li>Investors are given adequate time to review.</li>
        </ul>
      </section>

      <section>
        <h2>7. Employee Policies</h2>

        <h3>7.1 Personal Investment Restrictions</h3>
        <p>Employees are subject to:</p>
        <ul>
          <li>Pre-clearance requirements for personal investments;</li>
          <li>Holding periods for investments in listed properties;</li>
          <li>Disclosure of personal financial interests;</li>
          <li>Prohibition on trading on non-public information.</li>
        </ul>

        <h3>7.2 Gifts and Entertainment</h3>
        <p>Employees must:</p>
        <ul>
          <li>Report gifts above specified thresholds;</li>
          <li>Decline inappropriate gifts or entertainment;</li>
          <li>Avoid situations that could create obligations.</li>
        </ul>

        <h3>7.3 Outside Activities</h3>
        <p>Employees must obtain approval for:</p>
        <ul>
          <li>External board positions;</li>
          <li>Outside business activities;</li>
          <li>Consulting arrangements.</li>
        </ul>
      </section>

      <section>
        <h2>8. Allocation of Investment Opportunities</h2>
        <p>When investment demand exceeds availability:</p>
        <ul>
          <li>Fair allocation procedures are applied;</li>
          <li>No preferential treatment is given to related parties;</li>
          <li>Allocation criteria are documented;</li>
          <li>Random or time-based methods may be used.</li>
        </ul>
      </section>

      <section>
        <h2>9. Governance and Oversight</h2>
        <p>Our conflicts management is overseen by:</p>
        <ul>
          <li>Compliance function with escalation authority;</li>
          <li>Senior management review;</li>
          <li>Board-level oversight where appropriate;</li>
          <li>Regular policy reviews and updates.</li>
        </ul>
      </section>

      <section>
        <h2>10. Reporting Concerns</h2>
        <p>
          Users who believe a conflict of interest has not been properly managed may
          report concerns to:
        </p>
        <ul>
          <li>Email: <a href="mailto:compliance@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">compliance@capimax.com</a></li>
          <li>Through the platform's complaints procedure</li>
        </ul>
        <p>All reports are treated confidentially and investigated appropriately.</p>
      </section>

      <section>
        <h2>11. Training</h2>
        <p>
          All employees receive regular training on conflict of interest identification
          and management, including updates on policy changes and case studies.
        </p>
      </section>

      <section>
        <h2>12. Policy Review</h2>
        <p>
          This policy is reviewed annually and updated as necessary to address new
          risks, regulatory requirements, and business developments.
        </p>
      </section>
    </LegalPageLayout>
  );
};
