// =============================================================
// src/modules/wishlist/wishlist.service.js
// Plantea — Wishlist Business Logic
// =============================================================
// Responsibility: Wishlist operations for buyers (SQLite-backed).
// =============================================================

const { query, get, run, uuid } = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Get user's wishlist with plant details.
 */
const getWishlist = async (buyerId) => {
  const items = query(
    `SELECT w.id, w.plant_id, w.created_at,
            p.id AS plant_id, p.name, p.price_pkr, p.image_url, p.category, p.city,
            p.ai_verified, p.is_available, p.stock_quantity,
            u.full_name AS seller_name
     FROM wishlists w
     JOIN plants p ON p.id = w.plant_id
     LEFT JOIN users u ON u.id = p.seller_id
     WHERE w.buyer_id = ?
     ORDER BY w.created_at DESC`,
    [buyerId]
  );

  logger.info(`Wishlist fetched for buyer ${buyerId}: ${items.length} items`);
  return items || [];
};

/**
 * Add a plant to user's wishlist.
 * @returns {object} - { added: true } or { already: true }
 */
const addToWishlist = async (buyerId, plantId) => {
  const plant = get('SELECT id, is_available FROM plants WHERE id = ?', [plantId]);
  if (!plant) {
    const err = new Error('Plant not found');
    err.statusCode = 404;
    throw err;
  }
  if (!plant.is_available) {
    const err = new Error('This plant is no longer available');
    err.statusCode = 400;
    throw err;
  }

  const existing = get(
    'SELECT id FROM wishlists WHERE buyer_id = ? AND plant_id = ?',
    [buyerId, plantId]
  );
  if (existing) {
    logger.info(`Plant ${plantId} already in wishlist for buyer ${buyerId}`);
    return { already: true };
  }

  run('INSERT INTO wishlists (id, buyer_id, plant_id) VALUES (?, ?, ?)', [uuid(), buyerId, plantId]);
  logger.info(`Plant ${plantId} added to wishlist for buyer ${buyerId}`);
  return { added: true };
};

/**
 * Remove a plant from user's wishlist.
 */
const removeFromWishlist = async (buyerId, plantId) => {
  run('DELETE FROM wishlists WHERE buyer_id = ? AND plant_id = ?', [buyerId, plantId]);
  logger.info(`Plant ${plantId} removed from wishlist for buyer ${buyerId}`);
  return { message: 'Removed from wishlist' };
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
