// =============================================================
// src/middleware/auth.middleware.js
// Plantea — JWT Authentication & Role Guard Middleware
// =============================================================
// Responsibility: Verify identity and enforce role-based access.
//
// SE Principle — Separation of Concerns:
//   Authentication logic is NOT inside controllers. Controllers
//   handle business logic only. Auth is handled here, once,
//   and applied as a middleware layer to any route that needs it.
//
// How it works:
//   1. Client sends: Authorization: Bearer <token>
//   2. verifyToken decodes the JWT and attaches user to req
//   3. allowRoles(['seller']) blocks buyers and riders
// =============================================================

const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');

/**
 * Middleware: Verify JWT token on every protected route.
 * Attaches decoded user object to req.user for downstream use.
 */
const verifyToken = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    logger.warn('Access attempt with no token', req.path);
    return ApiResponse.error(res, 'Access denied. Please log in first.', 401);
  }

  try {
    // Verify signature and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user info to the request object
    // Downstream controllers can now read req.user.id, req.user.role
    req.user = decoded;
    next();

  } catch (err) {
    // Token expired or tampered with
    logger.warn('Invalid or expired token', err.message);
    return ApiResponse.error(res, 'Session expired. Please log in again.', 401);
  }
};

/**
 * Middleware factory: Restrict route to specific roles.
 * Usage: router.post('/list', verifyToken, allowRoles(['seller']), controller)
 *
 * @param {string[]} roles - Array of allowed roles e.g. ['seller', 'admin']
 */
const allowRoles = (roles) => {
  return (req, res, next) => {
    // req.user is set by verifyToken — must run after it
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Role '${req.user?.role}' tried to access ${req.path} (requires: ${roles})`);
      return ApiResponse.error(res, 'You do not have permission to perform this action.', 403);
    }
    next();
  };
};

module.exports = { verifyToken, allowRoles };
