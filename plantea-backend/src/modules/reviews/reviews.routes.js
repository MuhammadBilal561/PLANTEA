// =============================================================
// src/modules/reviews/reviews.routes.js
// Plantea — Reviews & Ratings Routes
// =============================================================

const { Router } = require('express');
const { body, param } = require('express-validator');
const reviewsController = require('./reviews.controller');
const { verifyToken, allowRoles } = require('../../middleware/auth.middleware');

const router = Router();

const reviewValidation = [
  body('order_id').isUUID().withMessage('Valid order ID is required.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment is too long.'),
];

const replyValidation = [
  body('reply').trim().notEmpty().withMessage('Reply is required.').isLength({ max: 1000 }),
];

// Public: reviews about a seller (for seller profiles)
router.get('/seller/:sellerId', reviewsController.getSellerReviews);

// Protected: buyer writes a review; seller replies
router.post('/', verifyToken, allowRoles(['buyer']), reviewValidation, reviewsController.createReview);
router.post('/:id/reply', verifyToken, allowRoles(['seller']), replyValidation, reviewsController.replyToReview);

module.exports = router;
