// =============================================================
// src/modules/coupons/coupons.routes.js
// Plantea — Promotions / Coupon Code Routes
// =============================================================

const { Router } = require('express');
const { body, param } = require('express-validator');
const couponsController = require('./coupons.controller');
const { verifyToken, allowRoles } = require('../../middleware/auth.middleware');

const router = Router();

const couponValidation = [
  body('code').trim().notEmpty().withMessage('Coupon code is required.'),
  body('type').optional().isIn(['percent', 'fixed']).withMessage('Invalid coupon type.'),
  body('value').isFloat({ min: 0.01 }).withMessage('Coupon value must be positive.'),
  body('usage_limit').optional().isInt({ min: 1 }).withMessage('Usage limit must be a positive integer.'),
];

// Any authenticated user can preview a coupon at checkout
router.post('/preview', verifyToken, couponsController.previewCoupon);

// Coupon management (seller/admin self-serve)
router.get('/',    verifyToken, allowRoles(['admin', 'seller']), couponsController.listCoupons);
router.post('/',   verifyToken, allowRoles(['admin', 'seller']), couponValidation, couponsController.createCoupon);
router.patch('/:id', verifyToken, allowRoles(['admin', 'seller']), couponsController.toggleCoupon);

module.exports = router;
