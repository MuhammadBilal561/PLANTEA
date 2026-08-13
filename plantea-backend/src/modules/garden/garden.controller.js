// =============================================================
// src/modules/garden/garden.controller.js
// Plantea — My Garden HTTP Controller
// =============================================================

const { validationResult } = require('express-validator');
const gardenService = require('./garden.service');
const ApiResponse = require('../../utils/ApiResponse');

/** GET /api/garden — User's saved plants */
const getMyGarden = async (req, res, next) => {
  try {
    const garden = await gardenService.getMyGarden(req.user.id);
    return ApiResponse.success(res, { garden }, 'Your garden retrieved.');
  } catch (err) { next(err); }
};

/** POST /api/garden — Save a plant to the garden */
const addToGarden = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }
    const item = await gardenService.addToGarden(req.user.id, req.body);
    return ApiResponse.success(res, { item }, 'Added to your garden.', 201);
  } catch (err) { next(err); }
};

/** PATCH /api/garden/:id — Update nickname / reminder */
const updateGardenItem = async (req, res, next) => {
  try {
    const item = await gardenService.updateGardenItem(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, { item }, 'Garden item updated.');
  } catch (err) { next(err); }
};

/** DELETE /api/garden/:id — Remove from garden */
const removeFromGarden = async (req, res, next) => {
  try {
    await gardenService.removeFromGarden(req.user.id, req.params.id);
    return ApiResponse.success(res, null, 'Removed from your garden.');
  } catch (err) { next(err); }
};

module.exports = { getMyGarden, addToGarden, updateGardenItem, removeFromGarden };
