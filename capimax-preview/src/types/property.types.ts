// DEPRECATED: Property-specific type definitions
// Use ../services/api/types.ts instead for all Property-related types
// This file is kept for backward compatibility but should not be used in new code

export enum PropertyType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  MIXED_USE = 'mixed_use',
  LAND = 'land'
}

export enum PropertyStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  ACTIVE = 'active',
  TOKENIZED = 'tokenized',
  UNDER_CONSTRUCTION = 'under_construction',
  SOLD_OUT = 'sold_out',
  CLOSED = 'closed',
  DELISTED = 'delisted'
}

export enum PropertyCategory {
  UNDER_CONSTRUCTION = 'under_construction',
  READY_PROPERTY = 'ready_property'
}

export interface Property {
  id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  status: PropertyStatus;
  
  // Property Category Fields
  property_category: PropertyCategory;
  expected_completion_date?: string;
  construction_progress?: number;
  rental_income_active?: boolean;
  monthly_rental_income?: number;
  occupancy_rate?: number;
  
  // Investment fields
  supports_installments?: boolean;
  installment_period_months?: number;
  
  // Financial Information
  total_value: number;
  token_price: number;
  total_tokens: number;
  tokens_sold: number;
  expected_return?: number;
  rental_yield?: number;
  minimum_investment?: number;
  
  // Location Information
  address: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  
  // Property Details
  property_size?: number;
  year_built?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  
  // Smart Contract
  smart_contract_address?: string;
  
  // Ownership
  owner_id: string;
  
  // Display
  featured?: boolean;
  images?: PropertyImage[];
  
  // Analytics
  total_views?: number;
  unique_views?: number;
  conversion_rate?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PropertyImage {
  id: string;
  image: string;
  caption?: string;
  is_primary: boolean;
  order: number;
}

// Clean default export for easy importing
export default Property;