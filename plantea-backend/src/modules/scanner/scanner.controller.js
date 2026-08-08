// =============================================================
// src/modules/scanner/scanner.controller.js
// Plantea — AI Scanner HTTP Controller
// =============================================================

const scannerService = require('./scanner.service');
const ApiResponse = require('../../utils/ApiResponse');


/**
 * POST /api/scanner/identify
 * Identify a plant from an uploaded image.
 * Accepts base64 image in request body.
 */
const identifyPlant = async (req, res, next) => {
  try {
    const { image_base64, plant_id } = req.body;

    // Validate that an image was provided
    if (!image_base64) {
      return ApiResponse.error(res, 'Image data is required. Send as base64 string.', 400);
    }

    // Basic size check — prevent abuse with huge payloads
    // A typical mobile photo in base64 is ~1–2MB
    if (image_base64.length > 5_000_000) {
      return ApiResponse.error(res, 'Image too large. Maximum size is ~3.5MB.', 413);
    }

    const result = await scannerService.scanPlant(image_base64, req.user.id, plant_id || null);

    return ApiResponse.success(res, result, 'Plant identified successfully.');

  } catch (err) { next(err); }
};


module.exports = { identifyPlant };