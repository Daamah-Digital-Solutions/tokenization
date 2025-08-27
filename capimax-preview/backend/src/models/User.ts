import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';
import { UserRole, KYCStatus } from '../types';

// Define the user attributes
export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  kycStatus: KYCStatus;
  isVerified: boolean;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  country?: string;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  profileImageUrl?: string;
  totalInvested: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (optional fields)
export interface UserCreationAttributes extends Optional<UserAttributes, 
  'id' | 'kycStatus' | 'isVerified' | 'isActive' | 'twoFactorEnabled' | 'loginAttempts' | 
  'totalInvested' | 'totalEarnings' | 'createdAt' | 'updatedAt' | 'phone' | 'twoFactorSecret' | 
  'emailVerificationToken' | 'emailVerificationExpires' | 'passwordResetToken' | 
  'passwordResetExpires' | 'lastLogin' | 'passwordChangedAt' | 'lockUntil' | 'country' | 
  'dateOfBirth' | 'address' | 'city' | 'state' | 'postalCode' | 'profileImageUrl'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public role!: UserRole;
  public kycStatus!: KYCStatus;
  public isVerified!: boolean;
  public isActive!: boolean;
  public twoFactorEnabled!: boolean;
  public twoFactorSecret?: string;
  public emailVerificationToken?: string;
  public emailVerificationExpires?: Date;
  public passwordResetToken?: string;
  public passwordResetExpires?: Date;
  public lastLogin?: Date;
  public passwordChangedAt?: Date;
  public loginAttempts!: number;
  public lockUntil?: Date;
  public country?: string;
  public dateOfBirth?: Date;
  public address?: string;
  public city?: string;
  public state?: string;
  public postalCode?: string;
  public profileImageUrl?: string;
  public totalInvested!: number;
  public totalEarnings!: number;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Virtual fields
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public get isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  // Instance methods
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  public async setPassword(password: string): Promise<void> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.passwordHash = await bcrypt.hash(password, saltRounds);
    this.passwordChangedAt = new Date();
  }

  public async incrementLoginAttempts(): Promise<void> {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < new Date()) {
      this.loginAttempts = 1;
      this.lockUntil = undefined;
    } else {
      this.loginAttempts += 1;
      
      // Lock account after max attempts
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
      const lockTime = parseInt(process.env.LOCKOUT_TIME || '1800000'); // 30 minutes
      
      if (this.loginAttempts >= maxAttempts) {
        this.lockUntil = new Date(Date.now() + lockTime);
      }
    }
    
    await this.save();
  }

  public async resetLoginAttempts(): Promise<void> {
    if (this.loginAttempts > 0 || this.lockUntil) {
      this.loginAttempts = 0;
      this.lockUntil = undefined;
      await this.save();
    }
  }

  public toSafeJSON(): Partial<UserAttributes> {
    const { passwordHash, twoFactorSecret, emailVerificationToken, passwordResetToken, ...safeUser } = this.toJSON();
    return safeUser;
  }

  // Static methods
  public static async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email: email.toLowerCase() } });
  }

  public static async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    country?: string;
  }): Promise<User> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    return User.create({
      email: userData.email.toLowerCase(),
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      phone: userData.phone,
      country: userData.country,
      kycStatus: KYCStatus.PENDING,
      isVerified: false,
      isActive: true,
      twoFactorEnabled: false,
      loginAttempts: 0,
      totalInvested: 0,
      totalEarnings: 0
    });
  }
}

// Initialize the model
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [3, 255]
      },
      set(value: string) {
        this.setDataValue('email', value.toLowerCase());
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash'
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
      validate: {
        len: [1, 100]
      }
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
      validate: {
        len: [1, 100]
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [10, 20]
      }
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.INVESTOR
    },
    kycStatus: {
      type: DataTypes.ENUM(...Object.values(KYCStatus)),
      allowNull: false,
      defaultValue: KYCStatus.PENDING,
      field: 'kyc_status'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'two_factor_enabled'
    },
    twoFactorSecret: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'two_factor_secret'
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'email_verification_token'
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verification_expires'
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'password_reset_token'
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_changed_at'
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_attempts'
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lock_until'
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_of_birth'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code'
    },
    profileImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'profile_image_url'
    },
    totalInvested: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'total_invested'
    },
    totalEarnings: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'total_earnings'
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['kyc_status']
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