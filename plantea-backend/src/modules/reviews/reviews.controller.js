// =============================================================
// src/modules/reviews/reviews.controller.js
// Plantea — Reviews & Ratings HTTP Controller
// =============================================================

const { validationResult } = require('express-validator');
const reviewsService = require('./reviews.service');
const ApiResponse = require('../../utils/ApiResponse');
const createNotification = require('../../utils/createNotification');

/** POST /api/reviews — Buyer reviews a delivered order */
const createReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }

    const { review, sellerId, plantName } = await reviewsService.createReview(req.user.id, req.body);

    // Notify the seller their listing got a review (drives engagement)
    try {
      await createNotification(
        sellerId,
        'review_received',
        'New Review',
        `Your plant "${plantName}" received a ${review.rating}-star review.`
      );
    } catch (e) { /* notification is best-effort */ }

    return ApiResponse.success(res, { review }, 'Review submitted. Thank you!', 201);
  } catch (err) { next(err); }
};

/** POST /api/reviews/:id/reply — Seller replies to a review */
const replyToReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }

    const review = await reviewsService.replyToReview(req.params.id, req.user.id, req.body.reply);
    return ApiResponse.success(res, { review }, 'Reply posted.');
  } catch (err) { next(err); }
};

/** GET /api/reviews/seller/:sellerId — Reviews about a seller */
const getSellerReviews = async (req, res, next) => {
  try {
    const result = await reviewsService.getReviewsForSeller(req.params.sellerId);
    return ApiResponse.success(res, result, 'Seller reviews retrieved.');
  } catch (err) { next(err); }
};

module.exports = { createReview, replyToReview, getSellerReviews };
