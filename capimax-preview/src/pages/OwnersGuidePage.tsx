import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const OwnersGuidePage: React.FC = () => {
  return (
    <InfoPageLayout
      title="Owner's Guide"
      subtitle="Capimax RT Platform – Owner's Guide"
    >
      <section className="info-section">
        <h2>1. Real Estate Tokenization</h2>
        <ul>
          <li>Converting property ownership into digital units (Tokens) representing fractional shares of the property.</li>
          <li>Allows the owner to sell part of the property or retain some tokens to generate ongoing income.</li>
          <li>Smart contracts ensure the protection of both the owner's and investors' rights.</li>
        </ul>

        <h2>2. Fractional Ownership</h2>
        <ul>
          <li>Enables investors to purchase fractional shares of the property, reducing entry barriers and distributing risks.</li>
          <li>Provides the owner with flexible financing for projects without the need for traditional loans.</li>
          <li>The owner can retain part of the ownership to receive continuous income or benefit from property value appreciation.</li>
        </ul>

        <h2>3. Blockchain &amp; Smart Contracts</h2>
        <ul>
          <li><strong>Blockchain:</strong> A secure and transparent database for all real estate operations.</li>
          <li><strong>Smart Contracts:</strong> Automatically execute legal and financial contract terms, including subscription, collection, and distribution.</li>
          <li><strong>Benefits for the Owner:</strong> Ensures compliance with contracts, transparent management of ownership shares, and reduced legal risks.</li>
        </ul>

        <h2>4. Platform Features for the Owner</h2>
        <ol>
          <li>Tokenization of the property into digital units.</li>
          <li>Smart contracts to enforce all subscription and sale terms.</li>
          <li>Listing the property on the platform and opening it for subscription.</li>
          <li>Promotional and marketing tools to attract investors.</li>
          <li>Automatic collection of funds from investors.</li>
          <li>Integrated dashboard to track subscriptions and manage ownership shares.</li>
          <li>Support from evaluation, insurance, and management companies to facilitate the subscription process.</li>
          <li>Digital wallet to withdraw funds from anywhere in the world using cryptocurrencies or traditional banking methods.</li>
          <li>Periodic reports on property performance and investor shares.</li>
          <li><strong>Owner Flexibility:</strong> The owner can sell the property entirely, sell a portion of it, or retain its management to generate ongoing income or oversee the project.</li>
        </ol>

        <h2>5. Investment Agreement Between Owner and Platform</h2>
        <p>
          The Investment Agreement is a primary contract between the owner and Capimax RT,
          containing all legal, financial, and documentation details regarding the property,
          including:
        </p>
        <ul>
          <li>Full property data and legal/technical documents.</li>
          <li>Details of accredited evaluation companies.</li>
          <li>Fees related to tokenization, administration, listing, subscription, SPV, and evaluation.</li>
          <li>The mechanism for transferring property ownership to an SPV (Special Purpose Vehicle).</li>
          <li>Legal and financial rights and obligations of both the owner and the platform.</li>
        </ul>
        <p>
          <strong>Important Note:</strong> The investment agreement must be signed before any other stage, as it
          forms the legal foundation for all property listing and subscription procedures.
        </p>
        <p>
          <strong>In Case of Unsuccessful Subscription:</strong> The agreement includes clauses defining the
          procedure to:
        </p>
        <ul>
          <li>Legally terminate the agreement, or</li>
          <li>Renew the agreement until the subscription is completed.</li>
        </ul>

        <h2>6. Terms &amp; Conditions for Property Listing and Legal Responsibilities</h2>
        <ul>
          <li>Submit accurate and complete documents to the platform.</li>
          <li>Comply with the timeline and defined stages for property listing and subscription.</li>
          <li>Adhere to local and international real estate and investment laws.</li>
          <li>The owner is responsible for any inaccurate or incorrect documents.</li>
          <li>The platform is responsible for managing the subscription and verifying transaction validity via smart contracts.</li>
        </ul>

        <h2>7. Fees the Owner Must Be Aware Of</h2>
        <ol>
          <li><strong>Property Tokenization Fee:</strong> For converting the property into digital units.</li>
          <li><strong>Administration Fee:</strong> Platform operation and subscription management fee.</li>
          <li><strong>Listing &amp; Subscription Fees:</strong> For listing the property on the platform and opening it for investors.</li>
          <li><strong>SPV Fees:</strong> For establishing and managing the Special Purpose Vehicle for each property.</li>
          <li><strong>Evaluation Fees:</strong> Fees for accredited evaluation companies to produce accurate property reports.</li>
        </ol>

        <h2>8. Required Documents from the Owner</h2>
        <ol>
          <li>Property ownership deed or title contract.</li>
          <li>Architectural plans and legal construction permits.</li>
          <li>Recent property evaluation certificate from accredited companies.</li>
          <li>Property insurance certificate, if available.</li>
          <li>Legal identification documents for the owner or owning company.</li>
          <li>Financial documents related to any debts or obligations on the property.</li>
          <li>Any existing agreements with current investors or tenants.</li>
        </ol>

        <h2>9. Property Listing Stages Until Subscription</h2>

        <h3>Stage 0: Signing the Investment Agreement</h3>
        <ul>
          <li>The Investment Agreement between the owner and platform is signed before any other procedures.</li>
          <li>The agreement defines all legal, financial, and documentation details of the property.</li>
          <li>Agreement on fees and the mechanism to transfer property ownership to the SPV.</li>
          <li>Forms the legal foundation for all listing and subscription stages.</li>
        </ul>

        <h3>Stage 1: Inspection, Evaluation, and Approval</h3>
        <ul>
          <li>After signing the agreement, the owner and platform agree on the property evaluation entity.</li>
          <li>A comprehensive property report is issued, including location, property type, expected returns, and risks.</li>
          <li>The property is approved for subscription based on an objective evaluation.</li>
        </ul>

        <h3>Stage 2: SPV Creation and Smart Contract Preparation</h3>
        <ul>
          <li>The owner and platform agree on the entity responsible for establishing the SPV.</li>
          <li>Property is converted into digital units (Tokens) via the SPV.</li>
          <li>Smart contracts are prepared to define the legal and financial terms for each unit.</li>
        </ul>

        <h3>Stage 3: Platform Listing and Subscription</h3>
        <ul>
          <li>Property is listed on Capimax RT, and the subscription is opened to investors.</li>
          <li>Owner dashboard to manage subscription, track requests, and control the timeline.</li>
        </ul>

        <h3>Stage 4: Marketing and Investor Attraction</h3>
        <ul>
          <li>Digital real estate promotion tools to attract investors.</li>
          <li>Clear reports provided for expected returns and risks for each investor.</li>
        </ul>

        <h3>Stage 5: Fund Collection and Subscription Completion</h3>
        <ul>
          <li>Receive funds from investors via digital wallet or banks.</li>
          <li>Tokens distributed automatically to investors through smart contracts.</li>
        </ul>

        <h3>Stage 6: Post-Subscription Management</h3>
        <p>After final completion of subscription:</p>
        <ul>
          <li>The owner receives their funds.</li>
          <li>Full execution of the Investment Agreement.</li>
          <li>Transfer of property ownership to the SPV as defined in the agreement.</li>
        </ul>
        <p>
          Management of owner and investor shares and exit via the annual market or liquidity
          provider.
        </p>
        <p>
          <strong>In Case of Unsuccessful Subscription:</strong> Clauses in the Investment Agreement determine the
          procedure to either terminate the agreement or renew it until subscription completion.
        </p>

        <h2>10. Owner &amp; Platform Responsibilities</h2>
        <h3>Owner Responsibilities:</h3>
        <ul>
          <li>Submit accurate and complete documents.</li>
          <li>Comply with all local and international laws and regulations.</li>
          <li>Monitor financial reports and ensure adherence to smart contract terms.</li>
          <li>Cooperate with evaluation, insurance, and management companies to facilitate a smooth subscription process.</li>
          <li>Adhere to terms and fees specified in the Investment Agreement.</li>
        </ul>
        <h3>Platform Responsibilities:</h3>
        <ul>
          <li>Manage tokenization and subscription via SPV and blockchain.</li>
          <li>Verify legal and financial documents.</li>
          <li>Manage fund collection and transfer payments to the owner after final subscription completion.</li>
          <li>Provide dashboards, reports, and accurate analytics.</li>
          <li>Offer professional marketing and promotional tools for the property.</li>
          <li>Adhere to terms of the Investment Agreement signed with the owner.</li>
        </ul>
      </section>
    </InfoPageLayout>
  );
};
