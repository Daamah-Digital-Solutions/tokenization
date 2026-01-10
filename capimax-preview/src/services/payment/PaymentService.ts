import { apiClient } from '../api/ApiClient';
import type { 
  Payment, 
  PaymentMethod, 
  PaymentStatus,
  CryptoPaymentData,
} from '../api/types';

export interface PaymentMethodInfo {
  id: string;
  type: PaymentMethod;
  display_name: string;
  last_four?: string;
  expiry_date?: string;
  brand?: string;
  wallet_address?: string;
  network?: string;
  is_default: boolean;
  created_at: Date;
}

export interface PaymentEstimate {
  subtotal: number;
  platform_fee: number;
  processing_fee: number;
  network_fee?: number;
  total: number;
  currency: string;
  payment_method_fees: Array<{
    method: PaymentMethod;
    fee_amount: number;
    fee_percentage: number;
    estimated_completion: string;
  }>;
}

export interface CryptoQuote {
  from_currency: string;
  to_currency: string;
  amount: number;
  rate: number;
  expires_at: Date;
  network_fee: number;
  processing_fee: number;
  total_amount: number;
  estimated_confirmation_time: string;
}

export interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  bank_name: string;
  account_type: 'checking' | 'savings';
  is_verified: boolean;
  is_default: boolean;
  created_at: Date;
}

export interface WithdrawalRequest {
  amount: number;
  currency: string;
  payment_method_id: string;
  notes?: string;
}

