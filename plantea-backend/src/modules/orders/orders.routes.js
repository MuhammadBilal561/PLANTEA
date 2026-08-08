// =============================================================
// src/modules/orders/orders.routes.js
// Plantea — Order Routes
// =============================================================

const { Router } = require('express');
const { body } = require('express-validator');
const ordersController = require('./orders.controller');
const { verifyToken, allowRoles } = require('../../middleware/auth.middleware');

const router = Router();

// All order routes require login
router.use(verifyToken);

const orderValidation = [
  body('plant_id').isUUID().withMessage('Valid plant ID is required.'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  body('delivery_address').trim().notEmpty().withMessage('Delivery address is required.'),
  body('payment_method')
    .optional()
    .isIn(['COD', 'EasyPaisa', 'JazzCash'])
    .withMessage('Invalid payment method.'),
];

router.post('/',                   allowRoles(['buyer']),                    orderValidation, ordersController.placeOrder);
router.get('/available',           allowRoles(['rider']),                    ordersController.getAvailableOrders);
router.get('/',                                                               ordersController.getMyOrders);
router.patch('/:id/status',        allowRoles(['seller', 'rider', 'buyer']), ordersController.updateStatus);
router.patch('/:id/assign-rider',  allowRoles(['rider']),                    ordersController.assignRider);

module.exports = router;
