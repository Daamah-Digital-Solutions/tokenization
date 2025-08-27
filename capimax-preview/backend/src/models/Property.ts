import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/database';
import { PropertyType, PropertyStatus } from '../types';
import { User } from './User';

export interface PropertyAttributes {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  propertyType: PropertyType;
  totalValue: number;
  tokenPrice: number;
  totalTokens: number;
  tokensSold: number;
  tokensAvailable: number;
  expectedReturn?: number;
  rentalYield?: number;
  propertySize?: number;
  yearBuilt?: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  status: PropertyStatus;
  smartContractAddress?: string;
  blockchainNetwork: string;
  images: string[];
  documents: any[];
  fundingProgress: number;
  minimumInvestment?: number;
  maximumInvestment?: number;
  propertyFeatures?: string[];
  neighborhood?: string;
  nearbyAmenities?: string[];
  transportLinks?: string[];
  constructionYear?: number;
  lastRenovated?: number;
  energyRating?: string;
  parkingSpaces?: number;
  floors?: number;
  units?: number;
  occupancyRate?: number;
  grossRentalYield?: number;
  netRentalYield?: number;
  appreciationRate?: number;
  taxRate?: number;
  managementFee?: number;
  maintenanceCost?: number;
  insuranceCost?: number;
  propertyTaxes?: number;
  utilities?: number;
  vacancyRate?: number;
  avgRentPerSqft?: number;
  marketValue?: number;
  purchasePrice?: number;
  renovationCost?: number;
  totalProjectCost?: number;
  fundingGoal?: number;
  fundingDeadline?: Date;
  tokenizationDate?: Date;
  listingDate?: Date;
  completionDate?: Date;
  isActive: boolean;
  isFeatured: boolean;
  views: number;
  favorites: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyCreationAttributes extends Optional<PropertyAttributes,
  'id' | 'tokensSold' | 'tokensAvailable' | 'status' | 'blockchainNetwork' | 'images' | 
  'documents' | 'fundingProgress' | 'isActive' | 'isFeatured' | 'views' | 'favorites' |
  'createdAt' | 'updatedAt' | 'description' | 'expectedReturn' | 'rentalYield' |
  'propertySize' | 'yearBuilt' | 'state' | 'latitude' | 'longitude' | 'smartContractAddress' |
  'minimumInvestment' | 'maximumInvestment' | 'propertyFeatures' | 'neighborhood' |
  'nearbyAmenities' | 'transportLinks' | 'constructionYear' | 'lastRenovated' |
  'energyRating' | 'parkingSpaces' | 'floors' | 'units' | 'occupancyRate' |
  'grossRentalYield' | 'netRentalYield' | 'appreciationRate' | 'taxRate' |
  'managementFee' | 'maintenanceCost' | 'insuranceCost' | 'propertyTaxes' |
  'utilities' | 'vacancyRate' | 'avgRentPerSqft' | 'marketValue' | 'purchasePrice' |
  'renovationCost' | 'totalProjectCost' | 'fundingGoal' | 'fundingDeadline' |
  'tokenizationDate' | 'listingDate' | 'completionDate'> {}

export class Property extends Model<PropertyAttributes, PropertyCreationAttributes> implements PropertyAttributes {
  public id!: string;
  public ownerId!: string;
  public title!: string;
  public description?: string;
  public propertyType!: PropertyType;
  public totalValue!: number;
  public tokenPrice!: number;
  public totalTokens!: number;
  public tokensSold!: number;
  public tokensAvailable!: number;
  public expectedReturn?: number;
  public rentalYield?: number;
  public propertySize?: number;
  public yearBuilt?: number;
  public address!: string;
  public city!: string;
  public state?: string;
  public country!: string;
  public latitude?: number;
  public longitude?: number;
  public status!: PropertyStatus;
  public smartContractAddress?: string;
  public blockchainNetwork!: string;
  public images!: string[];
  public documents!: any[];
  public fundingProgress!: number;
  public minimumInvestment?: number;
  public maximumInvestment?: number;
  public propertyFeatures?: string[];
  public neighborhood?: string;
  public nearbyAmenities?: string[];
  public transportLinks?: string[];
  public constructionYear?: number;
  public lastRenovated?: number;
  public energyRating?: string;
  public parkingSpaces?: number;
  public floors?: number;
  public units?: number;
  public occupancyRate?: number;
  public grossRentalYield?: number;
  public netRentalYield?: number;
  public appreciationRate?: number;
  public taxRate?: number;
  public managementFee?: number;
  public maintenanceCost?: number;
  public insuranceCost?: number;
  public propertyTaxes?: number;
  public utilities?: number;
  public vacancyRate?: number;
  public avgRentPerSqft?: number;
  public marketValue?: number;
  public purchasePrice?: number;
  public renovationCost?: number;
  public totalProjectCost?: number;
  public fundingGoal?: number;
  public fundingDeadline?: Date;
  public tokenizationDate?: Date;
  public listingDate?: Date;
  public completionDate?: Date;
  public isActive!: boolean;
  public isFeatured!: boolean;
  public views!: number;
  public favorites!: number;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Virtual fields
  public get fullAddress(): string {
    return `${this.address}, ${this.city}${this.state ? `, ${this.state}` : ''}, ${this.country}`;
  }

