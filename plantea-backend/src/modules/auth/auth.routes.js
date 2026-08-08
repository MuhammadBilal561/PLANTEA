// =============================================================
// src/modules/auth/auth.routes.js
// Plantea — Authentication Route Definitions
// =============================================================
// Responsibility: Map HTTP endpoints to controllers + validators.
//
// SE Principle — Input Validation at Boundary:
//   Validation happens at the API entry point, before any
//   business logic runs. This prevents malformed data from
//   reaching the database — a security and quality practice.
// =============================================================

const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('./auth.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

const router = Router();

// ------------------------------------------------------------------
// Validation Rules
// Defined here as arrays so they can be reused or imported in tests
// ------------------------------------------------------------------

const registerValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be 3–100 characters.'),

  body('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Please provide a valid email address.'),

  body('phone')
    .trim()
    .matches(/^03[0-9]{9}$/).withMessage('Phone must be a valid Pakistani number (03XXXXXXXXX).'),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),

  body('role')
    .isIn(['buyer', 'seller', 'rider']).withMessage('Role must be buyer, seller, or rider.'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 60 }).withMessage('City name too long.'),
];

const loginValidation = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Valid email is required.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];


// ------------------------------------------------------------------
// Route Definitions
// ------------------------------------------------------------------

// POST /api/auth/register
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login
router.post('/login', loginValidation, authController.login);

// GET /api/auth/me   (protected — must be logged in)
router.get('/me', verifyToken, authController.getMe);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);


module.exports = router;
