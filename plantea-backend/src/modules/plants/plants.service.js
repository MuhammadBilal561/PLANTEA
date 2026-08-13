// =============================================================
// src/modules/plants/plants.service.js
// Plantea — Plant Listings Business Logic
// =============================================================
// Responsibility: All database operations related to plants,
//   backed by SQLite. High cohesion — plants only.
// =============================================================

const { query, get, run, uuid } = require('../../config/db');
const logger = require('../../utils/logger');

// Columns always selected for plant cards / lists.
const PLANT_COLUMNS = `
  p.id, p.name, p.scientific_name, p.description,
  p.price_pkr, p.original_price_pkr, p.discount_pct,
  p.stock_quantity, p.category, p.city,
  p.ai_verified, p.health_score, p.image_url, p.is_available,
  p.is_organic, p.care_level, p.featured, p.views_count, p.sold_count,
  p.created_at,
  u.id AS seller_id, u.full_name AS seller_full_name, u.city AS seller_city,
  u.is_verified AS seller_is_verified`;

/** Map a raw plant row into the public API shape. */
const toPublicPlant = (p) => {
  if (!p) return null;
  return {
    ...p,
    seller: p.seller_id
      ? {
          id: p.seller_id,
          full_name: p.seller_full_name,
          city: p.seller_city,
          is_verified: !!p.seller_is_verified,
        }
      : null,
    price: p.price_pkr,
    price_pkr: p.price_pkr,
    seller_name: p.seller_full_name,
    rating_avg: p.rating_avg || null,
    rating_count: p.rating_count || 0,
  };
};

/** Base WHERE for "buyable" plants. */
const BUYABLE = 'p.is_available = 1 AND p.stock_quantity > 0';

/**
 * Build a safe FTS5 MATCH expression from a raw user search string.
 * Strips reserved FTS5 operators so user input cannot break the query.
 */
const buildFtsMatch = (search) => {
  const tokens = String(search)
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '')}"*`);
  return tokens.join(' OR ');
};

/**
 * Fetch a paginated list of available plants with filters.
 * Uses the FTS5 index when a search term is provided (fast, prefix-insensitive),
 * and falls back to LIKE for robustness.
 * @param {object} opts { city, category, search, sort, minPrice, maxPrice, page, page_size, limit, sellerOnly }
 * @returns {object} - { plants, total, page, totalPages }
 */
