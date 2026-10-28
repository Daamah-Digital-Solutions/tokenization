import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

import { COMPANY } from '../utils/company';
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
    title: "Ownership & Operational FAQ",
    items: [
      {
        question: "1. What is real estate tokenization?",
        answer: (
          <div>
            <p>Real estate tokenization is the process of:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Converting the economic value of a property into digital tokens</li>
              <li>Each token represents a defined fractional interest or financial right</li>
              <li>Tokens are issued via documented smart contracts</li>
            </ul>
            <p className="mt-2">Tokenization enables:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Fractional ownership</li>
              <li>Easier entry and exit</li>
              <li>Higher liquidity compared to traditional real estate purchases</li>
            </ul>
          </div>
        )
      },
      {
        question: "2. What types of properties are available on the platform?",
        answer: (
          <div>
            <p>The platform supports a wide range of real estate assets, including:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Completed</li>
              <li>Leased</li>
              <li>Income-generating properties</li>
            </ul>
            <p className="mt-2">Owners receive:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <p>This ownership model focuses on:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Early-stage entry at lower prices</li>
              <li>No periodic income</li>
              <li>Capital appreciation through structured development phases</li>
            </ul>
            <p className="mt-2">It includes:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <p>This model allows owners to:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Acquire tokens from the initial stage</li>
              <li>Pay through structured installments</li>
              <li>Without bank interest</li>
            </ul>
            <p className="mt-2">Key features:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Local corporate and real estate laws</li>
              <li>Ownership regulations</li>
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Professional asset management companies</li>
              <li>Licensed developers</li>
              <li>Authorized property managers</li>
            </ul>
            <p className="mt-2">Returns:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Tokenization and listing fees borne by the property owner</li>
              <li>SPV-related fees</li>
              <li>Owner fees such as purchase fees, annual management fees, exit fees, or any other applicable charges under any name</li>
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
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Legally hold a specific real estate asset and manage owner rights related to that asset in a legally segregated structure.</li>
            </ul>
            <p className="mt-2">Each property listed on the platform is linked to a dedicated SPV. Assets and liabilities of one property are never mixed with those of another.</p>
          </div>
        )
      },
      {
        question: "15. What is the role of the SPV within the platform?",
        answer: (
          <div>
            <p>The SPV plays a central role in the legal structuring of tokenized real estate ownership. Its responsibilities include:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Legally owning the real estate asset or holding its associated economic rights</li>
              <li>Issuing real estate tokens representing owner shares</li>
              <li>Receiving revenues generated by the property (rental income / sale proceeds)</li>
              <li>Distributing returns to owners in accordance with the Ownership Agreement</li>
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
            <p>The SPV's Ownership Agreement is legally linked to the smart contract.</p>
            <p className="mt-2">The smart contract executes:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Ownership registration</li>
              <li>Yield distribution</li>
              <li>Exit conditions</li>
            </ul>
            <p className="mt-2">Meanwhile, legal ownership and owner rights remain secured within the SPV, outside the blockchain.</p>
            <p className="mt-2">The smart contract is an execution mechanism; the SPV is the legal protection framework.</p>
          </div>
        )
      },
      {
        question: "17. What happens to owner funds if the platform shuts down?",
        answer: (
          <div>
            <p>If the Capimax RT platform is suspended or shut down for any reason:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Owner funds are not lost</li>
              <li>Tokens remain owned by the owner</li>
              <li>The SPV remains legally active</li>
              <li>The real estate asset remains owned by the SPV</li>
              <li>Owner rights remain legally enforceable and can be managed outside the platform</li>
            </ul>
            <p className="mt-2">Possible outcomes include:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Appointing a new asset or property manager</li>
              <li>Liquidating the asset and distributing proceeds</li>
              <li>Continuing yield distribution according to the Ownership Agreement</li>
            </ul>
          </div>
        )
      },
      {
        question: "18. Why is the SPV model used instead of direct property ownership?",
        answer: (
          <div>
            <p>Using an SPV provides:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Complete legal separation between the platform, owners, and the underlying property</li>
              <li>Easier regulatory compliance</li>
              <li>Protection of owners from operational risk</li>
              <li>Cross-border ownership capability</li>
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Strong legal protection for owners</li>
              <li>Risk isolation between assets</li>
              <li>Global operability</li>
              <li>Clear definition of rights and obligations</li>
              <li>Legal integration with smart contracts</li>
              <li>Flexible exit and ownership transfer</li>
              <li>Auditability and regulatory readiness</li>
            </ul>
            <p className="mt-2">Yes, each property is represented by a fully independent SPV to ensure:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Corporate law</li>
              <li>Tax regulations</li>
              <li>Executed Ownership Agreements</li>
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Locking ownership terms</li>
              <li>Recording digital ownership</li>
              <li>Distributing returns</li>
              <li>Managing exits</li>
              <li>Preventing unauthorized changes</li>
            </ul>
            <p className="mt-2">Smart contracts are:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <ol className="list-decimal ps-5 space-y-2">
              <li><strong>Legal Property Registration:</strong> The property is officially registered in the country where it is physically located, in accordance with the local land registry and property laws. This constitutes the primary legal proof of ownership.</li>
              <li><strong>Legal Structure (U.S.-Based SPV):</strong> A Special Purpose Vehicle (SPV) is established in the United States to structure and manage the economic rights associated with the asset. Owner rights are governed under U.S. corporate law and formal shareholder agreements.</li>
              <li><strong>Tokenization and Smart Contracts (United States):</strong> The digital tokens and smart contracts are issued and executed within a regulated legal and technical framework in the United States, ensuring clear documentation of ownership interests, automated distribution of returns, controlled transfer mechanisms, and full operational transparency.</li>
            </ol>
          </div>
        )
      },
      {
        question: "23. Are owner rights protected?",
        answer: (
          <div>
            <p>Yes. Protection is structured across three clear layers:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Formally registered property ownership in the country of the asset</li>
              <li>A U.S.-based SPV governing owner rights under corporate law</li>
              <li>Legally binding agreements supported by secure technological infrastructure</li>
            </ul>
            <p className="mt-2">In this model, blockchain serves as an operational and record-keeping layer, while legal protection is grounded in formal property registration and a structured U.S. legal entity.</p>
          </div>
        )
      },
      {
        question: "24. What does this mean for owners?",
        answer: (
          <div>
            <ul className="list-disc ps-5 space-y-1">
              <li>The underlying real estate asset is legally registered.</li>
              <li>Owner rights are contractually defined within a U.S. SPV structure.</li>
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>The establishment of independent legal entities (Special Purpose Vehicles - SPVs) for each real estate asset or ownership project.</li>
              <li>Each SPV being governed by the laws of the jurisdiction in which the underlying asset is located.</li>
              <li>Full compliance with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations.</li>
              <li>Complete legal segregation between the platform's operational assets and owners' assets.</li>
            </ul>
          </div>
        )
      },
      {
        question: "2. Is my purchase linked to the platform or to the underlying asset?",
        answer: (
          <div>
            <p>Your purchase is legally linked to the underlying real estate asset or ownership project through:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Your ownership interest in the SPV that holds the asset.</li>
              <li>Or through ownership tokens that represent defined economic and financial rights in that asset.</li>
            </ul>
            <p className="mt-2">The platform acts solely as a technical and operational intermediary and does not own or custody owner funds.</p>
          </div>
        )
      },
      {
        question: "3. What happens if the platform is shut down or ceases operations?",
        answer: (
          <div>
            <p>In the event that the platform is shut down for any reason (regulatory, commercial, or strategic):</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Owner funds are not lost.</li>
              <li>All assets remain legally owned by the relevant SPV.</li>
              <li>Owners retain full legal rights to their ownership interests, any accrued or future returns, and sale or exit rights in accordance with the asset's terms.</li>
            </ul>
            <p className="mt-2">One of the following will be implemented:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Owner funds are not included in the platform's operational balance sheet.</li>
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
            <ul className="list-disc ps-5 mt-1 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
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
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Tokens may be transferred to compatible external wallets.</li>
              <li>Owners retain full control over their tokens.</li>
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
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Through the approved secondary market.</li>
              <li>Through the LP market in platform.</li>
              <li>Or with prior legal and regulatory approval.</li>
            </ul>
            <p className="mt-2"><strong>In the Future:</strong> In exchange tokens platforms.</p>
            <p className="mt-2">This is to ensure regulatory compliance, protection of other owners, and prevention of unlawful or non-compliant trading.</p>
          </div>
        )
      },
      {
        question: "9. What happens if one of the involved parties (Owner, Developer, Broker) becomes insolvent?",
        answer: (
          <div>
            <p>Each party operates under a separate contractual framework.</p>
            <p className="mt-2">Insolvency of any party:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Does not directly affect owner ownership rights.</li>
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>The governing law of the SPV's jurisdiction.</li>
              <li>Or international commercial arbitration.</li>
              <li>Or competent courts, as specified in the relevant agreements.</li>
            </ul>
            <p className="mt-2">This is clearly defined in Terms and Conditions, Ownership Agreements, and Offering documentation.</p>
          </div>
        )
      },
      {
        question: "11. Is the platform subject to regulatory oversight?",
        answer: (
          <div>
            <p>Yes. Depending on its scope of operation, the platform is subject to:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Local and international laws.</li>
              <li>Financial compliance requirements.</li>
              <li>Regulatory authorities governing digital assets or real estate ownership.</li>
            </ul>
            <p className="mt-2">The platform also regularly updates its legal and compliance policies and adapts to future regulatory developments.</p>
          </div>
        )
      },
      {
        question: "12. Can ownership terms be changed after subscription?",
        answer: (
          <div>
            <p>No. Ownership terms for any asset cannot be altered after subscription.</p>
            <p className="mt-2">All terms are fixed, documented, and legally binding on all parties.</p>
            <p className="mt-2">Any future changes apply only to newly listed assets and do not affect existing purchases.</p>
          </div>
        )
      },
      {
        question: "13. Who bears the ultimate legal liability?",
        answer: (
          <div>
            <ul className="list-disc ps-5 space-y-1">
              <li>Each SPV bears legal responsibility for its underlying asset.</li>
              <li>Owner liability is strictly limited to the amount paid.</li>
              <li>The platform is responsible solely for technology, operations, and platform management.</li>
              <li>The platform assumes no liability beyond its legally defined role.</li>
            </ul>
          </div>
        )
      },
      {
        question: "14. Is my purchase legally protected in case of global expansion?",
        answer: (
          <div>
            <p>Yes.</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
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
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>Changes are required by new laws or regulations.</li>
              <li>Existing owner rights are not adversely affected.</li>
              <li>Full transparency and prior disclosure are maintained.</li>
            </ul>
          </div>
        )
      }
    ]
  }
];

