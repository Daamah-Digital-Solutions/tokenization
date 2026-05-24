import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const LiquidityProviderGuidePage: React.FC = () => {
  return (
    <InfoPageLayout
      title="Liquidity Provider Guide"
      subtitle="Capimax RT Platform – Liquidity Provider Guide"
    >
      <section className="info-section">
        <h2>1. Platform Overview</h2>
        <p>
          Capimax RT is a platform under Capimax Group, which includes 12 global companies in the
          United States, United Kingdom, and the United Arab Emirates. The group operates in
          ownership, real estate fund management, blockchain, fintech, and digital assets.
        </p>
        <p>
          The platform provides real estate tokenization via blockchain and smart contracts, enabling
          fractional ownership of properties. Capimax RT operates globally without geographical
          restrictions.
        </p>
        <p>
          It offers dedicated dashboards for owners, sellers, developers, brokers, and liquidity providers,
          as well as property and ownership reports and analytics, ensuring full transparency and
          verifiability of all financial and ownership operations.
        </p>

        <h2>2. Liquidity Provider Definition</h2>
        <p>
          A liquidity provider is a natural person or legal entity that supplies financial liquidity solely to
          support price differences in the Annual Market or a private market created by the liquidity
          provider.
        </p>
        <ul>
          <li>Liquidity providers do not fund direct subscriptions or general project financing.</li>
          <li>Their role is limited to facilitating exits and ensuring liquidity in the Annual Market and private liquidity markets.</li>
          <li>A liquidity provider can be an individual buyer, bank, or specialized investment company.</li>
        </ul>

        <h2>3. Role on the Platform</h2>
        <ul>
          <li><strong>Supporting the Annual Market:</strong> Providing liquidity to ensure owners can buy and sell tokens smoothly in the Annual Market.</li>
          <li><strong>Managing Private Markets:</strong> Enabling the liquidity provider to create a private internal market for tokenized properties and support owner transactions.</li>
          <li><strong>Market Stability:</strong> Ensuring continuous trading and minimizing price differences during owner exits.</li>
          <li><strong>Owner Confidence:</strong> Providing a reliable liquidity source that owners can rely on for buying and selling on the platform.</li>
        </ul>

        <h2>4. Liquidity Provider Benefits</h2>
        <ol>
          <li>
            <strong>Fixed Financial Returns:</strong> Earnings from price differences and market fees when supporting the Annual Market or private markets.
          </li>
          <li>
            <strong>Additional Revenue from Exits and Resales:</strong>
            <ul>
              <li>Earnings from exit fees when owners leave the Annual Market.</li>
              <li>Higher earnings when exits occur through the liquidity provider's private market.</li>
              <li>Profits also generated from resale of tokens in the Annual Market, where new owners purchase these shares.</li>
            </ul>
          </li>
          <li>
            <strong>Ownership Opportunities:</strong> Access to tokenized real estate projects and the ability to monitor internal market activity.
          </li>
          <li>
            <strong>Financial and Legal Security:</strong> All transactions are executed via smart contracts on the blockchain, ensuring capital safety.
          </li>
          <li>
            <strong>Flexible Liquidity Management:</strong> Ability to determine the amount of liquidity provided to the Annual Market or private market and monitor performance.
          </li>
        </ol>

        <h2>5. Business Model &amp; Earnings</h2>
        <p>
          <strong>Providing Liquidity:</strong> The liquidity provider deposits a specific amount of funds to
          support price differences in the Annual Market or a private market.
        </p>
        <h3>Earnings Sources:</h3>
        <ul>
          <li>Price differences and market fees from buy/sell transactions among owners within the supported market.</li>
          <li>Exit fees earned when owners exit the Annual Market.</li>
          <li>Private market fees: Higher fees for exits or sales via the liquidity provider's private market.</li>
          <li>Token resale: Profits when new owners purchase previously sold shares.</li>
        </ul>
        <h3>Funds Withdrawal:</h3>
        <ul>
          <li>The liquidity provider may withdraw part or all of the deposited capital after the support period ends or upon agreement to exit the private market.</li>
          <li>Smart contracts ensure automatic execution of fund withdrawals according to the agreed terms in the Liquidity Provider Agreement.</li>
        </ul>

        <h2>6. Liquidity Provider Agreement</h2>
        <p>A legal agreement between the liquidity provider and Capimax RT that specifies:</p>
        <ul>
          <li>The liquidity amount provided and the conditions for supporting the Annual Market or private market.</li>
          <li>The distribution of returns from price differences, market fees, and exit fees.</li>
          <li>The liquidity provider's rights to withdraw funds and reclaim capital at the end of the support period or agreement.</li>
          <li>Platform obligations to provide accurate information and maintain market transparency.</li>
          <li>Procedures in case of incomplete trading or market fluctuations.</li>
        </ul>

        <h2>7. Dashboard &amp; Reporting</h2>
        <p>Capimax RT provides a comprehensive dashboard for the liquidity provider:</p>
        <ul>
          <li>Monitor all activities in the Annual Market and private market.</li>
          <li>Display performance indicators, price differences, and exit fees.</li>
          <li>Generate full reports covering all transactions, earnings, and traded shares.</li>
          <li>Tools for full transparency and monitoring of all operations in the supported markets.</li>
        </ul>

        <h2>8. Financial Rights &amp; Security</h2>
        <ul>
          <li>All deposited funds and earnings are protected via smart contracts, ensuring automatic execution.</li>
          <li>A digital wallet allows the liquidity provider to manage capital, profits, and withdrawals to bank accounts or cryptocurrencies.</li>
          <li>The platform ensures the stability of the Annual Market and private markets and reduces operational risks.</li>
          <li>The liquidity provider can monitor all financial operations and verify entitlement to the agreed returns.</li>
        </ul>

        <h2>Summary</h2>
        <p>
          The liquidity provider in Capimax RT is essential for supporting liquidity in the Annual
          Market and private liquidity markets, ensuring smooth owner exits, price stability, and
          capital protection. Earnings are generated from:
        </p>
        <ul>
          <li>Price differences and market fees.</li>
          <li>Exit fees for owners.</li>
          <li>Higher fees via the private market.</li>
          <li>Resale of tokens and purchases by new owners.</li>
        </ul>
        <p>
          All details are accessible through a dedicated dashboard and comprehensive reports, ensuring
          full transparency and monitoring of all market activities.
        </p>
      </section>
    </InfoPageLayout>
  );
};
