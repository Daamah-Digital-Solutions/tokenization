import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  MapPin, 
  Star, 
  Users, 
  TrendingUp, 
  Calendar, 
  Building, 
  Shield, 
  Clock,
  DollarSign,
  Calculator,
  Eye,
  Download,
  FileText,
  Camera,
  Play,
  ChevronLeft,
  ChevronRight,
  Award,
  CheckCircle,
  Info,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Button } from '../components/ui/Button';
import { Card } from '../components/design-system/cards/Card';
import { Text } from '../components/design-system/typography/Text';
import { cn } from '../utils/cn';
import { InvestmentFlow, Property as InvestmentProperty, InvestmentData } from '../components/investment';

// Mock property data - in real app this would come from API
const mockProperty = {
  id: 1,
  images: [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1560448075-bb485b067938?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  ],
  title: "Manhattan Elite Tower",
  location: "432 Park Avenue, New York, NY 10016",
  price: "$12,850,000",
  tokenPrice: "$1,000",
  totalTokens: 12850,
  soldTokens: 10280,
  expectedReturn: "14.8%",
  investors: 847,
  type: "Residential",
  rating: 4.8,
  yearBuilt: 2022,
  status: 'funding' as const,
  featured: true,
  description: "Experience luxury living in the heart of Manhattan with this premium residential tower. Featuring world-class amenities, stunning city views, and prime location access to Central Park and major business districts.",
  details: {
    sqft: "2,450 sq ft",
    bedrooms: 3,
    bathrooms: 2.5,
    floors: 42,
    units: 180,
    parking: "2 spaces included",
    amenities: [
      "24/7 Concierge",
      "Rooftop Pool & Deck",
      "State-of-the-art Fitness Center",
      "Private Cinema",
      "Wine Storage",
      "Pet Spa",
      "Business Center",
      "Children's Playroom"
    ]
  },
  investment: {
    minInvestment: 1000,
    avgAnnualReturn: 14.8,
    dividendFrequency: "Quarterly",
    managementFee: 2.5,
    appreciationForecast: 8.2,
    rentalYield: 6.6,
    totalROI: 18.4
  },
  documents: [
    { name: "Property Prospectus", type: "PDF", size: "2.4 MB" },
    { name: "Financial Projections", type: "PDF", size: "1.8 MB" },
    { name: "Legal Documentation", type: "PDF", size: "3.1 MB" },
    { name: "Market Analysis", type: "PDF", size: "1.2 MB" },
  ],
  timeline: [
    { date: "2024-01-15", event: "Property Listing", status: "completed" },
    { date: "2024-02-01", event: "Pre-sale Launch", status: "completed" },
    { date: "2024-03-01", event: "Public Launch", status: "completed" },
    { date: "2024-12-31", event: "Funding Deadline", status: "upcoming" },
  ]
};

