// =============================================================
// src/modules/payment/payment.routes.js
// Plantea — Payment Route Definitions
// =============================================================
// Responsibility: Map HTTP endpoints to payment controllers.
//
// Note: The callback endpoint does NOT require authentication
//   because it's called by JazzCash servers, not by the user.
// =============================================================

const { Router } = require('express');
const paymentController = require('./payment.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

const router = Router();

// POST /api/payments/jazzcash/initiate - Initiate payment (requires auth)
router.post('/jazzcash/initiate', verifyToken, paymentController.initiateJazzCashPayment);

// POST /api/payments/jazzcash/callback - Payment callback (no auth - called by JazzCash)
router.post('/jazzcash/callback', paymentController.handleJazzCashCallback);

module.exports = router;
