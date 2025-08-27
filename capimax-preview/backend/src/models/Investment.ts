import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { PaymentMethod, InvestmentStatus } from '../types';
import { User } from './User';
import { Property } from './Property';

export interface InvestmentAttributes {
  id: string;
  userId: string;
  propertyId: string;
  tokenAmount: number;
  investmentAmount: number;
  tokenPriceAtPurchase: number;
  paymentMethod: PaymentMethod;
  paymentCurrency: string;
  transactionHash?: string;
  blockchainNetwork: string;
  status: InvestmentStatus;
  currentValue?: number;
  totalReturn?: number;
  returnPercentage?: number;
  monthlyIncome?: number;
  dividendsReceived?: number;
  lastDividendDate?: Date;
  purchaseDate: Date;
  confirmationDate?: Date;
  maturityDate?: Date;
  fees?: number;
  platformFee?: number;
  blockchainFee?: number;
  paymentReference?: string;
  notes?: string;
  riskLevel?: string;
  expectedAnnualReturn?: number;
  actualAnnualReturn?: number;
  performanceMetrics?: any;
  taxInfo?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentCreationAttributes extends Optional<InvestmentAttributes,
  'id' | 'status' | 'blockchainNetwork' | 'currentValue' | 'totalReturn' | 
  'returnPercentage' | 'monthlyIncome' | 'dividendsReceived' | 'lastDividendDate' |
  'confirmationDate' | 'maturityDate' | 'fees' | 'platformFee' | 'blockchainFee' |
  'paymentReference' | 'notes' | 'riskLevel' | 'expectedAnnualReturn' | 
  'actualAnnualReturn' | 'performanceMetrics' | 'taxInfo' | 'isActive' |
  'createdAt' | 'updatedAt' | 'transactionHash'> {}

export class Investment extends Model<InvestmentAttributes, InvestmentCreationAttributes> implements InvestmentAttributes {
  public id!: string;
  public userId!: string;
  public propertyId!: string;
  public tokenAmount!: number;
  public investmentAmount!: number;
  public tokenPriceAtPurchase!: number;
  public paymentMethod!: PaymentMethod;
  public paymentCurrency!: string;
  public transactionHash?: string;
  public blockchainNetwork!: string;
  public status!: InvestmentStatus;
  public currentValue?: number;
  public totalReturn?: number;
  public returnPercentage?: number;
  public monthlyIncome?: number;
  public dividendsReceived?: number;
  public lastDividendDate?: Date;
  public purchaseDate!: Date;
  public confirmationDate?: Date;
  public maturityDate?: Date;
  public fees?: number;
  public platformFee?: number;
  public blockchainFee?: number;
  public paymentReference?: string;
  public notes?: string;
  public riskLevel?: string;
  public expectedAnnualReturn?: number;
  public actualAnnualReturn?: number;
  public performanceMetrics?: any;
  public taxInfo?: any;
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public user?: User;
  public property?: Property;

  // Virtual fields
  public get ownershipPercentage(): number {
    if (this.property) {
      return (this.tokenAmount / this.property.totalTokens) * 100;
    }
    return 0;
  }

  public get profitLoss(): number {
    if (this.currentValue) {
      return this.currentValue - this.investmentAmount;
    }
    return 0;
  }

  public get profitLossPercentage(): number {
    const pl = this.profitLoss;
    return (pl / this.investmentAmount) * 100;
  }

