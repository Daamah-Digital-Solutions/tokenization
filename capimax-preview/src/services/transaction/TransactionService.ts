import { apiClient } from '../api/ApiClient';
import { PropertyService } from '../property/PropertyService';
import type {
  Transaction,
  Property
} from '../api/types';
import {
  TransactionType,
  PaymentMethod
} from '../api/types';

export interface EnhancedTransaction extends Transaction {
  property?: {
    id: string;
    title: string;
    address: string;
    city: string;
    state?: string;
    country: string;
  };
  payment_details?: {
    method: PaymentMethod;
    method_display: string;
    transaction_fee?: number;
    gas_fee?: number;
    confirmation_blocks?: number;
    network?: string;
    transaction_hash?: string;
  };
  blockchain_details?: {
    network: string;
    confirmations: number;
    required_confirmations: number;
    transaction_hash?: string;
    block_number?: number;
    gas_used?: number;
    gas_price?: string;
  };
}

export interface TransactionFilters {
  status?: string;
  type?: TransactionType;
  date_from?: string;
  date_to?: string;
  property_id?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  page?: number;
  limit?: number;
  ordering?: string;
}

export interface TransactionListResponse {
  transactions: EnhancedTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    total_amount: number;
    transaction_count: number;
    fees_paid: number;
    average_amount: number;
  };
}

export class TransactionService {
  /**
   * Get transactions with enhanced property and payment information
   */
  static async getTransactions(filters: TransactionFilters = {}): Promise<TransactionListResponse> {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 20,
        ordering: filters.ordering || '-created_at',
        ...filters
      };

      // Remove undefined values
      Object.keys(params).forEach(key =>
        params[key] === undefined && delete params[key]
      );

      const response = await apiClient.get<{
        count: number;
        next: string | null;
        previous: string | null;
        results: Transaction[];
      }>('/transactions/', params);

      if (!response || !response.results || !Array.isArray(response.results)) {
        throw new Error('Invalid response format from transactions API');
      }

      // Enhance transactions with property and payment details
      const enhancedTransactions = await Promise.all(
        response.results.map(async (transaction) => {
          const enhanced: EnhancedTransaction = { ...transaction };

          // Add property information if property_id exists
          if (transaction.property_id) {
            try {
              const property = await PropertyService.getProperty(transaction.property_id);
              enhanced.property = {
                id: property.id,
                title: property.title,
                address: property.address,
                city: property.city,
                state: property.state,
                country: property.country
              };
            } catch (error) {
              console.warn(`Failed to fetch property ${transaction.property_id}:`, error);
              // Fallback property data
              enhanced.property = {
                id: transaction.property_id,
                title: `Property ${transaction.property_id.slice(0, 8)}...`,
                address: 'Address not available',
                city: 'Unknown',
                country: 'Unknown'
              };
            }
          }

          // Enhanced payment details from metadata
          if (transaction.metadata) {
            enhanced.payment_details = {
              method: transaction.metadata.payment_method || PaymentMethod.CREDIT_CARD,
              method_display: this.getPaymentMethodDisplay(transaction.metadata.payment_method),
              transaction_fee: transaction.metadata.transaction_fee,
              gas_fee: transaction.metadata.gas_fee,
              confirmation_blocks: transaction.metadata.confirmation_blocks,
              network: transaction.metadata.network || 'Ethereum',
              transaction_hash: transaction.metadata.transaction_hash
            };

            // Add blockchain details for investment transactions
            if (transaction.type === TransactionType.INVESTMENT && transaction.metadata.transaction_hash) {
              enhanced.blockchain_details = {
                network: transaction.metadata.network || 'Ethereum',
                confirmations: transaction.metadata.confirmation_blocks || 0,
                required_confirmations: 12,
                transaction_hash: transaction.metadata.transaction_hash,
                block_number: transaction.metadata.block_number,
                gas_used: transaction.metadata.gas_used,
                gas_price: transaction.metadata.gas_price
              };
            }
          }

          return enhanced;
        })
      );

      // Calculate summary statistics
      const summary = {
        total_amount: enhancedTransactions.reduce((sum, t) => sum + t.amount, 0),
        transaction_count: enhancedTransactions.length,
        fees_paid: enhancedTransactions.reduce((sum, t) =>
          sum + (t.payment_details?.transaction_fee || 0) + (t.payment_details?.gas_fee || 0), 0
        ),
        average_amount: enhancedTransactions.length > 0
          ? enhancedTransactions.reduce((sum, t) => sum + t.amount, 0) / enhancedTransactions.length
          : 0
      };