const getAllPlants = async ({
  city, category, search, sort = 'newest',
  minPrice, maxPrice, page = 1, page_size, limit,
  featured, organic, seller,
} = {}) => {
  page = Math.max(1, parseInt(page) || 1);
  const size = parseInt(page_size) || parseInt(limit) || 20;
  const perPage = Math.min(100, Math.max(1, size));
  const offset = (page - 1) * perPage;

  const where = [BUYABLE];
  const params = [];
  let joinSql = '';

  // Search: prefer FTS5 (also indexes scientific name + description).
  if (search && String(search).trim()) {
    const match = buildFtsMatch(search);
    joinSql = `JOIN plants_fts ON plants_fts.plant_id = p.id`;
    where.push('plants_fts MATCH ?');
    params.push(match);
  } else {
    // Fallback LIKE search (also used when FTS is unavailable).
    if (search && String(search).trim()) {
      where.push('(LOWER(p.name) LIKE LOWER(?) OR LOWER(p.scientific_name) LIKE LOWER(?))');
      params.push(`%${search}%`, `%${search}%`);
    }
  }

  if (city)      { where.push('LOWER(p.city) LIKE LOWER(?)'); params.push(`%${city}%`); }
  if (category)  { where.push('p.category = ?');              params.push(category); }
  if (featured === '1' || featured === true) { where.push('p.featured = 1'); }
  if (organic === '1' || organic === true)   { where.push('p.is_organic = 1'); }
  if (minPrice)  { where.push('p.price_pkr >= ?');           params.push(Number(minPrice)); }
  if (maxPrice)  { where.push('p.price_pkr <= ?');           params.push(Number(maxPrice)); }
  if (seller)    { where.push('p.seller_id = ?');            params.push(seller); }

  const whereSql = where.join(' AND ');

  const orderBy = {
    newest: 'p.created_at DESC',
    price_asc: 'p.price_pkr ASC',
    price_desc: 'p.price_pkr DESC',
    popular: 'p.sold_count DESC, p.views_count DESC',
    rating: 'rating_avg DESC NULLS LAST, rating_count DESC',
  }[sort] || 'p.created_at DESC';

  const total = get(
    `SELECT COUNT(*) AS c FROM plants p ${joinSql} WHERE ${whereSql}`,
    params
  ).c;

  const plants = query(
    `SELECT
       ${PLANT_COLUMNS},
       (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.plant_id = p.id) AS rating_avg,
       (SELECT COUNT(*) FROM reviews r WHERE r.plant_id = p.id) AS rating_count
     FROM plants p
     ${joinSql}
     JOIN users u ON u.id = p.seller_id
     WHERE ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  ).map(toPublicPlant);

  return {
    plants,
    total,
    page,
    totalPages: Math.ceil(total / perPage) || 1,
  };
};


/**
 * Fetch a single plant by ID with full details + seller + reviews + related.
 * Increments the view counter (anonymous, no auth needed).
 */
const getPlantById = async (plantId) => {
  const plant = get(
    `SELECT
       ${PLANT_COLUMNS},
       u.phone AS seller_phone
     FROM plants p
     JOIN users u ON u.id = p.seller_id
     WHERE p.id = ?`,
    [plantId]
  );

  if (!plant) {
    const err = new Error('Plant not found.');
    err.statusCode = 404;
    throw err;
  }

  // Increment view counter for analytics (best-effort).
  run('UPDATE plants SET views_count = views_count + 1 WHERE id = ?', [plantId]);

  plant.seller = {
    id: plant.seller_id,
    full_name: plant.seller_full_name,
    phone: plant.seller_phone,
    city: plant.seller_city,
    is_verified: !!plant.seller_is_verified,
  };

  plant.reviews = query(
    `SELECT r.id, r.rating, r.comment, r.is_verified_purchase,
            r.seller_reply, r.created_at,
            u.full_name AS reviewer_name
     FROM reviews r
     JOIN users u ON u.id = r.buyer_id
     WHERE r.plant_id = ?
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [plantId]
  );

  const ratingAgg = query(
    `SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS count FROM reviews WHERE plant_id = ?`,
    [plantId]
  )[0] || { avg: null, count: 0 };

  plant.rating_avg = ratingAgg.avg;
  plant.rating_count = ratingAgg.count;

  plant.related = query(
    `SELECT
       ${PLANT_COLUMNS.replace(/p\./g, 'rp.')},
       (SELECT COUNT(*) FROM reviews r WHERE r.plant_id = rp.id) AS rating_count
     FROM plants rp
     JOIN users u ON u.id = rp.seller_id
     WHERE rp.is_available = 1 AND rp.stock_quantity > 0
       AND rp.id != ?
       AND (rp.category = ? OR rp.city = ?)
     ORDER BY rp.created_at DESC
     LIMIT 6`,
    [plantId, plant.category, plant.city]
  ).map(toPublicPlant);

  delete plant.seller_id;
  delete plant.seller_full_name;
  delete plant.seller_phone;
  delete plant.seller_city;
  delete plant.seller_is_verified;

  return plant;
};


/**
 * Fetch "featured" plants for the home hero/spotlight section.
 */
const getFeaturedPlants = async (limit = 8) => {
  const rows = query(
    `SELECT ${PLANT_COLUMNS},
       (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.plant_id = p.id) AS rating_avg,
       (SELECT COUNT(*) FROM reviews r WHERE r.plant_id = p.id) AS rating_count
     FROM plants p
     JOIN users u ON u.id = p.seller_id
     WHERE ${BUYABLE} AND p.featured = 1
     ORDER BY p.sold_count DESC, p.created_at DESC
     LIMIT ?`,
    [Math.min(20, Math.max(1, limit))]
  ).map(toPublicPlant);
  return rows;
};


