// =============================================================
// server.js
// Plantea — Backend Entry Point
// University of Engineering & Technology Lahore | IDEAL Labs
// CS 3rd Semester | Dr. Syed Khaldoon Khurshid
// =============================================================
// Responsibility: Initialize Express app, register all middleware
//   and routes, and start the HTTP server.
//
// SE Principle — Modular Architecture:
//   This file only wires things together. It does NOT contain
//   any business logic. Each module (auth, plants, orders,
//   scanner) is self-contained and imported here.
// =============================================================

require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

// Internal modules
const logger          = require('./src/utils/logger');
const ApiResponse     = require('./src/utils/ApiResponse');
const trackResponseTime = require('./src/middleware/responseTime.middleware');
const { globalErrorHandler, getErrorCount } = require('./src/middleware/error.middleware');
const { closeDb } = require('./src/config/db');

// Route modules — each module manages its own routes
const authRoutes    = require('./src/modules/auth/auth.routes');
const plantsRoutes  = require('./src/modules/plants/plants.routes');
const ordersRoutes  = require('./src/modules/orders/orders.routes');
const scannerRoutes = require('./src/modules/scanner/scanner.routes');
const usersRoutes = require('./src/modules/users/users.routes');
const wishlistRoutes = require('./src/modules/wishlist/wishlist.routes');
const notificationsRoutes = require('./src/modules/notifications/notifications.routes');
const paymentRoutes = require('./src/modules/payment/payment.routes');
const uploadsRoutes = require('./src/modules/uploads/uploads.routes');
const reviewsRoutes = require('./src/modules/reviews/reviews.routes');
const couponsRoutes = require('./src/modules/coupons/coupons.routes');
const gardenRoutes  = require('./src/modules/garden/garden.routes');
const analyticsRoutes = require('./src/modules/analytics/analytics.routes');
const adminRoutes   = require('./src/modules/admin/admin.routes');

const pkg = require('./package.json');

// ---------------------------------------------------------------
// App Initialization
// ---------------------------------------------------------------
const app  = express();
const PORT = process.env.PORT || 3000;

// Trust the first hop proxy (preview tunnels) so rate limiting correctly
// resolves the client IP from X-Forwarded-For instead of erroring out.
app.set('trust proxy', 1);

// ---------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------

// Helmet sets secure HTTP headers (XSS protection, no sniff, etc.)
app.use(helmet());

// CORS — the frontend uses an Authorization header, not cookies, so
// credentials are never required. Reflect origins only when running with
// a wildcard (mobile + preview tunnels); restrict when explicitly listed.
const allowedOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.includes('*')
    ? true // reflect any origin (mobile apps + preview tunnels)
    : allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: !allowedOrigins.includes('*'),
}));

// Per-request correlation ID (surfaces in logs and X-Request-Id header)
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// General rate limiting — prevents abuse across the whole API
// Limits: 600 requests per 15 minutes per IP (listings browsing is chatty)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
});
// Stricter limits on sensitive/expensive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // brute-force protection on login/OTP/password endpoints
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30, // uploads are large; bound them per IP
  message: { success: false, message: 'Upload limit reached. Please try again later.' },
  standardHeaders: true,
});

// Bypass rate limiting under test (supertest shares one IP; suites do many logins)
const noopLimiter = (req, res, next) => next();
app.use(process.env.NODE_ENV === 'test' ? noopLimiter : limiter);

// ---------------------------------------------------------------
// General Middleware
// ---------------------------------------------------------------

// Parse incoming JSON request bodies (limit prevents DoS)
app.use(express.json({ limit: '10mb' })); // 10mb to accommodate base64 plant images

// HTTP request logger — compact, includes correlation id
morgan.token('req-id', (req) => req.id || '-');
app.use(morgan(':method :url :status :response-time ms [:req-id]'));

// Custom response time tracker — adds X-Response-Time header
// This is our measurable PERFORMANCE metric (NFR: < 2s response)
app.use(trackResponseTime);

