import React, { useState } from 'react';
import { constructionStageLabel } from '../../../utils/constructionStage';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapPin, Users, TrendingUp, Star, Award, Heart, Share2, Eye, Bookmark, Clock, Shield, DollarSign, Calculator, Home, Building2, Calendar, Percent, CreditCard, BarChart3 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Card } from './Card';
import { Button } from '../../ui/Button';
import { Text } from '../typography/Text';
import { PropertyCategory } from '../../../services/api/types';
import type { Property } from '../../../services/api/types';
import { PROPERTY_PLACEHOLDER, handleImageFallback } from '../../../utils/imageFallback';
import { uiLocale } from '../../../utils/locale';

interface PropertyCardProps extends Omit<Property, 'id'> {
  id: string;
  featured?: boolean;
  className?: string;
  onInvestClick?: () => void;
  onQuickView?: () => void;
  onCardClick?: () => void;
  onFavorite?: (id: string, isFavorite: boolean) => void;
  onShare?: (property: { id: string; title: string; }) => void;
  initialFavorite?: boolean;
  showQuickActions?: boolean;
  // Additional UI props
  rating?: number;
  investor_count?: number;
  funding_percentage?: number;
}

export const PropertyCard = React.forwardRef<HTMLDivElement, PropertyCardProps>(({
  id,
  title,
  address,
  city,
  images,
  property_type,
  property_category,
  is_under_construction,
  is_ready_property,
  construction_status_display,
  construction_progress = 0,
  expected_completion_date,
  estimated_monthly_return,
  rental_income_active,
  monthly_rental_income,
  occupancy_rate,
  supports_installments,
  installment_period_months,
  total_value,
  token_price,
  total_tokens,
  tokens_sold,
  expected_return,
  rental_yield,
  year_built,
  status,
  featured = false,
  rating = 0,
  investor_count = 0,
  funding_percentage,
  className,
  onInvestClick,
  onQuickView,
  onCardClick,
  onFavorite,
  onShare,
  initialFavorite = false,
  showQuickActions = true,
  ...rest
}, ref) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isHovered, setIsHovered] = useState(false);
  const { t, i18n } = useTranslation('shared');
  const isAr = i18n.language?.startsWith('ar');
  
  // Calculate funding percentage
  const calculatedFundingPercentage = funding_percentage || Math.round(((tokens_sold || 0) / (total_tokens || 1)) * 100);
  
  // Format property location
  const location = `${city}${address ? ', ' + address : ''}`;
  
  // Get primary image
  const primaryImage = images && images.length > 0 ? images[0] : PROPERTY_PLACEHOLDER;
  
  // Format currency values
  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format percentage
  const formatPercentage = (value?: number) => {
    if (typeof value !== 'number') return '0%';
    return `${value.toFixed(1)}%`;
  };
  
  // Get status info based on property category
  const getStatusInfo = () => {
    if (property_category === PropertyCategory.UNDER_CONSTRUCTION) {
      return {
        label: constructionStageLabel(construction_status_display) || t('propertyCard.status.underConstruction'),
        color: 'from-orange-500 to-red-500',
        icon: Building2
      };
    }
    
    if (property_category === PropertyCategory.READY_PROPERTY) {
      if (rental_income_active) {
        return {
          label: t('propertyCard.status.incomeActive'),
          color: 'from-green-500 to-emerald-500',
          icon: DollarSign
        };
      }
      return {
        label: t('propertyCard.status.readyProperty'),
        color: 'from-blue-500 to-indigo-500',
        icon: Home
      };
    }
    
    // Fallback to old status system
    if (status === 'active') {
      return { label: t('propertyCard.status.active'), color: 'from-emerald-500 to-green-500', icon: Clock };
    }
    
    return { label: t('propertyCard.status.available'), color: 'from-emerald-500 to-green-500', icon: Clock };
  };
  
  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onFavorite?.(id, newFavoriteState);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.({ id, title });
  };

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.();
  };

  return (
    <div
      ref={ref}
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Featured Badge */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-3 start-6 z-10 px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1"
        >
          <Award className="w-3 h-3" />
          {t('propertyCard.featured')}
        </motion.div>
      )}

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute -top-3 end-6 z-10"
      >
        <div className={cn(
          "px-3 py-1.5 text-xs font-bold rounded-full shadow-lg flex items-center gap-1 text-white",
          `bg-gradient-to-r ${statusInfo.color}`
        )}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label.toUpperCase()}
        </div>
      </motion.div>

      <Card
        variant="elevated"
        interactive
        borderAccent
        hover
        onClick={onCardClick}
        className={cn(
          'overflow-hidden transition-all duration-500 cursor-pointer',
          isHovered && 'shadow-2xl dark:shadow-emerald-500/10 border-emerald-400 dark:border-emerald-500 scale-105',
          className
        )}
      >
        {/* Property Image */}
        <div className="relative h-56 -m-6 mb-6 overflow-hidden">
          <img
            src={primaryImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={handleImageFallback}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-800/20 to-transparent" />
          
          {/* Overlay Content */}
          <div className="absolute top-4 start-4 end-4 flex justify-between items-start">
            <div className="px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/20">
              <Text variant="caption" weight="semibold" className="text-slate-800 dark:text-white">
                {property_type ? t(`propertyCard.types.${property_type}`, { defaultValue: property_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }) : t('propertyCard.property')}
              </Text>
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/20">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <Text variant="caption" weight="semibold" className="text-slate-800 dark:text-white">
                  {rating.toFixed(1)}
                </Text>
              </div>
            )}
          </div>

          {/* Quick Actions (Show on Hover) */}
          {showQuickActions && (
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-4 end-4 flex flex-col gap-2"
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleFavoriteClick}
                    aria-label={isFavorite ? t('propertyCard.removeFavorite') : t('propertyCard.addFavorite')}
                    className={cn(
                      "p-2 rounded-full backdrop-blur-md border transition-all duration-200",
                      isFavorite 
                        ? "bg-red-500 text-white border-red-500 shadow-lg" 
                        : "bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 border-white/20 hover:bg-red-50 dark:hover:bg-red-900/20"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                  </motion.button>
                  
                  {onShare && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleShareClick}
                      aria-label={t('propertyCard.share')}
                      className="p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                    >
                      <Share2 className="w-4 h-4" />
                    </motion.button>
                  )}
                  
                  {onQuickView && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleQuickViewClick}
                      aria-label={t('propertyCard.quickView')}
                      className="p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Bottom Overlay */}
          <div className="absolute bottom-4 start-4 end-4">
            <h3 className="text-xl font-bold text-white mb-1">
              {title}
            </h3>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <MapPin className="w-3 h-3" />
              <span>{location}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          {/* Price Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 p-3 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(total_value)}
              </div>
              <Text variant="caption" color="muted" className="mt-1">
                {t('propertyCard.totalValue')}
              </Text>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-3 rounded-xl">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(token_price)}
              </div>
              <Text variant="caption" color="muted" className="mt-1">
                {t('propertyCard.perToken')}
              </Text>
            </div>
          </div>

          {/* Progress Bar - Show construction progress for under construction properties */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Text variant="bodySmall" color="tertiary">
                {is_under_construction ? t('propertyCard.constructionProgress') : t('propertyCard.fundingProgress')}
              </Text>
              <Text variant="bodySmall" weight="bold" color="primary">
                {is_under_construction ? `${construction_progress || 0}%` : `${calculatedFundingPercentage}%`}
              </Text>
            </div>
            <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${is_under_construction ? (construction_progress || 0) : calculatedFundingPercentage}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
                className={cn(
                  "h-full rounded-full relative",
                  is_under_construction 
                    ? "bg-gradient-to-r from-orange-500 to-red-500" 
                    : "bg-gradient-to-r from-emerald-500 to-green-500"
                )}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
            <div className="flex justify-between mt-2">
              <Text variant="caption" color="muted">
                {t(is_under_construction ? 'propertyCard.reserved' : 'propertyCard.sold', { value: (tokens_sold || 0).toLocaleString() })}
              </Text>
              <Text variant="caption" color="muted">
                {t('propertyCard.total', { value: (total_tokens || 0).toLocaleString() })}
              </Text>
            </div>
          </div>

          {/* Stats Grid - Conditional based on property category */}
          {is_under_construction ? (
            /* Under Construction Stats */
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Building2 className="w-4 h-4 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
                <Text variant="bodySmall" weight="bold" className="text-orange-600 dark:text-orange-400">
                  {construction_progress || 0}%
                </Text>
                <Text variant="caption" color="muted">
                  {t('propertyCard.complete')}
                </Text>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                <Text variant="bodySmall" weight="bold" className="text-blue-600 dark:text-blue-400">
                  {expected_completion_date ? new Date(expected_completion_date).toLocaleDateString(uiLocale(i18n.language), { month: 'short', year: 'numeric' }) : t('common.tbd')}
                </Text>
                <Text variant="caption" color="muted">
                  {t('propertyCard.completion')}
                </Text>
              </div>
              {supports_installments && (
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <Text variant="bodySmall" weight="bold" color="accent">
                    {t('propertyCard.monthsShort', { value: installment_period_months })}
                  </Text>
                  <Text variant="caption" color="muted">
                    {t('propertyCard.installments')}
                  </Text>
                </div>
              )}
              {!supports_installments && (
                <div className="text-center p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                  <Users className="w-4 h-4 mx-auto mb-1 text-slate-600 dark:text-gray-400" />
                  <Text variant="bodySmall" weight="bold" color="primary">
                    {investor_count}
                  </Text>
                  <Text variant="caption" color="muted">
                    {t('propertyCard.owners')}
                  </Text>
                </div>
              )}
            </div>
          ) : (
            /* Ready Property Stats */
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                <Users className="w-4 h-4 mx-auto mb-1 text-slate-600 dark:text-gray-400" />
                <Text variant="bodySmall" weight="bold" color="primary">
                  {investor_count}
                </Text>
                <Text variant="caption" color="muted">
                  {t('propertyCard.owners')}
                </Text>
              </div>
              
              {rental_income_active && monthly_rental_income ? (
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <Text variant="bodySmall" weight="bold" color="accent">
                    {formatCurrency(monthly_rental_income)}
                  </Text>
                  <Text variant="caption" color="muted">
                    {t('propertyCard.monthlyIncome')}
                  </Text>
                </div>
              ) : (
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <Text variant="bodySmall" weight="bold" color="accent">
                    {formatPercentage(expected_return)}
                  </Text>
                  <Text variant="caption" color="muted">
                    {t('propertyCard.expectedReturn')}
                  </Text>
                </div>
              )}
              
              {occupancy_rate !== undefined ? (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <BarChart3 className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                  <Text variant="bodySmall" weight="bold" className="text-blue-600 dark:text-blue-400">
                    {formatPercentage(occupancy_rate)}
                  </Text>
                  <Text variant="caption" color="muted">
                    {t('propertyCard.occupancy')}
                  </Text>
                </div>
              ) : (
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <Star className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <Text variant="bodySmall" weight="bold" color="accent">
                    {year_built || t('common.na')}
                  </Text>
                  <Text variant="caption" color="muted">
                    {t('propertyCard.built')}
                  </Text>
                </div>
              )}
            </div>
          )}

          {/* Enhanced CTA Buttons */}
          <div className="space-y-3">
            {/* Main Investment Button */}
            <Button
              variant="primary"
              size="md"
              onClick={onInvestClick}
              className="w-full font-semibold shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group"
            >
              <DollarSign className="w-4 h-4 me-2 group-hover:scale-110 transition-transform" />
              {is_under_construction && supports_installments ? t('propertyCard.reserveWithInstallments') : t('propertyCard.ownNow')}
            </Button>
            
            {/* Installment Notice for Construction Properties */}
            {is_under_construction && supports_installments && (
              <div className="text-center py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                  <CreditCard className="w-4 h-4" />
                  <Text variant="caption" className="font-medium">
                    {t('propertyCard.installmentPlan', { value: installment_period_months })}
                  </Text>
                </div>
              </div>
            )}
            
            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-2">
              {onQuickView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickViewClick}
                  className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <Eye className="w-3 h-3" />
                  {t('propertyCard.quickView')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
              >
                <Calculator className="w-3 h-3" />
                {t('propertyCard.calculate')}
              </Button>
            </div>
          </div>

          {/* Trust Indicators (Show on Hover) */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="pt-4 border-t border-slate-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Shield className="w-4 h-4" />
                    <span>{t('propertyCard.verifiedInsured')}</span>
                  </div>
                  {is_ready_property && rental_income_active ? (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <DollarSign className="w-4 h-4" />
                      <span>{t('propertyCard.activeIncome')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Clock className="w-4 h-4" />
                      <span>{is_under_construction ? t('propertyCard.preConstruction') : t('propertyCard.quarterlyDividends')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
});

PropertyCard.displayName = 'PropertyCard';