/**
 * Trending plants — highest recent sales/views (used for "Trending now").
 */
const getTrendingPlants = async (limit = 8) => {
  const rows = query(
    `SELECT ${PLANT_COLUMNS},
       (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.plant_id = p.id) AS rating_avg,
       (SELECT COUNT(*) FROM reviews r WHERE r.plant_id = p.id) AS rating_count
     FROM plants p
     JOIN users u ON u.id = p.seller_id
     WHERE ${BUYABLE}
     ORDER BY p.sold_count DESC, p.views_count DESC
     LIMIT ?`,
    [Math.min(20, Math.max(1, limit))]
  ).map(toPublicPlant);
  return rows;
};


/**
 * Create a new plant listing (sellers only).
 */
const createPlant = async (sellerId, plantData) => {
  const {
    name, scientific_name, description,
    price_pkr, original_price_pkr, discount_pct,
    stock_quantity, category, city, image_url,
    ai_verified, health_score, is_organic, care_level
  } = plantData;

  const id = uuid();
  run(
    `INSERT INTO plants
       (id, seller_id, name, scientific_name, description, price_pkr,
        original_price_pkr, discount_pct, stock_quantity, category, city,
        image_url, ai_verified, health_score, is_available, is_organic, care_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id, sellerId, name, scientific_name || null, description || null,
      price_pkr, original_price_pkr || null, discount_pct || 0,
      stock_quantity || 1, category || null, city || 'Lahore',
      image_url || null, ai_verified ? 1 : 0, health_score || null,
      is_organic ? 1 : 0, care_level || 'Easy'
    ]
  );

  const plant = get('SELECT * FROM plants WHERE id = ?', [id]);
  logger.info(`New plant listed: "${name}" by seller ${sellerId}`);
  return plant;
};


/**
 * Update a plant listing (owner only).
 */
const updatePlant = async (plantId, sellerId, updates) => {
  const existing = get('SELECT id, seller_id FROM plants WHERE id = ?', [plantId]);
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

  const allowedFields = [
    'name', 'scientific_name', 'description',
    'price_pkr', 'original_price_pkr', 'discount_pct',
    'stock_quantity', 'category', 'city', 'image_url',
    'is_available', 'is_organic', 'care_level'
  ];

  const sets = [];
  const params = [];
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(updates[field]);
    }
  });

  if (sets.length === 0) {
    return get('SELECT * FROM plants WHERE id = ?', [plantId]);
  }

  params.push(plantId);
  run(`UPDATE plants SET ${sets.join(', ')} WHERE id = ?`, params);

  return get('SELECT * FROM plants WHERE id = ?', [plantId]);
};


/**
 * Delete (soft-delete) a plant listing — keep order history intact.
 */
const deletePlant = async (plantId, sellerId) => {
  const existing = get('SELECT id, seller_id FROM plants WHERE id = ?', [plantId]);
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

  run('UPDATE plants SET is_available = 0 WHERE id = ?', [plantId]);
  logger.info(`Plant ${plantId} soft-deleted by seller ${sellerId}`);
};


/**
 * Fetch all plants listed by a specific seller.
 */
const getPlantsBySeller = async (sellerId) => {
  return query(
    'SELECT * FROM plants WHERE seller_id = ? ORDER BY created_at DESC',
    [sellerId]
  );
};


/**
 * Fetch distinct categories (for search/filter chips).
 */
const getCategories = async () => {
  return query(
    `SELECT category, COUNT(*) AS count
     FROM plants
     WHERE is_available = 1
     GROUP BY category
     ORDER BY count DESC`
  );
};


module.exports = {
  getAllPlants,
  getPlantById,
  getFeaturedPlants,
  getTrendingPlants,
  createPlant,
  updatePlant,
  deletePlant,
  getPlantsBySeller,
  getCategories,
};
