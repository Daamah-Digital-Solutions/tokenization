import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Award,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import type { SecondaryMarketListing } from '../../services/marketplace/MarketplaceService';

interface MarketplaceListingCardProps {
  listing: SecondaryMarketListing;
  onPurchase?: (listingId: string) => void;
  onBid?: (listingId: string) => void;
  onViewDetails?: (listingId: string) => void;
  className?: string;
  showActions?: boolean;
}

export const MarketplaceListingCard: React.FC<MarketplaceListingCardProps> = ({
  listing,
  onPurchase,
  onBid,
  onViewDetails,
  className,
  showActions = true
}) => {
  const isAuction = listing.listing_type === 'AUCTION';
  const isExpired = listing.status === 'EXPIRED';
  const isSold = listing.status === 'SOLD';
  const isActive = listing.status === 'ACTIVE';

  const statusColor = {
    ACTIVE: 'bg-green-500',
    SOLD: 'bg-gray-500',
    CANCELLED: 'bg-red-500',
    EXPIRED: 'bg-orange-500'
  }[listing.status];

  const timeRemaining = isAuction && listing.auction_end_date
    ? new Date(listing.auction_end_date).getTime() - Date.now()
    : null;

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return 'Expired';

    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden",
        "hover:shadow-xl hover:border-white/30 transition-all duration-300",
        className
      )}
    >
      {/* Property Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={listing.property.image_url}
          alt={listing.property.name}
          className="w-full h-full object-cover"
        />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge
            variant="outline"
            className={cn(
              "text-white border-white/30 backdrop-blur-sm",
              statusColor
            )}
          >
            {listing.status}
          </Badge>
        </div>

        {/* Listing Type Badge */}
        <div className="absolute top-3 right-3">
          <Badge
            variant={isAuction ? "destructive" : "default"}
            className="backdrop-blur-sm"
          >
            {isAuction ? (
              <>
                <Clock className="w-3 h-3 mr-1" />
                Auction
              </>
            ) : (
              <>
                <DollarSign className="w-3 h-3 mr-1" />
                Buy Now
              </>
            )}
          </Badge>
        </div>

        {/* Auction Timer Overlay */}
        {isAuction && timeRemaining && timeRemaining > 0 && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center justify-between text-white text-sm">
                <span>Time remaining:</span>
                <span className="font-bold text-yellow-400">
                  {formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Property Info */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {listing.property.name}
          </h3>
          <div className="flex items-center text-gray-600 mb-3">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="text-sm">{listing.property.location}</span>
          </div>
        </div>

        {/* Trading Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tokens for Sale</span>
              <span className="font-semibold text-gray-900">
                {listing.tokens_for_sale.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Price per Token</span>
              <span className="font-semibold text-green-600">
                ${listing.price_per_token.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="font-bold text-gray-900">
                ${listing.total_value.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Token Symbol</span>
              <span className="font-semibold text-blue-600">
                {listing.property.token_symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Property Value Reference */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Property Total Value</span>
            <span className="font-semibold text-gray-900">
              ${listing.property.total_value.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        {showActions && isActive && (
          <div className="flex gap-3">
            {isAuction ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails?.(listing.id)}
                  className="flex-1"
                >
                  View Bids
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onBid?.(listing.id)}
                  className="flex-1"
                >
                  Place Bid
                  <Award className="w-4 h-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails?.(listing.id)}
                  className="flex-1"
                >
                  Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onPurchase?.(listing.id)}
                  className="flex-1"
                >
                  Buy Now
                  <DollarSign className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Inactive Status Message */}
        {!isActive && (
          <div className="text-center py-2">
            <span className={cn(
              "text-sm font-medium",
              isSold ? "text-green-600" : "text-gray-500"
            )}>
              {isSold ? "This listing has been sold" : `This listing is ${listing.status.toLowerCase()}`}
            </span>
          </div>
        )}
      </div>

      {/* Created Date Footer */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            Listed {new Date(listing.created_at).toLocaleDateString()}
          </div>
          {listing.updated_at !== listing.created_at && (
            <div>
              Updated {new Date(listing.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};