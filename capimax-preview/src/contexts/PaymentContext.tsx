import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { PaymentService } from '../services/payment/PaymentService';
import { useAuth } from './AuthContext';

// Payment Method Types
export type PaymentMethodType = 'crypto' | 'card' | 'bank' | 'paypal';

export interface CryptoPaymentMethod {
  type: 'crypto';
  currency: 'ETH' | 'USDT' | 'USDC' | 'MATIC' | 'BNB' | 'BTC';
  network: 'ethereum' | 'polygon' | 'bsc' | 'lightning';
  address?: string;
}

export interface FiatPaymentMethod {
  type: 'card' | 'bank' | 'paypal';
  id: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  accountNumber?: string;
  email?: string; // for PayPal
}

export type PaymentMethod = CryptoPaymentMethod | FiatPaymentMethod;

// Transaction Types
export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'dividend' | 'fee';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  description: string;
  fee?: number;
  txHash?: string; // for crypto transactions
  confirmations?: number;
  receipt?: string;
}

// Wallet Balance
export interface WalletBalance {
  currency: string;
  balance: number;
  locked?: number; // locked in pending transactions
  usdValue?: number;
}

// Payment State
export interface PaymentState {
  // Balances
  balances: WalletBalance[];
  
  // Payment Methods
  paymentMethods: PaymentMethod[];
  defaultPaymentMethod?: PaymentMethod;
  
  // Transactions
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  
  // Current Operation
  currentTransaction?: Partial<Transaction>;
  processingPayment: boolean;
  
  // Currency & Rates
  selectedCurrency: string;
  exchangeRates: Record<string, number>;
  lastRateUpdate?: Date;
  
  // UI State
  showWalletModal: boolean;
  showPaymentModal: boolean;
  error?: string;
  
  // Security
  requires2FA: boolean;
  isSecurityVerified: boolean;
}

// Payment Actions
type PaymentAction =
  | { type: 'SET_BALANCES'; payload: WalletBalance[] }
  | { type: 'UPDATE_BALANCE'; payload: { currency: string; balance: number } }
  | { type: 'ADD_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'REMOVE_PAYMENT_METHOD'; payload: string }
  | { type: 'SET_DEFAULT_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; updates: Partial<Transaction> } }
  | { type: 'SET_CURRENT_TRANSACTION'; payload: Partial<Transaction> | undefined }
  | { type: 'SET_PROCESSING_PAYMENT'; payload: boolean }
  | { type: 'SET_SELECTED_CURRENCY'; payload: string }
  | { type: 'UPDATE_EXCHANGE_RATES'; payload: Record<string, number> }
  | { type: 'SHOW_WALLET_MODAL'; payload: boolean }
  | { type: 'SHOW_PAYMENT_MODAL'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_SECURITY_STATUS'; payload: { requires2FA: boolean; isVerified: boolean } }
  | { type: 'RESET_PAYMENT_STATE' };

// Initial State
const initialState: PaymentState = {
  balances: [],
  paymentMethods: [],
  transactions: [],
  pendingTransactions: [],
  processingPayment: false,
  selectedCurrency: 'USD',
  exchangeRates: {},
  showWalletModal: false,
  showPaymentModal: false,
  requires2FA: false,
  isSecurityVerified: false,
};

// Payment Reducer
function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
  switch (action.type) {
    case 'SET_BALANCES':
      return { ...state, balances: action.payload };
    
    case 'UPDATE_BALANCE':
      return {
        ...state,
        balances: state.balances.map(balance =>
          balance.currency === action.payload.currency
            ? { ...balance, balance: action.payload.balance }
            : balance
        )
      };
    
    case 'ADD_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: [...state.paymentMethods, action.payload]
      };
    
    case 'REMOVE_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: state.paymentMethods.filter(method => 
          'id' in method ? method.id !== action.payload : false
        )
      };
    
    case 'SET_DEFAULT_PAYMENT_METHOD':
      return { ...state, defaultPaymentMethod: action.payload };
    
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
        pendingTransactions: action.payload.status === 'pending' || action.payload.status === 'processing'
          ? [action.payload, ...state.pendingTransactions]
          : state.pendingTransactions
      };
    
    case 'UPDATE_TRANSACTION':
      const updatedTransaction = { 
        ...state.transactions.find(t => t.id === action.payload.id)!,
        ...action.payload.updates 
      };
      
      return {
        ...state,
        transactions: state.transactions.map(t => 
          t.id === action.payload.id ? updatedTransaction : t
        ),
        pendingTransactions: state.pendingTransactions.filter(t => 
          t.id !== action.payload.id || 
          (updatedTransaction.status === 'pending' || updatedTransaction.status === 'processing')
        )
      };
    
    case 'SET_CURRENT_TRANSACTION':
      return { ...state, currentTransaction: action.payload };
    
    case 'SET_PROCESSING_PAYMENT':
      return { ...state, processingPayment: action.payload };
    
    case 'SET_SELECTED_CURRENCY':
      return { ...state, selectedCurrency: action.payload };
    
    case 'UPDATE_EXCHANGE_RATES':
      return { 
        ...state, 
        exchangeRates: action.payload,
        lastRateUpdate: new Date()
      };
    
    case 'SHOW_WALLET_MODAL':
      return { ...state, showWalletModal: action.payload };
    
    case 'SHOW_PAYMENT_MODAL':
      return { ...state, showPaymentModal: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_SECURITY_STATUS':
      return { 
        ...state, 
        requires2FA: action.payload.requires2FA,
        isSecurityVerified: action.payload.isVerified
      };
    
    case 'RESET_PAYMENT_STATE':
      return { ...initialState };
    
    default:
      return state;
  }
}