const faqSectionsAr: FAQSection[] = [
  {
    title: "الأسئلة الشائعة حول التملّك والتشغيل",
    items: [
      {
        question: "1. ما هو ترميز العقارات؟",
        answer: (
          <div>
            <p>ترميز العقارات هو عملية تقوم على:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>تحويل القيمة الاقتصادية للعقار إلى رموز رقمية</li>
              <li>تمثّل كل حصة نسبة ملكية جزئية محددة أو حقًا ماليًا محددًا</li>
              <li>تُصدَر الحصص عبر عقود ذكية موثّقة</li>
            </ul>
            <p className="mt-2">ويتيح الترميز:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>الملكية الجزئية</li>
              <li>سهولة الدخول والخروج</li>
              <li>سيولة أعلى مقارنةً بشراء العقارات بالطرق التقليدية</li>
            </ul>
          </div>
        )
      },
      {
        question: "2. ما أنواع العقارات المتاحة على المنصة؟",
        answer: (
          <div>
            <p>تدعم المنصة مجموعة واسعة من الأصول العقارية، منها:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>العقارات السكنية</li>
              <li>العقارات التجارية</li>
              <li>المباني المكتبية</li>
              <li>أصول الضيافة والسياحة</li>
              <li>المشاريع التطويرية</li>
              <li>العقارات متعددة الاستخدامات</li>
            </ul>
            <p className="mt-2">تُدرَج الأصول في مدن ودول متعددة لتعزيز التنويع.</p>
          </div>
        )
      },
      {
        question: "3. ما هو نموذج الدخل؟",
        answer: (
          <div>
            <p>ينطبق هذا النموذج على العقارات:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>المكتملة</li>
              <li>المؤجَّرة</li>
              <li>المدرّة للدخل</li>
            </ul>
            <p className="mt-2">يحصل الملّاك على:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>عوائد دورية (شهرية أو ربع سنوية)</li>
              <li>تُوزَّع تلقائيًا عبر العقود الذكية</li>
              <li>قابلة للسحب أو لإعادة الاستثمار</li>
            </ul>
          </div>
        )
      },
      {
        question: "4. ما هو نموذج التطوير؟",
        answer: (
          <div>
            <p>يركّز نموذج التملّك هذا على:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>الدخول المبكر بأسعار أقل</li>
              <li>عدم وجود دخل دوري</li>
              <li>نمو رأس المال عبر مراحل تطوير منظّمة</li>
            </ul>
            <p className="mt-2">ويشمل:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>جولات تسعير محددة مسبقًا</li>
              <li>جداول زمنية ثابتة</li>
              <li>خطط تطوير موثّقة</li>
            </ul>
          </div>
        )
      },
      {
        question: "5. ما هو نموذج الأقساط؟",
        answer: (
          <div>
            <p>يتيح هذا النموذج للملّاك:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>امتلاك الحصص منذ المرحلة الأولى</li>
              <li>السداد عبر أقساط منظّمة</li>
              <li>دون فوائد بنكية</li>
            </ul>
            <p className="mt-2">أبرز المزايا:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>مرونة مالية</li>
              <li>إمكانية الخروج في أي وقت</li>
              <li>نقل الالتزامات المتبقية إلى المشتري الجديد عند إعادة البيع</li>
            </ul>
          </div>
        )
      },
      {
        question: "6. هل تعمل المنصة على مستوى عالمي؟",
        answer: (
          <div>
            <p>نعم. تعمل المنصة عالميًا من خلال:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>تأسيس شركة ذات غرض خاص (SPV) مستقلة لكل دولة</li>
              <li>الالتزام باللوائح المحلية</li>
              <li>منع خلط الأصول عبر الحدود</li>
            </ul>
          </div>
        )
      },
      {
        question: "7. هل الإطار العالمي منظَّم قانونيًا؟",
        answer: (
          <div>
            <p>نعم. يلتزم الإطار بما يلي:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>قوانين الشركات والعقارات المحلية</li>
              <li>لوائح الملكية</li>
              <li>قواعد مكافحة غسل الأموال (AML)</li>
              <li>متطلبات التحقق من الهوية (KYC)</li>
            </ul>
          </div>
        )
      },
      {
        question: "8. هل تتم مراجعة الأصول والمستندات والتحقق منها؟",
        answer: (
          <div>
            <p>نعم. يخضع كل أصل إلى:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>تقييم مستقل</li>
              <li>عناية واجبة قانونية كاملة</li>
              <li>التحقق من المستندات (الملكية، التراخيص، العقود)</li>
              <li>مراجعة فنية وتشغيلية</li>
            </ul>
            <p className="mt-2">لا تُدرَج الأصول إلا بعد اعتمادها بالكامل.</p>
          </div>
        )
      },
      {
        question: "9. كيف يمكنني الاطلاع على التفاصيل والمستندات والعقد الذكي للتحقق منها؟",
        answer: "جميع تفاصيل العقار ومستنداته وعقده الذكي وتقاريره متاحة في صفحة العقار. ويمكنك التحقق منها باستخدام روابط وأساليب التحقق المتوفّرة."
      },
      {
        question: "10. ماذا يحدث للحصص بعد الشراء؟",
        answer: "بعد الشراء، تُنقل الحصص مع مستندات العقار ذات الصلة إلى محفظتك على المنصة. ويمكنك الدخول إلى محفظتك في أي وقت للتحقق من الحصص والمستندات."
      },
      {
        question: "11. من يدير العقار ويوزّع العوائد؟",
        answer: (
          <div>
            <p>تتولّى إدارة العقار:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>شركات متخصصة في إدارة الأصول</li>
              <li>مطوّرون مرخّصون</li>
              <li>مديرو عقارات معتمدون</li>
            </ul>
            <p className="mt-2">العوائد:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>تمرّ عبر حسابات مخصّصة للأصل</li>
              <li>تُوزَّع تلقائيًا وفقًا لشروط العقد الذكي</li>
            </ul>
          </div>
        )
      },
      {
        question: "12. هل يمكنني بيع الحصص في السوق الثانوية؟",
        answer: (
          <div>
            <p><strong>حصص العقارات التطويرية:</strong> نعم، يمكنك البيع في أي وقت. والقرار لك، سواء بالخروج المبكر أو الانتظار لتحقيق عوائد قد تكون أعلى عند طرح الجولات اللاحقة، وذلك بحسب العقار وخطة تطويره.</p>
            <p className="mt-2"><strong>حصص العقارات قيد الإنشاء بنظام الأقساط:</strong> نعم، يمكنك بيع الحصة في أي وقت وفقًا لقواعد السوق الثانوية وآليات الخروج المتاحة.</p>
            <p className="mt-2"><strong>حصص العقارات الجاهزة للسكن:</strong> نعم، يمكن بيع الحصة في أي وقت في السوق الثانوية.</p>
          </div>
        )
      },
      {
        question: "13. هل جميع الرسوم شفافة؟",
        answer: (
          <div>
            <p>نعم، جميع الرسوم شفافة بالكامل. ويُعرض التفصيل الكامل لرسوم كل عقار في صفحة العقار. كما تُوثَّق جميع التفاصيل المالية والرسوم في الورقة البيضاء الخاصة بالعقار ضمن مستنداته. ويشمل ذلك:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>رسوم الترميز والإدراج التي يتحمّلها مالك العقار</li>
              <li>الرسوم المتعلقة بالشركة ذات الغرض الخاص (SPV)</li>
              <li>رسوم المالك مثل رسوم الشراء، ورسوم الإدارة السنوية، ورسوم الخروج، أو أي رسوم أخرى مطبّقة تحت أي مسمّى</li>
            </ul>
            <p className="mt-2">لا توجد رسوم خفية، وتضمن المنصة الوضوح التام لجميع الأطراف.</p>
          </div>
        )
      },
      {
        question: "14. ما هي الشركة ذات الغرض الخاص (SPV)، وما دورها في منصة كابي مكس RT؟",
        answer: (
          <div>
            <p>الشركة ذات الغرض الخاص (SPV) هي كيان قانوني مستقل يُؤسَّس لغرض واحد محدد.</p>
            <p className="mt-2">وفي منصة كابي مكس RT، يتمثّل هذا الغرض في:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>الحيازة القانونية لأصل عقاري محدد وإدارة حقوق الملّاك المتعلقة به ضمن هيكل منفصل قانونيًا.</li>
            </ul>
            <p className="mt-2">يرتبط كل عقار مُدرَج على المنصة بشركة ذات غرض خاص (SPV) مخصّصة له. ولا تختلط أصول عقار والتزاماته أبدًا بأصول عقار آخر والتزاماته.</p>
          </div>
        )
      },
      {
        question: "15. ما دور الشركة ذات الغرض الخاص (SPV) داخل المنصة؟",
        answer: (
          <div>
            <p>تؤدي الشركة ذات الغرض الخاص (SPV) دورًا محوريًا في الهيكلة القانونية لملكية العقارات المرمَّزة. وتشمل مسؤولياتها:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>التملّك القانوني للأصل العقاري أو حيازة الحقوق الاقتصادية المرتبطة به</li>
              <li>إصدار حصص عقارية تمثّل أنصبة الملّاك</li>
              <li>استلام الإيرادات التي يحققها العقار (الدخل الإيجاري / عائدات البيع)</li>
              <li>توزيع العوائد على الملّاك وفقًا لاتفاقية الملكية</li>
              <li>عزل المخاطر، بما يضمن عدم انتقال الالتزامات بين العقارات أو إلى المنصة نفسها</li>
              <li>الحفاظ على الاستمرارية القانونية، حتى في حال توقّف المنصة عن العمل</li>
            </ul>
          </div>
        )
      },
      {
        question: "16. ما العلاقة بين الشركة ذات الغرض الخاص (SPV) والعقد الذكي؟",
        answer: (
          <div>
            <p>ترتبط اتفاقية الملكية الخاصة بالشركة ذات الغرض الخاص (SPV) قانونيًا بالعقد الذكي.</p>
            <p className="mt-2">ويتولّى العقد الذكي تنفيذ:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>تسجيل الملكية</li>
              <li>توزيع العوائد</li>
              <li>شروط الخروج</li>
            </ul>
            <p className="mt-2">في حين تظل الملكية القانونية وحقوق الملّاك مصونة داخل الشركة ذات الغرض الخاص، خارج البلوك تشين.</p>
            <p className="mt-2">العقد الذكي هو آلية التنفيذ، والشركة ذات الغرض الخاص هي إطار الحماية القانونية.</p>
          </div>
        )
      },
      {
        question: "17. ماذا يحدث لأموال الملّاك إذا أُغلقت المنصة؟",
        answer: (
          <div>
            <p>إذا عُلّقت منصة كابي مكس RT أو أُغلقت لأي سبب:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>لا تضيع أموال الملّاك</li>
              <li>تظل الحصص مملوكة للمالك</li>
              <li>تظل الشركة ذات الغرض الخاص (SPV) قائمة قانونيًا</li>
              <li>يظل الأصل العقاري مملوكًا للشركة ذات الغرض الخاص</li>
              <li>تظل حقوق الملّاك نافذة قانونيًا ويمكن إدارتها خارج المنصة</li>
            </ul>
            <p className="mt-2">ومن النتائج المحتملة:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>تعيين مدير أصول أو مدير عقار جديد</li>
              <li>تصفية الأصل وتوزيع العائدات</li>
              <li>مواصلة توزيع العوائد وفقًا لاتفاقية الملكية</li>
            </ul>
          </div>
        )
      },
      {
        question: "18. لماذا يُستخدم نموذج الشركة ذات الغرض الخاص (SPV) بدلًا من التملّك المباشر للعقار؟",
        answer: (
          <div>
            <p>يوفّر استخدام الشركة ذات الغرض الخاص (SPV):</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>فصلًا قانونيًا تامًا بين المنصة والملّاك والعقار الأساسي</li>
              <li>سهولة أكبر في الامتثال التنظيمي</li>
              <li>حماية الملّاك من المخاطر التشغيلية</li>
              <li>إمكانية التملّك عبر الحدود</li>
              <li>معاملة ضريبية وقانونية أوضح</li>
            </ul>
          </div>
        )
      },
      {
        question: "19. ما أبرز مزايا استخدام الشركة ذات الغرض الخاص (SPV)؟",
        answer: (
          <div>
            <p>تشمل أبرز المزايا:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>حماية قانونية قوية للملّاك</li>
              <li>عزل المخاطر بين الأصول</li>
              <li>إمكانية العمل عالميًا</li>
              <li>تحديد واضح للحقوق والالتزامات</li>
              <li>تكامل قانوني مع العقود الذكية</li>
              <li>مرونة في الخروج ونقل الملكية</li>
              <li>قابلية التدقيق والجاهزية التنظيمية</li>
            </ul>
            <p className="mt-2">نعم، يُمثَّل كل عقار بشركة ذات غرض خاص (SPV) مستقلة تمامًا لضمان:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>عدم خلط الأموال</li>
              <li>عدم انتقال المخاطر بين الأصول</li>
              <li>شفافية كاملة في العوائد</li>
              <li>تبسيط التدقيق والمحاسبة</li>
            </ul>
          </div>
        )
      },
      {
        question: "20. هل الشركة ذات الغرض الخاص (SPV) مسجّلة وخاضعة للتنظيم؟",
        answer: (
          <div>
            <p>نعم. تُؤسَّس الشركات ذات الغرض الخاص في ولايات قضائية مناسبة قانونيًا (مثل ولاية وايومنغ في الولايات المتحدة الأمريكية)، وتخضع إلى:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>قانون الشركات</li>
              <li>اللوائح الضريبية</li>
              <li>اتفاقيات الملكية المُبرمة</li>
              <li>رقابة قانونية مستمرة</li>
            </ul>
          </div>
        )
      },
      {
        question: "21. ما دور العقد الذكي؟",
        answer: (
          <div>
            <p>يعمل العقد الذكي بوصفه النظام الأساسي من خلال:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>تثبيت شروط الملكية</li>
              <li>تسجيل الملكية الرقمية</li>
              <li>توزيع العوائد</li>
              <li>إدارة عمليات الخروج</li>
              <li>منع التغييرات غير المصرّح بها</li>
            </ul>
            <p className="mt-2">العقود الذكية:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>شفّافة</li>
              <li>مقاومة للتلاعب</li>
              <li>ملزِمة لجميع الأطراف</li>
            </ul>
          </div>
        )
      },
      {
        question: "22. هل يُسمح للمنصة بإدراج العقارات وترميزها في أي دولة حول العالم؟",
        answer: (
          <div>
            <p>نعم، يمكن للمنصة إدراج عقارات في دول مختلفة، شريطة الالتزام التام بقوانين التسجيل العقاري المحلية في كل ولاية قضائية.</p>
            <h4 className="font-semibold mt-3 mb-1">كيف يعمل نموذجنا:</h4>
            <ol className="list-decimal ps-5 space-y-2">
              <li><strong>التسجيل القانوني للعقار:</strong> يُسجَّل العقار رسميًا في الدولة التي يقع فيها فعليًا، وفقًا لسجل الأراضي وقوانين الملكية المحلية. ويُشكّل ذلك الإثبات القانوني الأساسي للملكية.</li>
              <li><strong>الهيكل القانوني (شركة ذات غرض خاص SPV مقرّها الولايات المتحدة):</strong> تُؤسَّس شركة ذات غرض خاص (SPV) في الولايات المتحدة لهيكلة الحقوق الاقتصادية المرتبطة بالأصل وإدارتها. وتخضع حقوق الملّاك لقانون الشركات الأمريكي واتفاقيات المساهمين الرسمية.</li>
              <li><strong>الترميز والعقود الذكية (الولايات المتحدة):</strong> تُصدَر الرموز الرقمية وتُنفَّذ العقود الذكية ضمن إطار قانوني وتقني منظَّم في الولايات المتحدة، بما يضمن توثيقًا واضحًا لحصص الملكية، وتوزيعًا مؤتمتًا للعوائد، وآليات نقل مضبوطة، وشفافية تشغيلية كاملة.</li>
            </ol>
          </div>
        )
      },
      {
        question: "23. هل حقوق الملّاك محمية؟",
        answer: (
          <div>
            <p>نعم. تُبنى الحماية عبر ثلاث طبقات واضحة:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>ملكية عقارية مسجّلة رسميًا في دولة الأصل</li>
              <li>شركة ذات غرض خاص (SPV) مقرّها الولايات المتحدة تحكم حقوق الملّاك بموجب قانون الشركات</li>
              <li>اتفاقيات ملزِمة قانونيًا مدعومة ببنية تحتية تقنية آمنة</li>
            </ul>
            <p className="mt-2">في هذا النموذج، تؤدي البلوك تشين دور طبقة تشغيلية وطبقة لحفظ السجلات، بينما تستند الحماية القانونية إلى التسجيل الرسمي للعقار وإلى كيان قانوني أمريكي منظَّم.</p>
          </div>
        )
      },
      {
        question: "24. ماذا يعني ذلك بالنسبة للملّاك؟",
        answer: (
          <div>
            <ul className="list-disc ps-5 space-y-1">
              <li>الأصل العقاري الأساسي مسجّل قانونيًا.</li>
              <li>حقوق الملّاك محددة تعاقديًا ضمن هيكل شركة ذات غرض خاص (SPV) أمريكية.</li>
              <li>تتم إدارة الملكية وعمليات النقل عبر نظام رقمي شفّاف.</li>
            </ul>
            <p className="mt-2">وعليه، لا تعتمد المنصة على بيئات غير منظَّمة، بل تجمع بين: قانون الملكية المحلي + الهيكلة القانونية الأمريكية + بنية تحتية تقنية منظَّمة.</p>
          </div>
        )
      }
    ]
  },
  {
    title: "الأسئلة القانونية الشائعة",
    items: [
      {
        question: "1. ما الإطار القانوني الذي تعمل المنصة بموجبه؟",
        answer: (
          <div>
            <p>تعمل المنصة ضمن إطار قانوني منظَّم يقوم على:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>تأسيس كيانات قانونية مستقلة (شركات ذات غرض خاص - SPV) لكل أصل عقاري أو مشروع تملّك.</li>
              <li>خضوع كل شركة ذات غرض خاص لقوانين الولاية القضائية التي يقع فيها الأصل الأساسي.</li>
              <li>الالتزام التام بلوائح مكافحة غسل الأموال (AML) والتحقق من الهوية (KYC).</li>
              <li>الفصل القانوني التام بين الأصول التشغيلية للمنصة وأصول الملّاك.</li>
            </ul>
          </div>
        )
      },
      {
        question: "2. هل يرتبط شرائي بالمنصة أم بالأصل الأساسي؟",
        answer: (
          <div>
            <p>يرتبط شراؤك قانونيًا بالأصل العقاري الأساسي أو بمشروع التملّك من خلال:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>حصة ملكيتك في الشركة ذات الغرض الخاص (SPV) التي تحوز الأصل.</li>
              <li>أو من خلال حصص ملكية تمثّل حقوقًا اقتصادية ومالية محددة في ذلك الأصل.</li>
            </ul>
            <p className="mt-2">تعمل المنصة حصرًا بوصفها وسيطًا تقنيًا وتشغيليًا، ولا تمتلك أموال الملّاك ولا تحتفظ بها.</p>
          </div>
        )
      },
      {
        question: "3. ماذا يحدث إذا أُغلقت المنصة أو توقّفت عن العمل؟",
        answer: (
          <div>
            <p>في حال إغلاق المنصة لأي سبب (تنظيمي أو تجاري أو استراتيجي):</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>لا تضيع أموال الملّاك.</li>
              <li>تظل جميع الأصول مملوكة قانونيًا للشركة ذات الغرض الخاص (SPV) المعنية.</li>
              <li>يحتفظ الملّاك بكامل حقوقهم القانونية في حصص ملكيتهم، وفي أي عوائد مستحقة أو مستقبلية، وفي حقوق البيع أو الخروج وفقًا لشروط الأصل.</li>
            </ul>
            <p className="mt-2">وسيُنفَّذ أحد الإجراءات التالية:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>تعيين مدير بديل.</li>
              <li>تعيين أمين أو مدير قانوني.</li>
              <li>نقل إدارة الأصل إلى منصة أخرى مرخّصة أو كيان قانوني آخر.</li>
            </ul>
          </div>
        )
      },
      {
        question: "4. هل يمكن للمنصة التصرّف في أموالي أو أصولي أو السيطرة عليها؟",
        answer: (
          <div>
            <p>لا.</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>لا تُدرَج أموال الملّاك في الميزانية التشغيلية للمنصة.</li>
              <li>تُحاز الأصول تحت ملكية مستقلة للشركة ذات الغرض الخاص (SPV).</li>
              <li>لا تملك المنصة أي حق قانوني في بيع الأصول أو رهنها أو تحميلها بأي أعباء أو التصرّف فيها.</li>
            </ul>
            <p className="mt-2">إلا في حدود العقود الحاكمة والموافقات التنظيمية المعمول بها حصرًا.</p>
          </div>
        )
      },
      {
        question: "5. هل المنصة مسؤولة عن تقلّبات أسعار السوق العقارية؟",
        answer: (
          <div>
            <p>لا تضمن المنصة تحقيق أرباح، ولا تتحمّل مخاطر السوق العقارية.</p>
            <p className="mt-2">ومع ذلك، تطبّق المنصة آليات متعددة للحد من المخاطر، منها:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>التنويع الجغرافي.</li>
              <li>التنويع حسب نوع الأصل (سكني، تجاري، ضيافة، وغيرها).</li>
              <li>التقييم المهني المستقل.</li>
              <li>العناية الواجبة القانونية والفنية.</li>
              <li>نماذج متنوعة لبناء المحافظ الاستثمارية.</li>
            </ul>
          </div>
        )
      },
      {
        question: "6. ما الوضع القانوني للحصص المُصدَرة؟",
        answer: (
          <div>
            <p>الحصص المُصدَرة عبر المنصة:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>ليست عملات رقمية مضاربية.</li>
              <li>تمثّل حقوقًا مالية، أو مصالح اقتصادية، أو حقوق انتفاع / مشاركة في الأرباح.</li>
              <li>تخضع لشروط الإصدار والمستندات التعاقدية المرتبطة بكل أصل.</li>
              <li>لا تمثّل حقوق ملكية أو مساهمة في المنصة نفسها.</li>
            </ul>
          </div>
        )
      },
      {
        question: "7. هل يمكنني نقل حصصي أو حصص ملكيتي إلى محفظة خارجية مثل MetaMask؟",
        answer: (
          <div>
            <p>يعتمد ذلك على نوع الأصل، وهيكل الحصة، والإطار التنظيمي المعمول به.</p>
            <p className="mt-2">وحيثما يُسمح بذلك:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>يمكن نقل الحصص إلى محافظ خارجية متوافقة.</li>
              <li>يحتفظ الملّاك بالسيطرة الكاملة على حصصهم.</li>
            </ul>
            <p className="mt-2">يقتصر التداول على الأسواق الثانوية المعتمدة أو المنصات المرخّصة الملتزمة بالقوانين المعمول بها.</p>
          </div>
        )
      },
      {
        question: "8. هل يمكنني بيع حصة ملكيتي خارج المنصة؟",
        answer: (
          <div>
            <p><strong>حاليًا:</strong></p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>من خلال السوق الثانوية المعتمدة.</li>
              <li>من خلال سوق مزوّدي السيولة داخل المنصة.</li>
              <li>أو بموافقة قانونية وتنظيمية مسبقة.</li>
            </ul>
            <p className="mt-2"><strong>مستقبلًا:</strong> عبر منصات تداول الرموز الرقمية.</p>
            <p className="mt-2">وذلك لضمان الامتثال التنظيمي، وحماية الملّاك الآخرين، ومنع التداول غير المشروع أو غير الملتزم.</p>
          </div>
        )
      },
      {
        question: "9. ماذا يحدث إذا أُعسر أحد الأطراف المعنية (المالك، المطوّر، الوسيط)؟",
        answer: (
          <div>
            <p>يعمل كل طرف ضمن إطار تعاقدي منفصل.</p>
            <p className="mt-2">إعسار أي طرف:</p>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>لا يؤثر بشكل مباشر على حقوق ملكية الملّاك.</li>
              <li>يُفعّل آليات الحماية التعاقدية.</li>
              <li>يتيح استبدال الطرف المتأثر عند الحاجة.</li>
            </ul>
            <p className="mt-2">تظل الأصول محوزة قانونيًا لدى الشركة ذات الغرض الخاص (SPV).</p>
          </div>
        )
      },
      {
        question: "10. كيف تُسوّى النزاعات؟",
        answer: (
          <div>
            <p>تُسوّى النزاعات وفقًا لما يلي:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>القانون الحاكم للولاية القضائية للشركة ذات الغرض الخاص (SPV).</li>
              <li>أو التحكيم التجاري الدولي.</li>
              <li>أو المحاكم المختصة، على النحو المحدد في الاتفاقيات ذات الصلة.</li>
            </ul>
            <p className="mt-2">ويُحدَّد ذلك بوضوح في الشروط والأحكام، واتفاقيات الملكية، ومستندات الطرح.</p>
          </div>
        )
      },
      {
        question: "11. هل تخضع المنصة لرقابة تنظيمية؟",
        answer: (
          <div>
            <p>نعم. وبحسب نطاق عملها، تخضع المنصة إلى:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>القوانين المحلية والدولية.</li>
              <li>متطلبات الامتثال المالي.</li>
              <li>الجهات التنظيمية المختصة بالأصول الرقمية أو بالملكية العقارية.</li>
            </ul>
            <p className="mt-2">كما تحدّث المنصة سياساتها القانونية وسياسات الامتثال بانتظام، وتتكيّف مع التطورات التنظيمية المستقبلية.</p>
          </div>
        )
      },
      {
        question: "12. هل يمكن تغيير شروط الملكية بعد الاكتتاب؟",
        answer: (
          <div>
            <p>لا. لا يمكن تعديل شروط الملكية لأي أصل بعد الاكتتاب.</p>
            <p className="mt-2">جميع الشروط ثابتة وموثّقة وملزِمة قانونيًا لجميع الأطراف.</p>
            <p className="mt-2">أي تغييرات مستقبلية تنطبق فقط على الأصول المُدرَجة حديثًا، ولا تؤثر على عمليات الشراء القائمة.</p>
          </div>
        )
      },
      {
        question: "13. من يتحمّل المسؤولية القانونية النهائية؟",
        answer: (
          <div>
            <ul className="list-disc ps-5 space-y-1">
              <li>تتحمّل كل شركة ذات غرض خاص (SPV) المسؤولية القانونية عن أصلها الأساسي.</li>
              <li>تقتصر مسؤولية المالك حصرًا على المبلغ المدفوع.</li>
              <li>تقتصر مسؤولية المنصة على التقنية والعمليات وإدارة المنصة.</li>
              <li>لا تتحمّل المنصة أي مسؤولية تتجاوز دورها المحدد قانونيًا.</li>
            </ul>
          </div>
        )
      },
      {
        question: "14. هل شرائي محمي قانونيًا في حال التوسّع عالميًا؟",
        answer: (
          <div>
            <p>نعم.</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>تُؤسَّس شركة ذات غرض خاص (SPV) مستقلة لكل دولة.</li>
              <li>التزام تام بالقوانين المحلية في كل ولاية قضائية.</li>
              <li>عدم خلط الأصول بين الدول.</li>
              <li>تقارير شفّافة خاصة بكل ولاية قضائية.</li>
            </ul>
          </div>
        )
      },
      {
        question: "15. هل يمكن تعديل هذا الإطار القانوني مستقبلًا؟",
        answer: (
          <div>
            <p>نعم، شريطة أن:</p>
            <ul className="list-disc ps-5 mt-2 space-y-1">
              <li>تكون التغييرات مطلوبة بموجب قوانين أو لوائح جديدة.</li>
              <li>لا تتأثر حقوق الملّاك القائمة سلبًا.</li>
              <li>يُحافَظ على الشفافية الكاملة والإفصاح المسبق.</li>
            </ul>
          </div>
        )
      }
    ]
  }
];

export const FAQPage: React.FC = () => {
  const { t, i18n } = useTranslation('pages');
  const isAr = (i18n.language || 'en').startsWith('ar');
  const sections = isAr ? faqSectionsAr : faqSections;
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const getFilteredSections = () => {
    if (!searchTerm) return sections;

    return sections.map(section => ({
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
      title={t('faq.title')}
      subtitle={t('faq.subtitle')}
    >
      <section className="info-section">
        {/* Search Box */}
        <div className="relative mb-8">
          <Search className="absolute start-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('faq.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-12 pe-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                      className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-start"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white pe-4">
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
              {t('faq.noResults')}
            </p>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {t('faq.stillHaveQuestions')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {t('faq.contactText')}
          </p>
          <a
            href={`mailto:${COMPANY.email}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            {t('faq.contactSupport')}
          </a>
        </div>
      </section>
    </InfoPageLayout>
  );
};
