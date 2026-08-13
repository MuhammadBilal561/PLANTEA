// =============================================================
// src/modules/wishlist/wishlist.controller.js
// Plantea — Wishlist HTTP Controller
// =============================================================
// Responsibility: Handle HTTP request/response for wishlist routes.
// =============================================================

const wishlistService = require('./wishlist.service');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * GET /api/wishlist
 * Get user's wishlist.
 */
const getWishlist = async (req, res, next) => {
  try {
    const wishlistItems = await wishlistService.getWishlist(req.user.id);
    
    return ApiResponse.success(res, { wishlist: wishlistItems }, 'Wishlist fetched successfully');

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/wishlist/:plantId
 * Add a plant to wishlist.
 */
const addToWishlist = async (req, res, next) => {
  try {
    const { plantId } = req.params;
    
    const result = await wishlistService.addToWishlist(req.user.id, plantId);
    
    if (result.already) {
      return ApiResponse.success(res, result, 'Plant is already in your wishlist');
    }
    
    return ApiResponse.success(res, result, 'Added to wishlist', 201);

  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/wishlist/:plantId
 * Remove a plant from wishlist.
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const { plantId } = req.params;
    
    const result = await wishlistService.removeFromWishlist(req.user.id, plantId);
    
    return ApiResponse.success(res, {}, result.message);

  } catch (err) {
    next(err);
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
