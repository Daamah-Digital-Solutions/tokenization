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
  paymentMethod: 'crypto' | 'fiat' | 'wallet' | 'nova_sukuk' | 'pronova' | string | null;
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
  // Nova Sukuk fields
  sukukPdf?: File;
  sukukReferenceNumber?: string;
  // Pronova fields
  txHash?: string;
  senderWalletAddress?: string;
  discountedAmount?: number;
}

export interface InvestmentFlowProps {
  property: InvestmentProperty;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (investment: InvestmentData) => void;
  onGoToPortfolio?: () => void;
  initialTokens?: number;
}