import { sequelize } from '../config/database';
import { User } from './User';
import { Property } from './Property';
import { Investment } from './Investment';
import { KYCDocument } from './KYCDocument';
import { Payment } from './Payment';
import { Transaction } from './Transaction';
import { Notification } from './Notification';

// Define all model relationships here

// User relationships
User.hasMany(Property, { foreignKey: 'ownerId', as: 'properties' });
User.hasMany(Investment, { foreignKey: 'userId', as: 'investments' });
User.hasMany(KYCDocument, { foreignKey: 'userId', as: 'kycDocuments' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Property relationships
Property.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Property.hasMany(Investment, { foreignKey: 'propertyId', as: 'investments' });

// Investment relationships
Investment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Investment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Investment.hasMany(Payment, { foreignKey: 'investmentId', as: 'payments' });
Investment.hasMany(Transaction, { foreignKey: 'investmentId', as: 'transactions' });

// KYC Document relationships
KYCDocument.belongsTo(User, { foreignKey: 'userId', as: 'user' });
KYCDocument.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

// Payment relationships
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Payment.belongsTo(Investment, { foreignKey: 'investmentId', as: 'investment' });
Payment.hasMany(Transaction, { foreignKey: 'paymentId', as: 'transactions' });

// Transaction relationships
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Transaction.belongsTo(Investment, { foreignKey: 'investmentId', as: 'investment' });
Transaction.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

// Notification relationships
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export models
export {
  sequelize,
  User,
  Property,
  Investment,
  KYCDocument,
  Payment,
  Transaction,
  Notification
};

// Export the database instance for initialization
export default {
  sequelize,
  User,
  Property,
  Investment,
  KYCDocument,
  Payment,
  Transaction,
  Notification
};