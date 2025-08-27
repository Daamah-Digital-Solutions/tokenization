import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { User } from '../models/User';
import { KYCDocument } from '../models/KYCDocument';
import { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  ConflictError,
  asyncHandler 
} from '../middleware/errorHandler';
import { LoggerService } from '../utils/logger';
import { RedisCache, SessionStore } from '../config/redis';
import { EmailService } from '../services/EmailService';
import { NotificationService } from '../services/NotificationService';
import { UserRole, KYCStatus, APIResponse } from '../types';

export class AuthController {
  // Register new user
  static register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, first_name, last_name, role, phone, country } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await User.createUser({
      email,
      password,
      firstName: first_name,
      lastName: last_name,
      role: role as UserRole,
      phone,
      country
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await EmailService.sendVerificationEmail(user.email, user.firstName, verificationToken);

    LoggerService.logUserAction(user.id, 'user_registered', {
      email: user.email,
      role: user.role
    });

    const response: APIResponse = {
      success: true,
      data: {
        message: 'Registration successful. Please check your email to verify your account.',
        user: user.toSafeJSON()
      }
    };

    res.status(201).json(response);
  });

  // Login user
  static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, twoFactorCode } = req.body;

    // Find user and check if account is locked
    const user = await User.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.isLocked) {
      LoggerService.logSecurityEvent('login_attempt_locked_account', {
        email,
        userId: user.id,
        ip: req.ip
      });
      throw new AuthenticationError('Account is temporarily locked due to too many failed login attempts');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      LoggerService.logSecurityEvent('failed_login_attempt', {
        email,
        userId: user.id,
        ip: req.ip,
        attempts: user.loginAttempts
      });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is disabled');
    }

    // Check email verification
    if (!user.isVerified) {
      throw new AuthenticationError('Please verify your email address before logging in');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new AuthenticationError('Two-factor authentication code required');
      }

      const isValidTOTP = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!isValidTOTP) {
        LoggerService.logSecurityEvent('invalid_2fa_attempt', {
          userId: user.id,
          ip: req.ip
        });
        throw new AuthenticationError('Invalid two-factor authentication code');
      }
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = await AuthController.generateTokens(user);

    // Store refresh token in Redis
    await RedisCache.set(
      `refresh_token:${user.id}`,
      tokens.refresh_token,
      7 * 24 * 60 * 60 // 7 days
    );

    LoggerService.logUserAction(user.id, 'user_logged_in', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const response: APIResponse = {
      success: true,
      data: {
        user: user.toSafeJSON(),
        tokens
      }
    };

    res.status(200).json(response);
  });

  // Logout user
  static logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { authorization } = req.headers;
    const token = authorization?.replace('Bearer ', '');
    const userId = req.userId;

    if (token && userId) {
      // Blacklist the current token
      await RedisCache.set(`blacklist:${token}`, 'true', 15 * 60); // 15 minutes (token expiry)
      
      // Remove refresh token
      await RedisCache.del(`refresh_token:${userId}`);

      LoggerService.logUserAction(userId, 'user_logged_out');
    }

    const response: APIResponse = {
      success: true,
      data: { message: 'Logout successful' }
    };

    res.status(200).json(response);
  });

  // Refresh access token
  static refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new AuthenticationError('Refresh token required');
    }

    try {
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET!) as any;
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Check if refresh token exists in Redis
      const storedToken = await RedisCache.get(`refresh_token:${user.id}`);
      if (storedToken !== refresh_token) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await AuthController.generateTokens(user);

      // Update refresh token in Redis
      await RedisCache.set(
        `refresh_token:${user.id}`,
        tokens.refresh_token,
        7 * 24 * 60 * 60
      );

      const response: APIResponse = {
        success: true,
        data: { tokens }
      };

      res.status(200).json(response);
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  });

  // Forgot password
  static forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist for security
      const response: APIResponse = {
        success: true,
        data: { message: 'If an account with that email exists, a password reset link has been sent.' }
      };
      res.status(200).json(response);
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email
    await EmailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

    LoggerService.logUserAction(user.id, 'password_reset_requested', {
      ip: req.ip
    });

    const response: APIResponse = {
      success: true,
      data: { message: 'Password reset link has been sent to your email.' }
    };

    res.status(200).json(response);
  });

  // Reset password
  static resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;

    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Update password
    await user.setPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    LoggerService.logUserAction(user.id, 'password_reset_completed', {
      ip: req.ip
    });

    const response: APIResponse = {
      success: true,
      data: { message: 'Password has been reset successfully.' }
    };

    res.status(200).json(response);
  });

  // Verify email
  static verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired verification token');
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    LoggerService.logUserAction(user.id, 'email_verified');

    const response: APIResponse = {
      success: true,
      data: { message: 'Email verified successfully.' }
    };

    res.status(200).json(response);
  });

  // Enable 2FA
  static enable2FA = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new ConflictError('Two-factor authentication is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Capimax (${user.email})`,
      issuer: 'Capimax Real Estate',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (user needs to verify before enabling)
    await RedisCache.set(`2fa_setup:${userId}`, secret.base32, 10 * 60); // 10 minutes

    LoggerService.logUserAction(userId, '2fa_setup_initiated');

    const response: APIResponse = {
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: [] // TODO: Generate backup codes
      }
    };

    res.status(200).json(response);
  });

  // Verify and complete 2FA setup
  static verify2FA = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { code } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get temporary secret
    const tempSecret = await RedisCache.get(`2fa_setup:${userId}`);
    if (!tempSecret) {
      throw new AuthenticationError('2FA setup session expired. Please start again.');
    }

    // Verify TOTP code
    const isValid = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!isValid) {
      throw new AuthenticationError('Invalid verification code');
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorSecret = tempSecret;
    await user.save();

    // Remove temporary secret
    await RedisCache.del(`2fa_setup:${userId}`);

    LoggerService.logUserAction(userId, '2fa_enabled');

    const response: APIResponse = {
      success: true,
      data: { message: 'Two-factor authentication has been enabled successfully.' }
    };

    res.status(200).json(response);
  });

  // Disable 2FA
  static disable2FA = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { password, code } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password');
    }

    // Verify 2FA code
    const isValidTOTP = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!isValidTOTP) {
      throw new AuthenticationError('Invalid two-factor authentication code');
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    LoggerService.logUserAction(userId, '2fa_disabled');

    const response: APIResponse = {
      success: true,
      data: { message: 'Two-factor authentication has been disabled.' }
    };

    res.status(200).json(response);
  });

  // Get current user profile
  static getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    
    const user = await User.findByPk(userId, {
      include: [{
        model: KYCDocument,
        as: 'kycDocuments',
        attributes: ['id', 'documentType', 'status', 'createdAt']
      }]
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const response: APIResponse = {
      success: true,
      data: {
        user: user.toSafeJSON()
      }
    };

    res.status(200).json(response);
  });

  // Update user profile
  static updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const updates = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Define allowed update fields
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'country', 'dateOfBirth',
      'address', 'city', 'state', 'postalCode'
    ];

    // Filter updates to only allowed fields
    const filteredUpdates: any = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Update user
    await user.update(filteredUpdates);

    LoggerService.logUserAction(userId, 'profile_updated', filteredUpdates);

    const response: APIResponse = {
      success: true,
      data: {
        user: user.toSafeJSON(),
        message: 'Profile updated successfully'
      }
    };

    res.status(200).json(response);
  });

  // Change password
  static changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Update password
    await user.setPassword(newPassword);
    await user.save();

    // Invalidate all existing sessions
    await RedisCache.del(`refresh_token:${userId}`);

    LoggerService.logUserAction(userId, 'password_changed', {
      ip: req.ip
    });

    const response: APIResponse = {
      success: true,
      data: { message: 'Password changed successfully. Please log in again.' }
    };

    res.status(200).json(response);
  });

  // Helper method to generate JWT tokens
  private static async generateTokens(user: User): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRE || '15m'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 15 * 60 // 15 minutes in seconds
    };
  }
}