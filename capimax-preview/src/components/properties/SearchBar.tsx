import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Clock, 
  MapPin, 
  Building, 
  DollarSign, 
  TrendingUp, 
  Filter,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SearchSuggestion {
  id: string;
  type: 'property' | 'location' | 'type' | 'recent';
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: string;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  isLoading?: boolean;
  showSuggestions?: boolean;
  recentSearches?: string[];
  onRecentSearch?: (query: string) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search properties by name, location, or type...",
  suggestions = [],
  isLoading = false,
  showSuggestions = true,
  recentSearches = [],
  onRecentSearch,
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock suggestions based on search value
  const mockSuggestions: SearchSuggestion[] = [
    {
      id: '1',
      type: 'property',
      title: 'Manhattan Elite Tower',
      subtitle: 'New York, NY • $12.85M',
      icon: Building,
      value: 'Manhattan Elite Tower'
    },
    {
      id: '2',
      type: 'location',
      title: 'New York',
      subtitle: '47 properties available',
      icon: MapPin,
      value: 'New York'
    },
    {
      id: '3',
      type: 'location',
      title: 'California',
      subtitle: '23 properties available',
      icon: MapPin,
      value: 'California'
    },
    {
      id: '4',
      type: 'type',
      title: 'Commercial',
      subtitle: 'Office buildings and retail spaces',
      icon: Building,
      value: 'Commercial'
    },
    {
      id: '5',
      type: 'property',
      title: 'Silicon Valley Tech Hub',
      subtitle: 'Palo Alto, CA • $28.5M',
      icon: Building,
      value: 'Silicon Valley Tech Hub'
    }
  ];

  const filteredSuggestions = value
    ? mockSuggestions.filter(suggestion => 
        suggestion.title.toLowerCase().includes(value.toLowerCase()) ||
        suggestion.subtitle?.toLowerCase().includes(value.toLowerCase())
      )
    : mockSuggestions;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowDropdown(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding dropdown to allow clicking on suggestions
    setTimeout(() => setShowDropdown(false), 150);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.value);
    setShowDropdown(false);
    onSearch?.(suggestion.value);
    inputRef.current?.blur();
  };

  const handleRecentSearchClick = (query: string) => {
    onChange(query);
    setShowDropdown(false);
    onRecentSearch?.(query);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch?.(value);
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className={cn(
          "relative transition-all duration-200",
          isFocused && "transform scale-[1.02]"
        )}>
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
          
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              "w-full pl-12 pr-12 py-4 text-lg rounded-2xl border-2 transition-all duration-200",
              "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
              "placeholder-gray-500 dark:placeholder-gray-400",
              "focus:outline-none focus:ring-4",
              isFocused 
                ? "border-emerald-500 dark:border-emerald-400 ring-emerald-500/20 dark:ring-emerald-400/20 shadow-lg"
                : "border-gray-300 dark:border-gray-600 shadow-sm hover:border-gray-400 dark:hover:border-gray-500"
            )}
          />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <div className="p-2">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
            )}
            
            {value && !isLoading && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
            
            <button
              type="submit"
              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="max-h-96 overflow-y-auto">
              {/* Recent Searches */}
              {!value && recentSearches.length > 0 && (
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    <Clock className="w-4 h-4" />
                    Recent Searches
                  </div>
                  <div className="space-y-2">
                    {recentSearches.slice(0, 5).map((query, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchClick(query)}
                        className="flex items-center gap-3 w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">{query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Filters */}
              {!value && (
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    <Filter className="w-4 h-4" />
                    Quick Filters
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['High Return', 'Low Risk', 'Fully Funded', 'New Listings'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => handleSuggestionClick({ id: filter, type: 'type', title: filter, value: filter })}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Suggestions */}
              {filteredSuggestions.length > 0 && (
                <div className="p-2">
                  {value && (
                    <div className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Suggestions
                    </div>
                  )}
                  {filteredSuggestions.map((suggestion) => {
                    const IconComponent = suggestion.icon;
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group"
                      >
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          suggestion.type === 'property' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                          suggestion.type === 'location' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                          suggestion.type === 'type' && "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                        )}>
                          {IconComponent && <IconComponent className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {suggestion.title}
                          </div>
                          {suggestion.subtitle && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {suggestion.subtitle}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No Results */}
              {value && filteredSuggestions.length === 0 && !isLoading && (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <div className="text-gray-500 dark:text-gray-400">No suggestions found</div>
                  <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Try searching for property names, locations, or types
                  </div>
                </div>
              )}

              {/* Popular Searches Footer */}
              {!value && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Popular: 
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Manhattan', 'Commercial', 'High Yield', 'Tech Hub'].map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSuggestionClick({ id: term, type: 'recent', title: term, value: term })}
                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};