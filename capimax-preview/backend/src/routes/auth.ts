import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware, authRateLimit } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';

const router = express.Router();

// Validation middleware helper
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters'),
  body('role')
    .isIn(['investor', 'property_owner', 'broker'])
    .withMessage('Role must be one of: investor, property_owner, broker'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('country')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters')
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('twoFactorCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Two-factor code must be 6 digits')
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

// Reset password validation
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Email verification validation
const verifyEmailValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
];

// 2FA verification validation
const verify2FAValidation = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be 6 digits')
];

// Disable 2FA validation
const disable2FAValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Two-factor code must be 6 digits')
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Profile update validation
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('country')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid date of birth'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be between 1 and 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('State must be between 1 and 100 characters'),
  body('postalCode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Postal code must be between 1 and 20 characters')
];

// Refresh token validation
const refreshTokenValidation = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Public routes (no authentication required)

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimit(5, 15), // 5 attempts per 15 minutes
  registerValidation,
  handleValidationErrors,
  AuthController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit(5, 15), // 5 attempts per 15 minutes
  loginValidation,
  handleValidationErrors,
  AuthController.login
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  authRateLimit(3, 60), // 3 attempts per hour
  forgotPasswordValidation,
  handleValidationErrors,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  authRateLimit(5, 15), // 5 attempts per 15 minutes
  resetPasswordValidation,
  handleValidationErrors,
  AuthController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  verifyEmailValidation,
  handleValidationErrors,
  AuthController.verifyEmail
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  refreshTokenValidation,
  handleValidationErrors,
  AuthController.refreshToken
);

// Protected routes (authentication required)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, AuthController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, AuthController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authMiddleware,
  updateProfileValidation,
  handleValidationErrors,
  AuthController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authMiddleware,
  changePasswordValidation,
  handleValidationErrors,
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/enable-2fa
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post('/enable-2fa', authMiddleware, AuthController.enable2FA);

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify and complete 2FA setup
 * @access  Private
 */
router.post(
  '/verify-2fa',
  authMiddleware,
  verify2FAValidation,
  handleValidationErrors,
  AuthController.verify2FA
);

/**
 * @route   POST /api/auth/disable-2fa
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post(
  '/disable-2fa',
  authMiddleware,
  disable2FAValidation,
  handleValidationErrors,
  AuthController.disable2FA
);

export default router;