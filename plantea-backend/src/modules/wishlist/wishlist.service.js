// =============================================================
// src/modules/wishlist/wishlist.service.js
// Plantea — Wishlist Business Logic
// =============================================================
// Responsibility: Handle wishlist operations for buyers.
//
// SE Principle — Role-Based Access:
//   Only buyers can manage wishlists. This is enforced at
//   the route level with middleware.
// =============================================================

const supabase = require('../../config/supabase');
const logger = require('../../utils/logger');

/**
 * Get user's wishlist with plant details.
 * 
 * @param {string} buyerId - Buyer's UUID
 * @returns {array} - Array of wishlist items with plant details
 */
const getWishlist = async (buyerId) => {
  const { data: wishlistItems, error } = await supabase
    .from('wishlists')
    .select(`
      id,
      plant_id,
      created_at,
      plants:plant_id (
        id,
        name,
        price_pkr,
        image_url,
        category,
        city,
        ai_verified,
        is_available,
        seller:seller_id (
          full_name
        )
      )
    `)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error(`Failed to fetch wishlist for buyer ${buyerId}:`, error.message);
    const err = new Error('Failed to fetch wishlist');
    err.statusCode = 500;
    throw err;
  }

  logger.info(`Wishlist fetched for buyer ${buyerId}: ${wishlistItems.length} items`);
  return wishlistItems || [];
};

/**
 * Add a plant to user's wishlist.
 * 
 * @param {string} buyerId - Buyer's UUID
 * @param {string} plantId - Plant's UUID
 * @returns {object} - { added: true } or { already: true }
 */
const addToWishlist = async (buyerId, plantId) => {
  // First, check if plant exists and is available
  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, is_available')
    .eq('id', plantId)
    .single();

  if (plantError || !plant) {
    const err = new Error('Plant not found');
    err.statusCode = 404;
    throw err;
  }

  if (!plant.is_available) {
    const err = new Error('This plant is no longer available');
    err.statusCode = 400;
    throw err;
  }

  // Try to insert into wishlist
  const { data, error } = await supabase
    .from('wishlists')
    .insert({
      buyer_id: buyerId,
      plant_id: plantId,
    })
    .select()
    .single();

  // Check for unique constraint violation (already in wishlist)
  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - already in wishlist
      logger.info(`Plant ${plantId} already in wishlist for buyer ${buyerId}`);
      return { already: true };
    }

    logger.error(`Failed to add to wishlist for buyer ${buyerId}:`, error.message);
    const err = new Error('Failed to add to wishlist');
    err.statusCode = 500;
    throw err;
  }

  logger.info(`Plant ${plantId} added to wishlist for buyer ${buyerId}`);
  return { added: true };
};

/**
 * Remove a plant from user's wishlist.
 * 
 * @param {string} buyerId - Buyer's UUID
 * @param {string} plantId - Plant's UUID
 * @returns {object} - Success message
 */
const removeFromWishlist = async (buyerId, plantId) => {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('buyer_id', buyerId)
    .eq('plant_id', plantId);

  if (error) {
    logger.error(`Failed to remove from wishlist for buyer ${buyerId}:`, error.message);
    const err = new Error('Failed to remove from wishlist');
    err.statusCode = 500;
    throw err;
  }

  logger.info(`Plant ${plantId} removed from wishlist for buyer ${buyerId}`);
  return { message: 'Removed from wishlist' };
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
