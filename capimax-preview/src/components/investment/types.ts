// Investment component type definitions
export interface InvestmentProperty {
  id: number;
  title: string;
  tokenPrice: number;
  minInvestment: number;
  expectedReturn: number;
  totalTokens: number;
  soldTokens: number;
  investment: {
    minInvestment: number;
    avgAnnualReturn: number;
    dividendFrequency: string;
    managementFee: number;
    appreciationForecast: number;
    rentalYield: number;
    totalROI: number;
  };
}

export interface InvestmentData {
  amount: number;
  tokens: number;
  paymentMethod: 'crypto' | 'fiat' | 'wallet' | string | null;
  paymentId?: string;
  paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  walletAddress?: string;
  cardDetails?: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
  };
  bankDetails?: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
}

export interface InvestmentFlowProps {
  property: InvestmentProperty;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (investment: InvestmentData) => void;
}