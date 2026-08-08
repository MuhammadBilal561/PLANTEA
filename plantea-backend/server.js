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
//
//   Changing a module never requires editing this file.
//   Adding a new module only requires 2 lines here.
// =============================================================

require('dotenv').config();

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

// Route modules — each module manages its own routes
const authRoutes    = require('./src/modules/auth/auth.routes');
const plantsRoutes  = require('./src/modules/plants/plants.routes');
const ordersRoutes  = require('./src/modules/orders/orders.routes');
const scannerRoutes = require('./src/modules/scanner/scanner.routes');
const usersRoutes = require('./src/modules/users/users.routes');
const wishlistRoutes = require('./src/modules/wishlist/wishlist.routes');
const notificationsRoutes = require('./src/modules/notifications/notifications.routes');
const paymentRoutes = require('./src/modules/payment/payment.routes');

// ---------------------------------------------------------------
// App Initialization
// ---------------------------------------------------------------
const app  = express();
// Trigger restart
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------

// Helmet sets secure HTTP headers (XSS protection, no sniff, etc.)
app.use(helmet());

// CORS — allow requests from the React Native mobile app
// In production, replace '*' with your actual frontend domain
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://plantea.app'  // replace with actual domain
    : '*',                   // allow all in development
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — prevent brute force and abuse
// Limits: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
});
app.use(limiter);

// ---------------------------------------------------------------
// General Middleware
// ---------------------------------------------------------------

// Parse incoming JSON request bodies (limit prevents DoS)
app.use(express.json({ limit: '10mb' })); // 10mb to accommodate base64 plant images

// HTTP request logger — shows method, URL, status, response time
// 'dev' format: GET /api/plants 200 45ms
app.use(morgan('dev'));

// Custom response time tracker — adds X-Response-Time header
// This is our measurable PERFORMANCE metric (NFR: < 2s response)
app.use(trackResponseTime);

// ---------------------------------------------------------------
// Route Registration
// ---------------------------------------------------------------
// Convention: all API routes are prefixed with /api/
// This clearly separates API from any future static file serving

app.use('/api/auth',    authRoutes);    // POST /api/auth/register, /login, /me
app.use('/api/plants',  plantsRoutes);  // CRUD for plant listings
app.use('/api/orders',  ordersRoutes);  // Order lifecycle management
app.use('/api/scanner', scannerRoutes); // AI plant identification
app.use('/api/users', usersRoutes);     // User profile management
app.use('/api/wishlist', wishlistRoutes); // Wishlist management
app.use('/api/notifications', notificationsRoutes); // Notifications
app.use('/api/payments', paymentRoutes); // Payment processing


// ---------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------
// Used by deployment platforms and reviewers to verify the server
// is running. Also surfaces our quality metrics.

app.get('/health', (req, res) => {
  return ApiResponse.success(res, {
    status:       'OK',
    service:      'Plantea Backend API',
    version:      '1.0.0',
    environment:  process.env.NODE_ENV,
    uptime_seconds: Math.floor(process.uptime()),
    // Quality metrics — measurable indicators for SE evaluation
    metrics: {
      total_errors_this_session: getErrorCount(),  // Error Count metric
      response_time_header:      'X-Response-Time on every response',
      uptime_target:             '99% monthly',
    },
  }, 'Plantea API is running.');
});


// ---------------------------------------------------------------
// 404 Handler — Unknown Routes
// ---------------------------------------------------------------
app.use((req, res) => {
  return ApiResponse.error(
    res,
    `Route '${req.method} ${req.path}' not found. Check the API documentation.`,
    404
  );
});


// ---------------------------------------------------------------
// Global Error Handler (MUST be last)
// ---------------------------------------------------------------
app.use(globalErrorHandler);


// ---------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------
const os = require('os');

app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const localIP = Object.values(nets).flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'localhost';
  
  logger.info(`🌿 Plantea Backend running on port ${PORT}`);
  logger.info(`Local:   http://localhost:${PORT}`);
  logger.info(`Network: http://${localIP}:${PORT}  ← open this on your phone`);
  logger.info(`Health:  http://${localIP}:${PORT}/health`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Modules loaded: Auth | Plants | Orders | Scanner');
});

module.exports = app; // exported for testing with supertest
