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
import { useTranslation } from 'react-i18next';

const features = [
  {
    number: 1,
    icon: Building2,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: 2,
    icon: TrendingUp,
    color: 'from-emerald-500 to-green-500'
  },
  {
    number: 3,
    icon: Target,
    color: 'from-purple-500 to-pink-500'
  },
  {
    number: 4,
    icon: Handshake,
    color: 'from-orange-500 to-red-500'
  },
  {
    number: 5,
    icon: Lightbulb,
    color: 'from-indigo-500 to-blue-500'
  },
  {
    number: 6,
    icon: Home,
    color: 'from-teal-500 to-cyan-500'
  },
  {
    number: 7,
    icon: Award,
    color: 'from-pink-500 to-rose-500'
  },
  {
    number: 8,
    icon: Globe,
    color: 'from-yellow-500 to-orange-500'
  },
  {
    number: 9,
    icon: BarChart3,
    color: 'from-violet-500 to-purple-500'
  },
  {
    number: 10,
    icon: TrendingDown,
    color: 'from-red-500 to-orange-500'
  },
  {
    number: 11,
    icon: DollarSign,
    color: 'from-green-500 to-emerald-500'
  },
  {
    number: 12,
    icon: MapPin,
    color: 'from-blue-500 to-indigo-500'
  },
  {
    number: 13,
    icon: Landmark,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    number: 14,
    icon: Users,
    color: 'from-purple-500 to-indigo-500'
  },
  {
    number: 15,
    icon: BarChart3,
    color: 'from-emerald-500 to-teal-500'
  },
  {
    number: 16,
    icon: RefreshCcw,
    color: 'from-orange-500 to-yellow-500'
  },
  {
    number: 17,
    icon: ShoppingCart,
    color: 'from-pink-500 to-purple-500'
  },
  {
    number: 18,
    icon: Layers,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: 19,
    icon: Shield,
    color: 'from-red-500 to-pink-500'
  },
  {
    number: 20,
    icon: LineChart,
    color: 'from-green-500 to-teal-500'
  },
  {
    number: 21,
    icon: Wallet,
    color: 'from-indigo-500 to-purple-500'
  },
  {
    number: 22,
    icon: FileCheck,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    number: 23,
    icon: BookOpen,
    color: 'from-yellow-500 to-orange-500'
  },
  {
    number: 24,
    icon: Heart,
    color: 'from-rose-500 to-pink-500'
  },
  {
    number: 25,
    icon: Globe,
    color: 'from-teal-500 to-cyan-500'
  },
  {
    number: 26,
    icon: CreditCard,
    color: 'from-violet-500 to-indigo-500'
  },
  {
    number: 27,
    icon: PieChart,
    color: 'from-orange-500 to-red-500'
  },
  {
    number: 28,
    icon: Landmark,
    color: 'from-emerald-500 to-green-500'
  },
  {
    number: 29,
    icon: FileText,
    color: 'from-blue-500 to-indigo-500'
  },
  {
    number: 30,
    icon: UserCheck,
    color: 'from-purple-500 to-pink-500'
  },
  {
    number: 31,
    icon: Code,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    number: 32,
    icon: Coins,
    color: 'from-green-500 to-emerald-500'
  },
  {
    number: 33,
    icon: Briefcase,
    color: 'from-orange-500 to-yellow-500'
  },
  {
    number: 34,
    icon: Lock,
    color: 'from-red-500 to-pink-500'
  },
  {
    number: 35,
    icon: Zap,
    color: 'from-indigo-500 to-violet-500'
  }
];

const additionalFeatures = [
  {
    number: 36,
    icon: Settings,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: 37,
    icon: Activity,
    color: 'from-emerald-500 to-green-500'
  },
  {
    number: 38,
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500'
  },
  {
    number: 39,
    icon: Globe,
    color: 'from-orange-500 to-red-500'
  }
];

export const WhyCapimaxPage: React.FC = () => {
  const { t } = useTranslation('pages');

  return (
    <>
      <Helmet>
        <title>{t('why.metaTitle')}</title>
        <meta
          name="description"
          content={t('why.metaDescription')}
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
                    <Award className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">{t('why.badge')}</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white"
                  >
                    {t('why.titleLead')}{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
                      {t('why.titleHighlight')}
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-light"
                  >
                    {t('why.heroText')}
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
                  {t('why.intro1')}
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  {t('why.intro2')}
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  {t('why.intro3')}
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  {t('why.intro4')}
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed mb-6">
                  {t('why.intro5')}
                </Text>

                <Text variant="bodyLarge" color="secondary" as="p" className="leading-relaxed font-semibold">
                  {t('why.introLead')}
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
                          {t(`why.features.${feature.number}.title`)}
                        </Heading>

                        <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                          {t(`why.features.${feature.number}.description`)}
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
                      {t('why.additionalTitle')}
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
                          {t(`why.features.${feature.number}.title`)}
                        </Heading>

                        <Text variant="body" color="secondary" as="p" className="leading-relaxed">
                          {t(`why.features.${feature.number}.description`)}
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
                      {t('why.advantageTitle')}
                    </Heading>
                    <Text variant="bodyLarge" color="secondary" as="p" className="max-w-3xl mx-auto leading-relaxed">
                      {t('why.advantageText')}
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
                  {t('why.ctaTitle')}
                </Heading>
                <Text
                  variant="bodyLarge"
                  align="center"
                  className="max-w-2xl mx-auto text-white/90"
                  as="p"
                >
                  {t('why.ctaText')}
                </Text>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <a
                  href="/register"
                  className="inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-100 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
                >
                  {t('why.ctaStart')}
                  <ArrowUpRight className="ms-3 w-5 h-5 rtl:-scale-x-100" />
                </a>
                <a
                  href="/properties"
                  className="inline-flex items-center justify-center border border-white/30 text-white hover:bg-white/10 px-10 py-4 text-lg font-semibold rounded-2xl transition-colors duration-300"
                >
                  {t('why.ctaExplore')}
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
