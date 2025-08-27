import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, TrendingUp, Star, Award, Heart, Share2, Eye, Bookmark, Clock, Shield, DollarSign, Calculator } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Card } from './Card';
import { Button } from '../../ui/Button';
import { Text } from '../typography/Text';

interface PropertyCardProps {
  id: number;
  image: string;
  title: string;
  location: string;
  price: string;
  tokenPrice: string;
  totalTokens: number;
  soldTokens: number;
  expectedReturn: string;
  investors: number;
  type: string;
  rating: number;
  yearBuilt: number;
  status: 'funding' | 'funded' | 'upcoming';
  featured?: boolean;
  className?: string;
  onInvestClick?: () => void;
  onQuickView?: () => void;
  onFavorite?: (id: number, isFavorite: boolean) => void;
  onShare?: (property: { id: number; title: string; }) => void;
  initialFavorite?: boolean;
  showQuickActions?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  id,
  image,
  title,
  location,
  price,
  tokenPrice,
  totalTokens,
  soldTokens,
  expectedReturn,
  investors,
  type,
  rating,
  yearBuilt,
  status,
  featured = false,
  className,
  onInvestClick,
  onQuickView,
  onFavorite,
  onShare,
  initialFavorite = false,
  showQuickActions = true,
}) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isHovered, setIsHovered] = useState(false);
  const fundingPercentage = Math.round((soldTokens / totalTokens) * 100);

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
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Featured Badge */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-3 left-6 z-10 px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1"
        >
          <Award className="w-3 h-3" />
          FEATURED
        </motion.div>
      )}

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute -top-3 right-6 z-10"
      >
        <div className={cn(
          "px-3 py-1.5 text-xs font-bold rounded-full shadow-lg flex items-center gap-1",
          status === 'funding' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
          status === 'funded' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
          status === 'upcoming' && "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
        )}>
          <Clock className="w-3 h-3" />
          {status.toUpperCase()}
        </div>
      </motion.div>

      <Card
        variant="elevated"
        interactive
        borderAccent
        hover
        className={cn(
          'overflow-hidden transition-all duration-500',
          isHovered && 'shadow-2xl dark:shadow-emerald-500/10 border-emerald-400 dark:border-emerald-500 scale-105',
          className
        )}
      >
        {/* Property Image */}
        <div className="relative h-56 -m-6 mb-6 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-800/20 to-transparent" />
          
          {/* Overlay Content */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/20">
              <Text variant="caption" weight="semibold" className="text-slate-800 dark:text-white">
                {type}
              </Text>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/20">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <Text variant="caption" weight="semibold" className="text-slate-800 dark:text-white">
                {rating}
              </Text>
            </div>
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
                  className="absolute top-4 right-4 flex flex-col gap-2"
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleFavoriteClick}
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
          <div className="absolute bottom-4 left-4 right-4">
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
                {price}
              </div>
              <Text variant="caption" color="muted" className="mt-1">
                Total Value
              </Text>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-3 rounded-xl">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {tokenPrice}
              </div>
              <Text variant="caption" color="muted" className="mt-1">
                Per Token
              </Text>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Text variant="bodySmall" color="tertiary">
                Funding Progress
              </Text>
              <Text variant="bodySmall" weight="bold" color="primary">
                {fundingPercentage}%
              </Text>
            </div>
            <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${fundingPercentage}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full relative"
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
            <div className="flex justify-between mt-2">
              <Text variant="caption" color="muted">
                {soldTokens.toLocaleString()} sold
              </Text>
              <Text variant="caption" color="muted">
                {totalTokens.toLocaleString()} total
              </Text>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
              <Users className="w-4 h-4 mx-auto mb-1 text-slate-600 dark:text-gray-400" />
              <Text variant="bodySmall" weight="bold" color="primary">
                {investors}
              </Text>
              <Text variant="caption" color="muted">
                Investors
              </Text>
            </div>
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
              <Text variant="bodySmall" weight="bold" color="accent">
                {expectedReturn}
              </Text>
              <Text variant="caption" color="muted">
                Returns
              </Text>
            </div>
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <Star className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
              <Text variant="bodySmall" weight="bold" color="accent">
                {yearBuilt}
              </Text>
              <Text variant="caption" color="muted">
                Built
              </Text>
            </div>
          </div>

          {/* Enhanced CTA Buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              size="md"
              onClick={onInvestClick}
              className="w-full font-semibold shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group"
            >
              <DollarSign className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Invest Now
            </Button>
            
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
                  Quick View
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
              >
                <Calculator className="w-3 h-3" />
                Calculate
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
                    <span>Verified & Insured</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Clock className="w-4 h-4" />
                    <span>Quarterly Dividends</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
};