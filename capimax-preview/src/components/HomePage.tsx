import React from 'react';
import { Navbar } from './layout/Navbar';
import { HeroSectionV2 } from './sections/HeroSectionV2';
import { HowItWorks } from './sections/HowItWorks';
import { FeaturedProperties } from './sections/FeaturedProperties';
import { WhyChooseUs } from './sections/WhyChooseUs';
import { Testimonials } from './sections/Testimonials';
import { TrustedPartners } from './sections/TrustedPartners';
import { Footer } from './layout/Footer';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 transition-colors duration-500">
      {/* Premium Navigation */}
      <Navbar />
      
      {/* Main Content Sections */}
      <main className="relative">
        {/* Hero - Full screen luxury introduction */}
        <HeroSectionV2 />
        
        {/* How It Works - Process explanation with premium animations */}
        <HowItWorks />
        
        {/* Featured Properties - Luxury property showcase */}
        <FeaturedProperties />
        
        {/* Why Choose Us - Institutional-grade value propositions */}
        <WhyChooseUs />
        
        {/* Testimonials - Success stories from elite investors */}
        <Testimonials />
        
        {/* Trusted Partners - Industry partnerships and certifications */}
        <TrustedPartners />
      </main>
      
      {/* Premium Footer */}
      <Footer />
    </div>
  );
};