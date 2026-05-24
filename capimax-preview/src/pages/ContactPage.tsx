import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle,
  Sparkles,
  Clock,
  Shield,
  HelpCircle,
  Building2,
  Users,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { Heading } from '../components/design-system/typography/Heading';
import { Text } from '../components/design-system/typography/Text';
import { Card } from '../components/design-system/cards/Card';
import { Button } from '../components/ui/Button';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const contactReasons = [
  {
    icon: HelpCircle,
    title: 'General Inquiries',
    description: 'Questions about our platform, services, or how to get started.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Building2,
    title: 'Property Listings',
    description: 'Information about listing your property or ownership opportunities.',
    color: 'from-emerald-500 to-green-500'
  },
  {
    icon: Users,
    title: 'Partnership',
    description: 'Interested in becoming a broker or strategic partner.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Shield,
    title: 'Account Support',
    description: 'Help with your account, verification, or technical issues.',
    color: 'from-orange-500 to-red-500'
  }
];

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate form submission
    // In production, this would send to your backend API
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setErrors({ message: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Capimax - Get in Touch</title>
        <meta
          name="description"
          content="Contact the Capimax team for questions about real estate tokenization, ownership opportunities, partnership inquiries, or technical support. We're here to help."
        />
        <meta name="keywords" content="contact capimax, real estate ownership support, tokenization help, customer service" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />

        <main className="relative pt-16">
          {/* Hero Section */}
          <section className="relative min-h-[40vh] overflow-hidden">
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
              {Array.from({ length: 10 }).map((_, i) => (
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
            <div className="relative z-10 min-h-[40vh] flex items-center">
              <Container>
                <div className="text-center space-y-6 max-w-3xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-500/30 shadow-xl"
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">We're Here to Help</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white"
                  >
                    Contact{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
                      Us
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-2xl mx-auto font-light"
                  >
                    Have questions about real estate tokenization or need assistance?
                    Our team is ready to help you get started.
                  </motion.p>
                </div>
              </Container>
            </div>
          </section>

          {/* Contact Reasons Section */}
          <Section variant="default" size="lg" animated>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactReasons.map((reason, index) => {
                const IconComponent = reason.icon;
                return (
                  <motion.div
                    key={reason.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      variant="elevated"
                      size="lg"
                      radius="2xl"
                      interactive
                      className="h-full hover:shadow-xl transition-all duration-500 group"
                    >
                      <div className="space-y-4 text-center">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${reason.color} flex items-center justify-center shadow-lg mx-auto`}>
                          <IconComponent className="w-7 h-7 text-white" />
                        </div>
                        <Heading level="h3" size="lg" align="center">
                          {reason.title}
                        </Heading>
                        <Text variant="bodySmall" color="secondary" align="center" as="p">
                          {reason.description}
                        </Text>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          {/* Contact Form Section */}
          <Section variant="gradient" size="2xl" backgroundPattern animated>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card
                  variant="elevated"
                  size="xl"
                  radius="3xl"
                  className="bg-white dark:bg-slate-800"
                >
                  {isSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12 space-y-6"
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                        <CheckCircle className="w-10 h-10 text-white" />
                      </div>
                      <Heading level="h3" size="2xl" align="center">
                        Message Sent!
                      </Heading>
                      <Text variant="body" color="secondary" align="center" as="p" className="max-w-sm mx-auto">
                        Thank you for reaching out. Our team will review your message and get back to you within 24-48 hours.
                      </Text>
                      <Button
                        variant="outline"
                        onClick={() => setIsSubmitted(false)}
                        className="mt-4"
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Heading level="h3" size="2xl">
                          Send Us a Message
                        </Heading>
                        <Text variant="body" color="secondary" as="p">
                          Fill out the form below and we'll get back to you shortly.
                        </Text>
                      </div>

                      {/* Name Field */}
                      <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border ${
                            errors.name
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                          } bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors`}
                          placeholder="John Doe"
                        />
                        {errors.name && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border ${
                            errors.email
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                          } bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors`}
                          placeholder="john@example.com"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* Subject Field */}
                      <div className="space-y-2">
                        <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border ${
                            errors.subject
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                          } bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors`}
                        >
                          <option value="">Select a subject</option>
                          <option value="general">General Inquiry</option>
                          <option value="investment">Ownership Questions</option>
                          <option value="property">Property Listing</option>
                          <option value="partnership">Partnership Opportunity</option>
                          <option value="support">Account Support</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.subject && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.subject}
                          </p>
                        )}
                      </div>

                      {/* Message Field */}
                      <div className="space-y-2">
                        <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={5}
                          className={`w-full px-4 py-3 rounded-xl border ${
                            errors.message
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                          } bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors resize-none`}
                          placeholder="How can we help you?"
                        />
                        {errors.message && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.message}
                          </p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Message
                            <Send className="ml-3 w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </Card>
              </motion.div>

              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <Heading level="h2" size="3xl">
                    Get in Touch
                  </Heading>
                  <Text variant="bodyLarge" color="secondary" as="p">
                    We value every inquiry and are committed to providing prompt, helpful responses.
                    Choose the method that works best for you.
                  </Text>
                </div>

                {/* Email Contact */}
                <Card
                  variant="elevated"
                  size="lg"
                  radius="2xl"
                  className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Mail className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Heading level="h3" size="lg">
                        Email Support
                      </Heading>
                      <Text variant="body" color="secondary" as="p">
                        For general inquiries and support
                      </Text>
                      <a
                        href="mailto:support@capimaxrt.com"
                        className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                      >
                        support@capimaxrt.com
                      </a>
                    </div>
                  </div>
                </Card>

                {/* Response Time */}
                <Card
                  variant="elevated"
                  size="lg"
                  radius="2xl"
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Clock className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Heading level="h3" size="lg">
                        Response Time
                      </Heading>
                      <Text variant="body" color="secondary" as="p">
                        We typically respond within 24-48 business hours. For urgent matters, please indicate so in your message subject.
                      </Text>
                    </div>
                  </div>
                </Card>

                {/* Security Note */}
                <Card
                  variant="elevated"
                  size="lg"
                  radius="2xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Heading level="h3" size="lg">
                        Your Privacy Matters
                      </Heading>
                      <Text variant="body" color="secondary" as="p">
                        All communications are handled securely and confidentially. We will never share your information with third parties.
                      </Text>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </Section>
        </main>

        <Footer />
      </div>
    </>
  );
};
