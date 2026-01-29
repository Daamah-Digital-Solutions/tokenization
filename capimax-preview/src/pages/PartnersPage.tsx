import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Landmark, Shield, Home, Users, Handshake, ArrowRight } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';
import { Button } from '../components/ui/Button';
import { PartnerCard, PartnerCardProps, PartnerCategory } from '../components/partners/PartnerCard';
import { useRouter } from '../utils/router';

type FilterCategory = 'all' | PartnerCategory;

interface CategoryTab {
  id: FilterCategory;
  label: string;
  icon: typeof Building2;
  description: string;
}

const categoryTabs: CategoryTab[] = [
  { id: 'all', label: 'All Partners', icon: Users, description: 'View all our trusted partners' },
  { id: 'developer', label: 'Developers', icon: Building2, description: 'Property development partners' },
  { id: 'financial', label: 'Financial', icon: Landmark, description: 'Valuation & financial management' },
  { id: 'insurance', label: 'Insurance', icon: Shield, description: 'Insurance coverage partners' },
  { id: 'management', label: 'Management', icon: Home, description: 'Property management services' }
];

const partners: PartnerCardProps[] = [
  // Developers / Property Partners
  {
    name: 'Elite Gate',
    category: 'developer',
    description: 'A leading real estate development company specializing in premium residential and commercial projects across the region.',
    role: 'Property Development Partner',
    website: undefined
  },
  {
    name: 'Prime One',
    category: 'developer',
    description: 'Innovative real estate developer focused on sustainable and modern urban living spaces with cutting-edge design.',
    role: 'Property Development Partner',
    website: undefined
  },
  {
    name: 'TDH',
    category: 'developer',
    description: 'Established developer with a strong portfolio of mixed-use developments and landmark residential projects.',
    role: 'Property Development Partner',
    website: undefined
  },
  {
    name: 'Capimax Development',
    category: 'developer',
    description: 'In-house development arm specializing in tokenization-ready properties designed for fractional investment opportunities.',
    role: 'In-House Development Partner',
    website: undefined
  },

  // Valuation & Financial Management
  {
    name: 'Capimax Financial',
    category: 'financial',
    description: 'Dedicated financial management entity providing comprehensive investment management, dividend distribution, and financial reporting services.',
    role: 'Financial Management & SPV Administration',
    website: undefined
  },
  {
    name: 'CIM Financial Group',
    category: 'financial',
    description: 'Independent valuation and financial advisory firm providing professional property valuations and market analysis.',
    role: 'Property Valuation & Advisory',
    website: undefined
  },

  // Insurance Partners
  {
    name: 'Assurax',
    category: 'insurance',
    description: 'Comprehensive insurance solutions provider offering property coverage, liability protection, and investment safeguards.',
    role: 'Property & Liability Insurance',
    website: undefined
  },
  {
    name: 'HCC',
    category: 'insurance',
    description: 'Specialized insurance partner providing tailored coverage solutions for real estate investments and tokenized assets.',
    role: 'Specialty Insurance Coverage',
    website: undefined
  },

  // Property Management
  {
    name: 'Nova Property',
    category: 'management',
    description: 'Professional property management company handling tenant relations, maintenance, rent collection, and day-to-day property operations.',
    role: 'Property Management Services',
    website: undefined
  }
];

export const PartnersPage: React.FC = () => {
  const { navigate } = useRouter();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const filteredPartners = activeCategory === 'all'
    ? partners
    : partners.filter(partner => partner.category === activeCategory);

  const partnerCounts = {
    all: partners.length,
    developer: partners.filter(p => p.category === 'developer').length,
    financial: partners.filter(p => p.category === 'financial').length,
    insurance: partners.filter(p => p.category === 'insurance').length,
    management: partners.filter(p => p.category === 'management').length
  };

  return (
    <>
      <Helmet>
        <title>Our Partners | Capimax RT - Trusted Ecosystem Partners</title>
        <meta
          name="description"
          content="Meet our trusted network of partners including property developers, financial advisors, insurance providers, and property management companies working together to deliver exceptional real estate investment opportunities."
        />
        <meta name="keywords" content="real estate partners, property developers, financial management, insurance, property management, Capimax RT" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />

        <main className="relative pt-16">
          {/* Hero Section */}
          <section className="relative py-20 lg:py-28 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-emerald-400/10 to-blue-400/10 dark:from-emerald-500/10 dark:to-blue-500/10 rounded-full blur-3xl"
              />
              <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl"
              />
            </div>

            <Container>
              <div className="relative z-10 text-center max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 mb-6"
                >
                  <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Trusted Ecosystem</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6"
                >
                  Our{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                    Partners
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto"
                >
                  We work with industry-leading partners to deliver exceptional real estate investment
                  opportunities. Our trusted ecosystem ensures quality, transparency, and professional
                  management at every stage.
                </motion.p>
              </div>
            </Container>
          </section>

          {/* Category Tabs */}
          <Section variant="default" size="sm">
            <div className="flex flex-wrap justify-center gap-3">
              {categoryTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeCategory === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300
                      ${isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                      }
                    `}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }
                    `}>
                      {partnerCounts[tab.id]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </Section>

          {/* Partners Grid */}
          <Section variant="default" size="xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredPartners.map((partner, index) => (
                  <motion.div
                    key={partner.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <PartnerCard {...partner} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filteredPartners.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 dark:text-slate-400">
                  No partners found in this category.
                </p>
              </div>
            )}
          </Section>

          {/* Partner Categories Overview */}
          <Section variant="gradient" size="xl" backgroundPattern>
            <div className="text-center mb-12">
              <Heading level="h2" size="3xl" align="center" className="mb-4">
                Partner Categories
              </Heading>
              <Text variant="bodyLarge" color="secondary" align="center" className="max-w-2xl mx-auto" as="p">
                Each partner plays a crucial role in our ecosystem, ensuring quality and professionalism at every stage of your investment journey.
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryTabs.filter(tab => tab.id !== 'all').map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setActiveCategory(category.id)}
                    className="group cursor-pointer p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {category.label}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          {category.description}
                        </p>
                        <p className="mt-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          {partnerCounts[category.id]} partner{partnerCounts[category.id] !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Become a Partner CTA */}
          <Section variant="dark" size="xl" backgroundElements>
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Heading level="h2" size="3xl" align="center" className="text-white">
                  Interested in Partnering with Us?
                </Heading>
                <Text variant="bodyLarge" align="center" className="text-white/80" as="p">
                  If you are a property developer, financial institution, insurance provider, or property management
                  company interested in joining our ecosystem, we would love to hear from you.
                </Text>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100"
                    onClick={() => navigate('contact')}
                  >
                    Contact Us
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => navigate('broker-program')}
                  >
                    Broker Program
                  </Button>
                </div>
                <Text variant="caption" align="center" className="text-white/60 pt-4" as="p">
                  For partnership inquiries, contact us at{' '}
                  <a href="mailto:partners@capimaxrt.com" className="text-emerald-400 hover:underline">
                    partners@capimaxrt.com
                  </a>
                </Text>
              </motion.div>
            </div>
          </Section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PartnersPage;
