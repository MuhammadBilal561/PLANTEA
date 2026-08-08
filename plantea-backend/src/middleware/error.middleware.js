// =============================================================
// src/middleware/error.middleware.js
// Plantea — Global Error Handler & Quality Metrics Counter
// =============================================================
// Responsibility: Catch any unhandled error from any route/module.
//
// Software Quality Metric — Error Count:
//   This middleware counts every server error (5xx). That count
//   is our "error rate" quality metric. Low error count = high
//   reliability. This is a measurable engineering health indicator.
//
// SE Principle — Don't Repeat Yourself (DRY):
//   Without this, every controller needs a try/catch. With this,
//   controllers can call next(err) and this handles the rest.
// =============================================================

const logger = require('../utils/logger');
const ApiResponse = require('../utils/ApiResponse');

// In-memory error counter (for this session's quality metrics)
// In production, this would be pushed to a monitoring service
let errorCount = 0;

/**
 * Global error-handling middleware.
 * Express recognizes it as error middleware because it has 4 params: (err, req, res, next).
 * Must be registered LAST in server.js, after all routes.
 */
const globalErrorHandler = (err, req, res, next) => {
  errorCount++; // increment quality metric

  // Log full error for developer visibility
  logger.error(`Unhandled error on ${req.method} ${req.path} | Total errors: ${errorCount}`, err.message);

  // Determine if this is a known operational error (e.g. validation)
  // or an unexpected programming error
  const statusCode = err.statusCode || 500;
  const message = statusCode < 500
    ? err.message                             // safe to show to client
    : 'An internal server error occurred.';  // hide internals in production

  return ApiResponse.error(res, message, statusCode);
};

/**
 * Export error count so it can be included in the /health endpoint.
 * This surfaces the metric for quality evaluation.
 */
const getErrorCount = () => errorCount;

module.exports = { globalErrorHandler, getErrorCount };
