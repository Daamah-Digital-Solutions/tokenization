import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, DollarSign, Calendar, TrendingUp, MapPin, Building, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface FilterState {
  priceRange: [number, number];
  returnRange: [number, number];
  yearBuiltRange: [number, number];
  minRating: number;
  location: string;
  minInvestors: number;
  maxInvestors: number;
  fundingStatus: 'all' | 'low' | 'medium' | 'high';
}

interface PropertyFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const defaultFilters: FilterState = {
  priceRange: [0, 100000000],
  returnRange: [0, 30],
  yearBuiltRange: [1980, new Date().getFullYear()],
  minRating: 0,
  location: '',
  minInvestors: 0,
  maxInvestors: 10000,
  fundingStatus: 'all'
};

export const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  filters,
  onFiltersChange,
  isOpen,
  onToggle,
  className
}) => {
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    onToggle();
  };

  const handleResetFilters = () => {
    setTempFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* Filter Toggle Button */}
      <Button
        variant="ghost"
        size="md"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 transition-all duration-200",
          isOpen && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
          className
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Advanced Filters
        {isOpen && <X className="w-4 h-4 ml-1" />}
      </Button>

      {/* Filters Panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl dark:shadow-2xl p-6 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
              Advanced Filters
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Reset All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Price Range */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Price Range
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100000000"
                    step="1000000"
                    value={tempFilters.priceRange[0]}
                    onChange={(e) => updateFilter('priceRange', [parseInt(e.target.value), tempFilters.priceRange[1]])}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb:bg-emerald-500"
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${(tempFilters.priceRange[0] / 100000000) * 100}%, #e5e7eb ${(tempFilters.priceRange[0] / 100000000) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100000000"
                    step="1000000"
                    value={tempFilters.priceRange[1]}
                    onChange={(e) => updateFilter('priceRange', [tempFilters.priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb:bg-emerald-600"
                    style={{
                      background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${(tempFilters.priceRange[1] / 100000000) * 100}%, #10b981 ${(tempFilters.priceRange[1] / 100000000) * 100}%, #10b981 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{formatPrice(tempFilters.priceRange[0])}</span>
                  <span>{formatPrice(tempFilters.priceRange[1])}</span>
                </div>
              </div>
            </div>

            {/* Expected Returns Range */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Expected Returns
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={tempFilters.returnRange[0]}
                    onChange={(e) => updateFilter('returnRange', [parseFloat(e.target.value), tempFilters.returnRange[1]])}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={tempFilters.returnRange[1]}
                    onChange={(e) => updateFilter('returnRange', [tempFilters.returnRange[0], parseFloat(e.target.value)])}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{tempFilters.returnRange[0]}%</span>
                  <span>{tempFilters.returnRange[1]}%</span>
                </div>
              </div>
            </div>

            {/* Year Built Range */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Year Built
              </label>
              <div className="space-y-3">
                <select
                  value={tempFilters.yearBuiltRange[0]}
                  onChange={(e) => updateFilter('yearBuiltRange', [parseInt(e.target.value), tempFilters.yearBuiltRange[1]])}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="1980">1980+</option>
                  <option value="1990">1990+</option>
                  <option value="2000">2000+</option>
                  <option value="2010">2010+</option>
                  <option value="2015">2015+</option>
                  <option value="2020">2020+</option>
                </select>
                <select
                  value={tempFilters.yearBuiltRange[1]}
                  onChange={(e) => updateFilter('yearBuiltRange', [tempFilters.yearBuiltRange[0], parseInt(e.target.value)])}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="2020">2020</option>
                  <option value="2021">2021</option>
                  <option value="2022">2022</option>
                  <option value="2023">2023</option>
                  <option value={new Date().getFullYear()}>Current Year</option>
                </select>
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Building className="w-4 h-4 text-emerald-600" />
                Minimum Rating
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => updateFilter('minRating', rating)}
                    className={cn(
                      "p-2 rounded-lg text-center text-sm font-medium transition-all duration-200",
                      tempFilters.minRating >= rating
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-2 border-yellow-300 dark:border-yellow-700"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {rating}⭐
                  </button>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Location
              </label>
              <select
                value={tempFilters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Locations</option>
                <option value="New York">New York</option>
                <option value="California">California</option>
                <option value="Florida">Florida</option>
                <option value="Texas">Texas</option>
                <option value="Illinois">Illinois</option>
                <option value="Washington">Washington</option>
                <option value="Nevada">Nevada</option>
                <option value="Massachusetts">Massachusetts</option>
              </select>
            </div>

            {/* Funding Status */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4 text-emerald-600" />
                Funding Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'low', label: '0-50%' },
                  { value: 'medium', label: '50-80%' },
                  { value: 'high', label: '80%+' }
                ].map(status => (
                  <button
                    key={status.value}
                    onClick={() => updateFilter('fundingStatus', status.value as FilterState['fundingStatus'])}
                    className={cn(
                      "p-2 rounded-lg text-center text-sm font-medium transition-all duration-200",
                      tempFilters.fundingStatus === status.value
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="md"
              onClick={handleResetFilters}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Reset Filters
            </Button>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={onToggle}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleApplyFilters}
                className="px-8"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};