interface PropertyDetailPageProps {
  propertyId?: number;
  onBack?: () => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({ 
  propertyId,
  onBack 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [investmentAmount, setInvestmentAmount] = useState(5000);
  const [showInvestmentFlow, setShowInvestmentFlow] = useState(false);

  const property = mockProperty; // In real app, fetch by propertyId
  const fundingPercentage = Math.round((property.soldTokens / property.totalTokens) * 100);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'financials', label: 'Financials', icon: BarChart3 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'location', label: 'Location', icon: MapPin },
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const calculateReturns = () => {
    const tokens = Math.floor(investmentAmount / 1000);
    const annualReturn = (investmentAmount * property.investment.avgAnnualReturn) / 100;
    const quarterlyDividend = annualReturn / 4;
    return { tokens, annualReturn, quarterlyDividend };
  };

  const { tokens, annualReturn, quarterlyDividend } = calculateReturns();

  // Convert property data to match InvestmentFlow interface
  const investmentProperty: InvestmentProperty = {
    id: property.id,
    title: property.title,
    tokenPrice: 1000, // Convert from string
    minInvestment: property.investment.minInvestment,
    expectedReturn: property.investment.avgAnnualReturn,
    totalTokens: property.totalTokens,
    soldTokens: property.soldTokens,
    investment: property.investment
  };

  const handleInvestmentComplete = (investment: InvestmentData) => {
    console.log('Investment completed:', investment);
    // In a real app, you would update the portfolio, send to backend, etc.
    setShowInvestmentFlow(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      <Navbar />
      
      <Container className="py-8">
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="md"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Properties
          </Button>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(
                "flex items-center gap-2",
                isFavorite && "text-red-500 hover:text-red-600"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
              {isFavorite ? "Saved" : "Save"}
            </Button>
            
            <Button
              variant="ghost"
              size="md"
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <div className="relative h-96 md:h-[500px]">
                <img
                  src={property.images[currentImageIndex]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Image Navigation */}
                <button
                  onClick={previousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {property.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        currentImageIndex === index
                          ? "bg-white scale-125"
                          : "bg-white/50 hover:bg-white/75"
                      )}
                    />
                  ))}
                </div>

                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {property.featured && (
                    <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      FEATURED
                    </div>
                  )}
                  
                  <div className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1",
                    property.status === 'funding' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                    property.status === 'funded' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                    property.status === 'upcoming' && "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  )}>
                    <Clock className="w-3 h-3" />
                    {property.status.toUpperCase()}
                  </div>
                </div>

                {/* Quick Stats Overlay */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <div className="px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">{property.rating}</span>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">{property.investors}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Property Info */}
            <Card className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {property.title}
                  </h1>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-lg">{property.location}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Property Type</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{property.type}</div>
                </div>
              </div>

              <Text variant="body" className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                {property.description}
              </Text>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {property.price}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    {property.tokenPrice}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Per Token</div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {property.expectedReturn}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Expected Return</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    {property.yearBuilt}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Year Built</div>
                </div>
              </div>

              {/* Funding Progress */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <Text variant="bodyLarge" weight="semibold">Funding Progress</Text>
                  <Text variant="bodyLarge" weight="bold" className="text-emerald-600 dark:text-emerald-400">
                    {fundingPercentage}% Complete
                  </Text>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${fundingPercentage}%` }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full relative"
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </motion.div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{property.soldTokens.toLocaleString()} tokens sold</span>
                  <span>{property.totalTokens.toLocaleString()} total tokens</span>
                </div>
              </div>
            </Card>

            {/* Tabs Navigation */}
            <Card>
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                        activeTab === tab.id
                          ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Property Details</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <Text variant="caption" color="muted" className="mb-1">Square Footage</Text>
                          <Text variant="body" weight="semibold">{property.details.sqft}</Text>
                        </div>
                        <div>
                          <Text variant="caption" color="muted" className="mb-1">Bedrooms</Text>
                          <Text variant="body" weight="semibold">{property.details.bedrooms}</Text>
                        </div>
                        <div>
                          <Text variant="caption" color="muted" className="mb-1">Bathrooms</Text>
                          <Text variant="body" weight="semibold">{property.details.bathrooms}</Text>
                        </div>
                        <div>
                          <Text variant="caption" color="muted" className="mb-1">Floors</Text>
                          <Text variant="body" weight="semibold">{property.details.floors}</Text>
                        </div>
                        <div>
                          <Text variant="caption" color="muted" className="mb-1">Total Units</Text>
                          <Text variant="body" weight="semibold">{property.details.units}</Text>
                        </div>
                        <div>
                          <Text variant="caption" color="muted" className="mb-1">Parking</Text>
                          <Text variant="body" weight="semibold">{property.details.parking}</Text>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Amenities</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {property.details.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <Text variant="body">{amenity}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'financials' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Investment Metrics</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                          {property.investment.avgAnnualReturn}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Annual Return</div>
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                          {property.investment.rentalYield}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Rental Yield</div>
                      </div>
                      
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                          {property.investment.appreciationForecast}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Appreciation Forecast</div>
                      </div>
                      
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                          {property.investment.totalROI}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total ROI</div>
                      </div>
                      
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                          {property.investment.managementFee}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Management Fee</div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {property.investment.dividendFrequency}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Dividend Frequency</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Property Documents</h3>
                    
                    {property.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{doc.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{doc.type} • {doc.size}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'location' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Location & Neighborhood</h3>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
                      <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Interactive Map Coming Soon
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Detailed location information and neighborhood analytics will be available here.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Address</h4>
                      <p className="text-gray-700 dark:text-gray-300">{property.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Investment Sidebar */}
          <div className="space-y-6">
            {/* Investment Calculator */}
            <Card className="sticky top-8">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  Investment Calculator
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Investment Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                      min={property.investment.minInvestment}
                      step={1000}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Minimum: ${property.investment.minInvestment.toLocaleString()}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Your Investment</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{tokens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Annual Return:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ${annualReturn.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Quarterly Dividend:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ${quarterlyDividend.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-full"
                  onClick={() => setShowInvestmentFlow(true)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Invest ${investmentAmount.toLocaleString()}
                </Button>
                
                <div className="text-center">
                  <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Investment Terms
                  </Button>
                </div>
              </div>
            </Card>

            {/* Trust Indicators */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Trust & Security</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700 dark:text-gray-300">SEC Compliant</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700 dark:text-gray-300">Verified Property</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700 dark:text-gray-300">Insured Investment</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">Quarterly Reporting</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>

      <Footer />

      {/* Investment Flow Modal */}
      <InvestmentFlow
        property={investmentProperty}
        isOpen={showInvestmentFlow}
        onClose={() => setShowInvestmentFlow(false)}
        onComplete={handleInvestmentComplete}
      />
    </div>
  );
};