const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const {
  login,
  register,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
} = require('../controllers/authController');

// Public routes
router.post(
  '/login',
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Private routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

// HR only routes
router.post(
  '/register',
  protect,
  authorize('HR_ADMIN'),
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('department').notEmpty().withMessage('Department is required'),
  ],
  register
);

module.exports = router;