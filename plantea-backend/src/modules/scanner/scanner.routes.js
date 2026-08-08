// =============================================================
// src/modules/scanner/scanner.routes.js
// Plantea — AI Scanner Route Definitions
// =============================================================

const { Router } = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const scannerController = require('./scanner.controller');

const router = Router();

// All scanner routes require login — prevent anonymous abuse
router.post('/identify', verifyToken, scannerController.identifyPlant);

module.exports = router;
