import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Shield,
  Building2,
  FileText,
  Link as LinkIcon,
  Wallet,
  Lock,
  Scale,
  Globe,
  Users,
  CheckCircle,
  Layers,
  BookOpen,
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';

interface AccordionSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export const StructurePage: React.FC = () => {
  const [openSections, setOpenSections] = useState<string[]>(['opening']);
  const [tocOpen, setTocOpen] = useState(false);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      // Open the section if it's not already open
      if (!openSections.includes(id)) {
        setOpenSections(prev => [...prev, id]);
      }

      // Wait for the section to open before scrolling
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    setTocOpen(false);
  };

  const sections: AccordionSection[] = [
    {
      id: 'opening',
      title: 'Opening Statement & Framework',
      icon: BookOpen,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Comprehensive Regulatory Guide – CapiMax Real Estate Tokenization Platform
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              CapiMax Real Estate Tokenization Platform represents an integrated technological infrastructure designed to redefine real estate ownership through a digital framework built on blockchain technology and smart contracts, while utilizing the SPV (Special Purpose Vehicle) model as a structured legal framework to safeguard the rights of all stakeholders and enhance transparency and regulatory compliance.
            </p>
          </div>

          <div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              The platform operates as an advanced technology-driven ecosystem, providing a comprehensive operational and regulatory structure for tokenizing real estate assets and enabling fractional ownership for owners, while ensuring governance, process control, and risk management in accordance with clearly defined and auditable standards.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Technical and Operational Framework
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              CapiMax is built upon:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Blockchain technology to record tokenized ownership and ensure data immutability.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Smart contracts to automate issuance, allocation, distribution of returns, and transfer processes.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  The SPV model to legally segregate assets and link each real estate property to an independent legal entity, ensuring clarity of ownership and obligations.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  A centralized governance and control infrastructure enabling operational management, compliance oversight, and real-time reporting with full transparency.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Stakeholder Control Tools and Management
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              The platform provides advanced dashboards and operational tools tailored to each participant within the ecosystem:
            </p>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  For Property Owners / Developers:
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Management of property listing and onboarding</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Monitoring subscription levels</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Access to performance and return reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Oversight of distributions and governance mechanisms</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  For Owners:
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Monitoring tokenized ownership portfolios</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Access to periodic performance and return analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Execution of internal buy/sell transactions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Management of exit and reinvestment processes</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  For Administrative and Regulatory Oversight:
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Internal compliance and supervisory tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Financial and operational reporting systems</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Digital verification and audit mechanisms</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Internal Secondary Market
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              CapiMax provides a regulated internal secondary marketplace, enabling owners to exit or restructure their positions by trading tokenized real estate shares within a secure and controlled environment. This mechanism enhances liquidity and reduces traditional holding periods commonly associated with real estate ownership.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Strategic Objective
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              The platform aims to:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Transform real estate assets into divisible, tradable digital ownership instruments.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Increase asset management efficiency through automation and digital governance.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Expand the global owner base via a structured and transparent technological model.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Achieve a balanced integration between technological innovation and regulatory compliance.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This Regulatory Guide serves as the comprehensive reference for the legal, technical, and operational framework governing the CapiMax Platform. It defines the rules, standards, and procedures that regulate platform operations and all participating stakeholders, ensuring transparency, fairness, and protection of ownership interests.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'spv-wyoming',
      title: 'SPV Company in Wyoming – General Framework',
      icon: Building2,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              1. Definition of an SPV (Special Purpose Vehicle)
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              An SPV is an independent legal entity established for a specific and clearly defined purpose. In the Capi Max RT model, this purpose includes:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Owning tokenized assets or the rights associated with them
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Or holding equity in local companies that legally own real estate assets
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Or managing the legal relationship between the real estate asset, the smart contract, and the digital token
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              2. Reasons for Choosing the State of Wyoming – United States
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              Wyoming was selected for the following reasons:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Advanced legal recognition of digital assets and smart contracts
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Strong protection of owner rights
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Regulatory clarity in dealing with SPVs and blockchain technology
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  A legal environment supportive of transparency and governance
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Acceptance of blockchain as a reliable registry for ownership and rights
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              3. Role of the U.S.-Based SPV Company
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              The SPV registered in Wyoming performs the following roles:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Acts as the parent and organizing entity for tokenization
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Legally anchors and links the smart contract to the company
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Represents owners legally
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Links the digital token to the real-world asset
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Enters into agreements with: The local company owning the property, The developer, The property owner
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              4. Relationship Between: The U.S. SPV, The local company (e.g., in the UAE), The real estate asset
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              The relationship is structured as follows:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  The local company legally owns the property in its jurisdiction
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  The U.S. SPV: Owns shares in the local company, Or holds documented contractual rights over the property
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  The smart contract is registered in the name of the SPV
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  The real estate token represents a real, documented legal right
                </span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'legal-structure',
      title: 'Legal Structure and Agreements',
      icon: FileText,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              1. Core Agreements
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              There is a set of interconnected agreements, including:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  An agreement between the SPV and the local company
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  An ownership agreement with the property owner or developer
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  An owner representation agreement
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  A legal linkage between all agreements and the smart contract
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              2. Benefits of This Structure
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Risk segregation</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Owner protection</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Prevention of manipulation</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Assurance that the token is not fictitious</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Legal compliance across multiple jurisdictions</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'spv-deep-dive',
      title: 'Dedicated SPV Section – How It Works',
      icon: Shield,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              1. SPV Advantages
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Independent legal entity</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Does not engage in activities beyond the specific asset</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Protects owners from operational risks</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Facilitates verification and auditing</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              2. SPV and Decentralization
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              Decentralization here is functional and controlled:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Legal management is centralized (via the SPV)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Records and transactions are decentralized (via blockchain)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  No single party has unilateral control over ownership or records
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              3. How Do We Ensure the Token Represents a Real Asset?
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Existence of a legally established SPV</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">A documented ownership agreement</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Proven ownership or contractual rights</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">A smart contract linked to the agreement</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Full transparency on the blockchain</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              4. Owner Rights
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Fractional ownership rights</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Right to returns</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Right to access information</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Right to exit (liquidity)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Protection under U.S. law</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              5. SPV Connection to Smart Contracts and Wallets
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The SPV is the token issuer</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The smart contract operates under its name</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Wallets represent owners</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Every transaction is fully traceable</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Question: Is the platform allowed to list and tokenize properties in any country worldwide?
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              <strong>Answer:</strong> Yes, the platform can list properties in different countries, provided full compliance with the local real estate registration laws of each respective jurisdiction.
            </p>

            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
              How Our Model Works
            </h5>
            <div className="space-y-4">
              <div>
                <h6 className="font-semibold text-gray-900 dark:text-white mb-2">
                  1. Legal Property Registration
                </h6>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  The property is officially registered in the country where it is physically located, in accordance with the local land registry and property laws. This constitutes the primary legal proof of ownership.
                </p>
              </div>

              <div>
                <h6 className="font-semibold text-gray-900 dark:text-white mb-2">
                  2. Legal Structure (U.S.-Based SPV)
                </h6>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  A Special Purpose Vehicle (SPV) is established in the United States to structure and manage the economic rights associated with the asset. Owner rights are governed under U.S. corporate law and formal shareholder agreements.
                </p>
              </div>

              <div>
                <h6 className="font-semibold text-gray-900 dark:text-white mb-2">
                  3. Tokenization and Smart Contracts (United States)
                </h6>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                  The digital tokens and smart contracts are issued and executed within a regulated legal and technical framework in the United States, ensuring:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Clear documentation of ownership interests</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Automated distribution of returns</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Controlled transfer mechanisms</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">Full operational transparency</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                Are Owner Rights Protected?
              </h5>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Yes. Protection is structured across three clear layers:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Formally registered property ownership in the country of the asset
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    A U.S.-based SPV governing owner rights under corporate law
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Legally binding agreements supported by secure technological infrastructure
                  </span>
                </li>
              </ul>

              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                In this model, blockchain serves as an operational and record-keeping layer, while legal protection is grounded in formal property registration and a structured U.S. legal entity.
              </p>

              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                Additionally, the platform currently operates exclusively within jurisdictions that maintain clear regulatory and legal frameworks for real estate ownership and purchase activities.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'smart-contracts',
      title: 'Smart Contracts – Features and Regulatory Role',
      icon: Layers,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              1. What Is a Smart Contract?
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              A legal-technical program that:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Automatically executes terms</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Cannot be manipulated</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Is linked to the real-world asset</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              2. Smart Contract Features
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Automated execution</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Reduced disputes</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">No reliance on intermediaries</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Permanent documentation</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              3. Role of the Smart Contract in:
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Distributing returns</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Recording ownership</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Compliance enforcement</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Managing exit mechanisms</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'wallets',
      title: 'Connection to Owner Wallets',
      icon: Wallet,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              1. Role of the Wallet
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Proof of ownership</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Receiving returns</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Executing voting (if applicable)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Exiting owned properties</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              2. Verification
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Every wallet is linked to a KYC-verified identity
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Every token is traceable</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Ownership cannot be manipulated</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'blockchain',
      title: 'Blockchain – The Backbone of Transparency',
      icon: LinkIcon,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Blockchain Advantages
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Immutable ledger</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Full transparency</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Fast execution</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Lower costs</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Higher liquidity</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Reduced risks</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'investment-agreement',
      title: 'Ownership Agreement with Seller and Developer',
      icon: FileText,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              1. Role of the Agreement
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Transfer of rights</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Definition of obligations</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Owner protection</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Linkage to the smart contract</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              2. Documentation
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Legally notarized</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Linked to the smart contract ID</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Linked to the SPV</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Verification of Ownership Rights
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Review of the title deed</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Review of the local company's registry</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Data reconciliation with the ownership agreement</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Linking everything to the smart contract</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Protection of Legal Ownership Rights
            </h4>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Protection Mechanisms:
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Legal registration</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Clear termination clauses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Guarantees</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Digital documentation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'rights-transfer',
      title: 'Mechanism for Transferring Rights',
      icon: Scale,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              How Is This Done?
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Signing an ownership agreement</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The SPV acts as buyer or legal representative</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Legal support provided by the platform</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Direct linkage to tokenization</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Why Is the Ownership Agreement Necessary?
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              Without it:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">The token has no legal standing</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">It is the bridge between the physical asset and the digital representation</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Owners are not protected</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">The platform is not enforceable</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Relationship Between the Ownership Agreement and the SPV
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">The SPV is the legal contracting party</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">The agreement establishes and documents the rights</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">The smart contract executes those rights</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              How Can the Owner Verify All of This on the Platform?
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              On each property page, the owner can find:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">SPV details</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Incorporation documents</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">The ownership agreement</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Smart contract link</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Token address</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Blockchain network</span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Summary
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This model is: <strong>Legal, Regulated, Transparent, Globally scalable</strong>. And it protects the owner, the asset, and the platform.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'investment-agreement-deep',
      title: 'Ownership Agreement – Complete Framework',
      icon: FileText,
      content: (
        <div className="space-y-8">
          <div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              What Is an Ownership Agreement?
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              The Ownership Agreement is the core legal document that:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Transfers ownership rights, usufruct rights, or income rights
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  From the property owner or developer
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  To the SPV company
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  For the benefit of owners represented by real estate tokens
                </span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-900 dark:text-amber-200 font-medium">
                A real estate token is not legal or valid without a valid and duly documented ownership agreement.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              What Exactly Does the Agreement Transfer?
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              Depending on the property model, the agreement transfers one or more of the following:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Full ownership</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Partial (fractional) ownership</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Usufruct rights</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Income rights</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Disposal or sale rights</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Development or operational rights</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Linkage with Autonomous Decentralization
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              Decentralization here does not mean absence of law. Rather:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The law governs the underlying asset</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Blockchain governs the registry and execution</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The smart contract automatically executes the agreement</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">Rights cannot be modified without consent or pre-programmed conditions</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              How to Verify Ownership Rights
            </h4>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  1. Traditional Legal Verification
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Title Deed</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Land registry records</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Commercial registry of the owning company</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Confirmation of absence of mortgages or disputes</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  2. Regulatory Verification via the SPV
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Ensuring that the SPV is legally established and registered</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Authorized to act</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">A principal party to the agreement</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  3. Digital Verification (Blockchain Verification)
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Smart contract address</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Number of tokens</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Type of rights represented</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Issuance date</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">Transaction history</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Regulatory Summary
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This model is: <strong>Legal, Auditable, Protected, Transparent, Regulatory-compliant, Globally scalable</strong>
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'example-uae',
      title: 'Example: Real Estate Tokenized Asset – UAE',
      icon: Globe,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Practical Application: Commercial Property in Dubai Business Bay
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This section demonstrates how the CapiMax regulatory framework applies to a real-world tokenized real estate asset in the United Arab Emirates.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              1. Property Details
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
                <p className="text-gray-900 dark:text-white font-medium">Dubai Business Bay, UAE</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Property Type</p>
                <p className="text-gray-900 dark:text-white font-medium">Commercial Office Building</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Valuation</p>
                <p className="text-gray-900 dark:text-white font-medium">$10,000,000 USD</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tokenization</p>
                <p className="text-gray-900 dark:text-white font-medium">1,000,000 tokens</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              2. Legal Structure
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Property is registered with Dubai Land Department (DLD) in the name of a UAE-based LLC
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  A Wyoming-based SPV owns 100% equity in the UAE LLC
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  The SPV issues digital tokens representing fractional ownership
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              3. Ownership Agreement
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              A formal ownership agreement is executed between:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The original property owner/developer</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The UAE-based LLC (local holding company)</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">The Wyoming SPV (owner representative)</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              4. Smart Contract Implementation
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Deployed on Ethereum blockchain
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Linked to SPV company registration
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  References ownership agreement ID
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Automates rental income distribution
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              5. Owner Rights
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              Token holders receive:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Proportional rental income (distributed quarterly)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Proportional capital appreciation upon sale
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Right to trade tokens on the internal marketplace
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Access to property performance reports
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              6. Compliance Framework
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Full KYC/AML verification for all owners
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Compliance with UAE real estate regulations
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Adherence to U.S. corporate governance standards
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Regular third-party audits
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              7. Documentation Available to Owners
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Dubai Land Department Title Deed</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">UAE LLC Commercial License</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Wyoming SPV Certificate of Incorporation</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Ownership Agreement</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Property Valuation Report</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Smart Contract Source Code</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              8. Risk Mitigation
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Asset segregation through SPV structure
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Insurance coverage on the property
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Professional property management
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Smart contract security audits
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              9. Revenue Distribution Process
            </h4>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Step 1</p>
                <p className="text-gray-900 dark:text-white">Tenants pay rent to UAE LLC bank account</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Step 2</p>
                <p className="text-gray-900 dark:text-white">Operating expenses and reserves deducted</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Step 3</p>
                <p className="text-gray-900 dark:text-white">Net income transferred to SPV distribution wallet</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Step 4</p>
                <p className="text-gray-900 dark:text-white">Smart contract automatically distributes to token holders</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              10. Exit Mechanisms
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Sell tokens on internal marketplace
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Participate in property sale vote
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  Receive proportional proceeds upon sale
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              11. Transparency and Reporting
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              Owners have access to:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Monthly financial statements</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Quarterly performance reports</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Annual audited financials</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Real-time blockchain transaction data</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Property occupancy updates</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">Market valuation updates</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'real-estate-journey',
      title: 'Real Estate Journey Model',
      icon: Building2,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 mb-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              From Physical Asset to Digital Token
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This journey outlines the complete lifecycle of a real estate asset on the CapiMax platform, from initial listing to token distribution and ongoing management.
            </p>
          </div>

          {[
            {
              phase: 'Phase 0',
              title: 'Property Acquisition or Development Initiation',
              items: [
                'Property owner or developer identifies a suitable asset',
                'Initial property valuation conducted',
                'Legal due diligence performed',
                'Property documentation compiled'
              ]
            },
            {
              phase: 'Phase 1',
              title: 'Platform Onboarding',
              items: [
                'Owner/developer submits property details to CapiMax',
                'Platform conducts initial screening',
                'Property evaluation and feasibility assessment',
                'Preliminary tokenization structure proposed'
              ]
            },
            {
              phase: 'Phase 2',
              title: 'Legal Structure Formation',
              items: [
                'Establish local holding company (if required)',
                'Create Wyoming SPV for the specific property',
                'Register SPV with appropriate authorities',
                'Prepare corporate governance documents'
              ]
            },
            {
              phase: 'Phase 3',
              title: 'Ownership Agreement Execution',
              items: [
                'Draft comprehensive ownership agreement',
                'Define rights transfer (ownership, usufruct, income)',
                'Legal review and notarization',
                'Execute agreement between all parties',
                'Link agreement to SPV documentation'
              ]
            },
            {
              phase: 'Phase 4',
              title: 'Property Verification and Documentation',
              items: [
                'Verify title deed and ownership',
                'Confirm absence of liens or encumbrances',
                'Obtain independent property valuation',
                'Compile all legal and financial documentation',
                'Upload documents to secure platform repository'
              ]
            },
            {
              phase: 'Phase 5',
              title: 'Smart Contract Development',
              items: [
                'Design smart contract architecture',
                'Code smart contract with specific property parameters',
                'Link smart contract to SPV and ownership agreement',
                'Conduct internal code review',
                'Third-party security audit',
                'Deploy to testnet for verification'
              ]
            },
            {
              phase: 'Phase 6',
              title: 'Token Economics Design',
              items: [
                'Determine total token supply',
                'Set token price based on property valuation',
                'Define minimum and maximum purchase amounts',
                'Establish revenue distribution mechanism',
                'Configure governance rights (if applicable)',
                'Finalize tokenomics documentation'
              ]
            },
            {
              phase: 'Phase 7',
              title: 'Regulatory Compliance',
              items: [
                'Ensure compliance with local real estate laws',
                'Verify adherence to U.S. securities regulations',
                'Implement KYC/AML requirements',
                'Set up compliance monitoring systems',
                'Obtain necessary regulatory approvals or exemptions'
              ]
            },
            {
              phase: 'Phase 8',
              title: 'Smart Contract Deployment',
              items: [
                'Deploy smart contract to production blockchain',
                'Verify contract on blockchain explorer',
                'Test token minting functionality',
                'Configure administrative controls',
                'Establish multi-signature wallet protections'
              ]
            },
            {
              phase: 'Phase 9',
              title: 'Property Listing on Platform',
              items: [
                'Create detailed property listing page',
                'Upload high-quality images and videos',
                'Publish all legal documentation',
                'Display SPV details and blockchain links',
                'Set ownership timeline and targets',
                'Launch property to owners'
              ]
            },
            {
              phase: 'Phase 10',
              title: 'Ownership Period',
              items: [
                'Owners review property details',
                'Complete KYC verification',
                'Submit purchase commitments',
                'Process payments (fiat or crypto)',
                'Track funding progress against target',
                'Provide regular updates to potential owners'
              ]
            },
            {
              phase: 'Phase 11',
              title: 'Token Minting and Distribution',
              items: [
                'Verify all purchase payments cleared',
                'Execute smart contract token minting function',
                'Distribute tokens to owner wallets',
                'Confirm all token allocations on blockchain',
                'Send confirmation notifications to owners',
                'Update property status to "Active"'
              ]
            },
            {
              phase: 'Phase 12',
              title: 'Ongoing Asset Management',
              items: [
                'Property management and operations',
                'Collect rental income or development proceeds',
                'Automated revenue distribution via smart contract',
                'Regular financial and performance reporting',
                'Facilitate secondary market trading',
                'Property maintenance and value enhancement',
                'Annual valuations and audits',
                'Owner communications and governance',
                'Exit planning and execution when appropriate'
              ]
            }
          ].map((phase, index) => (
            <div key={index} className="border-l-4 border-emerald-500 dark:border-emerald-400 pl-6 pb-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    {index}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                    {phase.phase}
                  </p>
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {phase.title}
                  </h5>
                </div>
              </div>
              <ul className="space-y-2 ml-15">
                {phase.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 mt-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Value of This Model for Owners
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Complete Transparency:</strong> Every step documented and verifiable
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Legal Protection:</strong> Multi-jurisdictional legal framework
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Automated Operations:</strong> Efficient, error-free execution
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Continuous Oversight:</strong> Ongoing management and reporting
                </span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'investor-journey',
      title: 'Owner Journey Model',
      icon: Users,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Your Journey as a CapiMax Owner
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              From registration to returns, this journey outlines the complete owner experience on the CapiMax platform, ensuring clarity and confidence at every step.
            </p>
          </div>

          {[
            {
              phase: 'Phase 1',
              title: 'Discovery and Registration',
              items: [
                'Discover CapiMax platform and real estate tokenization opportunities',
                'Review platform features and available properties',
                'Create account with email and secure password',
                'Agree to Terms of Service and Privacy Policy',
                'Verify email address'
              ]
            },
            {
              phase: 'Phase 2',
              title: 'KYC Verification',
              items: [
                'Submit identity verification documents',
                'Provide proof of address',
                'Complete KYC questionnaire',
                'Await verification (typically 24-48 hours)',
                'Receive KYC approval notification'
              ]
            },
            {
              phase: 'Phase 3',
              title: 'Property Exploration',
              items: [
                'Browse available tokenized properties',
                'Filter by location, type, expected returns, status',
                'Review detailed property information',
                'Examine legal documentation (title deeds, agreements, SPV details)',
                'Analyze financial projections and risk factors'
              ]
            },
            {
              phase: 'Phase 4',
              title: 'Due Diligence',
              items: [
                'Review SPV incorporation documents',
                'Verify smart contract address on blockchain',
                'Study ownership agreement terms',
                'Examine property valuation reports',
                'Understand tokenomics and distribution mechanisms',
                'Assess exit options and liquidity'
              ]
            },
            {
              phase: 'Phase 5',
              title: 'Ownership Decision',
              items: [
                'Select property for purchase',
                'Determine purchase amount',
                'Use ownership calculator to project returns',
                'Review terms and conditions specific to the property',
                'Confirm understanding of risks'
              ]
            },
            {
              phase: 'Phase 6',
              title: 'Wallet Setup (if using crypto)',
              items: [
                'Connect compatible Web3 wallet (MetaMask, WalletConnect, etc.)',
                'Verify wallet connection',
                'Ensure sufficient funds for purchase and gas fees',
                'Link wallet to CapiMax account for future transactions'
              ]
            },
            {
              phase: 'Phase 7',
              title: 'Purchase Execution',
              items: [
                'Select payment method (bank transfer, card, crypto)',
                'Enter purchase amount',
                'Review transaction summary and fees',
                'Confirm purchase commitment',
                'Complete payment authorization'
              ]
            },
            {
              phase: 'Phase 8',
              title: 'Payment Processing',
              items: [
                'Payment verification in progress',
                'Transaction confirmation received',
                'Purchase recorded in user dashboard',
                'Funds held in escrow until tokenization completes',
                'Email confirmation sent with transaction details'
              ]
            },
            {
              phase: 'Phase 9',
              title: 'Token Allocation',
              items: [
                'Property funding target reached',
                'Smart contract executes token minting',
                'Tokens automatically allocated to owner wallet',
                'Blockchain transaction confirmation',
                'Notification of successful token distribution'
              ]
            },
            {
              phase: 'Phase 10',
              title: 'Portfolio Management',
              items: [
                'View token holdings in dashboard',
                'Monitor property performance metrics',
                'Track portfolio value and returns',
                'Access property documents and reports',
                'Receive notifications of property updates'
              ]
            },
            {
              phase: 'Phase 11',
              title: 'Revenue Distribution',
              items: [
                'Property generates rental income or development returns',
                'Smart contract automatically calculates distributions',
                'Proportional revenue sent to owner wallet',
                'Distribution notification with detailed breakdown',
                'View distribution history and tax documentation'
              ]
            },
            {
              phase: 'Phase 12',
              title: 'Secondary Market Trading (Optional)',
              items: [
                'List tokens for sale on internal marketplace',
                'Set asking price and quantity',
                'Review buyer offers',
                'Execute sale transaction',
                'Receive proceeds in chosen currency',
                'Updated portfolio automatically'
              ]
            },
            {
              phase: 'Phase 13',
              title: 'Exit and Repurchase',
              items: [
                'Participate in property sale governance vote (if applicable)',
                'Receive proportional proceeds from property sale',
                'Review final distribution and capital gains',
                'Download tax documents and transaction history',
                'Option to purchase new properties',
                'Withdraw funds or maintain balance for future purchases'
              ]
            }
          ].map((phase, index) => (
            <div key={index} className="border-l-4 border-blue-500 dark:border-blue-400 pl-6 pb-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">
                    {phase.phase}
                  </p>
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {phase.title}
                  </h5>
                </div>
              </div>
              <ul className="space-y-2 ml-15">
                {phase.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mt-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Value Added for the Owner
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Accessibility:</strong> Own premium real estate with lower capital requirements
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Liquidity:</strong> Exit ownership through secondary market trading
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Transparency:</strong> Full visibility into property performance and legal structure
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Automation:</strong> Seamless revenue distribution without manual processes
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Diversification:</strong> Build a diversified real estate portfolio across geographies and asset types
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Legal Protection:</strong> Robust regulatory framework protecting owner rights
                </span>
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <Helmet>
        <title>Regulatory Structure | CapiMax RT</title>
        <meta
          name="description"
          content="Comprehensive regulatory guide for the CapiMax Real Estate Tokenization Platform. Learn about our SPV structure, legal framework, and owner protections."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />

        <main className="relative pt-16">
          {/* Hero Section */}
          <section className="relative min-h-[60vh] overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-r from-emerald-400/10 to-green-400/10 dark:from-emerald-500/20 dark:to-green-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                rotate: [360, 0],
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 dark:from-blue-500/15 dark:to-purple-500/15 rounded-full blur-3xl"
            />

            {/* Floating particles */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [-20, -100, -20],
                  x: [0, Math.sin(i) * 50, 0],
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 8 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                className="absolute"
                style={{
                  left: `${10 + (i * 4) % 80}%`,
                  top: `${20 + (i * 3) % 60}%`
                }}
              >
                <Sparkles className="w-2 h-2 text-blue-400/40 dark:text-cyan-400/60 dark:drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]" />
              </motion.div>
            ))}
          </div>

          {/* Hero Content */}
          <div className="relative z-10 min-h-[60vh] flex items-center">
            <Container>
              <div className="text-center space-y-8 max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-500/30 shadow-xl"
                >
                  <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Regulatory Framework</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white"
                >
                  Comprehensive{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
                    Regulatory Guide
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-light"
                >
                  CapiMax RT - Real Estate Tokenization Platform and Fractional Ownership
                </motion.p>
              </div>
            </Container>
          </div>
        </section>

        {/* Main Content */}
        <Section className="pb-20">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Table of Contents - Desktop Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden lg:block lg:col-span-3"
              >
                <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
                    Contents
                  </h3>
                  <nav className="space-y-2">
                    {sections.map((section, index) => {
                      const Icon = section.icon;
                      const isOpen = openSections.includes(section.id);

                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                            isOpen
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="line-clamp-2">{section.title}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </motion.div>

              {/* Mobile TOC Toggle */}
              <div className="lg:hidden col-span-1">
                <button
                  onClick={() => setTocOpen(!tocOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Menu className="w-4 h-4" />
                    Table of Contents
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${tocOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {tocOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm overflow-hidden"
                    >
                      <nav className="space-y-2">
                        {sections.map((section) => {
                          const Icon = section.icon;
                          const isOpen = openSections.includes(section.id);

                          return (
                            <button
                              key={section.id}
                              onClick={() => scrollToSection(section.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                isOpen
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              <span>{section.title}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="lg:col-span-9 space-y-4"
              >
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  const isOpen = openSections.includes(section.id);

                  return (
                    <div
                      key={section.id}
                      ref={(el) => (sectionRefs.current[section.id] = el)}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {section.title}
                            </h3>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                              {section.content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </Container>
        </Section>

        {/* CTA Section */}
        <Section variant="dark" size="2xl" backgroundElements animated>
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Heading level="h2" size="4xl" align="center" className="text-white">
                Ready to Own Tokenized Real Estate?
              </Heading>
              <Text
                variant="bodyLarge"
                align="center"
                className="max-w-2xl mx-auto text-white/90"
                as="p"
              >
                Join CapiMax and access premium real estate opportunities with full regulatory protection and transparency.
              </Text>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <a
                href="/register"
                className="inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-100 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
              >
                Get Started Now
                <ArrowUpRight className="ml-3 w-5 h-5" />
              </a>
              <a
                href="/properties"
                className="inline-flex items-center justify-center border border-white/30 text-white hover:bg-white/10 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
              >
                Explore Properties
                <Building2 className="ml-3 w-5 h-5" />
              </a>
            </div>
          </div>
        </Section>
        </main>

        <Footer />
      </div>
    </>
  );
};
