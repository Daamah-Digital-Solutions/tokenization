import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/database';
import { TransactionType } from '../types';
import { User } from './User';
import { Investment } from './Investment';
import { Payment } from './Payment';

export interface TransactionAttributes {
  id: string;
  userId: string;
  investmentId?: string;
  paymentId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  blockchainTxHash?: string;
  blockchainNetwork?: string;
  fromAddress?: string;
  toAddress?: string;
  gasUsed?: number;
  gasPrice?: string;
  blockNumber?: number;
  confirmations?: number;
  status: 'pending' | 'confirmed' | 'failed';
  fees?: number;
  exchangeRate?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  relatedTransactionId?: string;
  metadata?: any;
  tags?: string[];
  isInternal: boolean;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionCreationAttributes extends Optional<TransactionAttributes,
  'id' | 'investmentId' | 'paymentId' | 'reference' | 'blockchainTxHash' | 
  'blockchainNetwork' | 'fromAddress' | 'toAddress' | 'gasUsed' | 'gasPrice' |
  'blockNumber' | 'confirmations' | 'fees' | 'exchangeRate' | 'balanceBefore' |
  'balanceAfter' | 'relatedTransactionId' | 'metadata' | 'tags' | 'isInternal' |
  'processedAt' | 'createdAt' | 'updatedAt'> {}

export class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: string;
  public userId!: string;
  public investmentId?: string;
  public paymentId?: string;
  public type!: TransactionType;
  public amount!: number;
  public currency!: string;
  public description!: string;
  public reference?: string;
  public blockchainTxHash?: string;
  public blockchainNetwork?: string;
  public fromAddress?: string;
  public toAddress?: string;
  public gasUsed?: number;
  public gasPrice?: string;
  public blockNumber?: number;
  public confirmations?: number;
  public status!: 'pending' | 'confirmed' | 'failed';
  public fees?: number;
  public exchangeRate?: number;
  public balanceBefore?: number;
  public balanceAfter?: number;
  public relatedTransactionId?: string;
  public metadata?: any;
  public tags?: string[];
  public isInternal!: boolean;
  public processedAt?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public user?: User;
  public investment?: Investment;
  public payment?: Payment;

  // Virtual fields
  public get netAmount(): number {
    return this.amount - (this.fees || 0);
  }

  public get isCredit(): boolean {
    return [TransactionType.INVESTMENT, TransactionType.DIVIDEND, TransactionType.DEPOSIT].includes(this.type);
  }

  public get isDebit(): boolean {
    return [TransactionType.WITHDRAWAL, TransactionType.FEE].includes(this.type);
  }

  public get formattedAmount(): string {
    const sign = this.isCredit ? '+' : '-';
    return `${sign}${this.amount.toLocaleString()} ${this.currency}`;
  }

