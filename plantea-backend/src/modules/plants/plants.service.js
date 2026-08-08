// =============================================================
// src/modules/plants/plants.service.js
// Plantea — Plant Listings Business Logic
// =============================================================
// Responsibility: All database operations related to plants.
//
// Modular Design:
//   This module handles ONLY plant listing logic. It does not
//   touch orders, riders, or auth. High cohesion — all functions
//   here relate to one concept: plant listings.
// =============================================================

const supabase = require('../../config/supabase');
const logger = require('../../utils/logger');


/**
 * Fetch a paginated list of available plants.
 * Supports filtering by city, category, and keyword search.
 *
 * @param {object} filters - { city, category, search, page, limit }
 * @returns {object} - { plants, total, page, totalPages }
 */
const getAllPlants = async ({ city, category, search, page = 1, limit = 20 } = {}) => {

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Start building the query — only show available plants
  let query = supabase
    .from('plants')
    .select(`
      id, name, scientific_name, description,
      price_pkr, stock_quantity, category, city,
      ai_verified, health_score, image_url,
      seller:profiles!seller_id (id, full_name, city)
    `, { count: 'exact' }) // 'exact' lets us get total count for pagination
    .eq('is_available', true)
    .gt('stock_quantity', 0) // exclude out of stock
    .order('created_at', { ascending: false }); // newest first

  // Apply optional filters only when provided
  if (city)     query = query.ilike('city', `%${city}%`);       // case-insensitive
  if (category) query = query.eq('category', category);
  if (search)   query = query.ilike('name', `%${search}%`);     // partial name search

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: plants, error, count } = await query;

  if (error) {
    logger.error('Failed to fetch plants', error.message);
    throw new Error('Could not retrieve plant listings.');
  }

  return {
    plants,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit),
  };
};


/**
 * Fetch a single plant by ID with full details.
 *
 * @param {string} plantId - UUID of the plant
 * @returns {object} - Plant with seller info and reviews
 */
const getPlantById = async (plantId) => {
  const { data: plant, error } = await supabase
    .from('plants')
    .select(`
      *,
      seller:profiles!seller_id (id, full_name, phone, city),
      reviews (id, rating, comment, created_at,
        buyer:profiles!buyer_id (full_name))
    `)
    .eq('id', plantId)
    .single();

  if (error || !plant) {
    const err = new Error('Plant not found.');
    err.statusCode = 404;
    throw err;
  }

  return plant;
};


/**
 * Create a new plant listing (sellers only).
 *
 * @param {string} sellerId  - ID of the authenticated seller
 * @param {object} plantData - Plant fields from request body
 * @returns {object} - Newly created plant record
 */
const createPlant = async (sellerId, plantData) => {
  const {
    name, scientific_name, description,
    price_pkr, stock_quantity, category, city, image_url
  } = plantData;

  const { data: plant, error } = await supabase
    .from('plants')
    .insert({
      seller_id: sellerId,  // taken from JWT, not user input — prevents spoofing
      name,
      scientific_name,
      description,
      price_pkr,
      stock_quantity: stock_quantity || 1,
      category,
      city: city || 'Lahore',
      image_url,
      ai_verified: false, // must go through scanner to become true
      is_available: true, // immediately available for browsing
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create plant listing', error.message);
    throw new Error('Could not create listing. Please try again.');
  }

  logger.info(`New plant listed: "${name}" by seller ${sellerId}`);
  return plant;
};


/**
 * Update a plant listing (seller can only update their own plants).
 *
 * @param {string} plantId  - UUID of the plant to update
 * @param {string} sellerId - Must match plant's seller_id
 * @param {object} updates  - Fields to update
 * @returns {object} - Updated plant record
 */
const updatePlant = async (plantId, sellerId, updates) => {
  // First verify ownership — seller cannot edit another seller's listing
  const { data: existing } = await supabase
    .from('plants')
    .select('id, seller_id')
    .eq('id', plantId)
    .single();

  if (!existing) {
    const err = new Error('Plant not found.');
    err.statusCode = 404;
    throw err;
  }

  if (existing.seller_id !== sellerId) {
    const err = new Error('You can only edit your own listings.');
    err.statusCode = 403;
    throw err;
  }

  // Whitelist allowed fields — prevents mass assignment vulnerability
  const safeUpdates = {};
  const allowedFields = [
    'name', 'scientific_name', 'description',
    'price_pkr', 'stock_quantity', 'category',
    'city', 'image_url', 'is_available'
  ];

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) safeUpdates[field] = updates[field];
  });

  const { data: updatedPlant, error } = await supabase
    .from('plants')
    .update(safeUpdates)
    .eq('id', plantId)
    .select()
    .single();

  if (error) throw new Error('Could not update listing.');

  return updatedPlant;
};


/**
 * Delete (soft-delete) a plant listing.
 * We set is_available = false instead of actually deleting,
 * because existing orders may reference this plant ID.
 *
 * @param {string} plantId  - UUID of the plant
 * @param {string} sellerId - Must match plant's seller_id
 */
const deletePlant = async (plantId, sellerId) => {
  const { data: existing } = await supabase
    .from('plants')
    .select('id, seller_id')
    .eq('id', plantId)
    .single();

  if (!existing) {
    const err = new Error('Plant not found.');
    err.statusCode = 404;
    throw err;
  }

  if (existing.seller_id !== sellerId) {
    const err = new Error('You can only delete your own listings.');
    err.statusCode = 403;
    throw err;
  }

  // Soft delete — preserve record for order history
  await supabase.from('plants').update({ is_available: false }).eq('id', plantId);

  logger.info(`Plant ${plantId} soft-deleted by seller ${sellerId}`);
};


/**
 * Fetch all plants listed by a specific seller (for seller dashboard).
 *
 * @param {string} sellerId - Seller's UUID
 * @returns {object[]} - Array of plant records
 */
const getPlantsBySeller = async (sellerId) => {
  const { data: plants, error } = await supabase
    .from('plants')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Could not fetch your listings.');

  return plants;
};


module.exports = {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  getPlantsBySeller,
};