// ---------------------------------------------------------------
// Route Registration
// ---------------------------------------------------------------
// Convention: all API routes are prefixed with /api/

app.use('/api/auth',       process.env.NODE_ENV === 'test' ? noopLimiter : authLimiter, authRoutes);
app.use('/api/plants',     plantsRoutes);
app.use('/api/orders',     ordersRoutes);
app.use('/api/scanner',    scannerRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/wishlist',   wishlistRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/uploads',    process.env.NODE_ENV === 'test' ? noopLimiter : uploadLimiter, uploadsRoutes);
app.use('/api/reviews',    reviewsRoutes);
app.use('/api/coupons',    couponsRoutes);
app.use('/api/garden',     gardenRoutes);
app.use('/api/analytics',  analyticsRoutes);
app.use('/api/admin',      adminRoutes);

// ---------------------------------------------------------------
// Static files: uploaded plant images (with cache headers)
// ---------------------------------------------------------------
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  immutable: false,
}));

// ---------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------
app.get('/health', (req, res) => {
  return ApiResponse.success(res, {
    status:       'OK',
    service:      'Plantea Backend API',
    version:      pkg.version,
    database:     'SQLite (self-contained, free)',
    environment:  process.env.NODE_ENV,
    uptime_seconds: Math.floor(process.uptime()),
    metrics: {
      total_errors_this_session: getErrorCount(),
      response_time_header:      'X-Response-Time on every response',
      uptime_target:             '99% monthly',
    },
  }, 'Plantea API is running.');
});

// ---------------------------------------------------------------
// Static files: production web build of the frontend
// Served from the same origin as the API (single free deployment).
// ---------------------------------------------------------------
const fs = require('fs');
const frontendDist = path.join(__dirname, '..', 'plantea-frontend', 'dist');
const indexPath = path.join(frontendDist, 'index.html');

if (fs.existsSync(indexPath)) {
  app.use(express.static(frontendDist, { maxAge: '1h' }));
  // SPA fallback: serve index.html for any non-API GET route
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(indexPath);
  });
  logger.info(`Frontend: serving production build from ${frontendDist}`);
} else {
  logger.warn(`Frontend build not found at ${frontendDist} — API only mode. Run: cd plantea-frontend && npx expo export --platform web`);
}

// ---------------------------------------------------------------
// 404 Handler — Unknown Routes
// ---------------------------------------------------------------
app.use((req, res) => {
  const isApi = req.path.startsWith('/api/');
  return ApiResponse.error(
    res,
    isApi
      ? `API route '${req.method} ${req.path}' not found.`
      : `Route '${req.method} ${req.path}' not found.`,
    404
  );
});

// ---------------------------------------------------------------
// Global Error Handler (MUST be last)
// ---------------------------------------------------------------
app.use(globalErrorHandler);

// ---------------------------------------------------------------
// Process-level error handlers (never let the server die silently)
// ---------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err.stack);
});

// ---------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------
const os = require('os');

// Skip auto-listen + graceful-shutdown listeners when the app is imported
// for testing — supertest spins up the app in-process and force-exits.
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const nets = os.networkInterfaces();
    const localIP = Object.values(nets).flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'localhost';

    logger.info(`Plantea Backend v${pkg.version} running on port ${PORT}`);
    logger.info(`Local:   http://localhost:${PORT}`);
    logger.info(`Network: http://${localIP}:${PORT}`);
    logger.info(`Health:  http://localhost:${PORT}/health`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Database: SQLite (free, self-contained — no external accounts needed)');
  });

  // Graceful shutdown — close the HTTP server, then the database.
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      try { closeDb(); } catch (e) { /* ignore */ }
      logger.info('Shutdown complete.');
      process.exit(0);
    });
    // Force-exit if graceful close hangs (e.g. open keep-alive sockets)
    setTimeout(() => {
      logger.warn('Graceful shutdown timed out — forcing exit.');
      process.exit(1);
    }, 8000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app; // exported for testing with supertest
