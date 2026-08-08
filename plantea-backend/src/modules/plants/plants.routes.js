// =============================================================
// src/modules/plants/plants.routes.js
// Plantea — Plant Listing Routes
// =============================================================

const { Router } = require('express');
const { body } = require('express-validator');
const plantsController = require('./plants.controller');
const { verifyToken, allowRoles } = require('../../middleware/auth.middleware');

const router = Router();

// Validation for creating/updating a plant listing
const plantValidation = [
  body('name').trim().notEmpty().withMessage('Plant name is required.'),
  body('price_pkr')
    .isFloat({ min: 1 }).withMessage('Price must be a positive number.'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer.'),
  body('category')
    .optional()
    .isIn(['Indoor', 'Outdoor', 'Succulents', 'Flowering', 'Trees', 'Herbs'])
    .withMessage('Invalid category.'),
];

// Public routes (no login required)
router.get('/',     plantsController.getAllPlants);   // browse marketplace
router.get('/:id',  plantsController.getPlantById);  // view plant detail

// Protected routes — seller only
router.get('/my/listings', verifyToken, allowRoles(['seller']), plantsController.getMyListings);
router.post('/',    verifyToken, allowRoles(['seller']), plantValidation, plantsController.createPlant);
router.patch('/:id', verifyToken, allowRoles(['seller']), plantsController.updatePlant);
router.delete('/:id', verifyToken, allowRoles(['seller']), plantsController.deletePlant);

module.exports = router;