// Context
interface PaymentContextType {
  state: PaymentState;
  dispatch: React.Dispatch<PaymentAction>;

  // Helper Functions
  addPaymentMethod: (method: PaymentMethod) => void;
  removePaymentMethod: (methodId: string) => void;
  setDefaultPaymentMethod: (method: PaymentMethod) => void;
  updateBalance: (currency: string, balance: number) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  convertCurrency: (amount: number, from: string, to: string) => number;
  getBalance: (currency: string) => number;
  getTotalUSDBalance: () => number;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  setError: (error: string | undefined) => void;
  clearError: () => void;
  refreshWalletBalances: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

// Provider Props
interface PaymentProviderProps {
  children: ReactNode;
}

// Payment Provider Component
export function PaymentProvider({ children }: PaymentProviderProps) {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Function to fetch wallet balances
  const refreshWalletBalances = async () => {
    // Only fetch if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      const response = await PaymentService.getWalletBalance();

      // Transform the response to match our WalletBalance interface
      const balances: WalletBalance[] = response.balances.map(b => ({
        currency: b.currency,
        balance: b.available_balance,
        locked: b.pending_balance,
        usdValue: b.currency === 'USD' ? b.available_balance : undefined
      }));

      dispatch({ type: 'SET_BALANCES', payload: balances });

      // Set exchange rates based on total USD value if available
      if (response.total_value_usd) {
        const rates: Record<string, number> = { USD: 1 };
        balances.forEach(b => {
          if (b.currency !== 'USD' && b.usdValue) {
            rates[b.currency] = b.usdValue / b.balance;
          }
        });
        dispatch({ type: 'UPDATE_EXCHANGE_RATES', payload: rates });
      }
    } catch (error) {
      console.error('Failed to fetch wallet balances:', error);
      // Only set error if it's not an auth error (401)
      if (error?.status !== 401) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load wallet balances' });
      }
    }
  };

  // Fetch wallet balances when authentication changes
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshWalletBalances();
    } else {
      // Clear balances when not authenticated
      dispatch({ type: 'SET_BALANCES', payload: [] });
      dispatch({ type: 'SET_ERROR', payload: undefined });
    }
  }, [isAuthenticated, user]);

  // Helper Functions
  const addPaymentMethod = (method: PaymentMethod) => {
    dispatch({ type: 'ADD_PAYMENT_METHOD', payload: method });
  };

  const removePaymentMethod = (methodId: string) => {
    dispatch({ type: 'REMOVE_PAYMENT_METHOD', payload: methodId });
  };

  const setDefaultPaymentMethod = (method: PaymentMethod) => {
    dispatch({ type: 'SET_DEFAULT_PAYMENT_METHOD', payload: method });
  };

  const updateBalance = (currency: string, balance: number) => {
    dispatch({ type: 'UPDATE_BALANCE', payload: { currency, balance } });
  };

  const addTransaction = (transaction: Transaction) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, updates } });
  };

  const convertCurrency = (amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    
    const fromRate = state.exchangeRates[from] || 1;
    const toRate = state.exchangeRates[to] || 1;
    
    return (amount * fromRate) / toRate;
  };

  const getBalance = (currency: string): number => {
    const balance = state.balances.find(b => b.currency === currency);
    return balance?.balance || 0;
  };

  const getTotalUSDBalance = (): number => {
    return state.balances.reduce((total, balance) => {
      if (balance.currency === 'USD') return total + balance.balance;
      const usdValue = convertCurrency(balance.balance, balance.currency, 'USD');
      return total + usdValue;
    }, 0);
  };

  const openWalletModal = () => {
    dispatch({ type: 'SHOW_WALLET_MODAL', payload: true });
  };

  const closeWalletModal = () => {
    dispatch({ type: 'SHOW_WALLET_MODAL', payload: false });
  };

  const openPaymentModal = () => {
    dispatch({ type: 'SHOW_PAYMENT_MODAL', payload: true });
  };

  const closePaymentModal = () => {
    dispatch({ type: 'SHOW_PAYMENT_MODAL', payload: false });
  };

  const setError = (error: string | undefined) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: undefined });
  };

  const contextValue: PaymentContextType = {
    state,
    dispatch,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    updateBalance,
    addTransaction,
    updateTransaction,
    convertCurrency,
    getBalance,
    getTotalUSDBalance,
    openWalletModal,
    closeWalletModal,
    openPaymentModal,
    closePaymentModal,
    setError,
    clearError,
    refreshWalletBalances,
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
}

// Custom Hook
export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

export default PaymentContext;