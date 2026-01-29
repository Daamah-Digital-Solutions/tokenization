import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Are returns guaranteed?",
    answer: "No. Capimax RT does not guarantee returns, income, or capital preservation. All investments involve risk."
  },
  {
    question: "Can I sell my investment at any time?",
    answer: "Not necessarily. You may list units on the secondary market, but successful sale depends on demand, pricing, and compliance approval."
  },
  {
    question: "What is the minimum investment amount?",
    answer: "Minimum investment amounts vary by asset and are defined in each offering's documentation."
  },
  {
    question: "Do I own the physical property?",
    answer: "No. Investors hold economic or contractual rights in an SPV, not direct land registry ownership, unless explicitly stated."
  },
  {
    question: "What happens if the property is sold?",
    answer: "If the underlying asset is sold, proceeds are distributed according to the SPV agreements after settling obligations."
  },
  {
    question: "What is the difference between the secondary market and a liquidity provider?",
    answer: "Secondary Market: Investor-to-investor trading based on supply and demand. Liquidity Provider: An optional third party offering conditional liquidity under predefined terms."
  },
  {
    question: "Is Capimax RT a bank or financial institution?",
    answer: "No. Capimax RT is a technology platform and does not operate as a bank, broker, or financial intermediary."
  },
  {
    question: "Is tokenization legally recognized?",
    answer: "Tokenization legality depends on jurisdiction and structure. Capimax RT operates within applicable legal frameworks and disclosures."
  }
];

export const FAQPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFAQs = faqItems.filter(
    item =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.map((item, index) => (
            <div
              key={index}
              className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <span className="font-semibold text-slate-900 dark:text-white pr-4">
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
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
          ))}
        </div>

        {filteredFAQs.length === 0 && (
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
