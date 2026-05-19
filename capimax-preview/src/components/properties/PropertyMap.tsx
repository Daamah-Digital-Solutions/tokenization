import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Navigation, 
  Maximize2,
  X,
  Building,
  DollarSign,
  TrendingUp,
  Star,
  Users,
  Eye
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { cn } from '../../utils/cn';

export interface PropertyMapPin {
  id: number;
  lat: number;
  lng: number;
  title: string;
  price: string;
  type: string;
  status: 'funding' | 'funded' | 'upcoming';
  rating: number;
  image: string;
  fundingPercentage: number;
  expectedReturn: string;
  investors: number;
}

interface PropertyMapProps {
  properties: PropertyMapPin[];
  selectedProperty?: number;
  onPropertySelect?: (property: PropertyMapPin) => void;
  onPropertyClick?: (property: PropertyMapPin) => void;
  className?: string;
  fullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

// Mock map data - in a real application, this would use a proper map service like Google Maps or Mapbox
const mockMapLocations: PropertyMapPin[] = [
  {
    id: 1,
    lat: 40.7614,
    lng: -73.9776,
    title: "Manhattan Elite Tower",
    price: "$12.85M",
    type: "Residential",
    status: 'funding',
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    fundingPercentage: 80,
    expectedReturn: "14.8%",
    investors: 847
  },
  {
    id: 2,
    lat: 37.4419,
    lng: -122.1430,
    title: "Silicon Valley Tech Hub",
    price: "$28.5M",
    type: "Commercial",
    status: 'funding',
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    fundingPercentage: 60,
    expectedReturn: "18.2%",
    investors: 1203
  },
  {
    id: 3,
    lat: 25.7617,
    lng: -80.1918,
    title: "Miami Beach Resort",
    price: "$45.75M",
    type: "Hospitality",
    status: 'funding',
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    fundingPercentage: 70,
    expectedReturn: "22.4%",
    investors: 892
  }
];

export const PropertyMap: React.FC<PropertyMapProps> = ({
  // Default to empty — the caller is expected to pass real properties.
  // The previous `mockMapLocations` default is retained below for the dev
  // story where this component is rendered in Storybook without props.
  properties = [],
  selectedProperty,
  onPropertySelect,
  onPropertyClick,
  className,
  fullscreen = false,
  onFullscreenToggle
}) => {
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of US
  const [zoomLevel, setZoomLevel] = useState(4);
  const [mapStyle, setMapStyle] = useState<'default' | 'satellite' | 'terrain'>('default');
  const mapRef = useRef<HTMLDivElement>(null);

  const handlePinClick = (property: PropertyMapPin) => {
    onPropertySelect?.(property);
    setMapCenter({ lat: property.lat, lng: property.lng });
    setZoomLevel(12);
  };

  const handlePinDoubleClick = (property: PropertyMapPin) => {
    onPropertyClick?.(property);
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 18));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 1));
  };

  const resetView = () => {
    setMapCenter({ lat: 39.8283, lng: -98.5795 });
    setZoomLevel(4);
    onPropertySelect?.(undefined as any);
  };

  // Calculate pin positions based on map center and zoom level
  const calculatePinPosition = (property: PropertyMapPin) => {
    // This is a simplified calculation - in a real app, you'd use proper map projection
    const mapWidth = 100;
    const mapHeight = 100;
    
    const x = ((property.lng + 180) / 360) * mapWidth;
    const y = ((90 - property.lat) / 180) * mapHeight;
    
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700",
      fullscreen && "fixed inset-4 z-50 rounded-2xl shadow-2xl",
      className
    )}>
      {/* Map Container */}
      <div 
        ref={mapRef}
        className={cn(
          "relative bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 dark:from-blue-900/20 dark:via-green-900/20 dark:to-blue-900/20",
          fullscreen ? "h-full" : "h-96 md:h-[500px]"
        )}
      >
        {/* Map Background Pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20">
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='%23000' fill-opacity='0.03'%3E%3Cpolygon points='36,1 54,16 54,44 36,59 18,44 18,16'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Simulated Map Grid */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Property Pins */}
        {properties.map((property) => {
          const position = calculatePinPosition(property);
          const isSelected = selectedProperty === property.id;
          const isHovered = hoveredPin === property.id;
          
          return (
            <motion.div
              key={property.id}
              className="absolute transform -translate-x-1/2 -translate-y-full z-10"
              style={{ left: position.x, top: position.y }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: isSelected || isHovered ? 1.2 : 1 
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Pin */}
              <motion.button
                onClick={() => handlePinClick(property)}
                onDoubleClick={() => handlePinDoubleClick(property)}
                onMouseEnter={() => setHoveredPin(property.id)}
                onMouseLeave={() => setHoveredPin(null)}
                className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 shadow-lg",
                  isSelected 
                    ? "bg-emerald-500 border-white text-white scale-125"
                    : property.status === 'funding'
                      ? "bg-emerald-100 border-emerald-500 text-emerald-600 hover:bg-emerald-200"
                      : property.status === 'funded'
                        ? "bg-blue-100 border-blue-500 text-blue-600 hover:bg-blue-200"
                        : "bg-purple-100 border-purple-500 text-purple-600 hover:bg-purple-200"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Building className="w-4 h-4" />
                
                {/* Pin drop shadow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                  <div className="w-2 h-2 bg-black/20 rounded-full blur-sm" />
                </div>
              </motion.button>

              {/* Property Info Popup */}
              <AnimatePresence>
                {(isHovered || isSelected) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20"
                  >
                    <Card className="w-72 p-4 shadow-xl border-2 border-white dark:border-gray-700">
                      <div className="flex gap-3">
                        <img
                          src={property.image}
                          alt={property.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {property.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {property.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">{property.price}</div>
                          <div className="text-gray-500">Price</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">{property.expectedReturn}</div>
                          <div className="text-gray-500">Return</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">{property.fundingPercentage}%</div>
                          <div className="text-gray-500">Funded</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{property.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{property.investors}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinDoubleClick(property);
                          }}
                          className="text-xs px-2 py-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </Card>
                    
                    {/* Popup arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-900" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {onFullscreenToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFullscreenToggle}
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700"
            >
              {fullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetView}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>

        {/* Map Style Selector */}
        <div className="absolute bottom-4 left-4">
          <div className="flex bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            {(['default', 'satellite', 'terrain'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setMapStyle(style)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  mapStyle === style
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-4 right-4">
          <Card className="p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Legend</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">Funding</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Funded</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">Upcoming</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Coming Soon Overlay for Non-Interactive Features */}
        {!fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute inset-0 bg-black/5 dark:bg-black/20 flex items-center justify-center pointer-events-none"
          >
            <Card className="p-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-white/20 text-center">
              <Map className="w-8 h-8 mx-auto text-emerald-600 mb-3" />
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Interactive Map Preview
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Full map functionality coming soon
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Property Counter */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {properties.length} Properties
        </div>
      </div>
    </div>
  );
};