import React, { useState, useEffect } from 'react';
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
  LineChart,
  Loader,
  Home,
  Wrench,
  Calendar as CalendarIcon,
  Percent,
  TrendingDown,
  Target,
  Timer,
  Construction
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Button } from '../components/ui/Button';
import { Card } from '../components/design-system/cards/Card';
import { Text } from '../components/design-system/typography/Text';
import { cn } from '../utils/cn';
import { InvestmentFlow, Property as InvestmentProperty, InvestmentData } from '../components/investment';
import type { Property, PropertyDocuments } from '../services/api/types';
import { PropertyCategory } from '../services/api/types';
import { PropertyService } from '../services/property/PropertyService';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../utils/router';
import { ConstructionProgress } from '../components/properties/ConstructionProgress';
import { InstallmentSchedule } from '../components/properties/InstallmentSchedule';
import { PropertyDetailEnhanced } from '../components/properties/PropertyDetailEnhanced';
import { KYCGate } from '../components/kyc/KYCGate';
import { ConstructionService } from '../services/construction/ConstructionService';

// Property data interfaces
interface PropertyDetailData {
  property: Property | null;
  analytics: any;
  investors: any[];
  documents: PropertyDocuments[];
  // Construction milestones (only meaningful for under-construction properties).
  // Loaded from /api/v1/construction/<id>/milestones/ via ConstructionService.
  milestones: any[];
  loading: boolean;
  error: string | null;
}

