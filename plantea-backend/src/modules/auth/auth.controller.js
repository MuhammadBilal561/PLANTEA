// =============================================================
// src/modules/auth/auth.controller.js
// Plantea — Authentication HTTP Controller
// =============================================================
// Responsibility: Handle HTTP request/response for auth routes.
//
// SE Principle — Thin Controller:
//   This controller does NOT contain business logic.
//   It only: validates input → calls service → returns response.
//   All real work is in auth.service.js.
//
//   This is a refactored version of the "God Function" code smell
//   where one function did everything (read input, process logic,
//   talk to DB, and format response).
// =============================================================

const { validationResult } = require('express-validator');
const authService = require('./auth.service');
const ApiResponse = require('../../utils/ApiResponse');
const logger = require('../../utils/logger');


/**
 * POST /api/auth/register
 * Register a new user (buyer, seller, or rider).
 */
const register = async (req, res, next) => {
  try {
    // Check validation errors from express-validator rules (defined in routes)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }

    // Delegate all logic to the service layer
    const result = await authService.registerUser(req.body);

    return ApiResponse.success(res, result, 'Registration successful. Welcome to Plantea!', 201);

  } catch (err) {
    // Pass to global error handler (error.middleware.js)
    next(err);
  }
};


/**
 * POST /api/auth/login
 * Login and receive a JWT token.
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }

    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    return ApiResponse.success(res, result, 'Login successful.');

  } catch (err) {
    next(err);
  }
};


/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 * Protected route — requires valid JWT (verifyToken middleware).
 */
const getMe = async (req, res) => {
  // req.user is attached by verifyToken middleware
  return ApiResponse.success(res, req.user, 'Profile fetched successfully.');
};


/**
 * POST /api/auth/forgot-password
 * Send OTP to user's email for password reset.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ApiResponse.error(res, 'Email is required.', 400);
    }

    const result = await authService.forgotPassword(email);

    return ApiResponse.success(res, {}, result.message);

  } catch (err) {
    next(err);
  }
};


/**
 * POST /api/auth/verify-otp
 * Verify OTP code and return reset token.
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return ApiResponse.error(res, 'Email and OTP are required.', 400);
    }

    const result = await authService.verifyOtp(email, otp);

    return ApiResponse.success(res, result, 'OTP verified');

  } catch (err) {
    next(err);
  }
};


/**
 * POST /api/auth/reset-password
 * Reset user's password using reset token.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { reset_token, new_password } = req.body;

    if (!reset_token || !new_password) {
      return ApiResponse.error(res, 'Reset token and new password are required.', 400);
    }

    const result = await authService.resetPassword(reset_token, new_password);

    return ApiResponse.success(res, {}, result.message);

  } catch (err) {
    next(err);
  }
};


module.exports = { register, login, getMe, forgotPassword, verifyOtp, resetPassword };
