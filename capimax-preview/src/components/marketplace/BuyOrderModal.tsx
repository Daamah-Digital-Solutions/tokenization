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
  Building2,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { usePaymentOptions } from '../purchase/PaymentMethodList';
import { Input } from '../design-system/forms/Input';
import { Badge } from '../design-system/icons/Badge';
import { Card } from '../design-system/cards/Card';
import { Heading } from '../design-system/typography/Heading';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';
import { marketplaceService, type SecondaryMarketListing, type TradeOrderRequest } from '../../services/marketplace/MarketplaceService';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { PaymentService } from '../../services/payment/PaymentService';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('market');
  const [step, setStep] = useState<'order' | 'confirm' | 'processing' | 'success'>('order');
  const [orderData, setOrderData] = useState({
    tokens_requested: 1,
    order_type: 'market' as 'market' | 'limit',
    price_per_token: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Purchases are paid from the wallet balance (client round 3, #14/#21).
  const { data: feeOptions } = usePaymentOptions();
  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => PaymentService.getWalletBalance(),
    enabled: isOpen,
  });

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
  // PropShare model: the buyer pays the resale fee (admin setting, 1% by
  // default) on top of the price; the seller receives the full price.
  const resaleFeePct = Number(feeOptions?.fees?.secondary_resale_fee_pct ?? 1);
  const estimatedFees = Math.round(totalCost * resaleFeePct) / 100;
  const totalWithFees = totalCost + estimatedFees;
  const walletBalance =
    walletData?.total_value_usd ||
    walletData?.balances?.reduce((sum: number, b: any) => sum + (parseFloat(b.available_balance) || 0), 0) ||
    0;
  const insufficient = !!walletData && totalWithFees > walletBalance + 0.001;

  const validateOrder = () => {
    const newErrors: Record<string, string> = {};

    if (orderData.tokens_requested < listing.minimum_order_size) {
      newErrors.tokens_requested = t('buy.errMinOrder', { value: listing.minimum_order_size });
    }

    if (orderData.tokens_requested > listing.tokens_remaining) {
      newErrors.tokens_requested = t('buy.errOnlyAvailable', { value: listing.tokens_remaining });
    }

    if (orderData.order_type === 'limit' && (!orderData.price_per_token || parseFloat(orderData.price_per_token) <= 0)) {
      newErrors.price_per_token = t('buy.errValidPrice');
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
      const effectivePrice =
        orderData.order_type === 'limit'
          ? orderData.price_per_token
          : listing.price_per_token;
      // Backend serializer field-validates total_amount as required before
      // running the cross-field validator that would otherwise auto-compute
      // it for market orders. So send it ourselves on every request.
      const computedTotal = (
        orderData.tokens_requested * parseFloat(effectivePrice)
      ).toFixed(2);
      const tradeOrderData: TradeOrderRequest = {
        listing: listing.id,
        order_type: orderData.order_type,
        tokens_requested: orderData.tokens_requested,
        price_per_token: effectivePrice,
        total_amount: computedTotal,
      };

      setStep('processing');
      const result: any = await marketplaceService.createTradeOrder(tradeOrderData);

      // Backend returns the serialized TradeOrder directly (DRF default
      // create), not a `{ success: true, ... }` envelope. Treat the
      // presence of an `id` or an explicit `success` flag as confirmation.
      const succeeded = result && (result.success === true || !!result.id || !!result.order_id);
      if (succeeded) {
        setStep('success');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        }
      } else {
        // No identifying field came back — surface the failure rather
        // than leave the UI stuck on the processing step.
        throw new Error(t('buy.errNoConfirmation'));
      }
    } catch (error: any) {
      console.error('Order submission failed:', error);
      setErrors({ general: error.message || t('buy.errSubmit') });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
            className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Heading level="h3" size="xl">
                      {t('buy.title')}
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
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0">
              <div className="flex gap-4">
                {(() => {
                  const imgUrl =
                    listing.property_listing.images?.[0]?.image ||
                    (listing.property_listing as any).image_url;
                  if (imgUrl) {
                    return (
                      <img
                        src={imgUrl}
                        alt={listing.property_listing.title}
                        className="w-20 h-20 rounded-xl object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    );
                  }
                  return (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-100 to-emerald-50 dark:from-blue-900/30 dark:to-emerald-900/20 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-blue-300 dark:text-blue-700" />
                    </div>
                  );
                })()}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {listing.property_listing.title}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="w-4 h-4 me-1" />
                        {listing.property_listing.city}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {t(`propertyTypes.${listing.property_listing.property_type}`, { defaultValue: listing.property_listing.property_type })}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('buy.availableTokens')}</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {listing.tokens_remaining.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('buy.currentPrice')}</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${parseFloat(listing.price_per_token).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 pb-0 sm:pb-0 overflow-y-auto flex-1 min-h-0">
              {step === 'order' && (
                <div className="space-y-6">
                  {/* Order Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('buy.orderType')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setOrderData(prev => ({
                          ...prev,
                          order_type: 'market',
                          price_per_token: listing.price_per_token
                        }))}
                        className={`text-start rounded-xl border p-4 transition-colors ${
                          orderData.order_type === 'market'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500/40'
                            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                          <Zap className="w-4 h-4 text-emerald-600" />
                          {t('buy.marketOrder')}
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-snug">
                          {t('buy.marketOrderDesc', { price: parseFloat(listing.price_per_token).toFixed(2) })}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderData(prev => ({
                          ...prev,
                          order_type: 'limit',
                          price_per_token: listing.price_per_token
                        }))}
                        className={`text-start rounded-xl border p-4 transition-colors ${
                          orderData.order_type === 'limit'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/40'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          {t('buy.limitOrder')}
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-snug">
                          {t('buy.limitOrderDesc')}
                        </p>
                      </button>
                    </div>
                    {orderData.order_type === 'limit' && (
                      <p className="mt-3 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                        {t('buy.limitOrderNote')}
                      </p>
                    )}
                  </div>

                  {/* Token Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('buy.numberOfTokens')}
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
                      <span>{t('buy.min', { value: listing.minimum_order_size })}</span>
                      <span>{t('buy.max', { value: listing.tokens_remaining })}</span>
                    </div>
                  </div>

                  {/* Price (for limit orders) */}
                  {orderData.order_type === 'limit' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('buy.pricePerTokenUsd')}
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
                        {t('buy.currentMarketPrice', { price: parseFloat(listing.price_per_token).toFixed(2) })}
                      </p>
                    </div>
                  )}

                  {/* Order Summary */}
                  <Card variant="outline" className="p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{t('buy.tokens')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {orderData.tokens_requested.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{t('buy.pricePerToken')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${pricePerToken.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{t('buy.subtotal')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${totalCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{t('buy.platformFee', { pct: resaleFeePct })}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${estimatedFees.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900 dark:text-white">{t('buy.total')}</span>
                          <span className="font-bold text-xl text-gray-900 dark:text-white">
                            ${totalWithFees.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleContinue} className="flex-1">
                      {t('common.continue')}
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
                      {t('buy.confirmTitle')}
                    </Heading>
                    <Text variant="body" color="secondary">
                      {t('buy.confirmSubtitle')}
                    </Text>
                  </div>

                  {/* Order Summary */}
                  <Card variant="outline" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{t('buy.orderType')}</span>
                        <Badge variant={orderData.order_type === 'market' ? 'accent' : 'secondary'}>
                          {orderData.order_type === 'market' ? t('buy.marketOrder') : t('buy.limitOrder')}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('buy.tokensToPurchase')}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {orderData.tokens_requested.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('buy.pricePerToken')}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${pricePerToken.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold text-gray-900 dark:text-white">{t('buy.totalCost')}</span>
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
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 me-3 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                          {t('buy.importantNotes')}
                        </p>
                        <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                          <li>• {t('buy.note1')}</li>
                          <li>• {t('buy.note2')}</li>
                          <li>• {t('buy.note3')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    'flex items-center justify-between rounded-lg p-4 text-sm border',
                    insufficient
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                      : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  )}>
                    <span>{t('buy.walletBalance')} <strong>${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    {insufficient && <span className="font-medium">{t('buy.addFunds')}</span>}
                  </div>

                  {errors.general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 me-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
                      </div>
                    </div>
                  )}

                  <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <Button variant="outline" onClick={() => setStep('order')} className="flex-1">
                      {t('common.back')}
                    </Button>
                    <Button onClick={handleSubmitOrder} disabled={isSubmitting || insufficient} className="flex-1">
                      {isSubmitting ? t('buy.submitting') : t('buy.submitOrder')}
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
                    {t('buy.processingTitle')}
                  </Heading>
                  <Text variant="body" color="secondary">
                    {t('buy.processingDesc')}
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
                    {t('buy.successTitle')}
                  </Heading>
                  <Text variant="body" color="secondary" className="mb-4">
                    {t('buy.successDesc')}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {t('buy.redirecting')}
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