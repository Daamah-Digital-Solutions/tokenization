import React from 'react';
import { Navbar } from './layout/Navbar';
import { HeroSectionV2 } from './sections/HeroSectionV2';
import { HowItWorks } from './sections/HowItWorks';
import { FeaturedProperties } from './sections/FeaturedProperties';
import { WhyChooseUs } from './sections/WhyChooseUs';
import { Testimonials } from './sections/Testimonials';
import { TrustedPartners } from './sections/TrustedPartners';
import { Footer } from './layout/Footer';

// New Home Page Components - Phase 2
import {
  LegalDisclaimer,
  TokenizationExplainer,
  SPVExplainer,
  PropertyOwnerCTA,
  InvestorCTA,
  SecondaryMarketPreview,
  LiquidityProviderCTA,
} from './home';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 transition-colors duration-500">
      {/* Premium Navigation */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="relative">
        {/* 1. Hero - Full screen introduction with new tagline */}
        <HeroSectionV2 />

        {/* 2. Legal Disclaimer Banner - CRITICAL (must be directly below hero) */}
        <LegalDisclaimer />

        {/* 3. What is Tokenization - Educational section */}
        <TokenizationExplainer />

        {/* 4. SPV Model Explanation - Legal structure benefits */}
        <SPVExplainer />

        {/* 5. For Property Owners - CTA for asset owners */}
        <PropertyOwnerCTA />

        {/* 6. For Investors - Benefits and CTA for investors */}
        <InvestorCTA />

        {/* 7. Featured Properties - Property showcase */}
        <FeaturedProperties />

        {/* 8. Secondary Market Preview - Trading platform teaser */}
        <SecondaryMarketPreview />

        {/* 9. Liquidity Provider CTA - LP program promotion */}
        <LiquidityProviderCTA />

        {/* 10. Trusted Partners - Industry partnerships */}
        <TrustedPartners />

        {/* 11. How It Works - Process explanation */}
        <HowItWorks />

        {/* 12. Why Choose Us - Value propositions */}
        <WhyChooseUs />

        {/* 13. Testimonials - Success stories */}
        <Testimonials />
      </main>

      {/* Premium Footer */}
      <Footer />
    </div>
  );
};