import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const TechnologyPage: React.FC = () => {
  return (
    <InfoPageLayout
      title="Technology"
      subtitle="Secure Infrastructure for Tokenized Real Estate"
    >
      <section className="info-section">
        <p className="info-intro">
          Capimax RT operates on a blockchain-native infrastructure designed to ensure legal
          enforceability, technical security, asset transparency, and owner protection.
          Our technology framework integrates regulated legal structures with audited smart contracts to
          deliver institutional-grade real estate tokenization.
        </p>

        <h2>1. Blockchain Infrastructure</h2>
        <h3>Network Layer</h3>
        <p>Capimax RT utilizes a public blockchain network optimized for:</p>
        <ul>
          <li>High transaction security</li>
          <li>Transparent on-chain verification</li>
          <li>Immutable ownership records</li>
          <li>Efficient settlement</li>
        </ul>
        <h3>Core Principles</h3>
        <ul>
          <li>Decentralized ledger validation</li>
          <li>Transparent token issuance</li>
          <li>Publicly verifiable transaction history</li>
          <li>Non-custodial compatibility</li>
        </ul>
        <p>
          Each tokenized asset is deployed via a dedicated smart contract, linked to its corresponding legal
          entity (SPV/CBV structure).
        </p>

        <h2>2. Smart Contract Framework</h2>
        <h3>Asset-Level Smart Contracts</h3>
        <p>Each property on Capimax RT is represented by a dedicated smart contract that governs:</p>
        <ul>
          <li>Token issuance</li>
          <li>Ownership allocation</li>
          <li>Transfer restrictions</li>
          <li>Distribution logic</li>
          <li>Compliance controls</li>
        </ul>
        <h3>Smart Contract Capabilities</h3>
        <ul>
          <li>Controlled secondary transfer (annual liquidity window)</li>
          <li>KYC-based access validation</li>
          <li>Wallet whitelisting</li>
          <li>Compliance enforcement logic</li>
          <li>Automated distribution mechanisms</li>
        </ul>
        <p>
          Smart contracts are structured to reflect the legal rights embedded in the SPV documentation.
        </p>

        <h2>3. Security Architecture</h2>
        <p>
          Capimax RT follows a multi-layer security framework designed to mitigate technical and
          operational risks.
        </p>
        <h3>Infrastructure Security</h3>
        <ul>
          <li>Cloud infrastructure hardening</li>
          <li>Encrypted data transmission (SSL/TLS)</li>
          <li>Segmented network architecture</li>
        </ul>
        <h3>Application Security</h3>
        <ul>
          <li>Role-based access controls</li>
          <li>Multi-factor authentication</li>
          <li>Continuous vulnerability scanning</li>
        </ul>
        <h3>Smart Contract Security</h3>
        <ul>
          <li>External audit validation</li>
          <li>Code verification</li>
          <li>Deployment integrity checks</li>
        </ul>
        <h3>Operational Security</h3>
        <ul>
          <li>Strict internal access control</li>
          <li>Segregation of duties</li>
          <li>Continuous monitoring protocols</li>
        </ul>

        <h2>4. Custody Model</h2>
        <p>Capimax RT supports a hybrid custody structure.</p>
        <h3>Token Custody</h3>
        <ul>
          <li>Owners may hold tokens in approved wallets</li>
          <li>Whitelisting ensures compliance alignment</li>
          <li>Optional third-party custody integrations (where applicable)</li>
        </ul>
        <h3>Asset Custody</h3>
        <ul>
          <li>Underlying real estate assets are held within legally registered SPVs/CBVs</li>
          <li>Independent property management oversight</li>
          <li>Structured revenue collection mechanisms</li>
        </ul>
        <p>The custody model ensures separation between:</p>
        <ul>
          <li>Platform operations</li>
          <li>Asset ownership</li>
          <li>Owner token holdings</li>
        </ul>

        <h2>5. Audit &amp; Verification</h2>
        <p>Transparency and verification are fundamental pillars.</p>
        <h3>Smart Contract Audit</h3>
        <ul>
          <li>Independent third-party security audits</li>
          <li>Code vulnerability analysis</li>
          <li>Public audit summaries (where applicable)</li>
        </ul>
        <h3>Financial &amp; Operational Oversight</h3>
        <ul>
          <li>Property-level reporting</li>
          <li>Revenue validation</li>
          <li>Structured accounting oversight</li>
        </ul>
        <p>
          Audit documentation and verification summaries are made accessible to stakeholders through the
          transparency portal.
        </p>

        <h2>6. Data Transparency</h2>
        <p>Capimax RT provides structured visibility across the ecosystem.</p>
        <h3>On-Chain Transparency</h3>
        <ul>
          <li>Token supply verification</li>
          <li>Ownership distribution</li>
          <li>Transaction records</li>
        </ul>
        <h3>Off-Chain Transparency</h3>
        <ul>
          <li>Property financial performance</li>
          <li>Yield distributions</li>
          <li>Valuation updates</li>
          <li>Asset reports</li>
        </ul>
        <p>Owners maintain access to:</p>
        <ul>
          <li>Portfolio dashboard</li>
          <li>Distribution history</li>
          <li>Secondary market activity</li>
          <li>Annual liquidity reports</li>
        </ul>

        <h2>7. Compliance-Integrated Technology</h2>
        <p>Technology at Capimax RT is not isolated from regulation.</p>
        <p>Smart contracts are deployed in alignment with:</p>
        <ul>
          <li>Jurisdictional legal structure</li>
          <li>KYC / AML enforcement</li>
          <li>Transfer restrictions</li>
          <li>Owner eligibility criteria</li>
        </ul>
        <p>This ensures that blockchain execution aligns with legal enforceability.</p>

        <h2>8. Continuous Development &amp; Monitoring</h2>
        <p>The Capimax RT technology stack is subject to:</p>
        <ul>
          <li>Ongoing security review</li>
          <li>Periodic system updates</li>
          <li>Compliance adaptation</li>
          <li>Risk monitoring enhancements</li>
        </ul>
        <p>Technology governance follows structured internal review protocols.</p>
      </section>
    </InfoPageLayout>
  );
};
