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
      return await apiClient.get<PaymentMethodInfo[]>('/payments/methods/');
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
      return await apiClient.post<PaymentMethodInfo>('/payments/methods/', methodData);
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
      return await apiClient.delete(`/payments/methods/${methodId}/`);
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
      // Backend action: POST /payments/methods/<id>/set_default/ (router auto-route)
      return await apiClient.post(`/payments/methods/${methodId}/set_default/`);
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
      // Backend URL pattern: /payments/stripe/<action>/ — must include trailing slash
      return await apiClient.post('/payments/stripe/create-payment-intent/', data);
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
      return await apiClient.post<Payment>('/payments/stripe/confirm-payment/', {
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
      // Backend URL pattern: /payments/crypto/<action>/ — must include action + trailing slash
      return await apiClient.post('/payments/crypto/create-payment/', paymentData);
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
      return await apiClient.get<CryptoQuote>('/payments/crypto/get-quote/', {
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
   * @deprecated PayPal payment processing is NOT IMPLEMENTED on the backend.
   * The endpoint `/payments/paypal/...` does not exist; calls will 404.
   * Until backend PayPalView is added, do not call these. Kept here only so
   * existing imports don't break at build time.
   */
  static async processPayPalPayment(_data: {
    amount: number;
    currency: string;
    investment_id?: string;
    return_url: string;
    cancel_url: string;
  }): Promise<never> {
    throw new Error(
      'PayPal payments are not yet implemented on the backend. ' +
      'Use Stripe (credit card) or NOWPayments (crypto) instead.'
    );
  }

  /** @deprecated See processPayPalPayment. */
  static async confirmPayPalPayment(_paymentId: string, _payerId: string): Promise<never> {
    throw new Error(
      'PayPal payments are not yet implemented on the backend.'
    );
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

      // Backend mounts PaymentViewSet at /payments/payments/ (router-pluralised)
      return await apiClient.get('/payments/payments/', params);
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
      return await apiClient.get<Payment>(`/payments/payments/${paymentId}/`);
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
      return await apiClient.post(`/payments/payments/${paymentId}/cancel/`);
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
      // Backend route is POST /payments/refunds/ (RefundViewSet) — not /payments/{id}/refund.
      return await apiClient.post('/payments/refunds/', {
        payment: paymentId,
        reason,
      });
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
      return await apiClient.get('/payments/wallet/');
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
      return await apiClient.post('/payments/wallet/deposit/', data);
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
      return await apiClient.post('/payments/wallet/withdraw/', data);
    } catch (error) {
      console.error('Failed to withdraw funds:', error);
      throw error;
    }
  }

  /**
   * Get wallet transaction history (deposits, withdrawals, dividends, fees, etc.)
   * Backend: GET /payments/wallet/transactions/
   */
  static async getWalletTransactions(page = 1, pageSize = 20): Promise<{
    transactions: Array<{
      id: string;
      transaction_type: string;
      amount: string;
      currency: string;
      balance_before: string;
      balance_after: string;
      description: string;
      created_at: string;
    }>;
    pagination: { page: number; page_size: number; total_count: number; total_pages: number };
  }> {
    try {
      return await apiClient.get('/payments/wallet/transactions/', { page, page_size: pageSize });
    } catch (error) {
      console.error('Failed to get wallet transactions:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // NOWPayments — cryptocurrency payment gateway
  // -------------------------------------------------------------------------

  /** GET /payments/nowpayments/currencies/ — list supported crypto currencies. */
  static async getNowPaymentsCurrencies(): Promise<{ currencies: string[] }> {
    try {
      return await apiClient.get('/payments/nowpayments/currencies/');
    } catch (error) {
      console.error('Failed to get NOWPayments currencies:', error);
      throw error;
    }
  }

  /** POST /payments/nowpayments/estimate/ — estimate USD→crypto exchange. */
  static async getNowPaymentsEstimate(data: {
    amount: number;
    currency_from: string;
    currency_to: string;
  }): Promise<{
    amount: string;
    currency_from: string;
    currency_to: string;
    estimated_amount: string;
    min_amount: string | null;
    exchange_rate: string | null;
    valid_until: string;
  }> {
    try {
      return await apiClient.post('/payments/nowpayments/estimate/', data);
    } catch (error) {
      console.error('Failed to estimate NOWPayments price:', error);
      throw error;
    }
  }

  /** POST /payments/nowpayments/create-payment/ — direct-pay (user already chose crypto). */
  static async createNowPaymentsPayment(data: {
    amount: number;
    currency: string;
    pay_currency: string;
    order_description?: string;
    investment_id?: string;
    success_url?: string;
    cancel_url?: string;
  }): Promise<{
    payment_id: string;
    nowpayments_payment_id: string;
    pay_address: string;
    pay_amount: string;
    pay_currency: string;
    payment_status: string;
    payment_url: string;
    created_at: string;
  }> {
    try {
      return await apiClient.post('/payments/nowpayments/create-payment/', data);
    } catch (error) {
      console.error('Failed to create NOWPayments payment:', error);
      throw error;
    }
  }

  /** POST /payments/nowpayments/create-invoice/ — hosted invoice page (user picks crypto). */
  static async createNowPaymentsInvoice(data: {
    amount: number;
    currency?: string;
    order_description?: string;
    investment_id?: string;
    success_url?: string;
    cancel_url?: string;
  }): Promise<{
    payment_id: string;
    invoice_id: string;
    invoice_url: string;
    created_at: string;
  }> {
    try {
      return await apiClient.post('/payments/nowpayments/create-invoice/', data);
    } catch (error) {
      console.error('Failed to create NOWPayments invoice:', error);
      throw error;
    }
  }

  /** GET /payments/nowpayments/status/<payment_id>/ — poll on-chain status. */
  static async getNowPaymentsStatus(paymentId: string): Promise<{
    payment_id: string;
    nowpayments_payment_id: string;
    payment_status: string;
    pay_address: string;
    pay_amount: string;
    pay_currency: string;
    actually_paid: string;
    is_completed: boolean;
    is_pending: boolean;
    is_failed: boolean;
  }> {
    try {
      return await apiClient.get(`/payments/nowpayments/status/${paymentId}/`);
    } catch (error) {
      console.error('Failed to fetch NOWPayments status:', error);
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
      // Backend mounts investment-withdrawals under /api/v1/withdrawals/ (not /payments/)
      return await apiClient.get('/withdrawals/', { page, page_size: limit });
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