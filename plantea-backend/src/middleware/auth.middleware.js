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

// Short-lived cache of { userId → {isActive, role} } to avoid a DB read on
// every request while still catching deactivated/deleted accounts quickly.
const userStateCache = new Map();
const USER_CACHE_TTL_MS = 60 * 1000;
const { get } = require('../config/db');

/**
 * Middleware: Verify JWT token on every protected route.
 * Verifies the signature AND that the user still exists and is active.
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

  let decoded;
  try {
    // Verify signature and decode payload
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Token expired or tampered with
    logger.warn('Invalid or expired token', err.message);
    return ApiResponse.error(res, 'Session expired. Please log in again.', 401);
  }

  // Confirm the user still exists and is active (fresh or cached)
  const cached = userStateCache.get(decoded.id);
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL_MS) {
    if (!cached.isActive) {
      return ApiResponse.error(res, 'Your account has been deactivated.', 403);
    }
    req.user = { ...decoded, role: cached.role };
    return next();
  }

  const user = get('SELECT id, role, is_active FROM users WHERE id = ?', [decoded.id]);
  if (!user) {
    return ApiResponse.error(res, 'Account no longer exists. Please log in again.', 401);
  }
  if (!user.is_active) {
    userStateCache.set(decoded.id, { isActive: false, role: user.role, timestamp: Date.now() });
    return ApiResponse.error(res, 'Your account has been deactivated.', 403);
  }
  userStateCache.set(decoded.id, { isActive: true, role: user.role, timestamp: Date.now() });
  req.user = { ...decoded, role: user.role };
  next();
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
