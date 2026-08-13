// =============================================================
// src/modules/analytics/analytics.routes.js
// Plantea — Analytics Routes
// =============================================================

const { Router } = require('express');
const analyticsController = require('./analytics.controller');
const { verifyToken, allowRoles } = require('../../middleware/auth.middleware');

const router = Router();

router.get('/seller', verifyToken, allowRoles(['seller']), analyticsController.getSellerAnalytics);
router.get('/admin',  verifyToken, allowRoles(['admin']),  analyticsController.getAdminAnalytics);

module.exports = router;