  public get transactionAge(): number {
    return Math.floor((new Date().getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  public get explorerUrl(): string | null {
    if (!this.blockchainTxHash || !this.blockchainNetwork) return null;
    
    const explorers: Record<string, string> = {
      'ethereum': 'https://etherscan.io/tx/',
      'polygon': 'https://polygonscan.com/tx/',
      'bsc': 'https://bscscan.com/tx/'
    };
    
    const baseUrl = explorers[this.blockchainNetwork];
    return baseUrl ? `${baseUrl}${this.blockchainTxHash}` : null;
  }

  // Instance methods
  public async markConfirmed(blockNumber?: number, gasUsed?: number): Promise<void> {
    this.status = 'confirmed';
    this.processedAt = new Date();
    
    if (blockNumber) this.blockNumber = blockNumber;
    if (gasUsed) this.gasUsed = gasUsed;
    
    await this.save();
  }

  public async markFailed(reason?: string): Promise<void> {
    this.status = 'failed';
    this.processedAt = new Date();
    
    if (reason) {
      this.metadata = { ...this.metadata, failureReason: reason };
    }
    
    await this.save();
  }

  public async updateBlockchainInfo(txHash: string, network: string, fromAddr?: string, toAddr?: string): Promise<void> {
    this.blockchainTxHash = txHash;
    this.blockchainNetwork = network;
    if (fromAddr) this.fromAddress = fromAddr;
    if (toAddr) this.toAddress = toAddr;
    await this.save();
  }

  public async updateConfirmations(count: number): Promise<void> {
    this.confirmations = count;
    await this.save();
  }

  public async addTag(tag: string): Promise<void> {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      await this.save();
    }
  }

  public async removeTag(tag: string): Promise<void> {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
      await this.save();
    }
  }

  public async updateBalances(balanceBefore: number, balanceAfter: number): Promise<void> {
    this.balanceBefore = balanceBefore;
    this.balanceAfter = balanceAfter;
    await this.save();
  }

  public calculateTaxInfo(): {
    isTaxable: boolean;
    taxableAmount: number;
    taxCategory: string;
    holdingPeriod?: number;
  } {
    const taxableTypes = [TransactionType.DIVIDEND, TransactionType.INVESTMENT];
    const isTaxable = taxableTypes.includes(this.type);
    
    let taxableAmount = 0;
    let taxCategory = 'other';
    
    if (this.type === TransactionType.DIVIDEND) {
      taxableAmount = this.amount;
      taxCategory = 'dividend_income';
    } else if (this.type === TransactionType.INVESTMENT) {
      taxableAmount = 0; // Only gains are taxable, not the investment amount
      taxCategory = 'capital_gains';
    }

    return {
      isTaxable,
      taxableAmount,
      taxCategory,
      holdingPeriod: this.transactionAge
    };
  }

  public toSummaryJSON(): any {
    return {
      id: this.id,
      type: this.type,
      amount: this.amount,
      currency: this.currency,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt,
      blockchainTxHash: this.blockchainTxHash,
      explorerUrl: this.explorerUrl,
      isCredit: this.isCredit,
      netAmount: this.netAmount
    };
  }

  // Static methods
  public static async findByUserId(userId: string, options: {
    type?: TransactionType;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ transactions: Transaction[]; total: number }> {
    const where: any = { userId };
    
    if (options.type) where.type = options.type;
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt[Op.gte] = options.startDate;
      if (options.endDate) where.createdAt[Op.lte] = options.endDate;
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      limit: options.limit || 50,
      offset: options.offset || 0,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Investment,
          as: 'investment',
          include: [{
            model: require('./Property').Property,
            as: 'property',
            attributes: ['id', 'title']
          }],
          required: false
        },
        {
          model: Payment,
          as: 'payment',
          required: false
        }
      ]
    });

    return { transactions: rows, total: count };
  }

  public static async getTransactionStats(userId: string, period: 'month' | 'quarter' | 'year' = 'month'): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    transactionCount: number;
    avgTransactionAmount: number;
    byType: Record<TransactionType, { count: number; amount: number }>;
    byCurrency: Record<string, number>;
    chartData: Array<{ date: string; income: number; expenses: number }>;
  }> {
    const startDate = new Date();
    
    switch (period) {
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const transactions = await Transaction.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate },
        status: 'confirmed'
      },
      order: [['createdAt', 'ASC']]
    });

    const income = transactions.filter(t => t.isCredit);
    const expenses = transactions.filter(t => t.isDebit);
    
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIncome - totalExpenses;
    const transactionCount = transactions.length;
    const avgTransactionAmount = transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

    const byType = transactions.reduce((acc, t) => {
      if (!acc[t.type]) {
        acc[t.type] = { count: 0, amount: 0 };
      }
      acc[t.type].count += 1;
      acc[t.type].amount += t.amount;
      return acc;
    }, {} as Record<TransactionType, { count: number; amount: number }>);

    const byCurrency = transactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    // Generate chart data (daily aggregation)
    const chartData = this.generateChartData(transactions, period);

    return {
      totalIncome,
      totalExpenses,
      netFlow,
      transactionCount,
      avgTransactionAmount,
      byType,
      byCurrency,
      chartData
    };
  }

  private static generateChartData(transactions: Transaction[], period: string): Array<{ date: string; income: number; expenses: number }> {
    const groupedData: Record<string, { income: number; expenses: number }> = {};
    
    transactions.forEach(transaction => {
      const date = transaction.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!groupedData[date]) {
        groupedData[date] = { income: 0, expenses: 0 };
      }
      
      if (transaction.isCredit) {
        groupedData[date].income += transaction.amount;
      } else {
        groupedData[date].expenses += transaction.amount;
      }
    });

    return Object.entries(groupedData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  public static async createInvestmentTransaction(
    userId: string,
    investmentId: string,
    amount: number,
    currency: string,
    description: string,
    paymentId?: string
  ): Promise<Transaction> {
    return Transaction.create({
      userId,
      investmentId,
      paymentId,
      type: TransactionType.INVESTMENT,
      amount,
      currency,
      description,
      status: 'pending',
      isInternal: false
    });
  }

  public static async createDividendTransaction(
    userId: string,
    investmentId: string,
    amount: number,
    currency: string,
    description: string
  ): Promise<Transaction> {
    return Transaction.create({
      userId,
      investmentId,
      type: TransactionType.DIVIDEND,
      amount,
      currency,
      description,
      status: 'confirmed',
      isInternal: true,
      processedAt: new Date()
    });
  }
}

// Initialize the model
Transaction.init(
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
      allowNull: true,
      field: 'investment_id',
      references: {
        model: 'investments',
        key: 'id'
      }
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'payment_id',
      references: {
        model: 'payments',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TransactionType)),
      allowNull: false
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
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true
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
    fromAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      field: 'from_address'
    },
    toAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      field: 'to_address'
    },
    gasUsed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'gas_used'
    },
    gasPrice: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'gas_price'
    },
    blockNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'block_number'
    },
    confirmations: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
      defaultValue: 'pending'
    },
    fees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: true,
      field: 'exchange_rate'
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'balance_before'
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'balance_after'
    },
    relatedTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'related_transaction_id',
      references: {
        model: 'transactions',
        key: 'id'
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_internal'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at'
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
    modelName: 'Transaction',
    tableName: 'transactions',
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
        fields: ['payment_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['blockchain_tx_hash']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['processed_at']
      }
    ]
  }
);

// Define associations
Transaction.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  onDelete: 'CASCADE'
});

Transaction.belongsTo(Investment, { 
  foreignKey: 'investmentId', 
  as: 'investment',
  onDelete: 'SET NULL'
});

Transaction.belongsTo(Payment, { 
  foreignKey: 'paymentId', 
  as: 'payment',
  onDelete: 'SET NULL'
});

Transaction.belongsTo(Transaction, { 
  foreignKey: 'relatedTransactionId', 
  as: 'relatedTransaction',
  onDelete: 'SET NULL'
});