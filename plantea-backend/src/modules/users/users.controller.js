// =============================================================
// src/modules/users/users.controller.js
// Plantea — User Profile HTTP Controller
// =============================================================
// Responsibility: Handle HTTP request/response for user routes.
// =============================================================

const usersService = require('./users.service');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * GET /api/users/profile
 * Get the authenticated user's profile.
 */
const getProfile = async (req, res, next) => {
  try {
    // req.user.id is set by verifyToken middleware
    const user = await usersService.getUserProfile(req.user.id);
    
    return ApiResponse.success(res, user, 'Profile fetched successfully');

  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/profile
 * Update the authenticated user's profile.
 */
const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, city, bio, address, avatar_url } = req.body;
    
    const updatedUser = await usersService.updateUserProfile(req.user.id, {
      full_name,
      phone,
      city,
      bio,
      address,
      avatar_url,
    });
    
    return ApiResponse.success(res, updatedUser, 'Profile updated successfully');

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id/public
 * Public seller profile — no email/phone exposed.
 */
const getPublicProfile = async (req, res, next) => {
  try {
    const user = await usersService.getPublicProfile(req.params.id);
    return ApiResponse.success(res, { user }, 'Public profile fetched successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, getPublicProfile };
