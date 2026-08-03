// Shared types between frontend and backend
export enum UserRole {
  INVESTOR = 'investor',
  PROPERTY_OWNER = 'property_owner',
  BROKER = 'broker',
  ADMIN = 'admin'
}

export enum KYCStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

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

export enum DocumentType {
  PASSPORT = 'passport',
  NATIONAL_ID = 'national_id',
  DRIVING_LICENSE = 'driving_license',
  UTILITY_BILL = 'utility_bill',
  BANK_STATEMENT = 'bank_statement',
  VALUATION_REPORT = 'valuation_report',
  PROPERTY_DEED = 'property_deed',
  FINANCIAL_STATEMENT = 'financial_statement'
}

export enum DocumentStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum PaymentMethod {
  CRYPTOCURRENCY = 'cryptocurrency',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal'
}

export enum InvestmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum TransactionType {
  INVESTMENT = 'investment',
  DIVIDEND = 'dividend',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  FEE = 'fee',
  REFUND = 'refund'
}

export enum NotificationType {
  INVESTMENT_CONFIRMED = 'investment_confirmed',
  KYC_APPROVED = 'kyc_approved',
  KYC_REJECTED = 'kyc_rejected',
  NEW_PROPERTY = 'new_property_available',
  DIVIDEND_RECEIVED = 'dividend_received',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_FAILED = 'payment_failed',
  PROPERTY_SOLD_OUT = 'property_sold_out',
  PROPERTY_APPROVED = 'property_approved',
  PROPERTY_TOKENIZED = 'property_tokenized',
  CONSTRUCTION_MILESTONE = 'construction_milestone',
  BROKER_COMMISSION = 'broker_commission'
}

export enum CommissionStatus {
  PENDING = 'pending',
  EARNED = 'earned',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum InstallmentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum MilestoneStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
  DELAYED = 'delayed'
}

// API Response interface
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  request_id?: string;
}

// User interfaces
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  country: string;
  date_of_birth?: Date;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  kyc_status: KYCStatus;
  is_verified: boolean;
  wallet_address?: string;
  // Hybrid wallet model — wallet_address above is the primary destination
  // (custodial by default). external_wallet_address is the optional
  // self-custody slot set when the user links MetaMask.
  wallet_kind?: 'custodial' | 'external';
  external_wallet_address?: string;
  created_at: Date;
  updated_at: Date;
}

// Returned from GET /api/v1/auth/wallet/
export interface WalletInfo {
  primary_wallet: string | null;
  primary_kind: 'custodial' | 'external';
  external_wallet: string | null;
  has_external: boolean;
  custody_explanation: string;
}

// Step-1 response from POST /api/v1/auth/wallet/link-external/ (no signature).
export interface WalletLinkChallenge {
  step: 'sign_message';
  address: string;
  message_to_sign: string;
  nonce: string;
  expires_in_seconds: number;
}

// Step-2 response (with signature).
export interface WalletLinkResult {
  address: string;
  linked_at: number;
}

// Returned from GET /api/v1/auth/wallet/balances/.
export interface CustodialBalance {
  property_id: string;
  property_title: string;
  contract_address: string;
  network: string | null;
  chain_id: number | null;
  custodial_balance: string;   // string-encoded int (token count)
  external_balance: string;
}

// Returned from POST /api/v1/auth/wallet/withdraw/.
export interface WithdrawResult {
  transaction_hash: string;
  gas_top_up_transaction_hash: string | null;
  from_wallet: string;
  to_wallet: string;
  amount: string;
  status: string;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  country: string;
}

export interface UserLoginData {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface UserProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  date_of_birth?: Date;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

// Property interfaces
// Property interface for real estate tokenization
export interface Property {
  id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  status: PropertyStatus;
  
  // Property Category Fields
  property_category: PropertyCategory;
  is_under_construction: boolean;
  is_ready_property: boolean;
  
  // Construction Fields
  construction_status_display?: string;
  construction_progress?: number; // 0-100
  expected_completion_date?: string;
  
  // Rental Income Fields
  estimated_monthly_return?: number;
  rental_income_active?: boolean;
  monthly_rental_income?: number;
  occupancy_rate?: number; // 0-100
  
  // Installment Fields
  supports_installments?: boolean;
  installment_period_months?: number;
  // SPV / legal entity (client edit #5)
  spv_company_name?: string;
  spv_registration_number?: string;
  spv_establishment_date?: string;
  spv_bank_name?: string;
  
  // Token and Financial Fields
  total_value: number;
  token_price: number;
  total_tokens: number;
  tokens_sold: number;
  expected_return?: number;
  rental_yield?: number;
  
