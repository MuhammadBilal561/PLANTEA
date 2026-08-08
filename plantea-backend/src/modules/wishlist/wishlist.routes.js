// =============================================================
// src/modules/wishlist/wishlist.routes.js
// Plantea — Wishlist Route Definitions
// =============================================================
// Responsibility: Map HTTP endpoints to wishlist controllers.
//
// SE Principle — Role-Based Access Control:
//   Only buyers can access wishlist endpoints. This is enforced
//   by checking req.user.role in middleware.
// =============================================================

const { Router } = require('express');
const wishlistController = require('./wishlist.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

const router = Router();

// Middleware to ensure only buyers can access wishlist
const requireBuyer = (req, res, next) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({
      success: false,
      message: 'Only buyers can access wishlist',
    });
  }
  next();
};

// All wishlist routes require authentication and buyer role
router.use(verifyToken);
router.use(requireBuyer);

// GET /api/wishlist - Get user's wishlist
router.get('/', wishlistController.getWishlist);

// POST /api/wishlist/:plantId - Add plant to wishlist
router.post('/:plantId', wishlistController.addToWishlist);

// DELETE /api/wishlist/:plantId - Remove plant from wishlist
router.delete('/:plantId', wishlistController.removeFromWishlist);

module.exports = router;