interface PropertyDetailPageProps {
  propertyId?: string;
  onBack?: () => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  propertyId: propertyIdProp,
  onBack
}) => {
  const { state } = useAuth();
  const { navigate } = useRouter();
  // Read propertyId from prop or fall back to URL query parameter
  const propertyId = propertyIdProp || new URLSearchParams(window.location.search).get('id') || undefined;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showInvestmentFlow, setShowInvestmentFlow] = useState(false);
  const [initialTokens, setInitialTokens] = useState<number>(1);
  
  const [propertyData, setPropertyData] = useState<PropertyDetailData>({
    property: null,
    analytics: null,
    investors: [],
    documents: [],
    milestones: [],
    loading: true,
    error: null
  });

  // Load property data
  useEffect(() => {
    if (propertyId) {
      loadPropertyData();
    }
  }, [propertyId]);

  const loadPropertyData = async () => {
    if (!propertyId) return;
    
    try {
      setPropertyData(prev => ({ ...prev, loading: true, error: null }));
      
      const [property, analytics, investors, documents, milestones] = await Promise.allSettled([
        PropertyService.getProperty(propertyId),
        PropertyService.getPropertyAnalytics(propertyId).catch(() => null),
        PropertyService.getPropertyInvestors(propertyId, 1, 10).catch(() => ({ investors: [] })),
        PropertyService.getDocuments(propertyId).catch(() => []),
        // Milestones endpoint is only meaningful for under-construction
        // properties; for ready properties it returns an empty list which
        // we treat the same as a missing fetch.
        ConstructionService.getMilestones(propertyId).catch(() => [])
      ]);

      setPropertyData({
        property: property.status === 'fulfilled' ? property.value : null,
        analytics: analytics.status === 'fulfilled' ? analytics.value : null,
        investors: investors.status === 'fulfilled' ? investors.value.investors : [],
        documents: documents.status === 'fulfilled' ? documents.value : [],
        milestones: milestones.status === 'fulfilled' ? milestones.value : [],
        loading: false,
        error: property.status === 'rejected' ? property.reason?.message || 'Failed to load property' : null
      });
      
    } catch (error: any) {
      console.error('Failed to load property data:', error);
      setPropertyData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load property data'
      }));
    }
  };

  // No property ID provided
  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />
        <Container className="py-8 pt-24">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <Text variant="headingLarge" className="mb-2">No Property Selected</Text>
            <Text variant="body" color="muted" className="mb-6">
              Please select a property from the properties page to view its details.
            </Text>
            <Button variant="primary" onClick={onBack || (() => window.history.back())}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Properties
            </Button>
          </div>
        </Container>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (propertyData.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />
        <Container className="py-8 pt-24">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600" />
              <Text variant="body" color="muted">Loading property details...</Text>
            </div>
          </div>
        </Container>
        <Footer />
      </div>
    );
  }

  // Error state
  if (propertyData.error || !propertyData.property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <Navbar />
        <Container className="py-8 pt-24">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <Text variant="headingLarge" className="mb-2">Property Not Found</Text>
            <Text variant="body" color="muted" className="mb-6">
              {propertyData.error || 'The requested property could not be found.'}
            </Text>
            <Button variant="primary" onClick={onBack || (() => window.history.back())}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </Container>
        <Footer />
      </div>
    );
  }

  const property = propertyData.property;
  const fundingPercentage = property.total_tokens > 0 ? 
    Math.round((property.tokens_sold / property.total_tokens) * 100) : 0;
  
  // Property category helpers
  const isUnderConstruction = property.property_category === PropertyCategory.UNDER_CONSTRUCTION;
  const isReadyProperty = property.property_category === PropertyCategory.READY_PROPERTY;
  
  // Construction progress data — pulled from the construction app's
  // milestones endpoint when available. Ready properties leave this null.
  const constructionProgressData = isUnderConstruction ? {
    propertyId: property.id,
    propertyName: property.title,
    overallProgress: property.construction_progress || 0,
    currentPhase: property.construction_status_display || 'In Progress',
    milestones: propertyData.milestones || [],
    lastUpdated: property.updated_at.toISOString(),
    nextInspectionDate: property.expected_completion_date || null,
    developer: {
      name: property.owner_id ? 'Property Developer' : 'Unknown',
      contact: 'Contact via platform',
      projectManager: 'Project Manager'
    },
    timeline: {
      startDate: property.created_at.toISOString().split('T')[0],
      plannedCompletion: property.expected_completion_date || null,
    }
  } : null;


  // Convert property data to match InvestmentFlow interface. The
  // category-aware fields (is_under_construction / supports_installments /
  // installment_period_months / expected_completion_date / property_category)
  // gate the optional "Payment Schedule" step in the investment flow.
  const investmentProperty: InvestmentProperty = {
    id: property.id,
    title: property.title,
    tokenPrice: property.token_price,
    minInvestment: property.token_price, // Minimum is 1 token
    expectedReturn: property.expected_return || 10,
    totalTokens: property.total_tokens,
    soldTokens: property.tokens_sold,
    location: `${property.city || ''}, ${property.country || ''}`.replace(/^, |, $/, ''),
    propertyType: property.property_type,
    totalValue: property.total_value,
    is_under_construction: property.is_under_construction,
    supports_installments: property.supports_installments,
    installment_period_months: property.installment_period_months,
    property_category: property.property_category,
    expected_completion_date: property.expected_completion_date,
    investment: {
      minInvestment: Number(property.token_price) || 0,
      // DRF returns decimal fields as strings ("12.00"); coerce or the
      // invest modal does string-concat math and shows wrong percentages.
      // When the property hasn't published a return yet show 0 rather
      // than a misleading 10% fabrication.
      avgAnnualReturn: Number(property.expected_return) || 0,
      dividendFrequency: "Quarterly",
      managementFee: 2.5,
      appreciationForecast: 8,
      rentalYield: Number(property.rental_yield) || 0,
      totalROI: (Number(property.expected_return) || 0) + (Number(property.rental_yield) || 0)
    }
  };

  const handleInvestmentComplete = (investment: InvestmentData) => {
    console.log('Investment completed:', investment);
    setShowInvestmentFlow(false);
    // Refetch property data to update funding progress (tokens_sold, funding_percentage)
    loadPropertyData();
  };

  const handleGoToPortfolio = () => {
    setShowInvestmentFlow(false);
    navigate('dashboard', { view: 'portfolio' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      <Navbar />

      <Container className="py-8 pt-24">
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

        {/* Use PropertyDetailEnhanced component */}
        <PropertyDetailEnhanced
          property={property}
          analytics={propertyData.analytics}
          investors={propertyData.investors}
          documents={propertyData.documents}
          isUnderConstruction={isUnderConstruction}
          constructionProgressData={constructionProgressData}
          onInvestClick={(tokenCount) => {
            if (tokenCount) setInitialTokens(tokenCount);
            setShowInvestmentFlow(true);
          }}
          onImageClick={(index) => setCurrentImageIndex(index)}
          currentImageIndex={currentImageIndex}
        />
      </Container>

      <Footer />

      {/* Investment Flow Modal with KYC Gate */}
      {showInvestmentFlow && (
        <KYCGate action="make investments">
          <InvestmentFlow
            property={investmentProperty}
            isOpen={showInvestmentFlow}
            onClose={() => setShowInvestmentFlow(false)}
            onComplete={handleInvestmentComplete}
            onGoToPortfolio={handleGoToPortfolio}
            initialTokens={initialTokens}
          />
        </KYCGate>
      )}
    </div>
  );
};