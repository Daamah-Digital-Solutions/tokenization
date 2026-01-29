import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const ComplaintsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Complaints Procedure"
      lastUpdated="January 2026"
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          Capimax RT is committed to providing excellent service and handling all
          complaints fairly, promptly, and transparently. This document outlines our
          complaints procedure and how we will address your concerns.
        </p>
      </section>

      <section>
        <h2>2. What Is a Complaint?</h2>
        <p>
          A complaint is any expression of dissatisfaction about our services, products,
          staff, or the handling of a matter, where you expect a response or resolution.
        </p>
      </section>

      <section>
        <h2>3. How to Submit a Complaint</h2>
        <p>You can submit a complaint through any of the following channels:</p>

        <h3>3.1 Online</h3>
        <ul>
          <li>Through your account dashboard under "Help & Support"</li>
          <li>Via our contact form on the website</li>
        </ul>

        <h3>3.2 Email</h3>
        <p>
          Send your complaint to:{' '}
          <a href="mailto:complaints@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            complaints@capimax.com
          </a>
        </p>

        <h3>3.3 Mail</h3>
        <p>
          Write to us at:<br />
          Capimax RT Complaints Department<br />
          [Address]
        </p>
      </section>

      <section>
        <h2>4. Information to Include</h2>
        <p>To help us investigate your complaint effectively, please provide:</p>
        <ul>
          <li>Your full name and contact details;</li>
          <li>Your account number or registered email;</li>
          <li>A clear description of the issue;</li>
          <li>Dates and times of relevant events;</li>
          <li>Names of any staff members involved (if known);</li>
          <li>Supporting documents or evidence;</li>
          <li>Your desired resolution.</li>
        </ul>
      </section>

      <section>
        <h2>5. Our Complaints Process</h2>

        <h3>Step 1: Acknowledgment</h3>
        <p>
          We will acknowledge receipt of your complaint within <strong>2 business days</strong>.
          You will receive a reference number for tracking purposes.
        </p>

        <h3>Step 2: Investigation</h3>
        <p>
          Our complaints team will investigate your concern thoroughly. This may include:
        </p>
        <ul>
          <li>Reviewing relevant records and communications;</li>
          <li>Speaking with staff involved;</li>
          <li>Consulting with relevant departments;</li>
          <li>Requesting additional information from you.</li>
        </ul>

        <h3>Step 3: Initial Response</h3>
        <p>
          We aim to provide an initial response within <strong>5 business days</strong>.
          If the matter is complex and requires more time, we will inform you of the
          expected timeline.
        </p>

        <h3>Step 4: Resolution</h3>
        <p>
          We will provide a full response within <strong>15 business days</strong> of
          receiving your complaint. Complex complaints may take up to <strong>30 business
          days</strong>, in which case we will keep you informed of progress.
        </p>

        <h3>Step 5: Final Response</h3>
        <p>Our final response will include:</p>
        <ul>
          <li>Summary of your complaint;</li>
          <li>Our investigation findings;</li>
          <li>Our decision and reasoning;</li>
          <li>Any remedial action or compensation offered;</li>
          <li>Information about escalation options if unsatisfied.</li>
        </ul>
      </section>

      <section>
        <h2>6. Escalation</h2>
        <p>If you are not satisfied with our response, you may:</p>

        <h3>6.1 Internal Escalation</h3>
        <p>
          Request escalation to our Senior Complaints Officer within 14 days of
          receiving our response. They will conduct an independent review.
        </p>

        <h3>6.2 External Resolution</h3>
        <p>
          If you remain dissatisfied after internal escalation, you may have the right
          to refer your complaint to relevant external bodies depending on your
          jurisdiction, such as:
        </p>
        <ul>
          <li>Financial ombudsman services;</li>
          <li>Regulatory authorities;</li>
          <li>Alternative dispute resolution services.</li>
        </ul>
        <p>
          We will provide details of applicable external bodies in our final response.
        </p>
      </section>

      <section>
        <h2>7. Compensation and Remedies</h2>
        <p>Where appropriate, we may offer:</p>
        <ul>
          <li>Apologies and acknowledgment of errors;</li>
          <li>Correction of mistakes;</li>
          <li>Refund of fees or charges;</li>
          <li>Compensation for loss or inconvenience;</li>
          <li>Process improvements to prevent recurrence.</li>
        </ul>
        <p>
          Any compensation offered will be fair and proportionate to the circumstances.
        </p>
      </section>

      <section>
        <h2>8. Record Keeping</h2>
        <p>We maintain records of all complaints including:</p>
        <ul>
          <li>The nature of the complaint;</li>
          <li>Investigation steps taken;</li>
          <li>Our response and resolution;</li>
          <li>Any compensation provided;</li>
          <li>Lessons learned and improvements made.</li>
        </ul>
        <p>Records are retained in accordance with regulatory requirements.</p>
      </section>

      <section>
        <h2>9. Continuous Improvement</h2>
        <p>
          We analyze complaint data to identify trends and areas for improvement.
          Regular reports are provided to senior management, and findings are used
          to enhance our services and prevent similar issues.
        </p>
      </section>

      <section>
        <h2>10. Vulnerable Users</h2>
        <p>
          We give special consideration to complaints from vulnerable users and
          will adapt our process as needed to ensure fair treatment. Please let
          us know if you require any accommodations.
        </p>
      </section>

      <section>
        <h2>11. Confidentiality</h2>
        <p>
          All complaints are handled confidentially. Information is shared only
          with those who need to know for investigation and resolution purposes,
          or where required by law.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          For any questions about this complaints procedure, please contact us at{' '}
          <a href="mailto:complaints@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            complaints@capimax.com
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
};
