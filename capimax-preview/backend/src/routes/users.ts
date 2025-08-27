import express from 'express';
import { requireRole } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile (handled by auth routes)
 * @access  Private
 */

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private/Admin
 */
router.get('/:id', requireRole(UserRole.ADMIN), (req, res) => {
  res.json({ message: 'Get user by ID - Coming soon' });
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
router.put('/:id/role', requireRole(UserRole.ADMIN), (req, res) => {
  res.json({ message: 'Update user role - Coming soon' });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete('/:id', requireRole(UserRole.ADMIN), (req, res) => {
  res.json({ message: 'Delete user - Coming soon' });
});

/**
 * @route   GET /api/users/search
 * @desc    Search users (admin only)
 * @access  Private/Admin
 */
router.get('/search', requireRole(UserRole.ADMIN), (req, res) => {
  res.json({ message: 'Search users - Coming soon' });
});

export default router;