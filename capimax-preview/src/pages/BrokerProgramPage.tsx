import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Handshake,
  Target,
  BarChart3,
  Building2,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  Star,
  Sparkles,
  Globe,
  Shield,
  Zap,
  Crown,
  Briefcase,
  Network
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';
import { Button } from '../components/ui/Button';
import { Card } from '../components/design-system/cards/Card';
import { Badge } from '../components/design-system/icons/Badge';
import { StatsCard } from '../components/design-system/cards/StatsCard';
import { useRouter } from '../utils/router';

const partnerStats = [
  { number: "$250M+", label: "Partner Volume", icon: DollarSign },
  { number: "150+", label: "Active Partners", icon: Users },
  { number: "5.2%", label: "Avg Commission", icon: TrendingUp },
  { number: "99.8%", label: "Client Satisfaction", icon: Star }
];

const benefits = [
  {
    icon: DollarSign,
    title: 'High Commission Rates',
    description: 'Earn up to 5% commission on every purchase you refer with industry-leading payout structures.',
    highlight: 'Up to 5%',
    color: 'from-emerald-500 to-green-500'
  },
  {
    icon: TrendingUp,
    title: 'Recurring Revenue',
    description: 'Continue earning from dividend distributions and secondary market trades for lifetime value.',
    highlight: 'Lifetime Value',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Award,
    title: 'Performance Bonuses',
    description: 'Unlock tier-based bonuses as you achieve higher sales volumes and milestone rewards.',
    highlight: 'Bonus Tiers',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Users,
    title: 'Dedicated Support',
    description: 'Access to dedicated broker support team, training resources, and 24/7 assistance.',
    highlight: '24/7 Support',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track your performance with comprehensive analytics dashboard and reporting tools.',
    highlight: 'Live Data',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    icon: Building2,
    title: 'Premium Listings',
    description: 'Early access to premium property listings, exclusive deals, and institutional opportunities.',
    highlight: 'Exclusive Access',
    color: 'from-indigo-500 to-purple-500'
  }
];

const requirements = [
  'Licensed real estate professional or financial advisor',
  'Minimum 2 years of sales experience in real estate or finance',
  'Strong network of high-net-worth clients and buyers',
  'Commitment to Capimax training and certification program',
  'Professional references and track record verification'
];

const commissionTiers = [
  {
    tier: "Bronze",
    volume: "$0 - $500K",
    rate: "2.5%",
    deals: "1-5 deals",
    color: "from-amber-500 to-orange-500",
    benefits: ["Standard Commission", "Basic Support", "Monthly Reports"]
  },
  {
    tier: "Silver",
    volume: "$500K - $2M",
    rate: "3.5%",
    deals: "6-15 deals",
    color: "from-gray-400 to-gray-600",
    benefits: ["Enhanced Commission", "Priority Support", "Weekly Reports", "Exclusive Listings"]
  },
  {
    tier: "Gold",
    volume: "$2M - $5M",
    rate: "4.5%",
    deals: "16-30 deals",
    color: "from-yellow-400 to-yellow-600",
    benefits: ["Premium Commission", "Dedicated Manager", "Real-time Analytics", "Pre-launch Access"]
  },
  {
    tier: "Platinum",
    volume: "$5M+",
    rate: "5.0%",
    deals: "30+ deals",
    color: "from-emerald-500 to-green-500",
    benefits: ["Maximum Commission", "White-glove Service", "Custom Solutions", "Co-marketing Support"]
  }
];

