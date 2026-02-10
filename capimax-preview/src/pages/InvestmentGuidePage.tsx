import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const InvestmentGuidePage: React.FC = () => {
  return (
    <InfoPageLayout
      title="Investment Guide"
      subtitle="Capi Max RT Platform – Tokenized Real Estate Investment"
    >
      <section className="info-section">
        <h2>Phase 1: Registration &amp; Verification</h2>

        <h3>1) Account Creation</h3>
        <p><strong>Investor Actions:</strong></p>
        <ul>
          <li>Create a user account on the platform</li>
          <li>
            Enter basic information:
            <ul>
              <li>Legal name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Country</li>
            </ul>
          </li>
        </ul>

        <h3>2) Verification &amp; Compliance (KYC / AML)</h3>
        <p>To ensure compliance and investor protection:</p>
        <ul>
          <li>Upload identity documents</li>
          <li>Proof of residence</li>
          <li>Verify source of funds</li>
          <li>Specify investor type (Individual / Company)</li>
        </ul>
        <p><strong>What happens after verification:</strong></p>
        <ul>
          <li>Activate account for investment purposes</li>
          <li>Full access to the platform</li>
          <li>Link account to regulatory and legal framework</li>
        </ul>

        <h2>Phase 2: Funding the Account</h2>
        <h3>Funding Methods:</h3>
        <ul>
          <li>Bank transfer</li>
          <li>Approved cryptocurrencies</li>
          <li>Compatible digital wallets</li>
        </ul>
        <h3>Technical Process:</h3>
        <ul>
          <li>Register funds in the investor's account</li>
          <li>Link funds to investment wallet</li>
          <li>Prevent use of funds outside authorized frameworks</li>
        </ul>

        <h2>Phase 3: Choosing an Investment Strategy</h2>
        <p>
          The platform offers 3 clear investment strategies. The investor selects one according to
          their objective:
        </p>
        <h3>1) Income-Generating Investment</h3>
        <ul>
          <li>Ready-to-rent properties</li>
          <li>Regular periodic yields</li>
          <li>Lower risk</li>
          <li>Automatic yield distribution</li>
          <li>Suitable for investors seeking stable income</li>
        </ul>
        <h3>2) Development Investment</h3>
        <ul>
          <li>Properties under development</li>
          <li>Higher returns in the medium term</li>
          <li>Dependent on project completion</li>
          <li>Profits from sale or operation</li>
          <li>Suitable for investors accepting higher risk for higher returns</li>
        </ul>
        <h3>3) Installment / Phased Investment</h3>
        <ul>
          <li>Enter with smaller amounts</li>
          <li>Payment in stages</li>
          <li>Gradual rights accumulation</li>
          <li>Flexible commitment</li>
          <li>Suitable for long-term investors or those with limited liquidity</li>
        </ul>

        <h2>Phase 4: Token Purchase</h2>
        <h3>Purchase Steps:</h3>
        <ul>
          <li>Select the property</li>
          <li>Specify the number of tokens</li>
          <li>
            Review:
            <ul>
              <li>Expected yield</li>
              <li>Rights represented</li>
              <li>Investment duration</li>
            </ul>
          </li>
          <li>Confirm purchase</li>
        </ul>
        <h3>What Happens Technically:</h3>
        <ul>
          <li>Transaction executed via smart contract</li>
          <li>Deduct balance</li>
          <li>Register digital ownership</li>
        </ul>

        <h2>Phase 5: Tokens &amp; Dashboard</h2>
        <h3>Token Transfer:</h3>
        <ul>
          <li>Tokens sent directly to your wallet</li>
          <li>Each token represents a documented share</li>
        </ul>
        <h3>Dashboard Shows:</h3>
        <ul>
          <li>Number of tokens owned</li>
          <li>Investment value</li>
          <li>Accumulated yields</li>
          <li>Transaction history</li>
          <li>Linked legal documents</li>
        </ul>

        <h2>Phase 6: Yield Distribution</h2>
        <h3>How Yields Are Calculated:</h3>
        <p>Based on:</p>
        <ul>
          <li>Number of tokens</li>
          <li>Property performance</li>
          <li>Type of investment</li>
        </ul>
        <h3>Distribution Mechanism:</h3>
        <ul>
          <li>Automatic via smart contract</li>
          <li>Directly to investor wallet</li>
          <li>Recorded on blockchain</li>
        </ul>

        <h2>Phase 7: Price Tracking</h2>
        <p>Investor Can:</p>
        <ul>
          <li>Track token price</li>
          <li>Monitor historical performance</li>
          <li>Compare expected vs actual yield</li>
          <li>Access periodic reports</li>
        </ul>

        <h2>Phase 8: Yield Withdrawal</h2>
        <h3>Withdrawal Options:</h3>
        <ul>
          <li>Transfer to digital wallet</li>
          <li>Reinvest yields</li>
          <li>Bank transfer (if available)</li>
        </ul>
        <h3>Controls:</h3>
        <ul>
          <li>According to property terms</li>
          <li>According to distribution cycle</li>
          <li>Compliance with legal regulations</li>
        </ul>

        <h2>Phase 9: Exit</h2>
        <p>The platform provides several exit options:</p>
        <ol>
          <li>
            <strong>Sell tokens within the platform</strong>
            <ul>
              <li>Internal trading</li>
              <li>Flexible liquidity</li>
            </ul>
          </li>
          <li>
            <strong>Exit upon property sale</strong>
            <ul>
              <li>Final profit distribution</li>
              <li>Token burn</li>
            </ul>
          </li>
          <li>
            <strong>Transfer ownership to another investor</strong>
            <ul>
              <li>Via smart contract</li>
              <li>Automatic record update</li>
            </ul>
          </li>
        </ol>
        <h3>What Happens After Exit:</h3>
        <ul>
          <li>Complete settlement of rights</li>
          <li>Final transaction recorded</li>
          <li>Closing report for the investor</li>
        </ul>

        <h2>Investment Guide Summary</h2>
        <p>This system provides:</p>
        <ul>
          <li>Full transparency</li>
          <li>Legal protection</li>
          <li>Technical transparency</li>
          <li>Structured yields</li>
          <li>Flexible exit options</li>
          <li>Embedded compliance</li>
        </ul>
      </section>
    </InfoPageLayout>
  );
};
