import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { PaymentMethod, PaymentStatus } from '../types';
import { User } from './User';
import { Investment } from './Investment';

export interface PaymentAttributes {
  id: string;
  userId: string;
  investmentId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  externalTransactionId?: string;
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  blockchainTxHash?: string;
  blockchainNetwork?: string;
  walletAddress?: string;
  cardLast4?: string;
  cardBrand?: string;
  billingAddress?: any;
  paymentMethodDetails?: any;
  fees?: number;
  platformFee?: number;
  processingFee?: number;
  networkFee?: number;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: string;
  failureReason?: string;
  failureCode?: string;
  refundReason?: string;
  refundAmount?: number;
  refundedAt?: Date;
  confirmedAt?: Date;
  expiredAt?: Date;
  webhookData?: any;
  riskScore?: number;
  fraudFlags?: string[];
  complianceChecks?: any;
  metadata?: any;
  notes?: string;
  isTestPayment: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCreationAttributes extends Optional<PaymentAttributes,
  'id' | 'status' | 'externalTransactionId' | 'stripePaymentIntentId' | 
  'paypalOrderId' | 'blockchainTxHash' | 'blockchainNetwork' | 'walletAddress' |
  'cardLast4' | 'cardBrand' | 'billingAddress' | 'paymentMethodDetails' |
  'fees' | 'platformFee' | 'processingFee' | 'networkFee' | 'exchangeRate' |
  'originalAmount' | 'originalCurrency' | 'failureReason' | 'failureCode' |
  'refundReason' | 'refundAmount' | 'refundedAt' | 'confirmedAt' | 'expiredAt' |
  'webhookData' | 'riskScore' | 'fraudFlags' | 'complianceChecks' | 'metadata' |
  'notes' | 'isTestPayment' | 'createdAt' | 'updatedAt'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: string;
  public userId!: string;
  public investmentId!: string;
  public amount!: number;
  public currency!: string;
  public paymentMethod!: PaymentMethod;
  public status!: PaymentStatus;
  public externalTransactionId?: string;
  public stripePaymentIntentId?: string;
  public paypalOrderId?: string;
  public blockchainTxHash?: string;
  public blockchainNetwork?: string;
  public walletAddress?: string;
  public cardLast4?: string;
  public cardBrand?: string;
  public billingAddress?: any;
  public paymentMethodDetails?: any;
  public fees?: number;
  public platformFee?: number;
  public processingFee?: number;
  public networkFee?: number;
  public exchangeRate?: number;
  public originalAmount?: number;
  public originalCurrency?: string;
  public failureReason?: string;
  public failureCode?: string;
  public refundReason?: string;
  public refundAmount?: number;
  public refundedAt?: Date;
  public confirmedAt?: Date;
  public expiredAt?: Date;
  public webhookData?: any;
  public riskScore?: number;
  public fraudFlags?: string[];
  public complianceChecks?: any;
  public metadata?: any;
  public notes?: string;
  public isTestPayment!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public user?: User;
  public investment?: Investment;

  // Virtual fields
  public get netAmount(): number {
    return this.amount - (this.fees || 0);
  }

  public get totalFees(): number {
    return (this.platformFee || 0) + (this.processingFee || 0) + (this.networkFee || 0);
  }

  public get isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  public get isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  public get isPending(): boolean {
    return this.status === PaymentStatus.PENDING || this.status === PaymentStatus.PROCESSING;
  }

  public get canRefund(): boolean {
    return this.status === PaymentStatus.COMPLETED && !this.refundedAt;
  }

  public get processingTimeMinutes(): number | null {
    if (!this.confirmedAt) return null;
    return Math.round((this.confirmedAt.getTime() - this.createdAt.getTime()) / (1000 * 60));
  }

  // Instance methods
  public async markCompleted(transactionHash?: string, confirmedAt?: Date): Promise<void> {
    this.status = PaymentStatus.COMPLETED;
    this.confirmedAt = confirmedAt || new Date();
    
    if (transactionHash) {
      this.blockchainTxHash = transactionHash;
    }
    
    await this.save();
  }

  public async markFailed(reason?: string, code?: string): Promise<void> {
    this.status = PaymentStatus.FAILED;
    this.failureReason = reason;
    this.failureCode = code;
    await this.save();
  }

  public async markProcessing(externalId?: string): Promise<void> {
    this.status = PaymentStatus.PROCESSING;
    if (externalId) {
      this.externalTransactionId = externalId;
    }
    await this.save();
  }

  public async cancel(reason?: string): Promise<void> {
    this.status = PaymentStatus.CANCELLED;
    if (reason) {
      this.notes = reason;
    }
    await this.save();
  }

