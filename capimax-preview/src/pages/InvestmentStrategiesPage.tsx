import React from 'react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const InvestmentStrategiesPage: React.FC = () => {
  return (
    <InfoPageLayout
      title="Ownership Strategies"
      subtitle="Capi Max RT Platform – Tokenized Real Estate Ownership"
    >
      <section className="info-section">
        <h2>1) Development Token Ownership</h2>

        <h3>Definition</h3>
        <p>
          A development property purchase is buying a real estate asset at its early stages. The
          owner purchases tokens during the initial rounds at a lower price, without periodic yields, in
          exchange for:
        </p>
        <ul>
          <li>Lower entry price</li>
          <li>Token value growth across funding rounds</li>
          <li>Transparency of future pricing plans</li>
        </ul>

        <h3>Price Rounds Mechanism</h3>
        <p>The developer specifies:</p>
        <ul>
          <li>Number of rounds (typically 4)</li>
          <li>Token price for each round</li>
          <li>Release date for each round</li>
        </ul>
        <p>This data is:</p>
        <ul>
          <li>Published on the platform</li>
          <li>Supported by documentation</li>
          <li>Linked to the smart contract</li>
        </ul>

        <h3>Illustrative Example:</h3>
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Round</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Token Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">1</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">$50</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">01/03/2025</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Early entry</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">2</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">$65</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">01/09/2025</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">+20% growth</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">3</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">$80</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">01/03/2026</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Cumulative growth</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">4</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">$90</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">01/09/2026</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Pre-operation</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>How the Owner Knows Expected Returns</h3>
        <ul>
          <li>Next round price announced in advance</li>
          <li>Launch date known</li>
          <li>Past performance documented</li>
          <li>Profitability calculable before purchase</li>
        </ul>

        <h3>Owner Options</h3>
        <ul>
          <li>Exit at any subsequent round</li>
          <li>Sell on secondary market</li>
          <li>Continue until operation</li>
          <li>Later convert to an income-generating model</li>
        </ul>

        <h3>Documentation &amp; Transparency</h3>
        <ul>
          <li>Rounds table fixed</li>
          <li>Development agreement documented</li>
          <li>Price secured in smart contract</li>
          <li>Changes only via official disclosure</li>
        </ul>

        <h2>2) Installment-Based Development Ownership</h2>

        <h3>Definition</h3>
        <p>A long-term ownership plan that allows the owner to:</p>
        <ul>
          <li>Purchase tokens from the beginning</li>
          <li>Pay in installments</li>
          <li>Benefit from property value growth</li>
          <li>Eventually convert to an income-generating property</li>
        </ul>

        <h3>Installment Mechanism</h3>
        <p>The developer specifies:</p>
        <ul>
          <li>Installment duration</li>
          <li>Value of each installment</li>
          <li>Number of payments</li>
        </ul>
        <p>Features:</p>
        <ul>
          <li>Comfortable payment schedule</li>
          <li>Longer than traditional market terms</li>
          <li>No bank interest</li>
        </ul>

        <h3>Rights During Installment</h3>
        <ul>
          <li>Gradual economic ownership</li>
          <li>Token value increases as construction progresses</li>
          <li>Exit option at any time</li>
        </ul>

        <h3>Exit During Installment</h3>
        <p>Upon secondary market sale:</p>
        <ul>
          <li>Paid amount accounted</li>
          <li>Price growth ratio applied</li>
          <li>Token transfers to new buyer</li>
          <li>Remaining installments continue under same terms</li>
          <li>New owner benefits from price appreciation</li>
        </ul>

        <h3>Advantages</h3>
        <ul>
          <li>Lower initial entry amount</li>
          <li>Comfortable financial commitment</li>
          <li>High flexibility</li>
          <li>Liquidity before delivery</li>
        </ul>

        <h2>3) Income-Generating Stabilized Asset</h2>

        <h3>Definition</h3>
        <p>A property that is:</p>
        <ul>
          <li>Ready</li>
          <li>Leased</li>
          <li>Generates periodic income</li>
          <li>Shows gradual price appreciation</li>
        </ul>

        <h3>Owner Benefits</h3>
        <ul>
          <li>Periodic rental yield</li>
          <li>Gradual token value growth</li>
          <li>Full transparency of revenue</li>
        </ul>

        <h3>Yield Distribution</h3>
        <ul>
          <li>Monthly or quarterly</li>
          <li>Automatically via smart contract</li>
          <li>Withdrawable or reinvestable</li>
        </ul>

        <h3>Exit Options</h3>
        <ul>
          <li>Sell token on secondary market</li>
          <li>Exit when property is sold</li>
          <li>Transfer digital ownership easily</li>
        </ul>

        <h3>Suitable For</h3>
        <ul>
          <li>Conservative owners</li>
          <li>Those seeking stable income</li>
          <li>Owners preferring higher stability</li>
        </ul>

        <h2>Brief Comparison of Strategies</h2>
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Feature</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Development</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Installment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">Income-Generating</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Entry Price</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Low</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Flexible</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Higher</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Periodic Yield</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">No</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">No (Deferred)</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Yes</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Price Growth</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">High</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Gradual High</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Stable</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Exit Flexibility</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Flexible</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Flexible</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Flexible</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Risk Level</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Higher</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Medium</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">Lower</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Capi Max RT Strategy Summary</h2>
        <p>The platform provides:</p>
        <ul>
          <li>Full transparency</li>
          <li>Pre-announced pricing</li>
          <li>Documented contracts</li>
          <li>Binding smart contracts</li>
          <li>Organized liquidity</li>
          <li>Legal protection</li>
        </ul>
      </section>
    </InfoPageLayout>
  );
};
