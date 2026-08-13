// =============================================================
// src/modules/payment/payment.routes.js
// Plantea — Payment Route Definitions
// =============================================================

const { Router } = require('express');
const paymentController = require('./payment.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

const router = Router();

// GET /api/payments/methods — available payment methods (public)
router.get('/methods', paymentController.getPaymentMethods);

// POST /api/payments/jazzcash/initiate — optional JazzCash (auth required)
router.post('/jazzcash/initiate', verifyToken, paymentController.initiateJazzCashPayment);

// POST /api/payments/jazzcash/callback — called by JazzCash servers (no auth)
router.post('/jazzcash/callback', paymentController.handleJazzCashCallback);

module.exports = router;
