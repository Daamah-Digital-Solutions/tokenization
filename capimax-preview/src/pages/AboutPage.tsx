import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Building2,
  Shield,
  Users,
  Globe,
  TrendingUp,
  Lock,
  CheckCircle,
  Layers,
  Coins,
  FileCheck,
  Landmark,
  Target,
  Sparkles,
  Award,
  BarChart3,
  Wallet
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';
import { Card } from '../components/design-system/cards/Card';

const coreValues = [
  {
    icon: Shield,
    title: 'Security First',
    description: 'Bank-grade security with multi-layer encryption, secure wallets, and rigorous compliance protocols protect your owned properties.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Users,
    title: 'Accessibility',
    description: 'We democratize real estate ownership, making premium properties accessible to everyone regardless of capital size.',
    color: 'from-emerald-500 to-green-500'
  },
  {
    icon: Lock,
    title: 'Transparency',
    description: 'Blockchain technology ensures complete transparency with immutable records of ownership and transactions.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Globe,
    title: 'Global Reach',
    description: 'Access curated properties across international markets, diversifying your portfolio beyond local boundaries.',
    color: 'from-orange-500 to-red-500'
  }
];

const howItWorks = [
  {
    step: '01',
    icon: FileCheck,
    title: 'Property Verification',
    description: 'Each property undergoes rigorous due diligence including legal verification, valuation, and compliance checks before listing.'
  },
  {
    step: '02',
    icon: Coins,
    title: 'Tokenization',
    description: 'Properties are tokenized into digital shares on the blockchain, with each token representing fractional ownership.'
  },
  {
    step: '03',
    icon: Wallet,
    title: 'Ownership',
    description: 'Owners can purchase tokens starting from minimal amounts, receiving proportional ownership and returns.'
  },
  {
    step: '04',
    icon: BarChart3,
    title: 'Returns & Liquidity',
    description: 'Earn rental income distributions and capital appreciation. Trade tokens on our secondary marketplace for liquidity.'
  }
];

const teamStats = [
  { number: '$4.2B+', label: 'Assets Tokenized', icon: Building2 },
  { number: '50K+', label: 'Global Owners', icon: Users },
  { number: '1,200+', label: 'Properties Listed', icon: Landmark },
  { number: '15+', label: 'Countries Served', icon: Globe }
];

