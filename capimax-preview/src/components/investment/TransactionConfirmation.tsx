import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2,
  Download,
  Share2,
  Eye,
  ExternalLink,
  Calendar,
  TrendingUp,
  Building,
  Trophy,
  Gift,
  Star,
  Copy,
  Mail,
  Twitter,
  Facebook,
  Linkedin
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { InvestmentReceipt } from './InvestmentReceipt';
import type { InvestmentProperty, InvestmentData } from './types';
import { cn } from '../../utils/cn';

interface TransactionConfirmationProps {
  property: InvestmentProperty;
  investmentData: InvestmentData;
  onClose: () => void;
  transactionId?: string;
}

export const TransactionConfirmation: React.FC<TransactionConfirmationProps> = ({
  property,
  investmentData,
  onClose,
  transactionId = `TXN-${Date.now()}`
}) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const calculateReturns = () => {
    const annualReturn = (investmentData.amount * property.investment.avgAnnualReturn) / 100;
    const quarterlyDividend = annualReturn / 4;
    // Guard against division by zero
    const totalROI = investmentData.amount > 0 ? (annualReturn / investmentData.amount) * 100 : 0;

    return { annualReturn, quarterlyDividend, totalROI };
  };

  const returns = calculateReturns();
  const nextDividendDate = new Date();
  nextDividendDate.setMonth(nextDividendDate.getMonth() + 3);

  const sendConfirmationEmail = async () => {
    // Mock email sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEmailSent(true);
  };

  const shareInvestment = (platform: string) => {
    const shareText = `I just invested $${investmentData.amount.toLocaleString()} in ${property.title} through tokenized real estate! 🏢💎`;
    const shareUrl = window.location.href;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };
    
    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
  };

  const copyInvestmentDetails = async () => {
    const details = `Investment Confirmation
Property: ${property.title}
Amount: $${investmentData.amount.toLocaleString()}
Tokens: ${investmentData.tokens}
Expected Annual Return: $${returns.annualReturn.toLocaleString()}
Transaction ID: ${transactionId}`;
    
    await navigator.clipboard.writeText(details);
  };

  if (showReceipt) {
    return (
      <InvestmentReceipt
        property={property}
        investmentData={investmentData}
        transactionId={transactionId}
        onClose={() => setShowReceipt(false)}
        onDownload={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Animation */}
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Text variant="h2" weight="bold" className="text-gray-900 dark:text-white mb-2">
            Investment Successful!
          </Text>
          <Text variant="bodyLarge" color="muted">
            Welcome to the future of real estate investment
          </Text>
        </motion.div>
      </div>

      {/* Investment Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Text variant="h4" weight="semibold" className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Your Investment
          </Text>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <Text variant="bodySmall" weight="medium">Active</Text>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Investment Amount */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-xl text-center">
            <Building className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <Text variant="h3" className="text-emerald-600 dark:text-emerald-400 mb-1">
              ${investmentData.amount.toLocaleString()}
            </Text>
            <Text variant="bodySmall" color="muted">Investment Amount</Text>
          </div>

          {/* Property Tokens */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl text-center">
            <Gift className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <Text variant="h3" className="text-blue-600 dark:text-blue-400 mb-1">
              {investmentData.tokens}
            </Text>
            <Text variant="bodySmall" color="muted">Property Tokens</Text>
          </div>

          {/* Expected Return */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl text-center">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <Text variant="h3" className="text-purple-600 dark:text-purple-400 mb-1">
              {returns.totalROI.toFixed(1)}%
            </Text>
            <Text variant="bodySmall" color="muted">Expected Annual ROI</Text>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Property:</span>
              <span className="font-medium text-right">{property.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
              <span className="font-mono text-right">{transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Annual Return:</span>
              <span className="font-medium text-emerald-600">${returns.annualReturn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Next Dividend:</span>
              <span className="font-medium">{nextDividendDate.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* What's Next */}
      <Card className="p-6">
        <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          What's Next?
        </Text>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-bold">
              1
            </div>
            <div>
              <Text variant="bodyLarge" weight="semibold" className="mb-1">
                Portfolio Integration
              </Text>
              <Text variant="body" color="muted">
                Your investment will appear in your portfolio dashboard within 24 hours. 
                You'll be able to track performance and manage your holdings.
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="flex items-center justify-center w-8 h-8 bg-emerald-500 text-white rounded-full text-sm font-bold">
              2
            </div>
            <div>
              <Text variant="bodyLarge" weight="semibold" className="mb-1">
                First Dividend Payment
              </Text>
              <Text variant="body" color="muted">
                Your first quarterly dividend of ${returns.quarterlyDividend.toLocaleString()} 
                will be paid on {nextDividendDate.toLocaleDateString()}.
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full text-sm font-bold">
              3
            </div>
            <div>
              <Text variant="bodyLarge" weight="semibold" className="mb-1">
                Investment Certificate
              </Text>
              <Text variant="body" color="muted">
                A digital certificate of ownership will be sent to your email within 48 hours. 
                This serves as official proof of your investment.
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowReceipt(true)}
          className="flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Receipt
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => setShowReceipt(true)}
          className="flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Receipt
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={copyInvestmentDetails}
          className="flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy Details
        </Button>
      </div>

      {/* Email Confirmation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <Text variant="bodyLarge" weight="semibold" className="mb-1">
              Email Confirmation
            </Text>
            <Text variant="body" color="muted">
              {emailSent 
                ? "Confirmation email sent successfully!" 
                : "Send detailed investment confirmation to your email"
              }
            </Text>
          </div>
          <Button
            variant={emailSent ? "secondary" : "primary"}
            size="md"
            onClick={sendConfirmationEmail}
            disabled={emailSent}
            className="flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {emailSent ? "Sent" : "Send Email"}
          </Button>
        </div>
      </Card>

      {/* Share Investment */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Text variant="bodyLarge" weight="semibold" className="mb-1">
              Share Your Investment
            </Text>
            <Text variant="body" color="muted">
              Let others know about your smart investment choice
            </Text>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => shareInvestment('twitter')}
            className="flex items-center gap-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => shareInvestment('facebook')}
            className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => shareInvestment('linkedin')}
            className="flex items-center gap-2 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </Button>
        </div>
      </Card>

      {/* Close Button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="primary"
          size="lg"
          onClick={onClose}
          className="min-w-[200px]"
        >
          Return to Property
        </Button>
      </div>

      {/* Celebration */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center py-4"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              transition={{ delay: 1.2 + i * 0.1, duration: 0.6 }}
            >
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </motion.div>
          ))}
        </div>
        <Text variant="bodyLarge" className="text-emerald-600 dark:text-emerald-400 font-semibold">
          🎉 Congratulations on your investment! 🎉
        </Text>
        <Text variant="body" color="muted">
          You're now part of the future of real estate ownership
        </Text>
      </motion.div>
    </div>
  );
};