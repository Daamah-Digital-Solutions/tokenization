// Database enums
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
  MIXED_USE = 'mixed_use'
}

export enum PropertyStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SOLD_OUT = 'sold_out',
  CLOSED = 'closed'
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
  PROPERTY_SOLD_OUT = 'property_sold_out'
}

// API Response interfaces
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
export interface KYCDocumentUploadData {
  user_id: string;
  document_type: DocumentType;
  file: Buffer;
  file_name: string;
  file_size: number;
  metadata?: {
    expiry_date?: string;
    document_number?: string;
  };
}

// Blockchain interfaces
export interface SmartContractDeploymentData {
  property_id: string;
  token_name: string;
  token_symbol: string;
  total_supply: number;
  initial_price: number;
  network: string;
  owner_address: string;
}

export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas_used?: number;
  gas_price?: string;
  block_number?: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp?: Date;
}

// WebSocket events
export interface WebSocketEvent<T = any> {
  event: string;
  data: T;
  timestamp: string;
  user_id?: string;
}

// Utility interfaces
export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

export interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface SearchFilters {
  [key: string]: any;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// Error interfaces
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'postgres';
  ssl?: boolean;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}