  // Property Details
  property_size?: number;
  year_built?: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  images: string[];
  documents: string[];
  smart_contract_address?: string;
  blockchain?: PropertyBlockchain | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

// Real on-chain data for a property's token contract (client edits #9/#11).
export interface PropertyBlockchain {
  contract_address: string;
  network: string | null;
  network_type: string | null;
  chain_id: number | null;
  is_testnet: boolean | null;
  explorer_url: string | null;
  token_id: number | null;
  deployment_transaction: string | null;
  deployment_block: number | null;
  is_verified: boolean;
  status: string | null;
}

export interface PropertyCreateData {
  title: string;
  description: string;
  property_type: PropertyType;
  total_value: number;
  token_price: number;
  total_tokens: number;
  expected_return?: number;
  rental_yield?: number;
  property_size?: number;
  year_built?: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PropertyFilterOptions {
  type?: PropertyType;
  status?: PropertyStatus;
  min_price?: number;
  max_price?: number;
  location?: string;
  min_return?: number;
  max_return?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Investment interfaces
export interface Investment {
  id: string;
  user_id: string;
  property_id: string;
  token_amount: number;
  investment_amount: number;
  status: InvestmentStatus;
  payment_method: {
    type: PaymentMethod;
    currency: string;
    wallet_address?: string;
    network?: string;
  };
  transaction_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InvestmentCreateData {
  property_id: string;
  token_amount: number;
  investment_amount: number;
  payment_method: {
    type: PaymentMethod;
    currency: string;
    wallet_address?: string;
    network?: string;
    card_token?: string;
    billing_address?: any;
  };
}

// Payment interfaces
export interface Payment {
  id: string;
  user_id: string;
  investment_id?: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_hash?: string;
  payment_intent_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CryptoPaymentData {
  user_id: string;
  investment_id: string;
  amount: number;
  currency: string;
  wallet_address: string;
  network: string;
  gas_limit?: number;
  gas_price?: string;
}

export interface FiatPaymentData {
  user_id: string;
  investment_id: string;
  amount: number;
  currency: string;
  payment_method: {
    type: PaymentMethod;
    card_token?: string;
    billing_address?: any;
    bank_details?: any;
  };
}

// KYC interfaces
export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_path: string;
  file_name: string;
  file_size: number;
  metadata?: {
    expiry_date?: string;
    document_number?: string;
  };
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface KYCDocumentUploadData {
  document_type: DocumentType;
  file: File;
  metadata?: {
    expiry_date?: string;
    document_number?: string;
  };
}

// Notification interfaces
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: Date;
}

// Broker interfaces
export interface BrokerCommission {
  id: string;
  broker_id: string;
  investment_id: string;
  property_id: string;
  commission_rate: number;
  commission_amount: number;
  status: CommissionStatus;
  created_at: Date;
  updated_at: Date;
}

// Construction interfaces
export interface ConstructionMilestone {
  id: string;
  property_id: string;
  title: string;
  description: string;
  target_date: Date;
  completion_date?: Date;
  status: MilestoneStatus;
  progress_percentage: number;
  verification_required: boolean;
  verified_by?: string;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface InstallmentPayment {
  id: string;
  user_id: string;
  property_id: string;
  installment_number: number;
  due_date: Date;
  amount: number;
  status: InstallmentStatus;
  paid_at?: Date;
  payment_id?: string;
  created_at: Date;
  updated_at: Date;
}

// Transaction interfaces
export interface Transaction {
  id: string;
  user_id: string;
  property_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: string;
  description: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

// WebSocket events
export interface WebSocketEvent<T = any> {
  event: string;
  data: T;
  timestamp: string;
  user_id?: string;
}

// Error interfaces
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
  request_id?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

// Portfolio interfaces
export interface Portfolio {
  id: string;
  user_id: string;
  investments: Investment[];
  total_invested: number;
  current_value: number;
  total_return: number;
  return_percentage: number;
  monthly_dividends: number;
  properties_count: number;
  active_investments: number;
  pending_investments: number;
  performance_data: PerformanceDataPoint[];
  asset_allocation: AssetAllocation[];
  created_at: Date;
  updated_at: Date;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
  return_percentage: number;
  dividends: number;
}

export interface AssetAllocation {
  property_type: PropertyType;
  value: number;
  percentage: number;
  properties_count: number;
}

// Analytics interfaces
export interface AnalyticsData {
  portfolio_performance: {
    time_series: PerformanceDataPoint[];
    roi_trend: {
      date: string;
      roi: number;
    }[];
    income_trend: {
      date: string;
      income: number;
      expenses: number;
      net: number;
    }[];
  };
  market_comparison: {
    portfolio_performance: number;
    market_average: number;
    top_performers: number;
    time_period: string;
  };
  asset_allocation: AssetAllocation[];
  geographic_distribution: {
    country: string;
    city: string;
    value: number;
    percentage: number;
    properties_count: number;
  }[];
  risk_metrics: {
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
    beta: number;
  };
}

// Export aliases for backward compatibility - avoiding duplicate exports
export type APIResponseAlias = APIResponse<any>;
export type ApiErrorResponseAlias = ApiErrorResponse;