  public get coordinates(): { lat: number; lng: number } | null {
    if (this.latitude && this.longitude) {
      return { lat: this.latitude, lng: this.longitude };
    }
    return null;
  }

  public get fundingProgressPercentage(): number {
    return Math.round((this.tokensSold / this.totalTokens) * 100);
  }

  public get isSoldOut(): boolean {
    return this.tokensSold >= this.totalTokens;
  }

  public get investmentRange(): { min: number; max: number } {
    return {
      min: this.minimumInvestment || this.tokenPrice,
      max: this.maximumInvestment || this.tokenPrice * this.tokensAvailable
    };
  }

  // Instance methods
  public async updateTokensSold(amount: number): Promise<void> {
    this.tokensSold += amount;
    this.tokensAvailable = this.totalTokens - this.tokensSold;
    this.fundingProgress = this.fundingProgressPercentage;
    
    if (this.isSoldOut && this.status === PropertyStatus.ACTIVE) {
      this.status = PropertyStatus.SOLD_OUT;
    }
    
    await this.save();
  }

  public async incrementViews(): Promise<void> {
    this.views += 1;
    await this.save();
  }

  public async toggleFavorite(increase: boolean = true): Promise<void> {
    if (increase) {
      this.favorites += 1;
    } else {
      this.favorites = Math.max(0, this.favorites - 1);
    }
    await this.save();
  }

  public calculateROI(investmentAmount: number): {
    monthlyIncome: number;
    annualIncome: number;
    totalROI: number;
    appreciationValue: number;
  } {
    const tokenCount = Math.floor(investmentAmount / this.tokenPrice);
    const ownershipPercentage = tokenCount / this.totalTokens;
    
    const monthlyRental = this.rentalYield ? 
      (this.totalValue * (this.rentalYield / 100) / 12) * ownershipPercentage : 0;
    
    const annualRental = monthlyRental * 12;
    
    const appreciationValue = this.expectedReturn ? 
      investmentAmount * (this.expectedReturn / 100) : 0;
    
    const totalROI = ((annualRental + appreciationValue) / investmentAmount) * 100;
    
    return {
      monthlyIncome: Math.round(monthlyRental * 100) / 100,
      annualIncome: Math.round(annualRental * 100) / 100,
      totalROI: Math.round(totalROI * 100) / 100,
      appreciationValue: Math.round(appreciationValue * 100) / 100
    };
  }

  public toPublicJSON(): Partial<PropertyAttributes> {
    const publicData = { ...this.toJSON() };
    
    // Remove sensitive owner information for public listings
    if (!this.ownerId) {
      delete (publicData as any).ownerId;
    }
    
    return publicData;
  }

  // Static methods
  public static async findByStatus(status: PropertyStatus): Promise<Property[]> {
    return Property.findAll({ where: { status, isActive: true } });
  }

