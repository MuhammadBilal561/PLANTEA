// =============================================================
// src/middleware/error.middleware.js
// Plantea — Global Error Handler & Quality Metrics Counter
// =============================================================
// Responsibility: Catch any unhandled error from any route/module.
// =============================================================

const logger = require('../utils/logger');
const ApiResponse = require('../utils/ApiResponse');

// In-memory error counter (for this session's quality metrics)
let errorCount = 0;

/**
 * Normalize an unknown thrown value into an Error-like object so the
 * handler never crashes on non-Error throws (strings, objects, etc.).
 */
const toError = (err) => {
  if (err instanceof Error) return err;
  if (typeof err === 'string') {
    const e = new Error(err);
    e.statusCode = 400;
    return e;
  }
  const e = new Error('An unexpected error occurred.');
  e.statusCode = 500;
  return e;
};

/**
 * Global error-handling middleware.
 * Express recognizes it as error middleware because it has 4 params: (err, req, res, next).
 * Must be registered LAST in server.js, after all routes.
 */
const globalErrorHandler = (err, req, res, next) => {
  const error = toError(err);
  errorCount++;

  // Log full error for developer visibility (with request id when present)
  const reqId = req.id ? `[req:${req.id}] ` : '';
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    // Real server errors — log the stack
    logger.error(`Unhandled error on ${req.method} ${req.path} | Total errors: ${errorCount} ${reqId}`, error.stack || error.message);
  } else {
    // Expected client errors (validation, not-found, auth) — log at debug level
    logger.debug(`Request error on ${req.method} ${req.path} (${statusCode}): ${error.message} ${reqId}`);
  }

  const message = statusCode < 500
    ? error.message                             // safe to show to client
    : 'An internal server error occurred.';    // hide internals in production

  // Pass through structured validation details (from express-validator)
  const payload = { errors: error.errors || null };

  return ApiResponse.error(res, message, statusCode, payload.errors);
};

/**
 * Export error count so it can be included in the /health endpoint.
 */
const getErrorCount = () => errorCount;

/**
 * Reusable 404 handler for unmatched API routes.
 */
const notFoundHandler = (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return ApiResponse.error(res, `Route not found: ${req.method} ${req.path}`, 404);
  }
  next(); // let the SPA fallback handle non-API routes
};

module.exports = { globalErrorHandler, getErrorCount, notFoundHandler };
