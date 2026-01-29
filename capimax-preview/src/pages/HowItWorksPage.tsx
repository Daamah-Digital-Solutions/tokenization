import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const HowItWorksPage: React.FC = () => {
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title="How Capimax RT Works"
      subtitle="Understanding the platform's operational framework"
    >
      <section className="info-section">
        <p className="info-intro">
          This section explains, in a clear and structured manner, how Capimax RT operates as a technology platform, covering the full lifecycle of a tokenized real estate asset for Investors, Property Owners / Developers, and Strategic and Operational Partners.
        </p>

        <h2>Platform Overview</h2>
        <p>
          Capimax RT operates as a digital infrastructure that connects real estate assets, SPVs, investors, and service providers within a structured, compliant, and transparent operational framework.
        </p>
        <p>
          The platform does not sell real estate, manage investments, or provide financial services. Instead, it:
        </p>
        <ul>
          <li>Enables asset structuring through SPVs</li>
          <li>Facilitates documentation, disclosures, and reporting</li>
          <li>Organizes investor access and participation</li>
          <li>Supports structured exit mechanisms</li>
        </ul>

        <h2>Step-by-Step Operating Model</h2>

        <ol>
          <li>
            <span className="step-title">Asset Submission (Owner / Developer)</span>
            Submission of a listing request through the platform. Entry of asset details, ownership information, and investment objectives. Upload of preliminary ownership and project documentation.
          </li>
          <li>
            <span className="step-title">Initial Review & Screening</span>
            Preliminary review of submitted materials. Assessment of eligibility for platform listing. Request for additional documentation if required. Initial acceptance or rejection decision.
          </li>
          <li>
            <span className="step-title">SPV Formation & Structuring</span>
            Establishment of a dedicated SPV for the asset. Legal linkage between the SPV and the underlying asset. Preparation of operating, management, and investment agreements.
          </li>
          <li>
            <span className="step-title">Valuation & Insurance</span>
            Independent valuation by qualified third-party firms. Arrangement of insurance coverage where applicable. Upload of reports and policies into the Data Room.
          </li>
          <li>
            <span className="step-title">Investment Offering</span>
            Definition of unit price, minimum investment, and offering size. Publication of the asset offering page. Opening of subscriptions to verified and eligible investors.
          </li>
          <li>
            <span className="step-title">Post-Investment Operations</span>
            Ongoing asset and SPV administration. Periodic operational and financial reporting. Distribution of income (if any) in accordance with stated policies.
          </li>
          <li>
            <span className="step-title">Exit Mechanisms</span>
            Sale through the secondary market. Optional liquidity provider exit (subject to terms and availability). Asset sale and SPV wind-down where applicable.
          </li>
        </ol>

        <h2>Related Resources</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/tokenization')}>
            What is Tokenization
          </button>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            What is SPV
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            View Risk Disclosures
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/secondary-market')}>
            Secondary Market
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/investor-guide')}>
            Investor Guide
          </button>
        </div>
      </section>
    </InfoPageLayout>
  );
};