export class PaymentService {
  /**
   * Get user's payment methods
   */
  static async getPaymentMethods(): Promise<PaymentMethodInfo[]> {
    try {
      return await apiClient.get<PaymentMethodInfo[]>('/payments/methods');
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * Add new payment method
   */
  static async addPaymentMethod(methodData: {
    type: PaymentMethod;
    card_token?: string;
    wallet_address?: string;
    network?: string;
    account_details?: {
      account_number: string;
      routing_number: string;
      account_name: string;
      bank_name: string;
    };
  }): Promise<PaymentMethodInfo> {
    try {
      return await apiClient.post<PaymentMethodInfo>('/payments/methods', methodData);
    } catch (error) {
      console.error('Failed to add payment method:', error);
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  static async removePaymentMethod(methodId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/payments/methods/${methodId}`);
    } catch (error) {
      console.error('Failed to remove payment method:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  static async setDefaultPaymentMethod(methodId: string): Promise<{ message: string }> {
    try {
      return await apiClient.put(`/payments/methods/${methodId}/default`);
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   */
  static async createStripePaymentIntent(data: {
    amount: number;
    currency: string;
    investment_id?: string;
    payment_method_id?: string;
  }): Promise<{
    client_secret: string;
    payment_intent_id: string;
  }> {
    try {
      return await apiClient.post('/payments/stripe/payment-intent', data);
    } catch (error) {
      console.error('Failed to create Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm Stripe payment
   */
  static async confirmStripePayment(paymentIntentId: string): Promise<Payment> {
    try {
      return await apiClient.post<Payment>('/payments/stripe/confirm', {
        payment_intent_id: paymentIntentId
      });
    } catch (error) {
      console.error('Failed to confirm Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Process crypto payment
   */
  static async processCryptoPayment(paymentData: CryptoPaymentData): Promise<{
    payment_id: string;
    wallet_address: string;
    amount: number;
    currency: string;
    network: string;
    transaction_hash?: string;
    confirmation_blocks_required: number;
    estimated_confirmation_time: string;
  }> {
    try {
      return await apiClient.post('/payments/crypto', paymentData);
    } catch (error) {
      console.error('Failed to process crypto payment:', error);
      throw error;
    }
  }

  /**
   * Get crypto payment quote
   */
  static async getCryptoQuote(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<CryptoQuote> {
    try {
      return await apiClient.get<CryptoQuote>('/payments/crypto/quote', {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount
      });
    } catch (error) {
      console.error('Failed to get crypto quote:', error);
      throw error;
    }
  }

  /**
   * Process PayPal payment
   */
  static async processPayPalPayment(data: {
    amount: number;
    currency: string;
    investment_id?: string;
    return_url: string;
    cancel_url: string;
  }): Promise<{
    payment_id: string;
    approval_url: string;
  }> {
    try {
      return await apiClient.post('/payments/paypal', data);
    } catch (error) {
      console.error('Failed to process PayPal payment:', error);
      throw error;
    }
  }

  /**
   * Confirm PayPal payment
   */
  static async confirmPayPalPayment(
    paymentId: string,
    payerId: string
  ): Promise<Payment> {
    try {
      return await apiClient.post<Payment>('/payments/paypal/confirm', {
        payment_id: paymentId,
        payer_id: payerId
      });
    } catch (error) {
      console.error('Failed to confirm PayPal payment:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(page = 1, limit = 20, status?: PaymentStatus): Promise<{
    payments: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;

      return await apiClient.get('/payments', params);
    } catch (error) {
      console.error('Failed to get payment history:', error);
      throw error;
    }
  }

  /**
   * Get specific payment
   */
  static async getPayment(paymentId: string): Promise<Payment> {
    try {
      return await apiClient.get<Payment>(`/payments/${paymentId}`);
    } catch (error) {
      console.error('Failed to get payment:', error);
      throw error;
    }
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(paymentId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/payments/${paymentId}/cancel`);
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      throw error;
    }
  }

  /**
   * Request refund
   */
  static async requestRefund(paymentId: string, reason: string): Promise<{
    refund_id: string;
    message: string;
    estimated_completion: string;
  }> {
    try {
      return await apiClient.post(`/payments/${paymentId}/refund`, { reason });
    } catch (error) {
      console.error('Failed to request refund:', error);
      throw error;
    }
  }

  /**
   * Get payment estimate
   */
  static async getPaymentEstimate(
    amount: number,
    currency: string,
    paymentMethod?: PaymentMethod
  ): Promise<PaymentEstimate> {
    try {
      return await apiClient.get<PaymentEstimate>('/payments/estimate', {
        amount,
        currency,
        payment_method: paymentMethod
      });
    } catch (error) {
      console.error('Failed to get payment estimate:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  static async getWalletBalance(): Promise<{
    balances: Array<{
      currency: string;
      available_balance: number;
      pending_balance: number;
      locked_balance: number;
      total_balance: number;
      updated_at: string;
    }>;
    total_value_usd: number;
  }> {
    try {
      return await apiClient.get('/payments/wallet');
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  /**
   * Add funds to wallet
   */
  static async addFunds(data: {
    amount: number;
    currency: string;
    payment_method_id: string;
  }): Promise<{
    transaction_id: string;
    status: string;
    estimated_completion: string;
  }> {
    try {
      return await apiClient.post('/payments/wallet/deposit', data);
    } catch (error) {
      console.error('Failed to add funds:', error);
      throw error;
    }
  }

  /**
   * Withdraw funds from wallet
   */
  static async withdrawFunds(data: WithdrawalRequest): Promise<{
    withdrawal_id: string;
    status: string;
    estimated_completion: string;
    processing_fee: number;
  }> {
    try {
      return await apiClient.post('/payments/wallet/withdraw', data);
    } catch (error) {
      console.error('Failed to withdraw funds:', error);
      throw error;
    }
  }

  /**
   * Get withdrawal history
   */
  static async getWithdrawals(page = 1, limit = 20): Promise<{
    withdrawals: Array<{
      id: string;
      amount: number;
      currency: string;
      processing_fee: number;
      net_amount: number;
      status: string;
      payment_method: string;
      requested_at: Date;
      completed_at?: Date;
      notes?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get('/payments/withdrawals', { page, limit });
    } catch (error) {
      console.error('Failed to get withdrawals:', error);
      throw error;
    }
  }

  /**
   * Get supported currencies
   */
  static async getSupportedCurrencies(): Promise<Array<{
    code: string;
    name: string;
    symbol: string;
    type: 'fiat' | 'crypto';
    min_amount: number;
    max_amount: number;
    supported_methods: PaymentMethod[];
  }>> {
    try {
      return await apiClient.get('/payments/currencies');
    } catch (error) {
      console.error('Failed to get supported currencies:', error);
      throw error;
    }
  }

  /**
   * Verify bank account with micro deposits
   */
  static async verifyBankAccount(
    accountId: string,
    deposit1: number,
    deposit2: number
  ): Promise<{ verified: boolean; message: string }> {
    try {
      return await apiClient.post(`/payments/bank-accounts/${accountId}/verify`, {
        deposit_1: deposit1,
        deposit_2: deposit2
      });
    } catch (error) {
      console.error('Failed to verify bank account:', error);
      throw error;
    }
  }

  /**
   * Initiate bank account verification
   */
  static async initiateBankVerification(accountId: string): Promise<{
    message: string;
    verification_method: string;
    estimated_time: string;
  }> {
    try {
      return await apiClient.post(`/payments/bank-accounts/${accountId}/verify/initiate`);
    } catch (error) {
      console.error('Failed to initiate bank verification:', error);
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  static async getPaymentAnalytics(period = '30days'): Promise<{
    total_payments: number;
    total_amount: number;
    successful_payments: number;
    failed_payments: number;
    average_amount: number;
    top_currencies: Array<{
      currency: string;
      total_amount: number;
      payment_count: number;
    }>;
    payment_method_breakdown: Array<{
      method: PaymentMethod;
      percentage: number;
      total_amount: number;
    }>;
  }> {
    try {
      return await apiClient.get('/payments/analytics', { period });
    } catch (error) {
      console.error('Failed to get payment analytics:', error);
      throw error;
    }
  }

  /**
   * Set up recurring payment
   */
  static async setupRecurringPayment(config: {
    amount: number;
    currency: string;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
    payment_method_id: string;
    start_date: Date;
    end_date?: Date;
    purpose: 'investment' | 'wallet_topup';
    investment_id?: string;
  }): Promise<{
    recurring_payment_id: string;
    next_payment_date: Date;
    message: string;
  }> {
    try {
      return await apiClient.post('/payments/recurring', config);
    } catch (error) {
      console.error('Failed to setup recurring payment:', error);
      throw error;
    }
  }

  /**
   * Get recurring payments
   */
  static async getRecurringPayments(): Promise<Array<{
    id: string;
    amount: number;
    currency: string;
    frequency: string;
    next_payment: Date;
    status: 'active' | 'paused' | 'cancelled';
    created_at: Date;
    total_payments: number;
    total_amount: number;
  }>> {
    try {
      return await apiClient.get('/payments/recurring');
    } catch (error) {
      console.error('Failed to get recurring payments:', error);
      throw error;
    }
  }

  /**
   * Cancel recurring payment
   */
  static async cancelRecurringPayment(recurringPaymentId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/payments/recurring/${recurringPaymentId}`);
    } catch (error) {
      console.error('Failed to cancel recurring payment:', error);
      throw error;
    }
  }
}

export default PaymentService;