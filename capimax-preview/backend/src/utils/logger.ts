import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || path.join('logs', 'app.log');

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create the logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { 
    service: 'capimax-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(path.dirname(logFile), 'error.log'), 
      level: 'error' 
    }),
    // Write all logs with level `info` and below to combined log file
    new winston.transports.File({ filename: logFile }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let log = `${timestamp} [${service}] ${level}: ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          log += ' ' + JSON.stringify(meta);
        }
        
        return log;
      })
    )
  }));
}

// Create a stream object for morgan middleware
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Helper functions for structured logging
export class LoggerService {
  static logUserAction(userId: string, action: string, details?: any): void {
    logger.info('User Action', {
      userId,
      action,
      details,
      category: 'user_action'
    });
  }

  static logSecurityEvent(event: string, details: any): void {
    logger.warn('Security Event', {
      event,
      details,
      category: 'security'
    });
  }

  static logPaymentEvent(userId: string, paymentId: string, event: string, details?: any): void {
    logger.info('Payment Event', {
      userId,
      paymentId,
      event,
      details,
      category: 'payment'
    });
  }

  static logBlockchainEvent(transactionHash: string, event: string, details?: any): void {
    logger.info('Blockchain Event', {
      transactionHash,
      event,
      details,
      category: 'blockchain'
    });
  }

  static logKYCEvent(userId: string, documentId: string, event: string, details?: any): void {
    logger.info('KYC Event', {
      userId,
      documentId,
      event,
      details,
      category: 'kyc'
    });
  }

  static logAPIRequest(method: string, url: string, userId?: string, statusCode?: number): void {
    logger.info('API Request', {
      method,
      url,
      userId,
      statusCode,
      category: 'api_request'
    });
  }

  static logError(error: Error, context?: any): void {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context,
      category: 'error'
    });
  }

  static logDatabaseQuery(query: string, executionTime?: number): void {
    if (process.env.NODE_ENV === 'development' && process.env.LOG_DB_QUERIES === 'true') {
      logger.debug('Database Query', {
        query,
        executionTime,
        category: 'database'
      });
    }
  }
}

export default logger;