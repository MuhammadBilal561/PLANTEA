// =============================================================
// src/modules/users/users.service.js
// Plantea — User Profile Business Logic
// =============================================================
// Responsibility: Retrieve and update user profiles.
// Only whitelisted fields can be updated (no role/email changes).
// =============================================================

const { get, run } = require('../../config/db');
const logger = require('../../utils/logger');

const ALLOWED_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Peshawar', 'Quetta'];

const PUBLIC_FIELDS = `
  id, full_name, email, phone, role, city, is_active,
  is_verified, bio, avatar_url, address, created_at`;

/**
 * Get user profile by ID.
 */
const getUserProfile = async (userId) => {
  const user = get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [userId]);

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  logger.info(`Profile fetched for user ${userId}`);
  return user;
};

/**
 * Public profile view (for seller pages / buyer reviews) — no email/phone.
 */
const getPublicProfile = async (userId) => {
  const user = get(
    `SELECT id, full_name, role, city, is_active, is_verified, bio, avatar_url, created_at
     FROM users WHERE id = ?`,
    [userId]
  );

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
};

/**
 * Update user profile — full_name, phone, city, bio, address, avatar_url.
 */
const updateUserProfile = async (userId, updates) => {
  const allowedFields = ['full_name', 'phone', 'city', 'bio', 'address', 'avatar_url'];
  const updateData = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  if (updateData.phone) {
    const phoneRegex = /^03[0-9]{9}$/;
    if (!phoneRegex.test(updateData.phone)) {
      const err = new Error('Phone must be a valid Pakistani number (03XXXXXXXXX)');
      err.statusCode = 400;
      throw err;
    }
  }

  if (updateData.city && !ALLOWED_CITIES.includes(updateData.city)) {
    const err = new Error(`City must be one of: ${ALLOWED_CITIES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (Object.keys(updateData).length === 0) {
    const err = new Error('No valid fields to update');
    err.statusCode = 400;
    throw err;
  }

  const sets = Object.keys(updateData).map(k => `${k} = ?`);
  const params = Object.values(updateData);
  params.push(userId);

  const info = run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  if (info.changes === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const updatedUser = get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [userId]);

  logger.info(`Profile updated for user ${userId}`);
  return updatedUser;
};

module.exports = { getUserProfile, getPublicProfile, updateUserProfile };
