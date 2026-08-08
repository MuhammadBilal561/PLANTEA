// =============================================================
// src/modules/plants/plants.controller.js
// Plantea — Plant Listings HTTP Controller
// =============================================================

const { validationResult } = require('express-validator');
const plantsService = require('./plants.service');
const ApiResponse = require('../../utils/ApiResponse');


/** GET /api/plants — Browse all available plants */
const getAllPlants = async (req, res, next) => {
  try {
    // Extract optional query params for filtering and pagination
    const { city, category, search, page, limit } = req.query;
    const result = await plantsService.getAllPlants({ city, category, search, page, limit });
    
    // Map database fields to frontend-expected format
    const plantsWithSellerName = result.plants.map(plant => ({
      ...plant,
      price: plant.price_pkr, // Map price_pkr to price for frontend compatibility
      seller_name: plant.seller?.full_name || 'Unknown Seller'
    }));
    
    return ApiResponse.success(res, {
      plants: plantsWithSellerName,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    }, 'Plants retrieved successfully.');
  } catch (err) { next(err); }
};


/** GET /api/plants/:id — Get single plant detail */
const getPlantById = async (req, res, next) => {
  try {
    const plant = await plantsService.getPlantById(req.params.id);
    const plantWithMappedFields = {
      ...plant,
      price: plant.price_pkr,
      seller_name: plant.seller?.full_name || 'Unknown Seller',
      seller_city: plant.seller?.city || plant.city,
      seller_phone: plant.seller?.phone,
    };
    // Wrap in { plant: ... } so frontend can do response.data.plant
    return ApiResponse.success(res, { plant: plantWithMappedFields }, 'Plant details retrieved.');
  } catch (err) { next(err); }
};


/** POST /api/plants — Create listing (seller only) */
const createPlant = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }
    
    // Map frontend price field to database price_pkr field
    const plantData = {
      ...req.body,
      price_pkr: req.body.price || req.body.price_pkr
    };
    
    // req.user.id comes from the verified JWT — no spoofing possible
    const plant = await plantsService.createPlant(req.user.id, plantData);
    
    // Map response back to frontend format
    const plantWithMappedFields = {
      ...plant,
      price: plant.price_pkr
    };
    
    return ApiResponse.success(res, plantWithMappedFields, 'Plant listed successfully.', 201);
  } catch (err) { next(err); }
};


/** PATCH /api/plants/:id — Update listing (seller only) */
const updatePlant = async (req, res, next) => {
  try {
    const plant = await plantsService.updatePlant(req.params.id, req.user.id, req.body);
    return ApiResponse.success(res, plant, 'Listing updated successfully.');
  } catch (err) { next(err); }
};


/** DELETE /api/plants/:id — Soft-delete listing (seller only) */
const deletePlant = async (req, res, next) => {
  try {
    await plantsService.deletePlant(req.params.id, req.user.id);
    return ApiResponse.success(res, null, 'Listing removed successfully.');
  } catch (err) { next(err); }
};


/** GET /api/plants/my/listings — Seller views their own plants */
const getMyListings = async (req, res, next) => {
  try {
    const plants = await plantsService.getPlantsBySeller(req.user.id);
    // Normalize each plant with plant_id alias for the frontend
    const normalized = plants.map(p => ({ ...p, plant_id: p.id }));
    return ApiResponse.success(res, { plants: normalized }, 'Your listings retrieved.');
  } catch (err) { next(err); }
};


module.exports = { getAllPlants, getPlantById, createPlant, updatePlant, deletePlant, getMyListings };
