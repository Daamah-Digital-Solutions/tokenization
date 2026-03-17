import React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  ArrowLeft,
  Building,
  Calendar,
  Receipt,
  Shield,
  CheckCircle,
  User,
  Hash,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { Button } from '../ui/Button';
import { BlockchainLink } from '../ui/BlockchainLink';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import type { InvestmentProperty, InvestmentData } from './types';
import { cn } from '../../utils/cn';

interface InvestmentReceiptProps {
  property: InvestmentProperty;
  investmentData: InvestmentData;
  transactionId: string;
  blockchainHash?: string | null;
  investmentStatus?: 'completed' | 'pending' | 'minting' | 'pending_mint' | 'failed';
  onClose: () => void;
  onDownload: () => void;
  className?: string;
}

export const InvestmentReceipt: React.FC<InvestmentReceiptProps> = ({
  property,
  investmentData,
  transactionId,
  blockchainHash,
  investmentStatus = 'completed',
  onClose,
  onDownload,
  className
}) => {
  const currentDate = new Date();
  const nextDividendDate = new Date();
  nextDividendDate.setMonth(nextDividendDate.getMonth() + 3);

  const calculateReturns = () => {
    const annualReturn = (investmentData.amount * property.investment.avgAnnualReturn) / 100;
    const quarterlyDividend = annualReturn / 4;
    const managementFeeAmount = (investmentData.amount * property.investment.managementFee) / 100;
    const netAnnualReturn = annualReturn - managementFeeAmount;
    
    return { 
      annualReturn, 
      quarterlyDividend, 
      managementFeeAmount, 
      netAnnualReturn,
      totalROI: (netAnnualReturn / investmentData.amount) * 100
    };
  };

  const returns = calculateReturns();
  const ownershipPercentage = (investmentData.tokens / property.totalTokens) * 100;

  const downloadReceipt = () => {
    // In a real app, this would generate and download a PDF
    onDownload();
    
    // Mock download functionality
    const receiptData = `
CAPIMAX TOKENIZATION PLATFORM
Investment Receipt

Transaction ID: ${transactionId}
Date: ${currentDate.toLocaleDateString()}
Time: ${currentDate.toLocaleTimeString()}

PROPERTY DETAILS:
Property: ${property.title}
Investment Amount: $${investmentData.amount.toLocaleString()}
Tokens Purchased: ${investmentData.tokens}
Token Price: $${property.tokenPrice}
Ownership Share: ${ownershipPercentage.toFixed(4)}%

EXPECTED RETURNS:
Annual Return: $${returns.netAnnualReturn.toLocaleString()}
Quarterly Dividend: $${returns.quarterlyDividend.toLocaleString()}
Management Fee: $${returns.managementFeeAmount.toLocaleString()}
Next Dividend: ${nextDividendDate.toLocaleDateString()}

Payment Method: ${investmentData.paymentMethod}
Status: Confirmed
    `;
    
    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `investment-receipt-${transactionId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("space-y-6 max-w-4xl mx-auto", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="md"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <Button
          variant="primary"
          size="md"
          onClick={downloadReceipt}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Receipt
        </Button>
      </div>

      {/* Receipt */}
      <Card className="p-8 bg-white dark:bg-gray-900 print:shadow-none print:border-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl">
                <Building className="w-8 h-8" />
              </div>
              <div className="text-left">
                <Text variant="h2" weight="bold" className="text-gray-900 dark:text-white">
                  CAPIMAX
                </Text>
                <Text variant="body" color="muted">
                  Real Estate Tokenization Platform
                </Text>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <Text variant="h3" weight="semibold" className="text-emerald-600">
                Investment Receipt
              </Text>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <Text variant="body" weight="medium">
                Transaction Confirmed
              </Text>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-gray-500" />
                Transaction Information
              </Text>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">Transaction ID:</Text>
                  <Text variant="body" weight="medium" className="font-mono">{transactionId}</Text>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">Date & Time:</Text>
                  <Text variant="body" weight="medium">
                    {currentDate.toLocaleDateString()} at {currentDate.toLocaleTimeString()}
                  </Text>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">Payment Method:</Text>
                  <Text variant="body" weight="medium" className="capitalize">
                    {investmentData.paymentMethod === 'crypto' ? 'Cryptocurrency' : 'Fiat Currency'}
                  </Text>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">Status:</Text>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <Text variant="body" weight="medium" className="text-emerald-600">
                      Confirmed
                    </Text>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                Investor Information
              </Text>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">Investor ID:</Text>
                  <Text variant="body" weight="medium" className="font-mono">
                    USR-{Math.random().toString(36).substr(2, 8).toUpperCase()}
                  </Text>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">Account Type:</Text>
                  <Text variant="body" weight="medium">Individual</Text>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">KYC Status:</Text>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <Text variant="body" weight="medium" className="text-emerald-600">
                      Verified
                    </Text>
                  </div>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <Text variant="body" color="muted">Registration Date:</Text>
                  <Text variant="body" weight="medium">
                    {new Date(2024, 0, 15).toLocaleDateString()}
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div>
            <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-500" />
              Property Investment Details
            </Text>
            
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Text variant="h3" weight="bold" className="text-gray-900 dark:text-white mb-2">
                    {property.title}
                  </Text>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                    <MapPin className="w-4 h-4" />
                    <Text variant="body">{property.location || 'Location not available'}</Text>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Text variant="body" color="muted">Property Type:</Text>
                      <Text variant="body" weight="medium">{property.propertyType ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1) : 'Residential'}</Text>
                    </div>
                    <div className="flex justify-between">
                      <Text variant="body" color="muted">Token Price:</Text>
                      <Text variant="body" weight="medium">${property.tokenPrice.toLocaleString()}</Text>
                    </div>
                    <div className="flex justify-between">
                      <Text variant="body" color="muted">Total Property Value:</Text>
                      <Text variant="body" weight="medium">${(property.totalValue || 0).toLocaleString()}</Text>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                  <Text variant="bodyLarge" weight="semibold" className="mb-3">
                    Your Investment Breakdown
                  </Text>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Text variant="body" color="muted">Investment Amount:</Text>
                      <Text variant="body" weight="semibold" className="text-emerald-600">
                        ${investmentData.amount.toLocaleString()}
                      </Text>
                    </div>
                    <div className="flex justify-between">
                      <Text variant="body" color="muted">Tokens Purchased:</Text>
                      <Text variant="body" weight="semibold">
                        {investmentData.tokens.toLocaleString()}
                      </Text>
                    </div>
                    <div className="flex justify-between">
                      <Text variant="body" color="muted">Token Price:</Text>
                      <Text variant="body" weight="medium">
                        ${property.tokenPrice.toLocaleString()}
                      </Text>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <Text variant="body" color="muted">Ownership Share:</Text>
                      <Text variant="body" weight="bold" className="text-purple-600">
                        {ownershipPercentage.toFixed(4)}%
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Return Projections */}
          <div>
            <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              Return Projections
            </Text>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                <Text variant="bodySmall" color="muted" className="mb-1">Annual Return</Text>
                <Text variant="h3" className="text-blue-600 dark:text-blue-400 mb-1">
                  {returns.totalROI.toFixed(1)}% ROI
                </Text>
                <Text variant="bodySmall" className="text-blue-700 dark:text-blue-300">
                  Est. ${returns.netAnnualReturn.toLocaleString()}/year
                </Text>
              </div>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center">
                <Text variant="bodySmall" color="muted" className="mb-1">Quarterly Dividend</Text>
                <Text variant="h3" className="text-emerald-600 dark:text-emerald-400 mb-1">
                  ${returns.quarterlyDividend.toLocaleString()}
                </Text>
                <Text variant="bodySmall" className="text-emerald-700 dark:text-emerald-300">
                  Every 3 months
                </Text>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center">
                <Text variant="bodySmall" color="muted" className="mb-1">Next Dividend</Text>
                <Text variant="h3" className="text-purple-600 dark:text-purple-400 mb-1">
                  {nextDividendDate.toLocaleDateString()}
                </Text>
                <Text variant="bodySmall" className="text-purple-700 dark:text-purple-300">
                  Expected date
                </Text>
              </div>
            </div>

            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Text variant="bodySmall" className="text-amber-800 dark:text-amber-200">
                <strong>Disclaimer:</strong> Projected returns are estimates based on current market conditions and historical performance. 
                Actual returns may vary and are not guaranteed. All real estate investments carry risk including potential loss of principal.
              </Text>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-600" />
              <Text variant="bodySmall" weight="medium" className="text-emerald-600">
                SEC Compliant • Blockchain Secured • Fully Audited
              </Text>
            </div>
            
            <Text variant="bodySmall" color="muted" className="mb-2">
              This receipt serves as official confirmation of your real estate token investment.
              For questions or support, contact us at invest@capimax.com
            </Text>
            
            {/* Blockchain Verification Section */}
            {investmentStatus === 'completed' && blockchainHash && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <Text variant="body" weight="semibold" className="text-emerald-700 dark:text-emerald-300">
                    Tokens Minted on Polygon Blockchain
                  </Text>
                </div>
                <Text variant="bodySmall" color="muted" className="text-center mb-3">
                  Your property tokens have been securely minted and recorded on the blockchain.
                </Text>
                <div className="flex justify-center">
                  <BlockchainLink
                    transactionHash={blockchainHash}
                    network="polygon"
                    status={investmentStatus}
                    variant="badge"
                    size="md"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-4">
              <BlockchainLink
                transactionHash={blockchainHash}
                network="polygon"
                status={investmentStatus}
                variant="button"
                size="sm"
                showStatus={true}
              />

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 dark:text-gray-400"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            </div>

            <Text variant="bodySmall" color="muted" className="mt-4">
              Generated on {currentDate.toLocaleString()}
              {blockchainHash && (
                <span> • TX: {blockchainHash.slice(0, 10)}...{blockchainHash.slice(-6)}</span>
              )}
            </Text>
          </div>
        </motion.div>
      </Card>
    </div>
  );
};