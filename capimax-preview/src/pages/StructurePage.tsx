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
import { useTranslation } from 'react-i18next';

interface AccordionSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export const StructurePage: React.FC = () => {
  const { t } = useTranslation('pages');
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
      title: t('structure.opening.title'),
      icon: BookOpen,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('structure.opening.t1')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.opening.t2')}
            </p>
          </div>

          <div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.opening.t3')}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.opening.t4')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.opening.t5')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t6')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t7')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t8')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t9')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.opening.t10')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.opening.t11')}
            </p>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.opening.t12')}
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t13')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t14')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t15')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t16')}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.opening.t17')}
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t18')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t19')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t20')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t21')}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.opening.t22')}
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t23')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t24')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.opening.t25')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.opening.t26')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.opening.t27')}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.opening.t28')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.opening.t29')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t30')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t31')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t32')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.opening.t33')}
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.opening.t34')}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'spv-wyoming',
      title: t('structure.spvWyoming.title'),
      icon: Building2,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvWyoming.t1')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.spvWyoming.t2')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t3')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t4')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t5')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvWyoming.t6')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.spvWyoming.t7')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t8')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t9')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t10')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t11')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t12')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvWyoming.t13')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.spvWyoming.t14')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t15')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t16')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t17')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t18')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t19')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvWyoming.t20')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.spvWyoming.t21')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t22')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t23')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t24')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvWyoming.t25')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'legal-structure',
      title: t('structure.legalStructure.title'),
      icon: FileText,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.legalStructure.t1')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.legalStructure.t2')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.legalStructure.t3')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.legalStructure.t4')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.legalStructure.t5')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.legalStructure.t6')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.legalStructure.t7')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.legalStructure.t8')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.legalStructure.t9')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.legalStructure.t10')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.legalStructure.t11')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.legalStructure.t12')}</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'spv-deep-dive',
      title: t('structure.spvDeepDive.title'),
      icon: Shield,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvDeepDive.t1')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t4')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t5')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvDeepDive.t6')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.spvDeepDive.t7')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvDeepDive.t8')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvDeepDive.t9')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.spvDeepDive.t10')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvDeepDive.t11')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t12')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t13')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t14')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t15')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t16')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvDeepDive.t17')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t18')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t19')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t20')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t21')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t22')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvDeepDive.t23')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t24')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t25')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t26')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t27')}</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvDeepDive.t28')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              <strong>{t('structure.spvDeepDive.t29')}</strong> {t('structure.spvDeepDive.t30')}
            </p>

            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.spvDeepDive.t31')}
            </h5>
            <div className="space-y-4">
              <div>
                <h6 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.spvDeepDive.t32')}
                </h6>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {t('structure.spvDeepDive.t33')}
                </p>
              </div>

              <div>
                <h6 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.spvDeepDive.t34')}
                </h6>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {t('structure.spvDeepDive.t35')}
                </p>
              </div>

              <div>
                <h6 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.spvDeepDive.t36')}
                </h6>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                  {t('structure.spvDeepDive.t37')}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t38')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t39')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t40')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.spvDeepDive.t41')}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                {t('structure.spvDeepDive.t42')}
              </h5>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                {t('structure.spvDeepDive.t43')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('structure.spvDeepDive.t44')}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('structure.spvDeepDive.t45')}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('structure.spvDeepDive.t46')}
                  </span>
                </li>
              </ul>

              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                {t('structure.spvDeepDive.t47')}
              </p>

              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                {t('structure.spvDeepDive.t48')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'smart-contracts',
      title: t('structure.smartContracts.title'),
      icon: Layers,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.smartContracts.t1')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.smartContracts.t2')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t4')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t5')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.smartContracts.t6')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t7')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t8')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t9')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t10')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.smartContracts.t11')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t12')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t13')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t14')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.smartContracts.t15')}</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'wallets',
      title: t('structure.wallets.title'),
      icon: Wallet,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.wallets.t1')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.wallets.t2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.wallets.t3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.wallets.t4')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.wallets.t5')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.wallets.t6')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.wallets.t7')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.wallets.t8')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.wallets.t9')}</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'blockchain',
      title: t('structure.blockchain.title'),
      icon: LinkIcon,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.blockchain.t1')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.blockchain.t2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.blockchain.t3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.blockchain.t4')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.blockchain.t5')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.blockchain.t6')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.blockchain.t7')}</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'investment-agreement',
      title: t('structure.investmentAgreement.title'),
      icon: FileText,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreement.t1')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.legalStructure.t9')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t4')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreement.t5')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t6')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t7')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t8')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreement.t9')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t10')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t11')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t12')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t13')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreement.t14')}
            </h4>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.investmentAgreement.t15')}
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t16')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t17')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t18')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreement.t19')}</span>
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
      title: t('structure.rightsTransfer.title'),
      icon: Scale,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.rightsTransfer.t1')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t4')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t5')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.rightsTransfer.t6')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.rightsTransfer.t7')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t8')}</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t9')}</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t10')}</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t11')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.rightsTransfer.t12')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t13')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t14')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t15')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.rightsTransfer.t16')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.rightsTransfer.t17')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t18')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t19')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t20')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t21')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t22')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.rightsTransfer.t23')}</span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.rightsTransfer.t24')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.rightsTransfer.t25')} <strong>{t('structure.rightsTransfer.t26')}</strong>{t('structure.rightsTransfer.t27')}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'investment-agreement-deep',
      title: t('structure.investmentAgreementDeep.title'),
      icon: FileText,
      content: (
        <div className="space-y-8">
          <div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('structure.investmentAgreementDeep.t1')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.investmentAgreementDeep.t2')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.investmentAgreementDeep.t3')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.investmentAgreementDeep.t4')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.investmentAgreementDeep.t5')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.investmentAgreementDeep.t6')}
                </span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-900 dark:text-amber-200 font-medium">
                {t('structure.investmentAgreementDeep.t7')}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreementDeep.t8')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.investmentAgreementDeep.t9')}
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t10')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t11')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t12')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t13')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t14')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t15')}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreementDeep.t16')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.investmentAgreementDeep.t17')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t18')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t19')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t20')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t21')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreementDeep.t22')}
            </h4>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.investmentAgreementDeep.t23')}
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t24')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t25')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t26')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t27')}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.investmentAgreementDeep.t28')}
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t29')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t30')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t31')}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('structure.investmentAgreementDeep.t32')}
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t33')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t34')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t35')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t36')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{t('structure.investmentAgreementDeep.t37')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investmentAgreementDeep.t38')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.rightsTransfer.t25')} <strong>{t('structure.investmentAgreementDeep.t39')}</strong>
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'example-uae',
      title: t('structure.exampleUae.title'),
      icon: Globe,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t1')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.exampleUae.t2')}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t3')}
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('structure.exampleUae.t4')}</p>
                <p className="text-gray-900 dark:text-white font-medium">{t('structure.exampleUae.t5')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('structure.exampleUae.t6')}</p>
                <p className="text-gray-900 dark:text-white font-medium">{t('structure.exampleUae.t7')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('structure.exampleUae.t8')}</p>
                <p className="text-gray-900 dark:text-white font-medium">{t('structure.exampleUae.t9')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('structure.exampleUae.t10')}</p>
                <p className="text-gray-900 dark:text-white font-medium">{t('structure.exampleUae.t11')}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t12')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t13')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t14')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t15')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t16')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.exampleUae.t17')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t18')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t19')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t20')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t21')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t22')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t23')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t24')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t25')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t26')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.exampleUae.t27')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t28')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t29')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t30')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t31')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t32')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t33')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t34')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t35')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t36')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t37')}
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t38')}</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t39')}</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t40')}</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t41')}</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t42')}</span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t43')}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t44')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t45')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t46')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t47')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t48')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t49')}
            </h4>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('structure.exampleUae.t50')}</p>
                <p className="text-gray-900 dark:text-white">{t('structure.exampleUae.t51')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('structure.exampleUae.t52')}</p>
                <p className="text-gray-900 dark:text-white">{t('structure.exampleUae.t53')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('structure.exampleUae.t54')}</p>
                <p className="text-gray-900 dark:text-white">{t('structure.exampleUae.t55')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('structure.exampleUae.t56')}</p>
                <p className="text-gray-900 dark:text-white">{t('structure.exampleUae.t57')}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t58')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t59')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t60')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="rtl:rotate-180 w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('structure.exampleUae.t61')}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.exampleUae.t62')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {t('structure.exampleUae.t63')}
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t64')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t65')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t66')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t67')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t68')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{t('structure.exampleUae.t69')}</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'real-estate-journey',
      title: t('structure.realEstateJourney.title'),
      icon: Building2,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 mb-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.realEstateJourney.t1')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.realEstateJourney.t2')}
            </p>
          </div>

          {[
            {
              phase: t('structure.realEstateJourney.t3'),
              title: t('structure.realEstateJourney.t4'),
              items: [
                t('structure.realEstateJourney.t5'),
                t('structure.realEstateJourney.t6'),
                t('structure.realEstateJourney.t7'),
                t('structure.realEstateJourney.t8')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t9'),
              title: t('structure.realEstateJourney.t10'),
              items: [
                t('structure.realEstateJourney.t11'),
                t('structure.realEstateJourney.t12'),
                t('structure.realEstateJourney.t13'),
                t('structure.realEstateJourney.t14')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t15'),
              title: t('structure.realEstateJourney.t16'),
              items: [
                t('structure.realEstateJourney.t17'),
                t('structure.realEstateJourney.t18'),
                t('structure.realEstateJourney.t19'),
                t('structure.realEstateJourney.t20')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t21'),
              title: t('structure.realEstateJourney.t22'),
              items: [
                t('structure.realEstateJourney.t23'),
                t('structure.realEstateJourney.t24'),
                t('structure.realEstateJourney.t25'),
                t('structure.realEstateJourney.t26'),
                t('structure.realEstateJourney.t27')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t28'),
              title: t('structure.realEstateJourney.t29'),
              items: [
                t('structure.realEstateJourney.t30'),
                t('structure.realEstateJourney.t31'),
                t('structure.realEstateJourney.t32'),
                t('structure.realEstateJourney.t33'),
                t('structure.realEstateJourney.t34')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t35'),
              title: t('structure.realEstateJourney.t36'),
              items: [
                t('structure.realEstateJourney.t37'),
                t('structure.realEstateJourney.t38'),
                t('structure.realEstateJourney.t39'),
                t('structure.realEstateJourney.t40'),
                t('structure.realEstateJourney.t41'),
                t('structure.realEstateJourney.t42')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t43'),
              title: t('structure.realEstateJourney.t44'),
              items: [
                t('structure.realEstateJourney.t45'),
                t('structure.realEstateJourney.t46'),
                t('structure.realEstateJourney.t47'),
                t('structure.realEstateJourney.t48'),
                t('structure.realEstateJourney.t49'),
                t('structure.realEstateJourney.t50')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t51'),
              title: t('structure.realEstateJourney.t52'),
              items: [
                t('structure.realEstateJourney.t53'),
                t('structure.realEstateJourney.t54'),
                t('structure.realEstateJourney.t55'),
                t('structure.realEstateJourney.t56'),
                t('structure.realEstateJourney.t57')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t58'),
              title: t('structure.realEstateJourney.t59'),
              items: [
                t('structure.realEstateJourney.t60'),
                t('structure.realEstateJourney.t61'),
                t('structure.realEstateJourney.t62'),
                t('structure.realEstateJourney.t63'),
                t('structure.realEstateJourney.t64')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t65'),
              title: t('structure.realEstateJourney.t66'),
              items: [
                t('structure.realEstateJourney.t67'),
                t('structure.realEstateJourney.t68'),
                t('structure.realEstateJourney.t69'),
                t('structure.realEstateJourney.t70'),
                t('structure.realEstateJourney.t71'),
                t('structure.realEstateJourney.t72')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t73'),
              title: t('structure.realEstateJourney.t74'),
              items: [
                t('structure.realEstateJourney.t75'),
                t('structure.realEstateJourney.t76'),
                t('structure.realEstateJourney.t77'),
                t('structure.realEstateJourney.t78'),
                t('structure.realEstateJourney.t79'),
                t('structure.realEstateJourney.t80')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t81'),
              title: t('structure.realEstateJourney.t82'),
              items: [
                t('structure.realEstateJourney.t83'),
                t('structure.realEstateJourney.t84'),
                t('structure.realEstateJourney.t85'),
                t('structure.realEstateJourney.t86'),
                t('structure.realEstateJourney.t87'),
                t('structure.realEstateJourney.t88')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t89'),
              title: t('structure.realEstateJourney.t90'),
              items: [
                t('structure.realEstateJourney.t91'),
                t('structure.realEstateJourney.t92'),
                t('structure.realEstateJourney.t93'),
                t('structure.realEstateJourney.t94'),
                t('structure.realEstateJourney.t95'),
                t('structure.realEstateJourney.t96'),
                t('structure.realEstateJourney.t97'),
                t('structure.realEstateJourney.t98'),
                t('structure.realEstateJourney.t99')
              ]
            }
          ].map((phase, index) => (
            <div key={index} className="border-s-4 border-emerald-500 dark:border-emerald-400 ps-6 pb-6">
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
              <ul className="space-y-2 ms-15">
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
              {t('structure.realEstateJourney.t100')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.realEstateJourney.t101')}</strong> {t('structure.realEstateJourney.t102')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.realEstateJourney.t103')}</strong> {t('structure.realEstateJourney.t104')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.realEstateJourney.t105')}</strong> {t('structure.realEstateJourney.t106')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.realEstateJourney.t107')}</strong> {t('structure.realEstateJourney.t108')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'investor-journey',
      title: t('structure.investorJourney.title'),
      icon: Users,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('structure.investorJourney.t1')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('structure.investorJourney.t2')}
            </p>
          </div>

          {[
            {
              phase: t('structure.realEstateJourney.t9'),
              title: t('structure.investorJourney.t3'),
              items: [
                t('structure.investorJourney.t4'),
                t('structure.investorJourney.t5'),
                t('structure.investorJourney.t6'),
                t('structure.investorJourney.t7'),
                t('structure.investorJourney.t8')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t15'),
              title: t('structure.investorJourney.t9'),
              items: [
                t('structure.investorJourney.t10'),
                t('structure.investorJourney.t11'),
                t('structure.investorJourney.t12'),
                t('structure.investorJourney.t13'),
                t('structure.investorJourney.t14')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t21'),
              title: t('structure.investorJourney.t15'),
              items: [
                t('structure.investorJourney.t16'),
                t('structure.investorJourney.t17'),
                t('structure.investorJourney.t18'),
                t('structure.investorJourney.t19'),
                t('structure.investorJourney.t20')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t28'),
              title: t('structure.investorJourney.t21'),
              items: [
                t('structure.investorJourney.t22'),
                t('structure.investorJourney.t23'),
                t('structure.investorJourney.t24'),
                t('structure.investorJourney.t25'),
                t('structure.investorJourney.t26'),
                t('structure.investorJourney.t27')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t35'),
              title: t('structure.investorJourney.t28'),
              items: [
                t('structure.investorJourney.t29'),
                t('structure.investorJourney.t30'),
                t('structure.investorJourney.t31'),
                t('structure.investorJourney.t32'),
                t('structure.investorJourney.t33')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t43'),
              title: t('structure.investorJourney.t34'),
              items: [
                t('structure.investorJourney.t35'),
                t('structure.investorJourney.t36'),
                t('structure.investorJourney.t37'),
                t('structure.investorJourney.t38')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t51'),
              title: t('structure.investorJourney.t39'),
              items: [
                t('structure.investorJourney.t40'),
                t('structure.investorJourney.t41'),
                t('structure.investorJourney.t42'),
                t('structure.investorJourney.t43'),
                t('structure.investorJourney.t44')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t58'),
              title: t('structure.investorJourney.t45'),
              items: [
                t('structure.investorJourney.t46'),
                t('structure.investorJourney.t47'),
                t('structure.investorJourney.t48'),
                t('structure.investorJourney.t49'),
                t('structure.investorJourney.t50')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t65'),
              title: t('structure.investorJourney.t51'),
              items: [
                t('structure.investorJourney.t52'),
                t('structure.investorJourney.t53'),
                t('structure.investorJourney.t54'),
                t('structure.investorJourney.t55'),
                t('structure.investorJourney.t56')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t73'),
              title: t('structure.investorJourney.t57'),
              items: [
                t('structure.investorJourney.t58'),
                t('structure.investorJourney.t59'),
                t('structure.investorJourney.t60'),
                t('structure.investorJourney.t61'),
                t('structure.investorJourney.t62')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t81'),
              title: t('structure.investorJourney.t63'),
              items: [
                t('structure.investorJourney.t64'),
                t('structure.investorJourney.t65'),
                t('structure.investorJourney.t66'),
                t('structure.investorJourney.t67'),
                t('structure.investorJourney.t68')
              ]
            },
            {
              phase: t('structure.realEstateJourney.t89'),
              title: t('structure.investorJourney.t69'),
              items: [
                t('structure.investorJourney.t70'),
                t('structure.investorJourney.t71'),
                t('structure.investorJourney.t72'),
                t('structure.investorJourney.t73'),
                t('structure.investorJourney.t74'),
                t('structure.investorJourney.t75')
              ]
            },
            {
              phase: t('structure.investorJourney.t76'),
              title: t('structure.investorJourney.t77'),
              items: [
                t('structure.investorJourney.t78'),
                t('structure.investorJourney.t79'),
                t('structure.investorJourney.t80'),
                t('structure.investorJourney.t81'),
                t('structure.investorJourney.t82'),
                t('structure.investorJourney.t83')
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
              <ul className="space-y-2 ms-15">
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
              {t('structure.investorJourney.t84')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.investorJourney.t85')}</strong> {t('structure.investorJourney.t86')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.investorJourney.t87')}</strong> {t('structure.investorJourney.t88')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.investorJourney.t89')}</strong> {t('structure.investorJourney.t90')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.investorJourney.t91')}</strong> {t('structure.investorJourney.t92')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.investorJourney.t93')}</strong> {t('structure.investorJourney.t94')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>{t('structure.realEstateJourney.t103')}</strong> {t('structure.investorJourney.t95')}
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
        <title>{t('structure.ui.metaTitle')}</title>
        <meta
          name="description"
          content={t('structure.ui.metaDescription')}
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
              className="absolute top-20 end-20 w-72 h-72 bg-gradient-to-r from-emerald-400/10 to-green-400/10 dark:from-emerald-500/20 dark:to-green-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                rotate: [360, 0],
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-20 start-20 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 dark:from-blue-500/15 dark:to-purple-500/15 rounded-full blur-3xl"
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
                  <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">{t('structure.ui.badge')}</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white"
                >
                  {t('structure.ui.titleLead')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
                    {t('structure.ui.titleHighlight')}
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-light"
                >
                  {t('structure.ui.heroText')}
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
                    {t('structure.ui.contents')}
                  </h3>
                  <nav className="space-y-2">
                    {sections.map((section, index) => {
                      const Icon = section.icon;
                      const isOpen = openSections.includes(section.id);

                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
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
                    {t('structure.ui.tocToggle')}
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
                              className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
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
                        className="w-full flex items-center justify-between px-6 py-4 text-start hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
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
                {t('structure.ui.ctaTitle')}
              </Heading>
              <Text
                variant="bodyLarge"
                align="center"
                className="max-w-2xl mx-auto text-white/90"
                as="p"
              >
                {t('structure.ui.ctaText')}
              </Text>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <a
                href="/register"
                className="inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-100 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
              >
                {t('structure.ui.ctaStart')}
                <ArrowUpRight className="ms-3 w-5 h-5 rtl:-scale-x-100" />
              </a>
              <a
                href="/properties"
                className="inline-flex items-center justify-center border border-white/30 text-white hover:bg-white/10 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
              >
                {t('structure.ui.ctaExplore')}
                <Building2 className="ms-3 w-5 h-5" />
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
