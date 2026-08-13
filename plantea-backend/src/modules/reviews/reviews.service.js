// =============================================================
// src/modules/reviews/reviews.service.js
// Plantea — Reviews & Ratings Business Logic
// =============================================================
// Responsibility: Write reviews for delivered orders, seller replies,
//   and rating aggregates. Reviews drive marketplace trust.
// =============================================================

const { query, get, run, uuid } = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Create a review for a delivered order (buyer only, once per order).
 * Only the order's buyer can review; only delivered orders can be reviewed.
 */
const createReview = async (buyerId, { order_id, rating, comment }) => {
  const order = get(
    `SELECT o.id, o.buyer_id, o.status, o.plant_id, p.name AS plant_name,
            p.seller_id, u.full_name AS seller_name
     FROM orders o
     JOIN plants p ON p.id = o.plant_id
     JOIN users u ON u.id = p.seller_id
     WHERE o.id = ?`,
    [order_id]
  );

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  if (order.buyer_id !== buyerId) {
    const err = new Error('You can only review your own orders.');
    err.statusCode = 403;
    throw err;
  }

  if (order.status !== 'delivered') {
    const err = new Error('Only delivered orders can be reviewed.');
    err.statusCode = 400;
    throw err;
  }

  const existing = get(
    'SELECT id FROM reviews WHERE order_id = ? AND buyer_id = ?',
    [order_id, buyerId]
  );
  if (existing) {
    const err = new Error('You have already reviewed this order.');
    err.statusCode = 409;
    throw err;
  }

  const id = uuid();
  run(
    `INSERT INTO reviews
       (id, order_id, buyer_id, plant_id, rating, comment, is_verified_purchase)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [id, order_id, buyerId, order.plant_id, rating, comment || null]
  );

  const review = get('SELECT * FROM reviews WHERE id = ?', [id]);
  logger.info(`Review added: order ${order_id} rating ${rating} by buyer ${buyerId}`);

  return { review, sellerId: order.seller_id, plantName: order.plant_name };
};

/**
 * Seller replies to a review on their own plant.
 */
const replyToReview = async (reviewId, sellerId, reply) => {
  const review = get(
    `SELECT r.id, r.seller_reply, p.seller_id
     FROM reviews r
     JOIN plants p ON p.id = r.plant_id
     WHERE r.id = ?`,
    [reviewId]
  );

  if (!review) {
    const err = new Error('Review not found.');
    err.statusCode = 404;
    throw err;
  }

  if (review.seller_id !== sellerId) {
    const err = new Error('You can only reply to reviews on your own listings.');
    err.statusCode = 403;
    throw err;
  }

  run(
    `UPDATE reviews SET seller_reply = ?, seller_replied_at = ? WHERE id = ?`,
    [reply, new Date().toISOString(), reviewId]
  );

  return get('SELECT * FROM reviews WHERE id = ?', [reviewId]);
};

/**
 * Get reviews for a seller (used on seller profile / listings).
 */
const getReviewsForSeller = async (sellerId) => {
  const reviews = query(
    `SELECT r.id, r.rating, r.comment, r.is_verified_purchase,
            r.seller_reply, r.seller_replied_at, r.created_at,
            p.name AS plant_name, p.image_url AS plant_image,
            u.full_name AS buyer_name
     FROM reviews r
     JOIN plants p ON p.id = r.plant_id
     JOIN users u ON u.id = r.buyer_id
     WHERE p.seller_id = ?
     ORDER BY r.created_at DESC
     LIMIT 200`,
    [sellerId]
  );

  const agg = get(
    `SELECT ROUND(AVG(r.rating), 1) AS avg, COUNT(*) AS count
     FROM reviews r JOIN plants p ON p.id = r.plant_id
     WHERE p.seller_id = ?`,
    [sellerId]
  ) || { avg: null, count: 0 };

  return {
    reviews,
    rating_avg: agg.avg,
    rating_count: agg.count,
  };
};

module.exports = { createReview, replyToReview, getReviewsForSeller };