  public async refund(amount?: number, reason?: string): Promise<void> {
    const refundAmount = amount || this.amount;
    
    this.status = PaymentStatus.REFUNDED;
    this.refundAmount = refundAmount;
    this.refundReason = reason;
    this.refundedAt = new Date();
    
    await this.save();
  }

  public async updateRiskScore(score: number, flags?: string[]): Promise<void> {
    this.riskScore = score;
    if (flags) {
      this.fraudFlags = flags;
    }
    await this.save();
  }

  public async addWebhookData(webhookPayload: any): Promise<void> {
    if (!this.webhookData) {
      this.webhookData = [];
    }
    
    this.webhookData.push({
      timestamp: new Date(),
      payload: webhookPayload
    });
    
    await this.save();
  }

  public calculateConvertedAmount(fromCurrency: string, toCurrency: string, rate: number): number {
    if (this.currency === fromCurrency && this.originalCurrency === toCurrency) {
      return this.originalAmount || this.amount;
    }
    
    return this.amount * rate;
  }

  public getPaymentSummary(): {
    id: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    fees: number;
    netAmount: number;
    processingTime?: number;
    createdAt: Date;
    confirmedAt?: Date;
  } {
    return {
      id: this.id,
      amount: this.amount,
      currency: this.currency,
      method: this.paymentMethod,
      status: this.status,
      fees: this.totalFees,
      netAmount: this.netAmount,
      processingTime: this.processingTimeMinutes || undefined,
      createdAt: this.createdAt,
      confirmedAt: this.confirmedAt
    };
  }

  // Static methods
  public static async findByUserId(userId: string): Promise<Payment[]> {
    return Payment.findAll({
      where: { userId },
      include: [{
        model: Investment,
        as: 'investment',
        include: [{
          model: require('./Property').Property,
          as: 'property',
          attributes: ['id', 'title', 'city', 'country']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  public static async findPendingPayments(): Promise<Payment[]> {
    return Payment.findAll({
      where: { 
        status: [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });
  }

  public static async getPaymentStats(userId?: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    successRate: number;
    avgProcessingTime: number;
    byMethod: Record<PaymentMethod, number>;
    byCurrency: Record<string, number>;
  }> {
    const whereClause = userId ? { userId } : {};
    
    const payments = await Payment.findAll({ where: whereClause });
    
    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const successfulPayments = payments.filter(p => p.isCompleted).length;
    const failedPayments = payments.filter(p => p.isFailed).length;
    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
    
    const processingTimes = payments
      .map(p => p.processingTimeMinutes)
      .filter(t => t !== null) as number[];
    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length 
      : 0;

    const byMethod = payments.reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<PaymentMethod, number>);

    const byCurrency = payments.reduce((acc, p) => {
      acc[p.currency] = (acc[p.currency] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPayments,
      totalAmount,
      successfulPayments,
      failedPayments,
      successRate,
      avgProcessingTime,
      byMethod,
      byCurrency
    };
  }
}

// Initialize the model
Payment.init(
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
    investmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'investment_id',
      references: {
        model: 'investments',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
      field: 'payment_method'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      defaultValue: PaymentStatus.PENDING
    },
    externalTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'external_transaction_id'
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_payment_intent_id'
    },
    paypalOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'paypal_order_id'
    },
    blockchainTxHash: {
      type: DataTypes.STRING(66),
      allowNull: true,
      field: 'blockchain_tx_hash'
    },
    blockchainNetwork: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'blockchain_network'
    },
    walletAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      field: 'wallet_address'
    },
    cardLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      field: 'card_last4'
    },
    cardBrand: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'card_brand'
    },
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'billing_address'
    },
    paymentMethodDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'payment_method_details'
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
    processingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'processing_fee'
    },
    networkFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'network_fee'
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: true,
      field: 'exchange_rate'
    },
    originalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'original_amount'
    },
    originalCurrency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'original_currency'
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'failure_reason'
    },
    failureCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'failure_code'
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refund_reason'
    },
    refundAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'refund_amount'
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refunded_at'
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmed_at'
    },
    expiredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expired_at'
    },
    webhookData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'webhook_data'
    },
    riskScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'risk_score',
      validate: {
        min: 0,
        max: 100
      }
    },
    fraudFlags: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'fraud_flags'
    },
    complianceChecks: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'compliance_checks'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isTestPayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_test_payment'
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
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['investment_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['payment_method']
      },
      {
        fields: ['external_transaction_id']
      },
      {
        fields: ['blockchain_tx_hash']
      },
      {
        fields: ['created_at']
      }
    ]
  }
);

// Define associations
Payment.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  onDelete: 'CASCADE'
});

Payment.belongsTo(Investment, { 
  foreignKey: 'investmentId', 
  as: 'investment',
  onDelete: 'CASCADE'
});