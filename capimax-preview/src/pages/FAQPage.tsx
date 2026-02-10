import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: "Investment & Operational FAQ",
    items: [
      {
        question: "1. What is real estate tokenization?",
        answer: (
          <div>
            <p>Real estate tokenization is the process of:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Converting the economic value of a property into digital tokens</li>
              <li>Each token represents a defined fractional interest or financial right</li>
              <li>Tokens are issued via documented smart contracts</li>
            </ul>
            <p className="mt-2">Tokenization enables:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Fractional ownership</li>
              <li>Easier entry and exit</li>
              <li>Higher liquidity compared to traditional real estate investments</li>
            </ul>
          </div>
        )
      },
      {
        question: "2. What types of properties are available on the platform?",
        answer: (
          <div>
            <p>The platform supports a wide range of real estate assets, including:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Residential properties</li>
              <li>Commercial properties</li>
              <li>Office buildings</li>
              <li>Hospitality and tourism assets</li>
              <li>Development projects</li>
              <li>Mixed-use properties</li>
            </ul>
            <p className="mt-2">Assets are listed across multiple cities and countries to enhance diversification.</p>
          </div>
        )
      },
      {
        question: "3. What is the Income Model?",
        answer: (
          <div>
            <p>This model applies to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Completed</li>
              <li>Leased</li>
              <li>Income-generating properties</li>
            </ul>
            <p className="mt-2">Investors receive:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Periodic returns (monthly or quarterly)</li>
              <li>Automatically distributed via smart contracts</li>
              <li>Withdrawable or reinvestable</li>
            </ul>
          </div>
        )
      },
      {
        question: "4. What is the Development Model?",
        answer: (
          <div>
            <p>This investment model focuses on:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Early-stage entry at lower prices</li>
              <li>No periodic income</li>
              <li>Capital appreciation through structured development phases</li>
            </ul>
            <p className="mt-2">It includes:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Predefined pricing rounds</li>
              <li>Fixed timelines</li>
              <li>Documented development plans</li>
            </ul>
          </div>
        )
      },
      {
        question: "5. What is the Installment Model?",
        answer: (
          <div>
            <p>This model allows investors to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Acquire tokens from the initial stage</li>
              <li>Pay through structured installments</li>
              <li>Without bank interest</li>
            </ul>
            <p className="mt-2">Key features:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Financial flexibility</li>
              <li>Exit at any time</li>
              <li>Transfer of remaining obligations to a new buyer upon resale</li>
            </ul>
          </div>
        )
      },
      {
        question: "6. Does the platform operate globally?",
        answer: (
          <div>
            <p>Yes. The platform operates globally by:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Establishing a separate SPV for each country</li>
              <li>Complying with local regulations</li>
              <li>Preventing cross-border asset commingling</li>
            </ul>
          </div>
        )
      },
      {
        question: "7. Is the global framework legally regulated?",
        answer: (
          <div>
            <p>Yes. The framework complies with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Local corporate and real estate laws</li>
              <li>Investment regulations</li>
              <li>AML (Anti-Money Laundering) rules</li>
              <li>KYC (Know Your Customer) requirements</li>
            </ul>
          </div>
        )
      },
      {
        question: "8. Are assets and documents reviewed and verified?",
        answer: (
          <div>
            <p>Yes. Each asset undergoes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Independent valuation</li>
              <li>Full legal due diligence</li>
              <li>Document verification (ownership, permits, contracts)</li>
              <li>Technical and operational review</li>
            </ul>
            <p className="mt-2">Assets are listed only after full approval.</p>
          </div>
        )
      },
      {
        question: "9. How can I access the details, documents, and smart contract for verification?",
        answer: "All property details, documents, smart contract, and reports are available on the property page. You can verify them using the provided verification links and methods."
      },
      {
        question: "10. What happens to the tokens after purchase?",
        answer: "After purchase, the tokens along with the related property documents are transferred to your platform wallet. You can access your wallet at any time to verify the tokens and documents."
      },
      {
        question: "11. Who manages the property and distributes returns?",
        answer: (
          <div>
            <p>Property management is handled by:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Professional asset management companies</li>
              <li>Licensed developers</li>
              <li>Authorized property managers</li>
            </ul>
            <p className="mt-2">Returns:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Flow through dedicated asset accounts</li>
              <li>Are distributed automatically according to smart contract terms</li>
            </ul>
          </div>
        )
      },
      {
        question: "12. Can I sell tokens on the secondary market?",
        answer: (
          <div>
            <p><strong>Development property tokens:</strong> Yes, you can sell at any time. The decision is yours, whether to exit early or wait for potentially higher returns when subsequent rounds are offered, depending on the property and its development plan.</p>
            <p className="mt-2"><strong>Under-construction property tokens with installment plans:</strong> Yes, you can sell the token at any time according to the secondary market rules and available exit mechanisms.</p>
            <p className="mt-2"><strong>Ready-to-move-in property tokens:</strong> Yes, the token can be sold at any time on the secondary market.</p>
          </div>
        )
      },
      {
        question: "13. Are all fees transparent?",
        answer: (
          <div>
            <p>Yes, all fees are fully transparent. The complete breakdown of fees for each property is provided on the property page. In addition, all financial details and fees are documented in the property's white paper within the property documents. This includes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Tokenization and listing fees borne by the property owner</li>
              <li>SPV-related fees</li>
              <li>Investor fees such as purchase fees, annual management fees, exit fees, or any other applicable charges under any name</li>
            </ul>
            <p className="mt-2">There are no hidden fees, and the platform ensures full clarity for all parties.</p>
          </div>
        )
      },
      {
        question: "14. What is an SPV, and what is its role within the Capimax RT Platform?",
        answer: (
          <div>
            <p>An SPV (Special Purpose Vehicle) is an independent legal entity established for a single, specific purpose.</p>
            <p className="mt-2">Within the Capimax RT platform, that purpose is to:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Legally hold a specific real estate asset and manage investor rights related to that asset in a legally segregated structure.</li>
            </ul>
            <p className="mt-2">Each property listed on the platform is linked to a dedicated SPV. Assets and liabilities of one property are never mixed with those of another.</p>
          </div>
        )
      },
      {
        question: "15. What is the role of the SPV within the platform?",
        answer: (
          <div>
            <p>The SPV plays a central role in the legal structuring of tokenized real estate investments. Its responsibilities include:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Legally owning the real estate asset or holding its associated economic rights</li>
              <li>Issuing real estate tokens representing investor shares</li>
              <li>Receiving revenues generated by the property (rental income / sale proceeds)</li>
              <li>Distributing returns to investors in accordance with the Investment Agreement</li>
              <li>Isolating risk, ensuring that liabilities do not transfer between properties or to the platform itself</li>
              <li>Maintaining legal continuity, even if the platform ceases operations</li>
            </ul>
          </div>
        )
      },
      {
        question: "16. What is the relationship between the SPV and the smart contract?",
        answer: (
          <div>
            <p>The SPV's Investment Agreement is legally linked to the smart contract.</p>
            <p className="mt-2">The smart contract executes:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Ownership registration</li>
              <li>Yield distribution</li>
              <li>Exit conditions</li>
            </ul>
            <p className="mt-2">Meanwhile, legal ownership and investor rights remain secured within the SPV, outside the blockchain.</p>
            <p className="mt-2">The smart contract is an execution mechanism; the SPV is the legal protection framework.</p>
          </div>
        )
      },
      {
        question: "17. What happens to investor funds if the platform shuts down?",
        answer: (
          <div>
            <p>If the Capimax RT platform is suspended or shut down for any reason:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Investor funds are not lost</li>
              <li>Tokens remain owned by the investor</li>
              <li>The SPV remains legally active</li>
              <li>The real estate asset remains owned by the SPV</li>
              <li>Investor rights remain legally enforceable and can be managed outside the platform</li>
            </ul>
            <p className="mt-2">Possible outcomes include:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Appointing a new asset or property manager</li>
              <li>Liquidating the asset and distributing proceeds</li>
              <li>Continuing yield distribution according to the Investment Agreement</li>
            </ul>
          </div>
        )
      },
      {
        question: "18. Why is the SPV model used instead of direct property ownership?",
        answer: (
          <div>
            <p>Using an SPV provides:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Complete legal separation between the platform, investors, and the underlying property</li>
              <li>Easier regulatory compliance</li>
              <li>Protection of investors from operational risk</li>
              <li>Cross-border investment capability</li>
              <li>Clearer tax and legal treatment</li>
            </ul>
          </div>
        )
      },
      {
        question: "19. What are the key advantages of using an SPV?",
        answer: (
          <div>
            <p>Key benefits include:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Strong legal protection for investors</li>
              <li>Risk isolation between assets</li>
              <li>Global operability</li>
              <li>Clear definition of rights and obligations</li>
              <li>Legal integration with smart contracts</li>
              <li>Flexible exit and ownership transfer</li>
              <li>Auditability and regulatory readiness</li>
            </ul>
            <p className="mt-2">Yes, each property is represented by a fully independent SPV to ensure:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>No commingling of funds</li>
              <li>No risk contagion between assets</li>
              <li>Full transparency of returns</li>
              <li>Simplified auditing and accounting</li>
            </ul>
          </div>
        )
      },
      {
        question: "20. Is the SPV registered and regulated?",
        answer: (
          <div>
            <p>Yes. SPVs are incorporated in legally suitable jurisdictions (such as Wyoming, USA) and are subject to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Corporate law</li>
              <li>Tax regulations</li>
              <li>Executed Investment Agreements</li>
              <li>Ongoing legal oversight</li>
            </ul>
          </div>
        )
      },
      {
        question: "21. What is the role of the smart contract?",
        answer: (
          <div>
            <p>The smart contract serves as the core system by:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Locking investment terms</li>
              <li>Recording digital ownership</li>
              <li>Distributing returns</li>
              <li>Managing exits</li>
              <li>Preventing unauthorized changes</li>
            </ul>
            <p className="mt-2">Smart contracts are:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Transparent</li>
              <li>Tamper-resistant</li>
              <li>Binding on all parties</li>
            </ul>
          </div>
        )
      },
      {
        question: "22. Is the platform allowed to list and tokenize properties in any country worldwide?",
        answer: (
          <div>
            <p>Yes, the platform can list properties in different countries, provided full compliance with the local real estate registration laws of each respective jurisdiction.</p>
            <h4 className="font-semibold mt-3 mb-1">How Our Model Works:</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li><strong>Legal Property Registration:</strong> The property is officially registered in the country where it is physically located, in accordance with the local land registry and property laws. This constitutes the primary legal proof of ownership.</li>
              <li><strong>Legal Structure (U.S.-Based SPV):</strong> A Special Purpose Vehicle (SPV) is established in the United States to structure and manage the economic rights associated with the asset. Investor rights are governed under U.S. corporate law and formal shareholder agreements.</li>
              <li><strong>Tokenization and Smart Contracts (United States):</strong> The digital tokens and smart contracts are issued and executed within a regulated legal and technical framework in the United States, ensuring clear documentation of ownership interests, automated distribution of returns, controlled transfer mechanisms, and full operational transparency.</li>
            </ol>
          </div>
        )
      },
      {
        question: "23. Are investor rights protected?",
        answer: (
          <div>
            <p>Yes. Protection is structured across three clear layers:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Formally registered property ownership in the country of the asset</li>
              <li>A U.S.-based SPV governing investor rights under corporate law</li>
              <li>Legally binding agreements supported by secure technological infrastructure</li>
            </ul>
            <p className="mt-2">In this model, blockchain serves as an operational and record-keeping layer, while legal protection is grounded in formal property registration and a structured U.S. legal entity.</p>
          </div>
        )
      },
      {
        question: "24. What does this mean for investors?",
        answer: (
          <div>
            <ul className="list-disc pl-5 space-y-1">
              <li>The underlying real estate asset is legally registered.</li>
              <li>Investor rights are contractually defined within a U.S. SPV structure.</li>
              <li>Ownership management and transfers operate through a transparent digital system.</li>
            </ul>
            <p className="mt-2">Accordingly, the platform does not rely on unregulated environments; rather, it integrates: Local property law + U.S. legal structuring + regulated technological infrastructure.</p>
          </div>
        )
      }
    ]
  },
  {
    title: "Legal FAQ",
    items: [
      {
        question: "1. What is the legal framework under which the platform operates?",
        answer: (
          <div>
            <p>The platform operates within a structured legal framework based on:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The establishment of independent legal entities (Special Purpose Vehicles - SPVs) for each real estate asset or investment project.</li>
              <li>Each SPV being governed by the laws of the jurisdiction in which the underlying asset is located.</li>
              <li>Full compliance with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations.</li>
              <li>Complete legal segregation between the platform's operational assets and investors' assets.</li>
            </ul>
          </div>
        )
      },
      {
        question: "2. Is my investment linked to the platform or to the underlying asset?",
        answer: (
          <div>
            <p>Your investment is legally linked to the underlying real estate asset or investment project through:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your ownership interest in the SPV that holds the asset.</li>
              <li>Or through investment tokens that represent defined economic and financial rights in that asset.</li>
            </ul>
            <p className="mt-2">The platform acts solely as a technical and operational intermediary and does not own or custody investor funds.</p>
          </div>
        )
      },
      {
        question: "3. What happens if the platform is shut down or ceases operations?",
        answer: (
          <div>
            <p>In the event that the platform is shut down for any reason (regulatory, commercial, or strategic):</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Investor funds are not lost.</li>
              <li>All assets remain legally owned by the relevant SPV.</li>
              <li>Investors retain full legal rights to their ownership interests, any accrued or future returns, and sale or exit rights in accordance with the asset's terms.</li>
            </ul>
            <p className="mt-2">One of the following will be implemented:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Appointment of a replacement manager.</li>
              <li>Appointment of a legal trustee or administrator.</li>
              <li>Transfer of asset management to another licensed platform or legal entity.</li>
            </ul>
          </div>
        )
      },
      {
        question: "4. Can the platform dispose of or control my funds or assets?",
        answer: (
          <div>
            <p>No.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Investor funds are not included in the platform's operational balance sheet.</li>
              <li>Assets are held under independent SPV ownership.</li>
              <li>The platform has no legal right to sell the assets, pledge or encumber them, or dispose of them.</li>
            </ul>
            <p className="mt-2">Except strictly in accordance with the governing contracts and applicable regulatory approvals.</p>
          </div>
        )
      },
      {
        question: "5. Is the platform responsible for real estate market price fluctuations?",
        answer: (
          <div>
            <p>The platform does not guarantee profits and does not assume real estate market risk.</p>
            <p className="mt-2">However, the platform applies multiple risk mitigation mechanisms, including:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Geographic diversification.</li>
              <li>Asset-type diversification (residential, commercial, hospitality, etc.).</li>
              <li>Independent professional valuation.</li>
              <li>Legal and technical due diligence.</li>
              <li>Diversified portfolio construction models.</li>
            </ul>
          </div>
        )
      },
      {
        question: "6. What is the legal status of the issued tokens?",
        answer: (
          <div>
            <p>Tokens issued through the platform:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Are not speculative cryptocurrencies.</li>
              <li>Represent financial rights, economic interests, or usage / profit participation rights.</li>
              <li>Are governed by the issuance terms and contractual documentation linked to each asset.</li>
              <li>Do not represent equity or ownership in the platform itself.</li>
            </ul>
          </div>
        )
      },
      {
        question: "7. Can I transfer my tokens or ownership interests to an external wallet such as MetaMask?",
        answer: (
          <div>
            <p>This depends on the type of asset, the token structure, and the applicable regulatory framework.</p>
            <p className="mt-2">Where permitted:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Tokens may be transferred to compatible external wallets.</li>
              <li>Investors retain full control over their tokens.</li>
            </ul>
            <p className="mt-2">Trading is restricted to approved secondary markets or licensed platforms compliant with applicable laws.</p>
          </div>
        )
      },
      {
        question: "8. Can I sell my ownership interest outside the platform?",
        answer: (
          <div>
            <p><strong>Now:</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Through the approved secondary market.</li>
              <li>Through the LP market in platform.</li>
              <li>Or with prior legal and regulatory approval.</li>
            </ul>
            <p className="mt-2"><strong>In the Future:</strong> In exchange tokens platforms.</p>
            <p className="mt-2">This is to ensure regulatory compliance, protection of other investors, and prevention of unlawful or non-compliant trading.</p>
          </div>
        )
      },
      {
        question: "9. What happens if one of the involved parties (Owner, Developer, Broker) becomes insolvent?",
        answer: (
          <div>
            <p>Each party operates under a separate contractual framework.</p>
            <p className="mt-2">Insolvency of any party:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Does not directly affect investor ownership rights.</li>
              <li>Triggers contractual protection mechanisms.</li>
              <li>Allows for replacement of the affected party if required.</li>
            </ul>
            <p className="mt-2">Assets remain legally held by the SPV.</p>
          </div>
        )
      },
      {
        question: "10. How are disputes resolved?",
        answer: (
          <div>
            <p>Disputes are resolved in accordance with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The governing law of the SPV's jurisdiction.</li>
              <li>Or international commercial arbitration.</li>
              <li>Or competent courts, as specified in the relevant agreements.</li>
            </ul>
            <p className="mt-2">This is clearly defined in Terms and Conditions, Investment Agreements, and Offering documentation.</p>
          </div>
        )
      },
      {
        question: "11. Is the platform subject to regulatory oversight?",
        answer: (
          <div>
            <p>Yes. Depending on its scope of operation, the platform is subject to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Local and international laws.</li>
              <li>Financial compliance requirements.</li>
              <li>Regulatory authorities governing digital assets or real estate investments.</li>
            </ul>
            <p className="mt-2">The platform also regularly updates its legal and compliance policies and adapts to future regulatory developments.</p>
          </div>
        )
      },
      {
        question: "12. Can investment terms be changed after subscription?",
        answer: (
          <div>
            <p>No. Investment terms for any asset cannot be altered after subscription.</p>
            <p className="mt-2">All terms are fixed, documented, and legally binding on all parties.</p>
            <p className="mt-2">Any future changes apply only to newly listed assets and do not affect existing investments.</p>
          </div>
        )
      },
      {
        question: "13. Who bears the ultimate legal liability?",
        answer: (
          <div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each SPV bears legal responsibility for its underlying asset.</li>
              <li>Investor liability is strictly limited to the amount invested.</li>
              <li>The platform is responsible solely for technology, operations, and platform management.</li>
              <li>The platform assumes no liability beyond its legally defined role.</li>
            </ul>
          </div>
        )
      },
      {
        question: "14. Is my investment legally protected in case of global expansion?",
        answer: (
          <div>
            <p>Yes.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>A separate SPV is established for each country.</li>
              <li>Full compliance with local laws in each jurisdiction.</li>
              <li>No commingling of assets across countries.</li>
              <li>Transparent, jurisdiction-specific reporting.</li>
            </ul>
          </div>
        )
      },
      {
        question: "15. Can this legal framework be modified in the future?",
        answer: (
          <div>
            <p>Yes, provided that:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Changes are required by new laws or regulations.</li>
              <li>Existing investor rights are not adversely affected.</li>
              <li>Full transparency and prior disclosure are maintained.</li>
            </ul>
          </div>
        )
      }
    ]
  }
];

export const FAQPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const getFilteredSections = () => {
    if (!searchTerm) return faqSections;

    return faqSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(section => section.items.length > 0);
  };

  const filteredSections = getFilteredSections();

  const toggleFAQ = (key: string) => {
    setOpenIndex(openIndex === key ? null : key);
  };

  const totalItems = filteredSections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <InfoPageLayout
      title="Frequently Asked Questions"
      subtitle="Find answers to common questions about Capimax RT"
    >
      <section className="info-section">
        {/* Search Box */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* FAQ Sections */}
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
              {section.title}
            </h2>
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => {
                const key = `${sectionIndex}-${itemIndex}`;
                return (
                  <div
                    key={key}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(key)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white pr-4">
                        {item.question}
                      </span>
                      <motion.div
                        animate={{ rotate: openIndex === key ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {openIndex === key && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 py-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {totalItems === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No questions found matching your search.
            </p>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Still have questions?
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            If you couldn't find the answer you were looking for, please contact our support team.
          </p>
          <a
            href="mailto:support@capimaxrt.com"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>
      </section>
    </InfoPageLayout>
  );
};
