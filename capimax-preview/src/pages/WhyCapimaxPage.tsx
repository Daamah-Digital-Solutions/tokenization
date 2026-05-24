import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Globe,
  Shield,
  Award,
  Briefcase,
  Lightbulb,
  MapPin,
  Home,
  Calculator,
  FileText,
  DollarSign,
  LineChart,
  Wallet,
  RefreshCcw,
  ShoppingCart,
  Layers,
  PieChart,
  Coins,
  Lock,
  BookOpen,
  Heart,
  CreditCard,
  FileCheck,
  UserCheck,
  Handshake,
  Landmark,
  Database,
  Code,
  Zap,
  Settings,
  TrendingDown,
  Activity,
  CheckCircle,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';
import { Card } from '../components/design-system/cards/Card';

const features = [
  {
    number: 1,
    icon: Building2,
    title: 'Deep Real Estate Experience',
    description: 'Our team has decades of combined experience as property owners, developers, and buyers, allowing for precise understanding of asset valuation, market timing, and risk factors.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: 2,
    icon: TrendingUp,
    title: 'Ownership and Financial Expertise',
    description: 'Expertise in structured finance, fund management, and capital allocation ensures proper modeling of returns, risk-adjusted ownership strategies, and efficient allocation of owner capital.',
    color: 'from-emerald-500 to-green-500'
  },
  {
    number: 3,
    icon: Target,
    title: 'Development Knowledge',
    description: 'Hands-on experience in property development, from planning to delivery, allows accurate forecasting of timelines, cost management, and value appreciation potential.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    number: 4,
    icon: Handshake,
    title: 'Broker and Market Understanding',
    description: 'Understanding the intermediary role and market dynamics helps bridge gaps between developers, sellers, and buyers, ensuring smoother transactions.',
    color: 'from-orange-500 to-red-500'
  },
  {
    number: 5,
    icon: Lightbulb,
    title: 'Insight into Ownership Challenges',
    description: 'We have firsthand knowledge of operational and exit challenges, including owner withdrawals, illiquidity, maintenance costs, and market volatility.',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    number: 6,
    icon: Home,
    title: 'Familiarity with Property Types',
    description: 'In-depth knowledge of income-generating, development, and installment-based properties enables diversified ownership solutions for various risk appetites.',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    number: 7,
    icon: Award,
    title: 'Innovative Ownership Models',
    description: 'We created new ownership models combining installment-based property acquisition and phased development rounds to mirror real-world property processes.',
    color: 'from-pink-500 to-rose-500'
  },
  {
    number: 8,
    icon: Globe,
    title: 'Global Market Analysis',
    description: 'Our studies included global platforms such as Lofty, Relic, and local models like Stake and SmartCrowd, highlighting international best practices and potential improvements.',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    number: 9,
    icon: BarChart3,
    title: 'Competitive Benchmarking',
    description: 'Detailed competitor analysis identified gaps in transparency, liquidity, and owner control, which Capy Max RT addresses.',
    color: 'from-violet-500 to-purple-500'
  },
  {
    number: 10,
    icon: TrendingDown,
    title: 'Exit Strategy Optimization',
    description: 'Designed flexible exit options for owners, including secondary markets, buybacks, or redistribution of ownership, ensuring liquidity and strategic exits.',
    color: 'from-red-500 to-orange-500'
  },
  {
    number: 11,
    icon: DollarSign,
    title: 'Transparent Revenue Streams',
    description: 'Revenue for the platform derives from tokenization fees, listing fees, subscription fees, owner purchase fees, annual platform fees, exit fees, and profit sharing, including secondary market transactions and liquidity provider arrangements.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    number: 12,
    icon: MapPin,
    title: 'Diverse Property Offerings',
    description: 'The platform supports various property types and locations, including income-generating, under-construction, and development properties, allowing portfolio diversification.',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    number: 13,
    icon: Landmark,
    title: 'Global SPV Framework',
    description: 'All purchases are structured through Special Purpose Vehicles (SPVs), enabling global compliance, legal separation of assets, and expansion opportunities.',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    number: 14,
    icon: Users,
    title: 'Multiple Stakeholder Integration',
    description: 'The platform connects owners, property sellers, developers, intermediaries, liquidity providers, and partners, allowing smooth coordination and accountability.',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    number: 15,
    icon: BarChart3,
    title: 'Owner Dashboards',
    description: 'All stakeholders have access to dashboards that enable monitoring, management, transparency, and control of their assets and transactions.',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    number: 16,
    icon: RefreshCcw,
    title: 'Reinvestment Mechanism',
    description: 'Owners can automatically reinvest their yields into the platform, compounding returns and maximizing portfolio growth.',
    color: 'from-orange-500 to-yellow-500'
  },
  {
    number: 17,
    icon: ShoppingCart,
    title: 'Secondary Market Integration',
    description: 'Secondary market functionality allows owners to trade their property tokens, providing liquidity and flexible exit strategies.',
    color: 'from-pink-500 to-purple-500'
  },
  {
    number: 18,
    icon: Layers,
    title: 'Structured Development Rounds',
    description: 'Phased development and installment models replicate real-life property ownership cycles, offering clear growth and price appreciation patterns.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: 19,
    icon: Shield,
    title: 'Diversified Risk Management',
    description: 'Risk is mitigated through multi-country and multi-property portfolios, professional property appraisal, thorough due diligence, and diversified asset types.',
    color: 'from-red-500 to-pink-500'
  },
  {
    number: 20,
    icon: LineChart,
    title: 'Annual Revenue Accumulation',
    description: 'Platform revenues are cumulative: for example, 2027 revenues include income from properties listed in 2027 plus recurring fees, exit fees, and profits from prior years, compounding financial growth over time.',
    color: 'from-green-500 to-teal-500'
  },
  {
    number: 21,
    icon: Wallet,
    title: 'Digital and Crypto Payments',
    description: 'The platform supports traditional, digital, and crypto payment options, ensuring accessibility and convenience for global owners.',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    number: 22,
    icon: FileCheck,
    title: 'Transparency and Open Data',
    description: 'Full disclosure of property performance, revenues, and ownership documentation ensures informed decision-making.',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    number: 23,
    icon: BookOpen,
    title: 'Educational and Guidance Tools',
    description: 'The platform provides owners with explanations, guides, and analytics, reducing ambiguity and increasing confidence in decision-making.',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    number: 24,
    icon: Heart,
    title: 'Family Ownership Feature',
    description: 'Owners can allocate yields to family members, link their bank accounts, and manage shared returns, increasing loyalty and engagement.',
    color: 'from-rose-500 to-pink-500'
  },
  {
    number: 25,
    icon: Globe,
    title: 'Global Access',
    description: 'The platform is designed to operate internationally, providing ownership opportunities beyond local markets and spreading risks.',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    number: 26,
    icon: CreditCard,
    title: 'Flexible Payment Plans',
    description: 'Installment models allow smaller buyers to enter the market and gradually acquire tokenized ownership.',
    color: 'from-violet-500 to-indigo-500'
  },
  {
    number: 27,
    icon: PieChart,
    title: 'Market-Based Development Rounds',
    description: 'Ownership rounds mirror real property development stages, with clearly defined pricing and release schedules for phased access.',
    color: 'from-orange-500 to-red-500'
  },
  {
    number: 28,
    icon: Landmark,
    title: 'Actual Property Backing',
    description: 'All tokenized purchases are backed by real, legally documented properties, ensuring tangible asset value.',
    color: 'from-emerald-500 to-green-500'
  },
  {
    number: 29,
    icon: FileText,
    title: 'Reporting and Analytics',
    description: 'Comprehensive reports and open data provide visibility into portfolio performance, asset conditions, and revenue streams.',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    number: 30,
    icon: UserCheck,
    title: 'Owner Protection',
    description: 'Legal, contractual, and technological safeguards protect owners\' rights, including blockchain immutability and SPV structures.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    number: 31,
    icon: Code,
    title: 'Smart Contract Automation',
    description: 'Smart contracts ensure automated revenue distribution, compliance checks, and secure token transfers.',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    number: 32,
    icon: Coins,
    title: 'Integrated Liquidity Providers',
    description: 'Liquidity providers enhance market stability and enable smoother secondary transactions.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    number: 33,
    icon: Briefcase,
    title: 'Intermediary Support',
    description: 'The platform integrates brokers and intermediaries to attract property sellers and buyers while facilitating transactions.',
    color: 'from-orange-500 to-yellow-500'
  },
  {
    number: 34,
    icon: Lock,
    title: 'Eliminating Final Sale Pressure',
    description: 'Revenue accumulation replaces the need for forced property liquidation, ensuring consistent returns and long-term asset appreciation.',
    color: 'from-red-500 to-pink-500'
  },
  {
    number: 35,
    icon: Zap,
    title: 'Continuous Innovation',
    description: 'The platform continuously evolves to add new property types, ownership models, and services, maintaining leadership in tokenized real estate innovation.',
    color: 'from-indigo-500 to-violet-500'
  }
];

