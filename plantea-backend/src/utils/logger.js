// =============================================================
// src/utils/logger.js
// Plantea — Lightweight Structured Logger
// =============================================================
// Responsibility: Provide consistent, labeled log output.
//
// Software Quality — Metrics Visibility:
//   Structured logs feed into analytics. We can count error
//   frequency, measure which modules fail most, and track
//   system health over time. This is our "error count" metric.
//
// SE Principle — Single Responsibility:
//   All logging logic lives here. No module calls console.log
//   directly — they all call logger. Changing log format means
//   changing only this one file.
// =============================================================

const logger = {

  /**
   * General informational log (green)
   * Use for: server start, successful operations
   */
  info: (message, context = '') => {
    console.log(`\x1b[32m[INFO]\x1b[0m  [${new Date().toISOString()}] ${message}`, context || '');
  },

  /**
   * Warning log (yellow)
   * Use for: deprecated usage, retries, non-critical issues
   */
  warn: (message, context = '') => {
    console.warn(`\x1b[33m[WARN]\x1b[0m  [${new Date().toISOString()}] ${message}`, context || '');
  },

  /**
   * Error log (red) — increments error count metric
   * Use for: caught exceptions, DB failures, API errors
   */
  error: (message, error = '') => {
    console.error(`\x1b[31m[ERROR]\x1b[0m [${new Date().toISOString()}] ${message}`, error || '');
  },

  /**
   * Debug log (grey) — shown only in development
   * Use for: detailed tracing during development
   */
  debug: (message, data = '') => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\x1b[90m[DEBUG]\x1b[0m [${new Date().toISOString()}] ${message}`, data || '');
    }
  },

};

module.exports = logger;