      return {
        transactions: enhancedTransactions,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: enhancedTransactions.length, // This should come from API response
          pages: Math.ceil(enhancedTransactions.length / params.limit)
        },
        summary
      };
    } catch (error) {
      console.error('Failed to fetch enhanced transactions:', error);
      throw error;
    }
  }

  /**
   * Get a specific transaction with full details
   */
  static async getTransaction(transactionId: string): Promise<EnhancedTransaction> {
    try {
      const transaction = await apiClient.get<Transaction>(`/transactions/${transactionId}/`);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const enhanced: EnhancedTransaction = { ...transaction };

      // Add property information
      if (transaction.property_id) {
        try {
          const property = await PropertyService.getProperty(transaction.property_id);
          enhanced.property = {
            id: property.id,
            title: property.title,
            address: property.address,
            city: property.city,
            state: property.state,
            country: property.country
          };
        } catch (error) {
          console.warn(`Failed to fetch property ${transaction.property_id}:`, error);
        }
      }

      // Enhanced payment details
      if (transaction.metadata) {
        enhanced.payment_details = {
          method: transaction.metadata.payment_method || PaymentMethod.CREDIT_CARD,
          method_display: this.getPaymentMethodDisplay(transaction.metadata.payment_method),
          transaction_fee: transaction.metadata.transaction_fee,
          gas_fee: transaction.metadata.gas_fee,
          confirmation_blocks: transaction.metadata.confirmation_blocks,
          network: transaction.metadata.network || 'Ethereum',
          transaction_hash: transaction.metadata.transaction_hash
        };

        // Add blockchain details for investment transactions
        if (transaction.type === TransactionType.INVESTMENT && transaction.metadata.transaction_hash) {
          enhanced.blockchain_details = {
            network: transaction.metadata.network || 'Ethereum',
            confirmations: transaction.metadata.confirmation_blocks || 0,
            required_confirmations: 12,
            transaction_hash: transaction.metadata.transaction_hash,
            block_number: transaction.metadata.block_number,
            gas_used: transaction.metadata.gas_used,
            gas_price: transaction.metadata.gas_price
          };
        }
      }

      return enhanced;
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics for a user
   */
  static async getTransactionStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<{
    total_transactions: number;
    total_volume: number;
    fees_paid: number;
    successful_transactions: number;
    failed_transactions: number;
    pending_transactions: number;
    by_type: Record<TransactionType, { count: number; volume: number }>;
    by_status: Record<string, number>;
    monthly_trend: Array<{
      month: string;
      count: number;
      volume: number;
    }>;
  }> {
    try {
      return await apiClient.get('/transactions/stats/', { period });
    } catch (error) {
      console.error('Failed to fetch transaction statistics:', error);
      throw error;
    }
  }

  /**
   * Export transactions to CSV
   */
  static async exportTransactions(filters: TransactionFilters = {}): Promise<Blob> {
    try {
      const params = { ...filters, format: 'csv' };
      return await apiClient.get('/transactions/export/', params, {
        responseType: 'blob'
      });
    } catch (error) {
      console.error('Failed to export transactions:', error);
      throw error;
    }
  }

  /**
   * Get payment method display name
   */
  private static getPaymentMethodDisplay(method?: string): string {
    switch (method) {
      case PaymentMethod.CRYPTOCURRENCY:
        return 'Cryptocurrency';
      case PaymentMethod.CREDIT_CARD:
        return 'Credit Card';
      case PaymentMethod.BANK_TRANSFER:
        return 'Bank Transfer';
      case PaymentMethod.PAYPAL:
        return 'PayPal';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get transaction receipt/proof document
   */
  static async getTransactionReceipt(transactionId: string): Promise<Blob> {
    try {
      return await apiClient.get(`/transactions/${transactionId}/receipt/`, {}, {
        responseType: 'blob'
      });
    } catch (error) {
      console.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  /**
   * Retry failed transaction
   */
  static async retryTransaction(transactionId: string): Promise<{
    new_transaction_id: string;
    message: string;
  }> {
    try {
      return await apiClient.post(`/transactions/${transactionId}/retry/`);
    } catch (error) {
      console.error('Failed to retry transaction:', error);
      throw error;
    }
  }

  /**
   * Cancel pending transaction
   */
  static async cancelTransaction(transactionId: string): Promise<{
    message: string;
  }> {
    try {
      return await apiClient.post(`/transactions/${transactionId}/cancel/`);
    } catch (error) {
      console.error('Failed to cancel transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions for a specific property
   */
  static async getPropertyTransactions(
    propertyId: string,
    filters: Omit<TransactionFilters, 'property_id'> = {}
  ): Promise<TransactionListResponse> {
    return this.getTransactions({ ...filters, property_id: propertyId });
  }

  /**
   * Get blockchain transaction details from explorer
   */
  static async getBlockchainTransactionDetails(transactionHash: string, network = 'ethereum'): Promise<{
    hash: string;
    status: 'success' | 'failed' | 'pending';
    block_number: number;
    confirmations: number;
    gas_used: number;
    gas_price: string;
    transaction_fee: number;
    timestamp: Date;
    from_address: string;
    to_address: string;
    value: string;
    explorer_url: string;
  }> {
    try {
      // The backend `TokenTransaction` ViewSet uses a UUID `pk`, not the
      // transaction hash, for detail lookups. Hash is a search field,
      // so we hit the list endpoint with `?search=<hash>` and pick the
      // single result.
      const params: any = { search: transactionHash };
      if (network) params.network = network;
      const response: any = await apiClient.get('/blockchain/transactions/', params);
      const results = response?.results ?? response ?? [];
      if (!results.length) {
        throw new Error(`No on-chain record found for hash ${transactionHash}`);
      }
      // Return the first match — hashes are globally unique.
      return results[0];
    } catch (error) {
      console.error('Failed to get blockchain transaction details:', error);
      throw error;
    }
  }
}

export default TransactionService;