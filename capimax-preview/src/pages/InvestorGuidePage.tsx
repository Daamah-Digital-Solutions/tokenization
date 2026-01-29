import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const InvestorGuidePage: React.FC = () => {
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title="Investor Guide"
      subtitle="How to Invest on Capimax RT - A practical step-by-step guide"
    >
      <section className="info-section">
        <p className="info-intro">
          This guide provides a practical step-by-step walkthrough of how to invest through Capimax RT.
        </p>

        <h2>Step-by-Step Investor Journey</h2>

        <ol>
          <li>
            <span className="step-title">Account Registration</span>
            Create your account on Capimax RT with your email and basic information.
          </li>
          <li>
            <span className="step-title">Identity Verification (KYC)</span>
            Complete the identity verification process to become a verified investor.
          </li>
          <li>
            <span className="step-title">Browsing Available Opportunities</span>
            Explore the available investment opportunities listed on the platform.
          </li>
          <li>
            <span className="step-title">Reviewing Asset Documentation</span>
            Access the Data Room and review all relevant documentation for your chosen property.
          </li>
          <li>
            <span className="step-title">Making an Investment</span>
            Select your investment amount and complete the investment process.
          </li>
          <li>
            <span className="step-title">Monitoring Portfolio Performance</span>
            Track your investments through your personalized dashboard.
          </li>
          <li>
            <span className="step-title">Receiving Distributions (if applicable)</span>
            Receive income distributions according to the stated distribution policy.
          </li>
          <li>
            <span className="step-title">Executing an Exit Strategy</span>
            When ready, utilize exit mechanisms including the secondary market or liquidity provider options.
          </li>
        </ol>

        <h2>Investor Portfolio Dashboard</h2>
        <p>
          The investor dashboard provides:
        </p>
        <ul className="check-list">
          <li>List of invested assets</li>
          <li>Number of units held</li>
          <li>Investment value</li>
          <li>Distribution history</li>
          <li>Digital investment certificates</li>
          <li>Transaction logs</li>
        </ul>

        <div className="info-warning">
          <strong>Important:</strong> Before investing, ensure you have thoroughly reviewed all documentation, understood the risks involved, and consulted with your financial advisor if needed. All investments involve risk, including the potential loss of principal.
        </div>

        <h2>Get Started</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/register')}>
            Create Account
          </button>
          <button className="link-button" onClick={() => navigateToPage('/properties')}>
            Browse Properties
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            View Risk Disclosures
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/faq')}>
            FAQ
          </button>
        </div>
      </section>
    </InfoPageLayout>
  );
};