  public static async findFeatured(limit: number = 6): Promise<Property[]> {
    return Property.findAll({
      where: { 
        isFeatured: true, 
        isActive: true,
        status: PropertyStatus.ACTIVE
      },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  public static async searchProperties(filters: any, pagination: any): Promise<{
    properties: Property[];
    total: number;
  }> {
    const where: any = { isActive: true };
    
    if (filters.type) where.propertyType = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.city) where.city = filters.city;
    if (filters.country) where.country = filters.country;
    if (filters.min_price) where.tokenPrice = { ...where.tokenPrice, [Op.gte]: filters.min_price };
    if (filters.max_price) where.tokenPrice = { ...where.tokenPrice, [Op.lte]: filters.max_price };
    if (filters.min_return) where.expectedReturn = { ...where.expectedReturn, [Op.gte]: filters.min_return };
    if (filters.max_return) where.expectedReturn = { ...where.expectedReturn, [Op.lte]: filters.max_return };

    const order: any[] = [];
    if (filters.sort) {
      const direction = filters.order === 'desc' ? 'DESC' : 'ASC';
      order.push([filters.sort, direction]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const { count, rows } = await Property.findAndCountAll({
      where,
      order,
      limit: pagination.limit,
      offset: pagination.offset,
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    return { properties: rows, total: count };
  }
}

// Initialize the model
Property.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'owner_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [5, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    propertyType: {
      type: DataTypes.ENUM(...Object.values(PropertyType)),
      allowNull: false,
      field: 'property_type'
    },
    totalValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'total_value',
      validate: {
        min: 0
      }
    },
    tokenPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'token_price',
      validate: {
        min: 0
      }
    },
    totalTokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_tokens',
      validate: {
        min: 1
      }
    },
    tokensSold: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'tokens_sold',
      validate: {
        min: 0
      }
    },
    tokensAvailable: {
      type: DataTypes.INTEGER,
      field: 'tokens_available',
      validate: {
        min: 0
      }
    },
    expectedReturn: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'expected_return',
      validate: {
        min: 0,
        max: 100
      }
    },
    rentalYield: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'rental_yield',
      validate: {
        min: 0,
        max: 100
      }
    },
    propertySize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'property_size',
      validate: {
        min: 0
      }
    },
    yearBuilt: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'year_built',
      validate: {
        min: 1800,
        max: new Date().getFullYear() + 5
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PropertyStatus)),
      defaultValue: PropertyStatus.DRAFT
    },
    smartContractAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      field: 'smart_contract_address',
      validate: {
        isEthereumAddress: function(value: string) {
          if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Invalid Ethereum address format');
          }
        }
      }
    },
    blockchainNetwork: {
      type: DataTypes.STRING(20),
      defaultValue: 'ethereum',
      field: 'blockchain_network'
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    documents: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    fundingProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'funding_progress'
    },
    minimumInvestment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'minimum_investment'
    },
    maximumInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'maximum_investment'
    },
    propertyFeatures: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'property_features'
    },
    neighborhood: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nearbyAmenities: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'nearby_amenities'
    },
    transportLinks: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'transport_links'
    },
    constructionYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'construction_year'
    },
    lastRenovated: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'last_renovated'
    },
    energyRating: {
      type: DataTypes.STRING(5),
      allowNull: true,
      field: 'energy_rating'
    },
    parkingSpaces: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parking_spaces'
    },
    floors: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    units: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    occupancyRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'occupancy_rate'
    },
    grossRentalYield: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'gross_rental_yield'
    },
    netRentalYield: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'net_rental_yield'
    },
    appreciationRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'appreciation_rate'
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'tax_rate'
    },
    managementFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'management_fee'
    },
    maintenanceCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'maintenance_cost'
    },
    insuranceCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'insurance_cost'
    },
    propertyTaxes: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'property_taxes'
    },
    utilities: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    vacancyRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'vacancy_rate'
    },
    avgRentPerSqft: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'avg_rent_per_sqft'
    },
    marketValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'market_value'
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'purchase_price'
    },
    renovationCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'renovation_cost'
    },
    totalProjectCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'total_project_cost'
    },
    fundingGoal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'funding_goal'
    },
    fundingDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'funding_deadline'
    },
    tokenizationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'tokenization_date'
    },
    listingDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'listing_date'
    },
    completionDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completion_date'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_featured'
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    favorites: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    modelName: 'Property',
    tableName: 'properties',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: (property: Property) => {
        // Calculate tokens available
        property.tokensAvailable = property.totalTokens - property.tokensSold;
        
        // Calculate funding progress
        property.fundingProgress = Math.round((property.tokensSold / property.totalTokens) * 100);
      }
    },
    indexes: [
      {
        fields: ['owner_id']
      },
      {
        fields: ['property_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['city', 'country']
      },
      {
        fields: ['token_price']
      },
      {
        fields: ['expected_return']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['is_featured']
      },
      {
        fields: ['created_at']
      }
    ]
  }
);

// Define associations
Property.belongsTo(User, { 
  foreignKey: 'ownerId', 
  as: 'owner',
  onDelete: 'CASCADE'
});