import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Building2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Badge } from '../design-system/icons/Badge';
import { Card } from '../design-system/cards/Card';
import { Heading } from '../design-system/typography/Heading';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';
import { marketplaceService, type SecondaryMarketListing, type TradeOrderRequest } from '../../services/marketplace/MarketplaceService';
import { useAuth } from '../../contexts/AuthContext';

interface BuyOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: SecondaryMarketListing | null;
  onSuccess?: () => void;
}

export const BuyOrderModal: React.FC<BuyOrderModalProps> = ({
  isOpen,
  onClose,
  listing,
  onSuccess
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'order' | 'confirm' | 'processing' | 'success'>('order');
  const [orderData, setOrderData] = useState({
    tokens_requested: 1,
    order_type: 'market' as 'market' | 'limit',
    price_per_token: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && listing) {
      setStep('order');
      setOrderData({
        tokens_requested: listing.minimum_order_size || 1,
        order_type: 'market',
        price_per_token: listing.price_per_token
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, listing]);

  if (!listing) return null;

  const pricePerToken = parseFloat(orderData.price_per_token || listing.price_per_token);
  const totalCost = pricePerToken * orderData.tokens_requested;
  const estimatedFees = totalCost * 0.025; // 2.5% fee
  const totalWithFees = totalCost + estimatedFees;

  const validateOrder = () => {
    const newErrors: Record<string, string> = {};

    if (orderData.tokens_requested < listing.minimum_order_size) {
      newErrors.tokens_requested = `Minimum order size is ${listing.minimum_order_size} tokens`;
    }

    if (orderData.tokens_requested > listing.tokens_remaining) {
      newErrors.tokens_requested = `Only ${listing.tokens_remaining} tokens available`;
    }

    if (orderData.order_type === 'limit' && (!orderData.price_per_token || parseFloat(orderData.price_per_token) <= 0)) {
      newErrors.price_per_token = 'Please enter a valid price per token';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateOrder()) {
      setStep('confirm');
    }
  };

  const handleSubmitOrder = async () => {
    if (!validateOrder()) return;

    setIsSubmitting(true);
    try {
      const tradeOrderData: TradeOrderRequest = {
        listing: listing.id,
        order_type: orderData.order_type,
        tokens_requested: orderData.tokens_requested,
        price_per_token: orderData.order_type === 'limit' ? orderData.price_per_token : listing.price_per_token
      };

      setStep('processing');
      const result = await marketplaceService.createTradeOrder(tradeOrderData);

      if (result.success) {
        setStep('success');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('Order submission failed:', error);
      setErrors({ general: error.message || 'Failed to submit order. Please try again.' });
      setStep('confirm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (step !== 'processing') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Heading level="h3" size="xl">
                      Buy Property Tokens
                    </Heading>
                    <Text variant="bodySmall" color="secondary">
                      {listing.property_listing.title}
                    </Text>
                  </div>
                </div>
                {step !== 'processing' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Property Info */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex gap-4">
                <img
                  src={listing.property_listing.images?.[0]?.image || listing.property_listing.image_url || '/placeholder-property.jpg'}
                  alt={listing.property_listing.title}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {listing.property_listing.title}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {listing.property_listing.city}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {listing.property_listing.property_type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Available Tokens</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {listing.tokens_remaining.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Current Price</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${parseFloat(listing.price_per_token).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 'order' && (
                <div className="space-y-6">
                  {/* Order Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Order Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={orderData.order_type === 'market' ? 'default' : 'outline'}
                        onClick={() => setOrderData(prev => ({
                          ...prev,
                          order_type: 'market',
                          price_per_token: listing.price_per_token
                        }))}
                        className="h-12 justify-start"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Market Order
                      </Button>
                      <Button
                        variant={orderData.order_type === 'limit' ? 'default' : 'outline'}
                        onClick={() => setOrderData(prev => ({
                          ...prev,
                          order_type: 'limit',
                          price_per_token: listing.price_per_token
                        }))}
                        className="h-12 justify-start"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Limit Order
                      </Button>
                    </div>
                  </div>

                  {/* Token Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Tokens
                    </label>
                    <Input
                      type="number"
                      value={orderData.tokens_requested}
                      onChange={(e) => setOrderData(prev => ({
                        ...prev,
                        tokens_requested: parseInt(e.target.value) || 0
                      }))}
                      min={listing.minimum_order_size}
                      max={listing.tokens_remaining}
                      className={errors.tokens_requested ? 'border-red-500' : ''}
                    />
                    {errors.tokens_requested && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.tokens_requested}</p>
                    )}
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span>Min: {listing.minimum_order_size}</span>
                      <span>Max: {listing.tokens_remaining}</span>
                    </div>
                  </div>

                  {/* Price (for limit orders) */}
                  {orderData.order_type === 'limit' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price per Token ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={orderData.price_per_token}
                        onChange={(e) => setOrderData(prev => ({
                          ...prev,
                          price_per_token: e.target.value
                        }))}
                        className={errors.price_per_token ? 'border-red-500' : ''}
                      />
                      {errors.price_per_token && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.price_per_token}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Current market price: ${parseFloat(listing.price_per_token).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Order Summary */}
                  <Card variant="outline" className="p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Tokens</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {orderData.tokens_requested.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Price per Token</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${pricePerToken.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${totalCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Platform Fee (2.5%)</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${estimatedFees.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                          <span className="font-bold text-xl text-gray-900 dark:text-white">
                            ${totalWithFees.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleContinue} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calculator className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Heading level="h4" size="lg" className="mb-2">
                      Confirm Your Order
                    </Heading>
                    <Text variant="body" color="secondary">
                      Please review your order details before submitting
                    </Text>
                  </div>

                  {/* Order Summary */}
                  <Card variant="outline" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Order Type</span>
                        <Badge variant={orderData.order_type === 'market' ? 'accent' : 'secondary'}>
                          {orderData.order_type === 'market' ? 'Market Order' : 'Limit Order'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tokens to Purchase</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {orderData.tokens_requested.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Price per Token</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${pricePerToken.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold text-gray-900 dark:text-white">Total Cost</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            ${totalWithFees.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Important Notes */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                          Important Notes:
                        </p>
                        <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                          <li>• Orders are processed immediately and cannot be cancelled</li>
                          <li>• Token transfer will occur upon order completion</li>
                          <li>• Platform fees are non-refundable</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {errors.general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('order')} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleSubmitOrder} disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? 'Submitting...' : 'Submit Order'}
                    </Button>
                  </div>
                </div>
              )}

              {step === 'processing' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                  <Heading level="h4" size="lg" className="mb-2">
                    Processing Your Order
                  </Heading>
                  <Text variant="body" color="secondary">
                    Please wait while we process your token purchase...
                  </Text>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </motion.div>
                  <Heading level="h4" size="lg" className="mb-2">
                    Order Submitted Successfully!
                  </Heading>
                  <Text variant="body" color="secondary" className="mb-4">
                    Your buy order has been submitted and is being processed. You'll receive a confirmation email shortly.
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Redirecting you back to the marketplace...
                  </Text>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};