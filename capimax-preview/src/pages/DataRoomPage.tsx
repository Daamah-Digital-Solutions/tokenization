import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const DataRoomPage: React.FC = () => {
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title="Data Room & Documentation Hub"
      subtitle="Demonstrating Capimax RT's commitment to transparency and owner protection"
    >
      <section className="info-section">
        <p className="info-intro">
          Each listed asset includes a secure digital data room containing all relevant documentation to support informed ownership decisions.
        </p>

        <h2>Contents of the Data Room</h2>
        <p>
          Each listed asset includes a secure digital data room containing:
        </p>
        <ul>
          <li>Ownership and title documentation</li>
          <li>SPV incorporation and governance documents</li>
          <li>Independent valuation reports</li>
          <li>Insurance policies</li>
          <li>Property management agreements</li>
          <li>Periodic financial and operational reports</li>
          <li>Distribution statements</li>
          <li>Material events log</li>
        </ul>

        <h2>Data Room Features</h2>
        <ul className="check-list">
          <li>Advanced search and categorization</li>
          <li>Version control and audit trail</li>
          <li>Role-based access permissions</li>
          <li>Secure viewing and download</li>
        </ul>

        <h2>Why This Matters</h2>
        <p>
          Transparency:
        </p>
        <ul>
          <li>Enhances owner confidence</li>
          <li>Reduces information asymmetry</li>
          <li>Mitigates disputes</li>
          <li>Supports informed decision-making</li>
        </ul>

        <div className="info-highlight">
          <strong>Access:</strong> Verified owners gain access to the Data Room for each property they are considering or have purchased. Documentation access is subject to platform rules and compliance requirements.
        </div>

        <h2>Related Pages</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            What is SPV
          </button>
          <button className="link-button" onClick={() => navigateToPage('/investor-guide')}>
            Co-Owner Guide
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/properties')}>
            Browse Properties
          </button>
        </div>
      </section>
    </InfoPageLayout>
  );
};
