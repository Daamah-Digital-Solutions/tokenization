import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Sparkles, FolderOpen, Loader2, AlertCircle } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Section } from '../components/design-system/sections/Section';
import { DocumentService, type Document } from '../services/documents/DocumentService';
import { useRouter } from '../utils/router';

export const DocumentCenterPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { navigate } = useRouter();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const data = await DocumentService.getDocuments();
        setDocuments(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      <Navbar />

      <main className="relative pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] overflow-hidden">
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
          <div className="relative z-10 min-h-[50vh] flex items-center">
            <Container>
              <div className="text-center space-y-8 max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-500/30 shadow-xl"
                >
                  <FileText className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Official Platform Documents</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white"
                >
                  Document{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
                    Center
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto"
                >
                  Access important documents, reports, and resources related to the Capimax tokenization platform. All files are available for download.
                </motion.p>
              </div>
            </Container>
          </div>
        </section>

        {/* Documents List Section */}
        <Section className="py-16">
          <Container>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Loading documents...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-semibold text-lg mb-2">Failed to load documents</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <FolderOpen className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-semibold text-xl mb-2">No documents yet</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Documents will appear here once they are published.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="group bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1 truncate">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(doc.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.download_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </Container>
        </Section>

        {/* CTA Section */}
        <Section variant="dark">
          <Container>
            <div className="text-center py-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-3xl lg:text-4xl font-bold text-white mb-4"
              >
                Ready to Start Investing?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto"
              >
                Explore tokenized real estate opportunities and build your portfolio with Capimax.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={() => navigate('properties')}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Browse Properties
                </button>
                <button
                  onClick={() => navigate('register')}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors"
                >
                  Create Account
                </button>
              </motion.div>
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </div>
  );
};
