import { Request, Response, NextFunction } from 'express';
import logger, { LoggerService } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class InternalServerError extends CustomError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let error = { ...err };
  error.message = err.message;

  // Log error
  LoggerService.logError(err, {
    url: req.url,
    method: req.method,
    userId: (req as any).userId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = 'Validation Error';
    const details = (err as any).errors?.map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    error = new ValidationError(message, details);
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    error = new ConflictError(message);
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again';
    error = new AuthenticationError(message);
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again';
    error = new AuthenticationError(message);
  }

  // Multer error (file upload)
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    }
    error = new ValidationError(message);
  }

  // Set default values
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_ERROR';

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      code: errorCode,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    },
    request_id: (req as any).requestId || req.headers['x-request-id']
  };

  // Add validation details if present
  if (error.details) {
    errorResponse.error.details = error.details;
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error.message = 'Something went wrong!';
  }

  res.status(statusCode).json(errorResponse);
}

// Async error handler wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default errorHandler;