export const AboutPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>About Us | Capimax - Real Estate Tokenization Platform</title>
        <meta
          name="description"
          content="Learn about Capimax, the leading real estate tokenization platform. We make property ownership accessible through blockchain technology, enabling fractional ownership of premium real estate worldwide."
        />
        <meta name="keywords" content="about capimax, real estate tokenization, fractional ownership, blockchain real estate, real estate ownership platform" />
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
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Trusted by 50,000+ Owners Worldwide</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white"
                  >
                    About{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
                      Capimax
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-light"
                  >
                    We are transforming real estate ownership through blockchain technology,
                    making premium property ownership accessible to everyone.
                  </motion.p>
                </div>
              </Container>
            </div>
          </section>

          {/* Stats Section */}
          <Section variant="default" size="lg" animated>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            >
              {teamStats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="space-y-4 group cursor-pointer"
                >
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-400/20 group-hover:shadow-lg transition-shadow duration-300"
                  >
                    <stat.icon className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                  </motion.div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
                    {stat.number}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Section>

          {/* Mission Section */}
          <Section variant="gradient" size="2xl" backgroundPattern animated>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Heading level="h2" size="4xl">
                  Our Mission
                </Heading>
                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed">
                  Capimax was founded with a clear vision: to democratize real estate ownership
                  and break down the barriers that have traditionally limited access to premium
                  property markets.
                </Text>
                <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                  Through blockchain technology and tokenization, we enable owners of all
                  sizes to own fractional shares of carefully vetted properties worldwide.
                  Our platform combines the stability of real estate with the flexibility
                  and transparency of digital assets.
                </Text>
                <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                  Whether you're buying your first $100 share or diversifying a multi-million
                  dollar portfolio, Capimax provides the tools, security, and opportunities
                  to build wealth through real estate.
                </Text>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative"
              >
                <Card
                  variant="elevated"
                  size="xl"
                  radius="3xl"
                  className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800"
                >
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <Heading level="h3" size="2xl">
                      What We Solve
                    </Heading>
                    <ul className="space-y-4">
                      {[
                        'High capital requirements that exclude most buyers',
                        'Lack of liquidity in traditional real estate',
                        'Geographic limitations on property access',
                        'Complex legal processes and paperwork',
                        'Limited transparency in property transactions'
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <Text variant="body" color="secondary">
                            {item}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </motion.div>
            </div>
          </Section>

          {/* How It Works Section */}
          <Section variant="default" size="2xl" animated>
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Heading level="h2" size="4xl" align="center" className="mb-4">
                  How Real Estate Tokenization Works
                </Heading>
                <Text
                  variant="bodyLarge"
                  color="secondary"
                  align="center"
                  className="max-w-3xl mx-auto"
                  as="p"
                >
                  Our streamlined process makes property ownership simple, secure, and accessible
                </Text>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="relative"
                >
                  {/* Connector Line */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-300 to-emerald-100 dark:from-emerald-600 dark:to-emerald-800" />
                  )}

                  <Card
                    variant="elevated"
                    size="lg"
                    radius="2xl"
                    interactive
                    className="h-full hover:shadow-xl transition-all duration-500 relative z-10"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <step.icon className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-4xl font-bold text-emerald-500/20 dark:text-emerald-400/20">
                          {step.step}
                        </span>
                      </div>
                      <Heading level="h3" size="lg">
                        {step.title}
                      </Heading>
                      <Text variant="body" color="secondary" as="p">
                        {step.description}
                      </Text>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* Core Values Section */}
          <Section variant="accent" size="2xl" animated>
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Heading level="h2" size="4xl" align="center" className="mb-4">
                  Our Core Values
                </Heading>
                <Text
                  variant="bodyLarge"
                  color="secondary"
                  align="center"
                  className="max-w-3xl mx-auto"
                  as="p"
                >
                  The principles that guide everything we do at Capimax
                </Text>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {coreValues.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      variant="elevated"
                      size="xl"
                      radius="2xl"
                      interactive
                      className="h-full hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />

                      <div className="relative z-10 flex items-start gap-6">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <div className="space-y-3">
                          <Heading level="h3" size="xl" className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                            {value.title}
                          </Heading>
                          <Text variant="body" color="secondary" as="p">
                            {value.description}
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Compliance & Security Section */}
          <Section variant="default" size="2xl" animated>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card
                  variant="elevated"
                  size="xl"
                  radius="3xl"
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800"
                >
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <Heading level="h3" size="2xl">
                      Security & Compliance
                    </Heading>
                    <div className="space-y-4">
                      {[
                        { icon: Lock, text: 'Bank-grade encryption for all data' },
                        { icon: FileCheck, text: 'KYC/AML compliance for all users' },
                        { icon: Layers, text: 'Smart contract audited by leading firms' },
                        { icon: Shield, text: 'Secure custody of digital assets' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 text-blue-500" />
                          <Text variant="body" color="secondary">
                            {item.text}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Heading level="h2" size="4xl">
                  Built on Trust & Technology
                </Heading>
                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed">
                  At Capimax, security isn't an afterthought—it's the foundation of everything
                  we build. Our platform combines cutting-edge blockchain technology with
                  rigorous compliance standards to protect your owned properties.
                </Text>
                <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                  Every property listed on our platform undergoes comprehensive due diligence,
                  including legal verification, professional valuation, and regulatory compliance
                  checks. Our smart contracts are audited by industry-leading security firms,
                  and we maintain full regulatory compliance in all jurisdictions we operate in.
                </Text>
                <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                  Your trust is our most valuable asset. We're committed to maintaining the
                  highest standards of transparency, security, and integrity in everything we do.
                </Text>
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
                  Ready to Start Owning?
                </Heading>
                <Text
                  variant="bodyLarge"
                  align="center"
                  className="max-w-2xl mx-auto text-white/90"
                  as="p"
                >
                  Join thousands of owners who are building wealth through tokenized real estate.
                  Start your journey today with as little as $100.
                </Text>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <a
                  href="/register"
                  className="inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-100 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
                >
                  Create Free Account
                  <TrendingUp className="ml-3 w-5 h-5" />
                </a>
                <a
                  href="/properties"
                  className="inline-flex items-center justify-center border border-white/30 text-white hover:bg-white/10 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
                >
                  Browse Properties
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