const additionalFeatures = [
  {
    number: 36,
    icon: Settings,
    title: 'Dedicated Dashboards for All Stakeholders',
    description: 'The platform provides dedicated dashboards for each stakeholder, including developers, liquidity providers, brokers, and partners. These dashboards enable full transparency, control, and freedom of operation, including property listing, document uploads, tracking, analytics, revenue collection, and withdrawals. Each stakeholder has a complete interface tailored to their role and responsibilities.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: 37,
    icon: Activity,
    title: 'Competitor Analysis and Expansion Planning',
    description: 'Capy Max RT has conducted extensive competitor analysis and developed strategic expansion plans. The platform continuously updates its products and services annually, ensuring relevance, competitiveness, and innovation.',
    color: 'from-emerald-500 to-green-500'
  },
  {
    number: 38,
    icon: Sparkles,
    title: 'Annual Feature and Service Enhancements',
    description: 'The platform retains additional services and features that are introduced each year, refreshing the platform\'s functionality, user experience, and ownership offerings. This ensures that Capy Max RT evolves dynamically with market needs.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    number: 39,
    icon: Globe,
    title: 'Global Expansion Roadmap',
    description: 'Capy Max RT has a structured global expansion strategy, enabling the platform to scale operations and provide ownership opportunities in international markets in subsequent phases.',
    color: 'from-orange-500 to-red-500'
  }
];

