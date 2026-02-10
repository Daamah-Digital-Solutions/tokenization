import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const BrokerGuidePage: React.FC = () => {
  return (
    <InfoPageLayout
      title="Broker Guide"
      subtitle="Capimax RT Platform – Broker Guide"
    >
      <section className="info-section">
        <h2>1. Platform Overview</h2>
        <p>
          Capimax RT is a platform under Capimax Group, which includes 12 global companies in the
          United States, United Kingdom, and the United Arab Emirates. The group operates in
          investment, real estate fund management, blockchain, fintech, and digital assets.
        </p>
        <p>
          The platform provides real estate tokenization via blockchain and smart contracts, allowing
          fractional ownership of properties. Capimax RT operates globally without geographical
          restrictions.
        </p>
        <p>
          Properties listed on the platform are carefully verified by real estate management specialists and
          accredited global evaluation companies, including:
        </p>
        <ul>
          <li>Ready-to-rent properties with yields.</li>
          <li>Development projects in progress via four project rounds.</li>
          <li>Under-construction properties with installment plans.</li>
        </ul>
        <p>
          The platform provides dedicated dashboards for investors, owners, developers, and brokers, as
          well as reports and analytics for properties and investments. It ensures full transparency and
          verification of all financial and investment operations. An annual exit market is available for
          investors, with a liquidity provider coming soon for instant exits. Multiple payment and
          withdrawal options are supported, including traditional currencies and cryptocurrencies.
        </p>

        <h2>2. Broker Features &amp; Benefits</h2>
        <ol>
          <li>
            <strong>Commissions from property/project referrals:</strong> The broker earns a commission for every property or project referred to the
            platform that is tokenized and offered for fractional ownership.
          </li>
          <li>
            <strong>Commissions from investor referrals:</strong> The broker earns a commission for every new investor who registers and
            participates in subscriptions via the broker's unique referral code.
          </li>
          <li>
            <strong>Additional Benefits:</strong>
            <ul>
              <li>A comprehensive dashboard to track all referred projects and properties.</li>
              <li>Monitoring all investors referred, including their data and documentation.</li>
              <li>Access to financial and investment data for all projects and investors.</li>
              <li>Digital wallet to withdraw commissions and earnings via bank account or cryptocurrency.</li>
              <li>Ability to work with investors of different capital sizes (low, medium, high).</li>
            </ul>
          </li>
        </ol>

        <h2>3. Real Estate Tokenization</h2>
        <ul>
          <li>Conversion of properties into digital units (Tokens) representing fractional shares.</li>
          <li>Allows the broker to fully understand subscription, sales, and exit mechanisms and the benefits for all parties (owner, developer, investor).</li>
          <li>Smart contracts guarantee automatic execution of all legal and financial terms.</li>
        </ul>

        <h2>4. Fractional Ownership</h2>
        <ul>
          <li>Enables investors to acquire fractional shares, lowering entry barriers and distributing risks.</li>
          <li>Provides brokers the opportunity to guide investors with different capital sizes.</li>
          <li>Supports participation across various projects securely and transparently.</li>
        </ul>

        <h2>5. Blockchain &amp; Smart Contracts</h2>
        <ul>
          <li><strong>Blockchain:</strong> Secure and transparent ledger for all property and project operations.</li>
          <li><strong>Smart Contracts:</strong> Automatically enforce all legal and financial conditions, including subscriptions, collections, and distributions.</li>
          <li><strong>Benefits for Brokers:</strong> Ensures transparency and security for all investor and project referral operations.</li>
        </ul>

        <h2>6. Benefits of Tokenization &amp; Fractional Ownership for All Parties</h2>
        <ul>
          <li><strong>Owners:</strong> Sell property fully or partially, raise capital quickly, retain management, and maintain income flow.</li>
          <li><strong>Developers:</strong> Raise capital for ongoing and new projects, sell partially or fully, retain shares and manage projects.</li>
          <li><strong>Investors:</strong> Participate with low or medium capital, access diverse properties, receive expected returns, and enjoy legal and financial protection via smart contracts.</li>
        </ul>

        <h2>7. Broker Agreement</h2>
        <p>Legal agreement between the broker and Capimax RT outlining:</p>
        <ul>
          <li>Commissions from property or project referrals.</li>
          <li>Commissions from investor referrals via the broker's unique code.</li>
          <li>Legal and financial obligations toward owners, developers, and investors.</li>
          <li>Mechanism for withdrawing earnings via digital wallet or bank account.</li>
          <li>Compliance with local and international laws and regulations for brokerage.</li>
        </ul>

        <h2>8. Broker &amp; Platform Responsibilities</h2>
        <h3>Broker Responsibilities:</h3>
        <ul>
          <li>Refer investors and clients professionally and transparently.</li>
          <li>Comply with local and international brokerage regulations.</li>
          <li>Track all referred projects and investors, ensuring data accuracy.</li>
          <li>Adhere to agreement terms regarding commissions and withdrawals.</li>
        </ul>
        <h3>Platform Responsibilities:</h3>
        <ul>
          <li>Manage all legal and financial operations for projects via blockchain and smart contracts.</li>
          <li>Verify documentation and data for investors and developers.</li>
          <li>Pay commissions to brokers through the digital wallet or bank account.</li>
          <li>Provide a comprehensive dashboard and tools for brokers to manage and track projects and investors transparently.</li>
        </ul>

        <h2>9. Broker Dashboard</h2>
        <ul>
          <li>Track all referred projects and properties.</li>
          <li>Monitor all referred investors per project or property.</li>
          <li>Access all documents and financial/investment data.</li>
          <li>Track commissions and earnings and withdraw easily.</li>
          <li>Analytical tools to evaluate project performance and investor shares.</li>
        </ul>
      </section>
    </InfoPageLayout>
  );
};
