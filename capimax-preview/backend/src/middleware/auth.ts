import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { LoggerService } from '../utils/logger';
import { RedisCache } from '../config/redis';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
      userRole?: string;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    // Check if token is blacklisted
    const isBlacklisted = await RedisCache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Check if user exists and is active
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Check if user's password was changed after token was issued
    const passwordChangedAt = user.passwordChangedAt;
    if (passwordChangedAt && decoded.iat < Math.floor(passwordChangedAt.getTime() / 1000)) {
      throw new AuthenticationError('User recently changed password. Please log in again');
    }

    // Attach user data to request
    req.userId = user.id;
    req.user = user;
    req.userRole = user.role;

    // Log API request
    LoggerService.logAPIRequest(req.method, req.originalUrl, user.id);

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token has expired'));
    } else {
      next(error);
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.userRole)) {
      LoggerService.logSecurityEvent('unauthorized_access_attempt', {
        userId: req.userId,
        requiredRoles: roles,
        userRole: req.userRole,
        endpoint: req.originalUrl
      });
      
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
}

export function requireVerifiedKYC(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (req.user.kycStatus !== 'approved') {
    return next(new AuthorizationError('KYC verification required'));
  }

  next();
}

export function requireActive(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.user.isActive) {
    return next(new AuthorizationError('Account is not active'));
  }

  next();
}

export function require2FA(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.user.twoFactorEnabled) {
    return next(new AuthorizationError('Two-factor authentication required'));
  }

  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  
  if (!token) {
    return next();
  }

  // Try to authenticate but don't fail if token is invalid
  jwt.verify(token, process.env.JWT_SECRET!, async (err, decoded) => {
    if (err || !decoded) {
      return next();
    }

    try {
      const payload = decoded as JWTPayload;
      const user = await User.findByPk(payload.userId);
      
      if (user && user.isActive) {
        req.userId = user.id;
        req.user = user;
        req.userRole = user.role;
      }
    } catch (error) {
      // Silently fail for optional auth
    }

    next();
  });
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for token in query parameters (for WebSocket handshake)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

// Rate limiting for authentication endpoints
export function authRateLimit(maxAttempts: number = 5, windowMinutes: number = 15) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip;
    const key = `auth_attempts:${clientIP}`;
    
    try {
      const attempts = await RedisCache.incr(key);
      
      if (attempts === 1) {
        await RedisCache.expire(key, windowMinutes * 60);
      }
      
      if (attempts > maxAttempts) {
        LoggerService.logSecurityEvent('rate_limit_exceeded', {
          ip: clientIP,
          endpoint: req.originalUrl,
          attempts
        });
        
        throw new AuthenticationError(`Too many authentication attempts. Try again in ${windowMinutes} minutes.`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default authMiddleware;