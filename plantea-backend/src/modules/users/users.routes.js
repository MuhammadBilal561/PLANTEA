// =============================================================
// src/modules/users/users.routes.js
// Plantea — User Profile Route Definitions
// =============================================================
// Responsibility: Map HTTP endpoints to user controllers.
// =============================================================

const { Router } = require('express');
const usersController = require('./users.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

const router = Router();

// All user routes require authentication
router.use(verifyToken);

// GET /api/users/profile - Get current user's profile
router.get('/profile', usersController.getProfile);

// PUT /api/users/profile - Update current user's profile
router.put('/profile', usersController.updateProfile);

module.exports = router;
