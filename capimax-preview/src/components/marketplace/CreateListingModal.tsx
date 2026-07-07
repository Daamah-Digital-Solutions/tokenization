import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Building2,
  Coins,
  Calculator,
  Timer,
  MapPin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Badge } from '../design-system/icons/Badge';
import { Card } from '../design-system/cards/Card';
import { Heading } from '../design-system/typography/Heading';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';
import { marketplaceService, type CreateListingRequest } from '../../services/marketplace/MarketplaceService';
import { PropertyService } from '../../services/property/PropertyService';
import { InvestmentService } from '../../services/investment/InvestmentService';
import { useUser } from '../../contexts/AuthContext';
import { PROPERTY_PLACEHOLDER, handleImageFallback } from '../../utils/imageFallback';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /**
   * When set, the modal skips the property-picker and opens straight on the
   * details step for this property (client edit #2 — "Sell" on a My Properties
   * card should already know which property you mean).
   */
  preselectPropertyId?: string;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectPropertyId
}) => {
  // AuthContext exposes the full reducer-shaped value (`{ state, login,
  // logout, ... }`), so `const { user } = useAuth()` was always
  // resolving to `undefined`. That made `enabled: isOpen && !!user`
  // evaluate to false, so the user-investments query never ran and
  // every investor saw "No Properties Found" even when they owned
  // tokens. Use the `useUser()` helper instead — it pulls
  // `state.user` for us.
  const user = useUser();
  const [step, setStep] = useState<'select' | 'details' | 'confirm' | 'processing' | 'success'>('select');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [listingData, setListingData] = useState<Partial<CreateListingRequest>>({
    listing_type: 'sell',
    tokens_offered: 1,
    price_per_token: '',
    minimum_order_size: 1,
    accepts_partial_fills: true,
    auto_extend: false,
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Guards the auto-preselect so it fires once per open (and not again if the
  // user manually navigates back to the picker).
  const preselectDoneRef = useRef(false);

  // Fetch user's investments (properties they own tokens in)
  const { data: investments, isLoading: investmentsLoading } = useQuery({
    queryKey: ['user-investments'],
    queryFn: () => InvestmentService.getUserInvestments(),
    enabled: isOpen && !!user
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedProperty(null);
      preselectDoneRef.current = false;
      setListingData({
        listing_type: 'sell',
        tokens_offered: 1,
        price_per_token: '',
        minimum_order_size: 1,
        accepts_partial_fills: true,
        auto_extend: false,
        notes: ''
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateListing = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedProperty) {
      newErrors.property = 'Please select a property';
    }

    if (!listingData.tokens_offered || listingData.tokens_offered < 1) {
      newErrors.tokens_offered = 'Tokens offered must be at least 1';
    }

    if (selectedProperty && listingData.tokens_offered! > selectedProperty.tokens_owned) {
      newErrors.tokens_offered = `You can only sell up to ${selectedProperty.tokens_owned} tokens`;
    }

    if (!listingData.price_per_token || parseFloat(listingData.price_per_token) <= 0) {
      newErrors.price_per_token = 'Please enter a valid price per token';
    }

    if (listingData.minimum_order_size! < 1) {
      newErrors.minimum_order_size = 'Minimum order size must be at least 1';
    }

    if (listingData.minimum_order_size! > listingData.tokens_offered!) {
      newErrors.minimum_order_size = 'Minimum order size cannot exceed tokens offered';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePropertySelect = (investment: any) => {
    setSelectedProperty(investment);
    setListingData(prev => ({
      ...prev,
      property_listing: investment.property.id,
      tokens_offered: Math.min(10, investment.tokens_owned), // Default to 10 or max owned
      price_per_token: investment.property.current_token_price || '100.00'
    }));
    setStep('details');
  };

  // When opened pre-scoped to a property (e.g. "Sell" on a My Properties card),
  // auto-select it once the investor's holdings load and jump past the picker.
  useEffect(() => {
    if (!isOpen || !preselectPropertyId || preselectDoneRef.current) return;
    if (!investments || investments.length === 0) return;
    const match = investments.find(
      (inv: any) => String(inv?.property?.id) === String(preselectPropertyId),
    );
    if (match) {
      preselectDoneRef.current = true;
      handlePropertySelect(match);
    }
  }, [isOpen, preselectPropertyId, investments]);

  const handleContinue = () => {
    if (validateListing()) {
      setStep('confirm');
    }
  };

  const handleSubmitListing = async () => {
    if (!validateListing()) return;

    setIsSubmitting(true);
    try {
      // Set expiry to 7 days from now if not set
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const createData: CreateListingRequest = {
        property_listing: selectedProperty.property.id,
        listing_type: listingData.listing_type!,
        tokens_offered: listingData.tokens_offered!,
        price_per_token: listingData.price_per_token!,
        minimum_order_size: listingData.minimum_order_size,
        expires_at: expiryDate.toISOString(),
        accepts_partial_fills: listingData.accepts_partial_fills,
        auto_extend: listingData.auto_extend,
        notes: listingData.notes
      };

      setStep('processing');
      // The backend's `MarketListingCreateSerializer` echoes the request
      // payload back on 201 Created — without serializing the model's
      // `id` field. So the previous `if (result.id) { setStep('success') }`
      // check left the modal frozen on "Creating Your Listing…"
      // indefinitely even though the listing had been written.
      //
      // The promise resolving without throwing IS the success signal —
      // axios already throws on any non-2xx, so by definition the
      // listing was created. Advance to success unconditionally.
      await marketplaceService.createListing(createData);
      setStep('success');
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Listing creation failed:', error);
      setErrors({ general: error.message || 'Failed to create listing. Please try again.' });
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

  const totalValue = (listingData.tokens_offered || 0) * parseFloat(listingData.price_per_token || '0');

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
            className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <Heading level="h3" size="xl">
                      Create Sell Listing
                    </Heading>
                    <Text variant="bodySmall" color="secondary">
                      List your property tokens for sale
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

            {/* Step Indicator */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                {[
                  { id: 'select', label: 'Select Property' },
                  { id: 'details', label: 'Listing Details' },
                  { id: 'confirm', label: 'Confirm' }
                ].map((stepItem, index) => (
                  <div key={stepItem.id} className="flex items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      step === stepItem.id || (['processing', 'success'].includes(step) && index < 3)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    )}>
                      {index + 1}
                    </div>
                    <span className={cn(
                      "ml-2 text-sm font-medium",
                      step === stepItem.id || (['processing', 'success'].includes(step) && index < 3)
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}>
                      {stepItem.label}
                    </span>
                    {index < 2 && (
                      <div className={cn(
                        "w-12 h-0.5 ml-4",
                        (['processing', 'success'].includes(step) && index < 2) ||
                        (step === 'confirm' && index < 2) ||
                        (step === 'details' && index < 1)
                          ? "bg-blue-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 'select' && (
                <div className="space-y-6">
                  <div>
                    <Heading level="h4" size="lg" className="mb-2">
                      Select Property to Sell
                    </Heading>
                    <Text variant="body" color="secondary">
                      Choose from properties you own tokens in
                    </Text>
                  </div>

                  {investmentsLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-32" />
                      ))}
                    </div>
                  )}

                  {!investmentsLoading && investments && investments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {investments.map((investment) => (
                        <motion.div
                          key={investment.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            variant="outline"
                            className="p-4 cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => handlePropertySelect(investment)}
                          >
                            <div className="flex gap-4">
                              <img
                                src={investment.property.image_url || PROPERTY_PLACEHOLDER}
                                alt={investment.property.title}
                                className="w-16 h-16 rounded-lg object-cover"
                                onError={handleImageFallback}
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                  {investment.property.title}
                                </h4>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {investment.property.city}
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Your Tokens:</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {investment.tokens_owned}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {!investmentsLoading && (!investments || investments.length === 0) && (
                    <Card variant="outline" className="p-8 text-center">
                      <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <Heading level="h4" size="lg" className="mb-2">
                        No Properties Found
                      </Heading>
                      <Text variant="body" color="secondary">
                        You don't own tokens in any properties yet. Purchase some tokens first to create sell listings.
                      </Text>
                    </Card>
                  )}

                  {errors.property && (
                    <p className="text-red-600 dark:text-red-400 text-sm">{errors.property}</p>
                  )}
                </div>
              )}

              {step === 'details' && selectedProperty && (
                <div className="space-y-6">
                  {/* Property Info */}
                  <Card variant="outline" className="p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex gap-4">
                      <img
                        src={selectedProperty.property.image_url || PROPERTY_PLACEHOLDER}
                        alt={selectedProperty.property.title}
                        className="w-20 h-20 rounded-xl object-cover"
                        onError={handleImageFallback}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {selectedProperty.property.title}
                        </h4>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          {selectedProperty.property.city}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Your Tokens:</span>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {selectedProperty.tokens_owned}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Current Price:</span>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              ${selectedProperty.property.current_token_price || '100.00'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Listing Details Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tokens to Sell */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tokens to Sell
                      </label>
                      <Input
                        type="number"
                        value={listingData.tokens_offered}
                        onChange={(e) => setListingData(prev => ({
                          ...prev,
                          tokens_offered: parseInt(e.target.value) || 0
                        }))}
                        min={1}
                        max={selectedProperty.tokens_owned}
                        className={errors.tokens_offered ? 'border-red-500' : ''}
                      />
                      {errors.tokens_offered && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.tokens_offered}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Maximum: {selectedProperty.tokens_owned} tokens
                      </p>
                    </div>

                    {/* Price per Token */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price per Token ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={listingData.price_per_token}
                        onChange={(e) => setListingData(prev => ({
                          ...prev,
                          price_per_token: e.target.value
                        }))}
                        className={errors.price_per_token ? 'border-red-500' : ''}
                      />
                      {errors.price_per_token && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.price_per_token}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Suggested: ${selectedProperty.property.current_token_price || '100.00'}
                      </p>
                    </div>

                    {/* Minimum Order Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Order Size
                      </label>
                      <Input
                        type="number"
                        value={listingData.minimum_order_size}
                        onChange={(e) => setListingData(prev => ({
                          ...prev,
                          minimum_order_size: parseInt(e.target.value) || 1
                        }))}
                        min={1}
                        max={listingData.tokens_offered}
                        className={errors.minimum_order_size ? 'border-red-500' : ''}
                      />
                      {errors.minimum_order_size && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.minimum_order_size}</p>
                      )}
                    </div>

                    {/* Total Value Display */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total Value
                      </label>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${totalValue.toFixed(2)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {listingData.tokens_offered} tokens × ${parseFloat(listingData.price_per_token || '0').toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Accept Partial Fills</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Allow buyers to purchase part of your listing
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={listingData.accepts_partial_fills}
                          onChange={(e) => setListingData(prev => ({
                            ...prev,
                            accepts_partial_fills: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Auto-extend Listing</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Automatically extend listing when it expires
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={listingData.auto_extend}
                          onChange={(e) => setListingData(prev => ({
                            ...prev,
                            auto_extend: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={listingData.notes}
                      onChange={(e) => setListingData(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      placeholder="Add any additional notes about your listing..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleContinue} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 'confirm' && selectedProperty && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calculator className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <Heading level="h4" size="lg" className="mb-2">
                      Confirm Your Listing
                    </Heading>
                    <Text variant="body" color="secondary">
                      Please review your listing details before submitting
                    </Text>
                  </div>

                  {/* Listing Summary */}
                  <Card variant="outline" className="p-6">
                    <div className="flex gap-4 mb-6">
                      <img
                        src={selectedProperty.property.image_url || PROPERTY_PLACEHOLDER}
                        alt={selectedProperty.property.title}
                        className="w-20 h-20 rounded-xl object-cover"
                        onError={handleImageFallback}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {selectedProperty.property.title}
                        </h4>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="w-4 h-4 mr-1" />
                          {selectedProperty.property.city}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tokens for Sale</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {listingData.tokens_offered?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Price per Token</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${parseFloat(listingData.price_per_token || '0').toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Minimum Order Size</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {listingData.minimum_order_size} tokens
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Partial Fills</span>
                        <Badge variant={listingData.accepts_partial_fills ? 'accent' : 'secondary'}>
                          {listingData.accepts_partial_fills ? 'Allowed' : 'Not Allowed'}
                        </Badge>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold text-gray-900 dark:text-white">Total Value</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            ${totalValue.toFixed(2)}
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
                          <li>• Your tokens will be locked while the listing is active</li>
                          <li>• Listing expires in 7 days (can be extended)</li>
                          <li>• You can cancel the listing at any time if no orders are pending</li>
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
                    <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleSubmitListing} disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? 'Creating...' : 'Create Listing'}
                    </Button>
                  </div>
                </div>
              )}

              {step === 'processing' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Timer className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
                  </div>
                  <Heading level="h4" size="lg" className="mb-2">
                    Creating Your Listing
                  </Heading>
                  <Text variant="body" color="secondary">
                    Please wait while we create your sell listing...
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
                    Listing Created Successfully!
                  </Heading>
                  <Text variant="body" color="secondary" className="mb-4">
                    Your sell listing has been created and is now live on the marketplace.
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