export const WhyCapimaxPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Why Capimax RT | Capimax - Real Estate Tokenization Platform</title>
        <meta
          name="description"
          content="Discover why Capimax RT is the leading real estate tokenization platform. Learn about our 39 unique features, global expertise, and innovative ownership models that set us apart."
        />
        <meta name="keywords" content="why capimax, real estate tokenization advantages, real estate ownership platform, blockchain real estate, tokenized real estate benefits" />
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
                    <Award className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">39 Unique Features & Advantages</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white"
                  >
                    Why{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
                      Capimax RT
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-light"
                  >
                    Discover the expertise, innovation, and comprehensive approach that makes Capimax RT the leading real estate tokenization platform.
                  </motion.p>
                </div>
              </Container>
            </div>
          </section>

          {/* Introduction Section */}
          <Section variant="default" size="2xl" animated>
            <div className="max-w-5xl mx-auto space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  CapiMax RT represents the result of extensive cumulative expertise across the real estate, finance, ownership, and development sectors. The founding team has operated as property owners, developers, and buyers, gaining direct practical insight into the real-world challenges of property ownership, including risk management, exit strategies, return optimization, asset valuation, and owner relations.
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  Capi Max RT is owned by Capimax Global Group, which holds 12 companies operating across multiple international jurisdictions, including the United States, the United Kingdom, and the United Arab Emirates. The group operates in more than 72 business activities spanning ownership, real estate development, virtual assets, tokenization, ownership funds, and financial and technology services.
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  This institutional scale and diversified operational footprint provide the platform with integrated expertise across technical, legal, financial, real estate, ownership, and technological disciplines, enabling comprehensive management of the platform from all operational, regulatory, and strategic perspectives.
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  In addition, the team conducted extensive studies of both local and global markets, analyzing the strengths, weaknesses, and opportunities within traditional and tokenized real estate ownership models. Competitors were carefully examined to identify gaps and areas for improvement.
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  This accumulated knowledge, combined with market research, owner behavior studies, and operational experience, enabled the team to design Capy Max RT as a comprehensive solution that addresses real challenges faced by owners, property sellers, and developers. The platform emphasizes transparency, flexibility, governance, and strategic growth.
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed font-semibold">
                  The following 35 features represent the innovations and advantages directly derived from our accumulated expertise and market understanding:
                </Text>
              </motion.div>
            </div>
          </Section>

          {/* Features Grid Section */}
          <Section variant="gradient" size="2xl" backgroundPattern animated>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <motion.div
                    key={feature.number}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: index * 0.02 }}
                  >
                    <Card
                      variant="elevated"
                      size="lg"
                      radius="2xl"
                      interactive
                      className="h-full hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                      <div className="relative z-10 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <div className="w-10 h-10 flex items-center justify-center">
                            <span className="text-3xl font-bold text-slate-200 dark:text-slate-700">
                              {feature.number}
                            </span>
                          </div>
                        </div>

                        <Heading level="h3" size="lg" className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                          {feature.title}
                        </Heading>

                        <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                          {feature.description}
                        </Text>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Divider Section */}
          <Section variant="default" size="lg" animated>
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
                </div>
                <div className="relative flex justify-center">
                  <div className="px-6 py-3 bg-white dark:bg-slate-900 border-2 border-emerald-500/30 rounded-full">
                    <Text variant="body" className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Additional Strategic Features
                    </Text>
                  </div>
                </div>
              </motion.div>
            </div>
          </Section>

          {/* Additional Features Section */}
          <Section variant="accent" size="2xl" animated>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {additionalFeatures.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <motion.div
                    key={feature.number}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Card
                      variant="elevated"
                      size="xl"
                      radius="2xl"
                      interactive
                      className="h-full hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />

                      <div className="relative z-10 space-y-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                            <IconComponent className="w-7 h-7 text-white" />
                          </div>
                          <div className="w-12 h-12 flex items-center justify-center">
                            <span className="text-4xl font-bold text-emerald-500/20 dark:text-emerald-400/20">
                              {feature.number}
                            </span>
                          </div>
                        </div>

                        <Heading level="h3" size="xl" className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                          {feature.title}
                        </Heading>

                        <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                          {feature.description}
                        </Text>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Summary Section */}
          <Section variant="default" size="2xl" animated>
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <Card
                  variant="elevated"
                  size="xl"
                  radius="3xl"
                  className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800"
                >
                  <div className="text-center space-y-6">
                    <div className="inline-flex p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <Heading level="h2" size="3xl">
                      The Capimax RT Advantage
                    </Heading>
                    <Text variant="bodyLarge" color="secondary" as="p" className="max-w-3xl mx-auto leading-relaxed">
                      These 39 features represent our commitment to creating the most comprehensive, transparent, and owner-friendly real estate tokenization platform. Every feature is designed to address real challenges and deliver tangible value to all stakeholders.
                    </Text>
                  </div>
                </Card>
              </motion.div>
            </div>
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
                  Experience the Capimax RT Difference
                </Heading>
                <Text
                  variant="bodyLarge"
                  align="center"
                  className="max-w-2xl mx-auto text-white/90"
                  as="p"
                >
                  Join a platform built on decades of expertise, powered by innovation, and designed for your success. Start owning tokenized real estate today.
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
