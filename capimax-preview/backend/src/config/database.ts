import { Sequelize, Options } from 'sequelize';
import logger from '../utils/logger';

interface DatabaseConfig extends Options {
  database: string;
  username: string;
  password: string;
  host: string;
  port: number;
}

const config: DatabaseConfig = {
  database: process.env.DB_NAME || 'capimax_dev',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? 
    (sql: string) => logger.debug(sql) : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
};

export const sequelize = new Sequelize(
  process.env.DATABASE_URL || 
  `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`,
  config
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('📊 Database synchronized');
    }
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('🔒 Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}

export default sequelize;