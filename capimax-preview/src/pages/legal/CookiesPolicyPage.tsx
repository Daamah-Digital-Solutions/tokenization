import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CookiesPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Cookies Policy"
      lastUpdated="January 2026"
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          This Cookies Policy explains how Capimax RT ("we," "us," or "our") uses cookies
          and similar tracking technologies when you visit our platform. By using our
          platform, you consent to our use of cookies as described in this policy.
        </p>
      </section>

      <section>
        <h2>2. What Are Cookies?</h2>
        <p>
          Cookies are small text files that are stored on your device (computer, tablet,
          or mobile) when you visit a website. They help websites recognize your device
          and remember information about your visit, such as your preferences and settings.
        </p>
      </section>

      <section>
        <h2>3. Types of Cookies We Use</h2>

        <h3>3.1 Essential Cookies</h3>
        <p>
          These cookies are necessary for the platform to function properly. They enable
          core functionality such as:
        </p>
        <ul>
          <li>User authentication and session management;</li>
          <li>Security features;</li>
          <li>Remembering your login status;</li>
          <li>Processing transactions.</li>
        </ul>
        <p>
          <em>These cookies cannot be disabled as they are essential for platform operation.</em>
        </p>

        <h3>3.2 Functional Cookies</h3>
        <p>
          These cookies enhance functionality and personalization, including:
        </p>
        <ul>
          <li>Language preferences;</li>
          <li>Theme settings (light/dark mode);</li>
          <li>Display preferences;</li>
          <li>Previously viewed properties.</li>
        </ul>

        <h3>3.3 Analytics Cookies</h3>
        <p>
          We use analytics cookies to understand how visitors interact with our platform.
          This helps us improve our services. These cookies collect:
        </p>
        <ul>
          <li>Pages visited and navigation paths;</li>
          <li>Time spent on pages;</li>
          <li>Error messages encountered;</li>
          <li>Device and browser information.</li>
        </ul>

        <h3>3.4 Marketing Cookies</h3>
        <p>
          These cookies may be used to deliver relevant advertisements and track campaign
          effectiveness. They include:
        </p>
        <ul>
          <li>Advertising preferences;</li>
          <li>Campaign tracking;</li>
          <li>Conversion tracking.</li>
        </ul>
      </section>

      <section>
        <h2>4. Third-Party Cookies</h2>
        <p>
          Some cookies are placed by third-party services that appear on our platform.
          These may include:
        </p>
        <ul>
          <li><strong>Google Analytics:</strong> For website analytics;</li>
          <li><strong>Payment Processors:</strong> For secure payment handling;</li>
          <li><strong>Security Services:</strong> For fraud prevention;</li>
          <li><strong>Customer Support:</strong> For chat and support features.</li>
        </ul>
        <p>
          We do not control these third-party cookies. Please refer to their respective
          privacy policies for more information.
        </p>
      </section>

      <section>
        <h2>5. Cookie Duration</h2>
        <p>Cookies on our platform fall into two categories:</p>
        <ul>
          <li>
            <strong>Session Cookies:</strong> Temporary cookies that expire when you
            close your browser.
          </li>
          <li>
            <strong>Persistent Cookies:</strong> Cookies that remain on your device
            for a set period or until you delete them. These help us recognize you
            when you return to our platform.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Managing Cookies</h2>
        <p>You can manage cookies in several ways:</p>

        <h3>6.1 Browser Settings</h3>
        <p>
          Most browsers allow you to control cookies through their settings. You can:
        </p>
        <ul>
          <li>View cookies stored on your device;</li>
          <li>Delete some or all cookies;</li>
          <li>Block cookies from specific sites;</li>
          <li>Block all cookies (note: this may affect platform functionality).</li>
        </ul>

        <h3>6.2 Our Cookie Settings</h3>
        <p>
          You can manage your cookie preferences through our platform's cookie settings
          panel. This allows you to:
        </p>
        <ul>
          <li>Accept or reject non-essential cookies;</li>
          <li>Customize your preferences by cookie category;</li>
          <li>Withdraw consent at any time.</li>
        </ul>

        <h3>6.3 Do Not Track</h3>
        <p>
          Some browsers have a "Do Not Track" feature. Our platform respects this
          setting where technically feasible.
        </p>
      </section>

      <section>
        <h2>7. Impact of Disabling Cookies</h2>
        <p>If you disable cookies, you may experience:</p>
        <ul>
          <li>Inability to log in or maintain sessions;</li>
          <li>Loss of saved preferences;</li>
          <li>Reduced functionality on certain features;</li>
          <li>Need to re-enter information repeatedly.</li>
        </ul>
        <p>
          Essential cookies cannot be disabled as they are required for the platform
          to function properly.
        </p>
      </section>

      <section>
        <h2>8. Similar Technologies</h2>
        <p>In addition to cookies, we may use similar technologies including:</p>
        <ul>
          <li><strong>Local Storage:</strong> For storing data locally in your browser;</li>
          <li><strong>Session Storage:</strong> For temporary data during your visit;</li>
          <li><strong>Pixel Tags:</strong> For tracking email opens and conversions;</li>
          <li><strong>Web Beacons:</strong> For understanding user behavior.</li>
        </ul>
      </section>

      <section>
        <h2>9. Updates to This Policy</h2>
        <p>
          We may update this Cookies Policy from time to time to reflect changes in
          technology, regulation, or our practices. We will notify you of significant
          changes through the platform.
        </p>
      </section>

      <section>
        <h2>10. Contact Us</h2>
        <p>
          If you have questions about our use of cookies, please contact us at{' '}
          <a href="mailto:privacy@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            privacy@capimax.com
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
};
