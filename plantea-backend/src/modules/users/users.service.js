// =============================================================
// src/modules/users/users.service.js
// Plantea — User Profile Business Logic
// =============================================================
// Responsibility: Handle user profile retrieval and updates.
//
// SE Principle — Data Validation:
//   All user input is validated before database operations.
//   Only whitelisted fields can be updated to prevent
//   unauthorized modifications (e.g., changing role or email).
// =============================================================

const supabase = require('../../config/supabase');
const logger = require('../../utils/logger');

// Allowed cities for validation
const ALLOWED_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Peshawar', 'Quetta'];

/**
 * Get user profile by ID.
 * 
 * @param {string} userId - User's UUID
 * @returns {object} - User profile data
 */
const getUserProfile = async (userId) => {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, city, is_active, created_at')
    .eq('id', userId)
    .single();

  if (error || !user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  logger.info(`Profile fetched for user ${userId}`);
  return user;
};

/**
 * Update user profile.
 * 
 * Only allows updating: full_name, phone, city
 * All other fields are protected from modification.
 * 
 * @param {string} userId - User's UUID
 * @param {object} updates - { full_name, phone, city }
 * @returns {object} - Updated user profile
 */
const updateUserProfile = async (userId, updates) => {
  // Whitelist - only these fields can be updated
  const allowedFields = ['full_name', 'phone', 'city'];
  const updateData = {};

  // Filter out any fields not in the whitelist
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  // Validate phone number if provided
  if (updateData.phone) {
    const phoneRegex = /^03[0-9]{9}$/;
    if (!phoneRegex.test(updateData.phone)) {
      const err = new Error('Phone must be a valid Pakistani number (03XXXXXXXXX)');
      err.statusCode = 400;
      throw err;
    }
  }

  // Validate city if provided
  if (updateData.city && !ALLOWED_CITIES.includes(updateData.city)) {
    const err = new Error(`City must be one of: ${ALLOWED_CITIES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    const err = new Error('No valid fields to update');
    err.statusCode = 400;
    throw err;
  }

  // Perform update
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select('id, full_name, email, phone, role, city, is_active, created_at')
    .single();

  if (error) {
    logger.error(`Failed to update profile for user ${userId}:`, error.message);
    const err = new Error('Failed to update profile');
    err.statusCode = 500;
    throw err;
  }

  logger.info(`Profile updated for user ${userId}`);
  return updatedUser;
};

module.exports = { getUserProfile, updateUserProfile };