  public get holdingPeriodDays(): number {
    const start = this.confirmationDate || this.createdAt;
    return Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  public get annualizedReturn(): number {
    if (this.holdingPeriodDays === 0) return 0;
    const days = this.holdingPeriodDays;
    const totalReturn = this.profitLossPercentage;
    return (totalReturn / days) * 365;
  }

  // Instance methods
  public async updateCurrentValue(newValue: number): Promise<void> {
    this.currentValue = newValue;
    this.totalReturn = newValue - this.investmentAmount;
    this.returnPercentage = (this.totalReturn / this.investmentAmount) * 100;
    await this.save();
  }

  public async addDividend(amount: number): Promise<void> {
    this.dividendsReceived = (this.dividendsReceived || 0) + amount;
    this.lastDividendDate = new Date();
    
    // Update total return to include dividends
    if (this.currentValue) {
      this.totalReturn = (this.currentValue - this.investmentAmount) + this.dividendsReceived;
      this.returnPercentage = (this.totalReturn / this.investmentAmount) * 100;
    }
    
    await this.save();
  }

  public async confirm(transactionHash?: string): Promise<void> {
    this.status = InvestmentStatus.COMPLETED;
    this.confirmationDate = new Date();
    this.purchaseDate = new Date();
    
    if (transactionHash) {
      this.transactionHash = transactionHash;
    }
    
    await this.save();
  }

  public async cancel(reason?: string): Promise<void> {
    this.status = InvestmentStatus.CANCELLED;
    if (reason) {
      this.notes = reason;
    }
    await this.save();
  }

  public async fail(reason?: string): Promise<void> {
    this.status = InvestmentStatus.FAILED;
    if (reason) {
      this.notes = reason;
    }
    await this.save();
  }

  public calculateProjectedReturns(years: number = 1): {
    projectedValue: number;
    projectedIncome: number;
    totalProjectedReturn: number;
    projectedROI: number;
  } {
    const expectedReturn = this.expectedAnnualReturn || this.property?.expectedReturn || 0;
    const rentalYield = this.property?.rentalYield || 0;
    
    const appreciation = this.investmentAmount * Math.pow(1 + (expectedReturn / 100), years);
    const annualRental = this.investmentAmount * (rentalYield / 100);
    const totalRental = annualRental * years;
    
    const projectedValue = appreciation;
    const projectedIncome = totalRental;
    const totalProjectedReturn = (appreciation - this.investmentAmount) + totalRental;
    const projectedROI = (totalProjectedReturn / this.investmentAmount) * 100;

    return {
      projectedValue: Math.round(projectedValue * 100) / 100,
      projectedIncome: Math.round(projectedIncome * 100) / 100,
      totalProjectedReturn: Math.round(totalProjectedReturn * 100) / 100,
      projectedROI: Math.round(projectedROI * 100) / 100
    };
  }

  public generateTaxReport(): {
    capitalGains: number;
    dividendIncome: number;
    totalTaxableIncome: number;
    holdingPeriod: number;
    isLongTerm: boolean;
  } {
    const capitalGains = this.currentValue ? this.currentValue - this.investmentAmount : 0;
    const dividendIncome = this.dividendsReceived || 0;
    const totalTaxableIncome = capitalGains + dividendIncome;
    const holdingPeriod = this.holdingPeriodDays;
    const isLongTerm = holdingPeriod > 365;

    return {
      capitalGains,
      dividendIncome,
      totalTaxableIncome,
      holdingPeriod,
      isLongTerm
    };
  }

  public toPortfolioJSON(): any {
    return {
      id: this.id,
      property: {
        id: this.property?.id,
        title: this.property?.title,
        location: `${this.property?.city}, ${this.property?.country}`,
        image: this.property?.images?.[0],
        type: this.property?.propertyType
      },
      tokenAmount: this.tokenAmount,
      investmentAmount: this.investmentAmount,
      currentValue: this.currentValue,
      totalReturn: this.totalReturn,
      returnPercentage: this.returnPercentage,
      monthlyIncome: this.monthlyIncome,
      ownershipPercentage: this.ownershipPercentage,
      purchaseDate: this.purchaseDate,
      status: this.status,
      transactionHash: this.transactionHash,
      paymentMethod: this.paymentMethod,
      paymentCurrency: this.paymentCurrency
    };
  }

  // Static methods
  public static async findByUserId(userId: string): Promise<Investment[]> {
    return Investment.findAll({
      where: { userId, isActive: true },
      include: [{
        model: Property,
        as: 'property',
        attributes: ['id', 'title', 'city', 'country', 'images', 'propertyType', 'totalTokens']
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  public static async findByPropertyId(propertyId: string): Promise<Investment[]> {
    return Investment.findAll({
      where: { propertyId, status: InvestmentStatus.COMPLETED },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });
  }

  public static async calculatePortfolioSummary(userId: string): Promise<{
    totalInvested: number;
    currentValue: number;
    totalReturn: number;
    returnPercentage: number;
    propertiesCount: number;
    monthlyIncome: number;
    dividendsReceived: number;
    activeInvestments: number;
  }> {
    const investments = await Investment.findAll({
      where: { 
        userId, 
        status: InvestmentStatus.COMPLETED,
        isActive: true 
      }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
    const currentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.investmentAmount), 0);
    const totalReturn = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
    const propertiesCount = new Set(investments.map(inv => inv.propertyId)).size;
    const monthlyIncome = investments.reduce((sum, inv) => sum + (inv.monthlyIncome || 0), 0);
    const dividendsReceived = investments.reduce((sum, inv) => sum + (inv.dividendsReceived || 0), 0);
    const activeInvestments = investments.length;

    return {
      totalInvested: Math.round(totalInvested * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      returnPercentage: Math.round(returnPercentage * 100) / 100,
      propertiesCount,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      dividendsReceived: Math.round(dividendsReceived * 100) / 100,
      activeInvestments
    };
  }
}

// Initialize the model
Investment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    propertyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'property_id',
      references: {
        model: 'properties',
        key: 'id'
      }
    },
    tokenAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'token_amount',
      validate: {
        min: 1
      }
    },
    investmentAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'investment_amount',
      validate: {
        min: 0
      }
    },
    tokenPriceAtPurchase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'token_price_at_purchase',
      validate: {
        min: 0
      }
    },
    paymentMethod: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
      field: 'payment_method'
    },
    paymentCurrency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'payment_currency'
    },
    transactionHash: {
      type: DataTypes.STRING(66),
      allowNull: true,
      field: 'transaction_hash',
      validate: {
        isTransactionHash: function(value: string) {
          if (value && !/^0x[a-fA-F0-9]{64}$/.test(value)) {
            throw new Error('Invalid transaction hash format');
          }
        }
      }
    },
    blockchainNetwork: {
      type: DataTypes.STRING(20),
      defaultValue: 'ethereum',
      field: 'blockchain_network'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InvestmentStatus)),
      defaultValue: InvestmentStatus.PENDING
    },
    currentValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'current_value'
    },
    totalReturn: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'total_return'
    },
    returnPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'return_percentage'
    },
    monthlyIncome: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'monthly_income'
    },
    dividendsReceived: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'dividends_received'
    },
    lastDividendDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_dividend_date'
    },
    purchaseDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'purchase_date'
    },
    confirmationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmation_date'
    },
    maturityDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'maturity_date'
    },
    fees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    platformFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'platform_fee'
    },
    blockchainFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'blockchain_fee'
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'payment_reference'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    riskLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'risk_level'
    },
    expectedAnnualReturn: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'expected_annual_return'
    },
    actualAnnualReturn: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'actual_annual_return'
    },
    performanceMetrics: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'performance_metrics'
    },
    taxInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'tax_info'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    modelName: 'Investment',
    tableName: 'investments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['property_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['payment_method']
      },
      {
        fields: ['transaction_hash']
      },
      {
        fields: ['purchase_date']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['created_at']
      }
    ]
  }
);

// Define associations
Investment.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  onDelete: 'CASCADE'
});

Investment.belongsTo(Property, { 
  foreignKey: 'propertyId', 
  as: 'property',
  onDelete: 'CASCADE'
});