export const BrokerProgramPage: React.FC = () => {
  const { navigate } = useRouter();

  const handleApplyNow = () => {
    navigate('broker-application');
  };

  const handleContactSales = () => {
    alert('Contact form coming soon! Email us at partners@capimax.com');
  };

  return (
    <>
      <Helmet>
        <title>Partner Program | Capimax - Professional Broker Partnership</title>
        <meta
          name="description"
          content="Join the exclusive Capimax Partner Program. Earn premium commissions, access institutional opportunities, and grow your business with cutting-edge real estate technology."
        />
        <meta name="keywords" content="broker program, real estate broker, partner program, commissions, referral program, institutional real estate" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />

        <main className="relative pt-16">
          {/* Hero Section */}
          <section className="relative min-h-[85vh] overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Animated gradient orbs */}
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
              {Array.from({ length: 15 }).map((_, i) => (
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
            <div className="relative z-10 min-h-[85vh] flex items-center">
              <Container>
                <div className="text-center space-y-12 max-w-5xl mx-auto">

                  {/* Trust Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-500/30 shadow-xl"
                  >
                    <div className="relative">
                      <Crown className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0"
                      >
                        <Sparkles className="w-5 h-5 text-yellow-400/60 dark:text-yellow-300/80" />
                      </motion.div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Elite Partner Program</span>
                  </motion.div>

                  {/* Main Headlines */}
                  <div className="space-y-8">
                    <motion.h1
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-slate-800 dark:text-white"
                    >
                      Partner with the{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 relative">
                        Future of Real Estate
                        <motion.div
                          animate={{
                            scaleX: [0, 1, 0],
                            opacity: [0, 0.8, 0]
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: 1
                          }}
                          className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 rounded-full"
                        />
                      </span>
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-4xl mx-auto font-light"
                    >
                      Join our exclusive network of elite real estate professionals and unlock unprecedented earning potential
                      through institutional-grade tokenized real estate ownership.
                    </motion.p>
                  </div>

                  {/* Partner Status Indicators */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Applications Open</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Limited Positions</span>
                    </div>
                  </motion.div>

                  {/* CTA Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      className="group relative px-10 py-5 text-lg font-semibold shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 border-0 rounded-2xl overflow-hidden"
                      onClick={handleApplyNow}
                    >
                      <motion.div
                        animate={{ x: [-100, 300] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                      />
                      <span className="relative z-10 flex items-center">
                        Apply Now
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <ArrowRight className="ml-3 w-5 h-5" />
                        </motion.div>
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      className="group px-10 py-5 text-lg font-semibold transition-all duration-500 rounded-2xl"
                      onClick={handleContactSales}
                    >
                      <Phone className="mr-3 w-5 h-5 group-hover:text-emerald-500 transition-colors duration-300" />
                      Contact Sales
                    </Button>
                  </motion.div>
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
              {partnerStats.map((stat, index) => (
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

          {/* Benefits Section */}
          <Section variant="gradient" size="2xl" backgroundPattern animated>
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Heading
                  level="h2"
                  size="4xl"
                  align="center"
                  className="mb-4"
                >
                  Unmatched Partner Benefits
                </Heading>
                <Text
                  variant="bodyLarge"
                  color="secondary"
                  align="center"
                  className="max-w-3xl mx-auto"
                  as="p"
                >
                  Experience the advantages of partnering with the most innovative real estate ownership platform
                </Text>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
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
                      {/* Background gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />

                      <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center shadow-lg`}>
                            <IconComponent className="w-8 h-8 text-white" />
                          </div>
                          <Badge variant="accent" size="sm">
                            {benefit.highlight}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <Heading level="h3" size="xl" className="group-hover:text-emerald-600 transition-colors duration-300">
                            {benefit.title}
                          </Heading>
                          <Text variant="body" color="secondary" as="p">
                            {benefit.description}
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Commission Tiers */}
          <Section variant="default" size="2xl" animated>
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Heading
                  level="h2"
                  size="4xl"
                  align="center"
                  className="mb-4"
                >
                  Commission Structure
                </Heading>
                <Text
                  variant="bodyLarge"
                  color="secondary"
                  align="center"
                  className="max-w-3xl mx-auto"
                  as="p"
                >
                  Transparent, performance-based commission tiers that reward your success
                </Text>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {commissionTiers.map((tier, index) => (
                <motion.div
                  key={tier.tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -8 }}
                  className="group"
                >
                  <Card
                    variant="elevated"
                    size="lg"
                    radius="2xl"
                    className={`h-full transition-all duration-500 relative overflow-hidden ${
                      tier.tier === 'Platinum'
                        ? 'ring-2 ring-emerald-500/50 shadow-2xl shadow-emerald-500/20'
                        : 'hover:shadow-xl'
                    }`}
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />

                    <div className="relative z-10 space-y-6">
                      {/* Tier Header */}
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                          {tier.tier === 'Platinum' && <Crown className="w-8 h-8 text-white" />}
                          {tier.tier === 'Gold' && <Award className="w-8 h-8 text-white" />}
                          {tier.tier === 'Silver' && <Target className="w-8 h-8 text-white" />}
                          {tier.tier === 'Bronze' && <Briefcase className="w-8 h-8 text-white" />}
                        </div>
                        <Heading level="h3" size="xl" className="mb-2">
                          {tier.tier}
                        </Heading>
                        <Text variant="bodySmall" color="secondary" as="p">
                          {tier.volume}
                        </Text>
                      </div>

                      {/* Commission Rate */}
                      <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                          {tier.rate}
                        </div>
                        <Text variant="bodySmall" color="secondary" as="p">
                          Commission Rate
                        </Text>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-3">
                        <Text variant="label" color="primary" as="p" className="font-semibold">
                          Tier Benefits:
                        </Text>
                        <ul className="space-y-2">
                          {tier.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <Text variant="bodySmall" color="secondary">
                                {benefit}
                              </Text>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {tier.tier === 'Platinum' && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="accent" size="sm" icon={Crown}>
                          Most Popular
                        </Badge>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* Requirements Section */}
          <Section variant="accent" size="2xl" animated>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <Heading level="h2" size="4xl">
                    Partner Requirements
                  </Heading>
                  <Text
                    variant="bodyLarge"
                    color="secondary"
                    as="p"
                  >
                    We partner with exceptional professionals who meet our high standards of excellence and integrity
                  </Text>
                </div>

                <ul className="space-y-4">
                  {requirements.map((requirement, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <Text variant="body" color="primary">
                        {requirement}
                      </Text>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card
                  variant="elevated"
                  size="xl"
                  radius="3xl"
                  className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800 shadow-2xl"
                >
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                      <Handshake className="w-10 h-10 text-white" />
                    </div>

                    <div className="space-y-4">
                      <Heading level="h3" size="2xl" align="center">
                        Ready to Partner?
                      </Heading>
                      <Text
                        variant="body"
                        color="secondary"
                        align="center"
                        as="p"
                      >
                        Join our exclusive network of elite real estate professionals and start earning premium commissions today.
                      </Text>
                    </div>

                    <div className="space-y-4">
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={handleApplyNow}
                      >
                        Start Application
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>

                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-500" />
                          <span className="text-slate-600 dark:text-slate-400">Secure Process</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-500" />
                          <span className="text-slate-600 dark:text-slate-400">Quick Approval</span>
                        </div>
                      </div>
                    </div>

                    <Text variant="caption" color="muted" align="center" as="p">
                      Questions? Contact our Partner Team at{' '}
                      <a href="mailto:partners@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                        partners@capimax.com
                      </a>
                    </Text>
                  </div>
                </Card>
              </motion.div>
            </div>
          </Section>

          {/* Final CTA Section */}
          <Section
            variant="dark"
            size="2xl"
            backgroundElements
            animated
          >
            <div className="text-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Heading
                  level="h2"
                  size="4xl"
                  align="center"
                  className="text-white"
                >
                  Transform Your Business Today
                </Heading>
                <Text
                  variant="bodyLarge"
                  align="center"
                  className="max-w-2xl mx-auto text-white/90"
                  as="p"
                >
                  Join the most sophisticated real estate ownership platform and unlock unprecedented growth opportunities for your practice.
                </Text>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 px-10 py-5 text-lg font-semibold"
                  onClick={handleApplyNow}
                >
                  Begin Partnership Application
                  <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 px-10 py-5 text-lg font-semibold"
                  onClick={() => navigate('contact')}
                >
                  Schedule Consultation
                  <Phone className="ml-3 w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
                {[
                  { icon: Network, label: "Elite Network Access" },
                  { icon: Globe, label: "Global Opportunities" },
                  { icon: Crown, label: "Premium Support" }
                ].map((feature, index) => (
                  <div key={index} className="text-center space-y-2">
                    <feature.icon className="w-8 h-8 text-emerald-400 mx-auto" />
                    <Text variant="bodySmall" className="text-white/80" as="p">
                      {feature.label}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </main>

        <Footer />
      </div>
    </>
  );
};