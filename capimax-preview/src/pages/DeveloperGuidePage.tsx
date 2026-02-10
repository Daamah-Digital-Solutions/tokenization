import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const DeveloperGuidePage: React.FC = () => {
  return (
    <InfoPageLayout
      title="Developer's Guide"
      subtitle="Capimax RT Platform – Developer's Guide"
    >
      <section className="info-section">
        <h2>1. Real Estate Tokenization</h2>
        <ul>
          <li>Convert properties into digital units (Tokens) representing fractional shares of the property.</li>
          <li>Allows the developer to sell full or partial ownership of properties while retaining certain units for continued income.</li>
          <li>Smart contracts guarantee the execution of all terms for both the developer and investors.</li>
        </ul>

        <h2>2. Fractional Ownership</h2>
        <ul>
          <li>Investors can acquire fractional shares in properties, reducing entry barriers and distributing risk.</li>
          <li>Enables developers to raise capital efficiently for ongoing or new projects.</li>
          <li>Developers can retain part of the ownership to generate ongoing income or profit from property appreciation.</li>
        </ul>

        <h2>3. Blockchain &amp; Smart Contracts</h2>
        <ul>
          <li><strong>Blockchain:</strong> A secure, transparent ledger for all property operations.</li>
          <li><strong>Smart Contracts:</strong> Automatically enforce all legal and financial conditions, including subscription, collection, and distribution.</li>
          <li><strong>Benefits for Developers:</strong> Guarantees compliance with contracts, allows transparent management of property shares, reduces legal and operational risk.</li>
        </ul>

        <h2>4. Platform Features for Developers</h2>
        <ol>
          <li>Tokenize properties and convert them into digital units.</li>
          <li>Smart contracts enforce all subscription and sale conditions.</li>
          <li>List properties on the platform for investor subscription.</li>
          <li>Marketing tools to promote projects globally.</li>
          <li>Automated fund collection from investors.</li>
          <li>Integrated dashboard to manage subscription, track progress, and generate detailed reports.</li>
          <li>Support from evaluation, insurance, and management companies to facilitate smooth project execution.</li>
          <li>Digital wallet to withdraw funds globally via cryptocurrencies or traditional banking.</li>
          <li>Periodic reports on project performance and investor participation.</li>
          <li>
            <strong>Developer-Specific Flexibility &amp; Advantages:</strong>
            <ul>
              <li>Ability to tokenize and sell ready-to-rent properties with returns.</li>
              <li>Ability to tokenize and sell development projects through four project rounds.</li>
              <li>Ability to tokenize under-construction properties with installment plans.</li>
              <li>Retain part of the project to maintain ongoing income.</li>
              <li>Option to retain project management via an external company, ensuring liquidity and control.</li>
              <li>Transparent oversight of all units, investors, and financial flows via platform dashboards.</li>
            </ul>
          </li>
        </ol>

        <h2>5. Investment Agreement Between Developer and Platform</h2>
        <p>
          The Investment Agreement defines all legal, financial, and documentation details of the
          property and project, including:
        </p>
        <ul>
          <li>Complete property and project data, legal and technical documents.</li>
          <li>Accredited evaluation and management companies.</li>
          <li>Fees: tokenization, administration, listing, subscription, SPV, and evaluation.</li>
          <li>Mechanism to transfer project/property ownership to an SPV (Special Purpose Vehicle).</li>
          <li>Legal and financial obligations of both the developer and platform.</li>
        </ul>
        <p>
          <strong>Important:</strong> Agreement must be signed before any other stage.
        </p>
        <p>
          <strong>In case subscription is not completed:</strong> Agreement defines procedures for either
          terminating or renewing until subscription completion.
        </p>

        <h2>6. Terms &amp; Conditions for Listing and Legal Responsibilities</h2>
        <ul>
          <li>Submission of accurate and complete documentation.</li>
          <li>Adherence to timelines and defined stages for listing and subscription.</li>
          <li>Compliance with local and international laws and regulations.</li>
          <li>Developer responsible for accuracy of all documents.</li>
          <li>Platform responsible for subscription management and verification through smart contracts.</li>
        </ul>

        <h2>7. Fees for Developers</h2>
        <ol>
          <li><strong>Tokenization Fee:</strong> To convert property/project into digital units.</li>
          <li><strong>Administration Fee:</strong> Platform operation and subscription management.</li>
          <li><strong>Listing &amp; Subscription Fees:</strong> For platform listing and investor subscription.</li>
          <li><strong>SPV Fee:</strong> Establishment and management of SPV for each property/project.</li>
          <li><strong>Evaluation Fee:</strong> Accredited evaluation companies' fees for project/property assessment.</li>
        </ol>

        <h2>8. Required Documents from Developer</h2>
        <ol>
          <li>Property ownership deed or project legal contract.</li>
          <li>Architectural plans and legal permits.</li>
          <li>Recent evaluation report from accredited companies.</li>
          <li>Insurance certificates, if applicable.</li>
          <li>Legal identification documents for the developer or company.</li>
          <li>Financial documents relating to debts or obligations on the property/project.</li>
          <li>Any existing agreements with current investors, tenants, or partners.</li>
        </ol>

        <h2>9. Property/Project Listing Stages Until Subscription</h2>

        <h3>Stage 0: Signing the Investment Agreement</h3>
        <ul>
          <li>Must be signed before any other stage.</li>
          <li>Defines all legal, financial, and documentation details.</li>
          <li>Establishes fees and mechanism for SPV ownership transfer.</li>
        </ul>

        <h3>Stage 1: Inspection, Evaluation, and Approval</h3>
        <ul>
          <li>Agreement on evaluation entity.</li>
          <li>Comprehensive project/property report including type, location, expected returns, and risks.</li>
          <li>Project/property approved for subscription.</li>
        </ul>

        <h3>Stage 2: SPV Creation &amp; Smart Contract Setup</h3>
        <ul>
          <li>Agreement on entity establishing SPV.</li>
          <li>Conversion of property/project into digital tokens via SPV.</li>
          <li>Smart contracts prepared for legal and financial execution of each unit.</li>
        </ul>

        <h3>Stage 3: Platform Listing &amp; Subscription Opening</h3>
        <ul>
          <li>Listing on Capimax RT.</li>
          <li>Dashboard for developer to manage subscription, track requests, and control timeline.</li>
        </ul>

        <h3>Stage 4: Marketing &amp; Investor Attraction</h3>
        <ul>
          <li>Digital promotion tools for global reach.</li>
          <li>Clear reports on returns and risks for each investor.</li>
        </ul>

        <h3>Stage 5: Fund Collection &amp; Subscription Completion</h3>
        <ul>
          <li>Receive funds via digital wallet or banking channels.</li>
          <li>Tokens automatically distributed to investors via smart contracts.</li>
        </ul>

        <h3>Stage 6: Post-Subscription Management</h3>
        <p>After final subscription:</p>
        <ul>
          <li>Developer receives funds.</li>
          <li>Full execution of Investment Agreement.</li>
          <li>Ownership transferred to SPV.</li>
        </ul>
        <p>Manage developer and investor shares, exit via annual market or liquidity provider.</p>
        <p>
          <strong>In Case Subscription Is Not Completed:</strong> Investment Agreement clauses define procedures to
          either terminate or renew the agreement until subscription completion.
        </p>

        <h2>10. Developer &amp; Platform Responsibilities</h2>
        <h3>Developer Responsibilities:</h3>
        <ul>
          <li>Submit accurate, complete documents.</li>
          <li>Comply with all legal and regulatory requirements.</li>
          <li>Monitor financial reports and ensure compliance with smart contracts.</li>
          <li>Cooperate with evaluation, insurance, and management companies.</li>
          <li>Adhere to terms and fees specified in Investment Agreement.</li>
        </ul>
        <h3>Platform Responsibilities:</h3>
        <ul>
          <li>Manage tokenization, subscription, and SPV/blockchain operations.</li>
          <li>Verify legal and financial documentation.</li>
          <li>Manage fund collection and transfer payments to developer after subscription completion.</li>
          <li>Provide dashboards, reports, and analytics.</li>
          <li>Provide marketing and promotion tools.</li>
          <li>Adhere to terms of signed Investment Agreement.</li>
        </ul>
      </section>
    </InfoPageLayout>
  );
};
