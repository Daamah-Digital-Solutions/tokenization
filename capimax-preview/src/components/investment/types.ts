// Investment component type definitions
export interface InvestmentProperty {
  id: number;
  title: string;
  tokenPrice: number;
  minInvestment: number;
  expectedReturn: number;
  totalTokens: number;
  soldTokens: number;
  location?: string;
  propertyType?: string;
  totalValue?: number;
  // Category-aware fields: when present + true, the investment flow
  // shows the optional installment-schedule step. Both must be true for
  // installments to be offered; either one false routes the user to the
  // upfront-payment path only.
  is_under_construction?: boolean;
  supports_installments?: boolean;
  installment_period_months?: number;
  property_category?: 'under_construction' | 'ready_property';
  expected_completion_date?: string;
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
  // Installment plan — only set when the investor chose to pay in
  // installments on an under-construction property. When true, the
  // backend ``Investment`` row spawns a ``ConstructionInstallment`` and
  // the on-chain mint sends ``isInstallment=true`` so tokens land in
  // contract escrow until each installment is paid.
  is_installment_purchase?: boolean;
  total_installments?: number;
}

export interface InvestmentFlowProps {
  property: InvestmentProperty;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (investment: InvestmentData) => void;
  onGoToPortfolio?: () => void;
  initialTokens?: number;
}