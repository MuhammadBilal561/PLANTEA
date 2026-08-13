// =============================================================
// src/modules/garden/garden.routes.js
// Plantea — My Garden Routes
// =============================================================

const { Router } = require('express');
const { body } = require('express-validator');
const gardenController = require('./garden.controller');
const { verifyToken, allowRoles } = require('../../middleware/auth.middleware');

const router = Router();

router.use(verifyToken);

const addValidation = [
  body('plant_id').isUUID().withMessage('Valid plant ID is required.'),
  body('nickname').optional().trim().isLength({ max: 60 }),
  body('water_reminder_days').optional().isInt({ min: 1, max: 60 }),
];

router.get('/',     allowRoles(['buyer']), gardenController.getMyGarden);
router.post('/',    allowRoles(['buyer']), addValidation, gardenController.addToGarden);
router.patch('/:id', allowRoles(['buyer']), gardenController.updateGardenItem);
router.delete('/:id', allowRoles(['buyer']), gardenController.removeFromGarden);

module.exports = router;
