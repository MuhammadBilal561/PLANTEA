// =============================================================
// src/modules/garden/garden.service.js
// Plantea — My Garden Business Logic
// =============================================================
// Responsibility: Buyers save plants to their garden with care
//   preferences (nickname, watering reminders). Drives retention.
// =============================================================

const { query, get, run, uuid } = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Add a plant to the user's garden (idempotent per user+plant).
 */
const addToGarden = async (userId, { plant_id, nickname, water_reminder_days }) => {
  const plant = get('SELECT id FROM plants WHERE id = ?', [plant_id]);
  if (!plant) {
    const err = new Error('Plant not found.');
    err.statusCode = 404;
    throw err;
  }

  const existing = get('SELECT id FROM my_garden WHERE user_id = ? AND plant_id = ?', [userId, plant_id]);
  if (existing) {
    const err = new Error('This plant is already in your garden.');
    err.statusCode = 409;
    throw err;
  }

  const id = uuid();
  run(
    `INSERT INTO my_garden (id, user_id, plant_id, nickname, water_reminder_days)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, plant_id, nickname || null, water_reminder_days || 7]
  );

  logger.info(`Plant ${plant_id} added to garden of user ${userId}`);
  return get('SELECT * FROM my_garden WHERE id = ?', [id]);
};

/**
 * List the user's garden with plant + care details.
 */
const getMyGarden = async (userId) => {
  const items = query(
    `SELECT g.id AS garden_id, g.nickname, g.water_reminder_days, g.created_at,
            p.id AS plant_id, p.name, p.scientific_name, p.image_url,
            p.price_pkr, p.category, p.care_level, p.health_score, p.ai_verified
     FROM my_garden g
     JOIN plants p ON p.id = g.plant_id
     WHERE g.user_id = ?
     ORDER BY g.created_at DESC`,
    [userId]
  );

  return items.map((g) => ({
    ...g,
    plant: {
      id: g.plant_id,
      name: g.name,
      scientific_name: g.scientific_name,
      image_url: g.image_url,
      price_pkr: g.price_pkr,
      category: g.category,
      care_level: g.care_level,
      health_score: g.health_score,
      ai_verified: g.ai_verified,
    },
  }));
};

/**
 * Remove a plant from the user's garden.
 */
const removeFromGarden = async (userId, gardenId) => {
  const item = get('SELECT id FROM my_garden WHERE id = ? AND user_id = ?', [gardenId, userId]);
  if (!item) {
    const err = new Error('Garden item not found.');
    err.statusCode = 404;
    throw err;
  }
  run('DELETE FROM my_garden WHERE id = ?', [gardenId]);
};

/**
 * Update a garden item (nickname / reminder days).
 */
const updateGardenItem = async (userId, gardenId, { nickname, water_reminder_days }) => {
  const item = get('SELECT id FROM my_garden WHERE id = ? AND user_id = ?', [gardenId, userId]);
  if (!item) {
    const err = new Error('Garden item not found.');
    err.statusCode = 404;
    throw err;
  }

  const sets = [];
  const params = [];
  if (nickname !== undefined) { sets.push('nickname = ?'); params.push(nickname); }
  if (water_reminder_days !== undefined) { sets.push('water_reminder_days = ?'); params.push(water_reminder_days); }

  if (sets.length > 0) {
    params.push(gardenId);
    run(`UPDATE my_garden SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  return get('SELECT * FROM my_garden WHERE id = ?', [gardenId]);
};

module.exports = { addToGarden, getMyGarden, removeFromGarden, updateGardenItem };
