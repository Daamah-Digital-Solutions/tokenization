import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const SPVPage: React.FC = () => {
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title="What Is an SPV and How Does It Protect Owners?"
      subtitle="Understanding the SPV structure as a legal and risk-mitigation mechanism"
    >
      <section className="info-section">
        <p className="info-intro">
          To explain the SPV structure as a legal and risk-mitigation mechanism.
        </p>

        <h2>What Is an SPV?</h2>
        <p>
          A Special Purpose Vehicle (SPV) is a legally independent company created for a single, specific purpose, such as owning one property or executing one real estate project.
        </p>

        <h2>Why Capimax RT Uses SPVs</h2>
        <ul>
          <li>To isolate risks</li>
          <li>To prevent asset commingling</li>
          <li>To protect owners from unrelated liabilities</li>
          <li>To enable clear reporting and governance</li>
        </ul>

        <h2>How SPVs Protect Owners</h2>
        <ul className="check-list">
          <li>Assets are legally held by the SPV</li>
          <li>Financial accounts are ring-fenced</li>
          <li>Obligations are limited to the specific project</li>
          <li>Owner interests are defined contractually</li>
        </ul>

        <h2>What Owners Actually Own</h2>
        <p>
          Owners hold:
        </p>
        <ul>
          <li>Economic or contractual rights in the SPV</li>
          <li>Defined by ownership agreements</li>
          <li>Transferable under platform rules</li>
        </ul>

        <div className="info-highlight">
          <strong>Important:</strong> Owners do not directly hold the physical property's land registry title. They hold economic or contractual rights in an SPV, not direct land registry ownership, unless explicitly stated in the offering documentation.
        </div>

        <h2>Learn More</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/tokenization')}>
            What is Tokenization
          </button>
          <button className="link-button" onClick={() => navigateToPage('/data-room')}>
            Data Room
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/how-it-works')}>
            How It Works
          </button>
        </div>
      </section>
    </InfoPageLayout>
  );
};
