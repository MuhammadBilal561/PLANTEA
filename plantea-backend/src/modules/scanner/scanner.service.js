// =============================================================
// src/modules/scanner/scanner.service.js
// Plantea — AI Plant Scanner (Plant.id API Integration)
// =============================================================
// Responsibility: Send plant image to Plant.id API and return
//   identification, health score, care info, and toxicity alerts.
//
// Low Coupling:
//   The rest of the backend never calls Plant.id directly.
//   Only this file knows the API URL, key, and response shape.
//   If Plant.id changes their API (or we switch to a different
//   service), only this file changes. Zero impact on other modules.
//
// Automation Principle:
//   This replaces manual expert checking with AI — scalable,
//   instant, and consistent. Referenced in Week 2 pitch deck.
// =============================================================

const axios = require('axios');
const FormData = require('form-data');
const supabase = require('../../config/supabase');
const logger = require('../../utils/logger');

// PlantNet API base URL — identifies plants from images
// Docs: https://my-api.plantnet.org
const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';
/**
 * Identify a plant from a base64-encoded image using PlantNet API.
 * Stores the result in scan_logs for analytics and audit trail.
 *
 * @param {string} base64Image  - Base64 encoded image string
 * @param {string} userId       - ID of the user performing the scan
 * @param {string|null} plantId - Linked listing ID (optional)
 * @returns {object}            - Identification result with care info
 */
const scanPlant = async (base64Image, userId, plantId = null) => {

  // Convert base64 to a buffer so we can send it as a file upload
  // PlantNet accepts multipart/form-data with image files
  const imageBuffer = Buffer.from(base64Image, 'base64');

  // Build multipart form — PlantNet requires 'images' field
  const form = new FormData();
  form.append('images', imageBuffer, {
    filename: 'plant.jpg',
    contentType: 'image/jpeg',
  });
  form.append('organs', 'leaf');   // ← ADD THIS LINE


  let apiResponse;

  try {
    apiResponse = await axios.post(
      PLANTNET_API_URL,
      form,
      {
        params: {
  'api-key': process.env.PLANTNET_API_KEY,
  lang: 'en',
  'nb-results': '1',
  'include-related-images': 'false',
},
        headers: {
          ...form.getHeaders(), // sets correct multipart/form-data boundary
        },
        timeout: 10000, // 10s timeout — scanner NFR is < 5s response
      }
    );
  } catch (axiosError) {
    // PlantNet returns 404 when it cannot identify the plant at all
    if (axiosError.response?.status === 404) {
      logger.warn('PlantNet could not identify plant in image');
      return {
        identifiedName: 'Unknown Plant',
        scientificName: null,
        confidence: 0,
        isHealthy: true,
        healthScore: 50,
        diseaseDetected: null,
        treatmentSuggestion: null,
        care: {
          watering: 'Moderate',
          sunlight: 'Indirect sunlight',
          soil: 'Well-drained potting mix',
        },
        isToxic: false,
        toxicityNote: null,
      };
    }

    logger.error('PlantNet API call failed', axiosError.message);
    const err = new Error('AI scanner is temporarily unavailable. Please try again.');
    err.statusCode = 503;
    throw err;
  }

  // Parse PlantNet response into clean Plantea format
  const result = parseApiResponse(apiResponse.data);

  // Save scan to database for analytics
  await logScanResult(userId, plantId, result, apiResponse.data);

  // If scan is for an existing listing and plant is healthy, mark as AI verified
  if (plantId && result.healthScore >= 70) {
    await supabase
      .from('plants')
      .update({ ai_verified: true, health_score: result.healthScore })
      .eq('id', plantId);

    logger.info(`Plant ${plantId} AI-verified. Health score: ${result.healthScore}`);
  }

  return result;
};


/**
 * Parse PlantNet API response into a clean Plantea-friendly structure.
 * Extracted as a helper — keeps scanPlant() short and readable (SRP).
 *
 * PlantNet response shape:
 *   results[0].species.scientificNameWithoutAuthor  → scientific name
 *   results[0].species.commonNames[0]               → common name
 *   results[0].score                                → confidence (0–1)
 *
 * @param {object} rawResponse - Raw JSON from PlantNet API
 * @returns {object}           - Clean structured result
 */
const parseApiResponse = (rawResponse) => {
  const topResult = rawResponse?.results?.[0];

  const commonName     = topResult?.species?.commonNames?.[0] ?? 'Unknown Plant';
  const scientificName = topResult?.species?.scientificNameWithoutAuthor ?? null;
  const confidence     = Math.round((topResult?.score ?? 0) * 100); // convert 0–1 to 0–100

  // PlantNet does not provide health scores directly.
  // We derive a health score from confidence — high confidence = healthy clear photo.
  // A proper health check would require a secondary disease-detection API.
  const healthScore = confidence >= 70 ? confidence : Math.max(40, confidence);

  return {
    // Identification
    identifiedName: commonName,
    scientificName,
    confidence, // percentage e.g. 94

    // Health (derived from identification confidence)
    isHealthy: confidence >= 50,
    healthScore,
    diseaseDetected: null,       // PlantNet does not detect disease — future feature
    treatmentSuggestion: null,

    // Basic care defaults — can be extended with a care database later
    care: {
      watering: 'Moderate — check soil moisture before watering',
      sunlight: 'Indirect sunlight recommended',
      soil:     'Well-drained potting mix',
    },

    // Toxicity — not provided by PlantNet free tier
    isToxic: false,
    toxicityNote: null,
  };
};


/**
 * Save scan result to scan_logs table.
 * Feeds analytics: how many scans per day, confidence distribution, etc.
 */
const logScanResult = async (userId, plantId, result, rawData) => {
  const { error } = await supabase.from('scan_logs').insert({
    user_id:          userId,
    plant_id:         plantId,
    identified_name:  result.identifiedName,
    confidence_pct:   result.confidence,
    health_score:     result.healthScore,
    is_toxic:         result.isToxic,
    raw_api_response: rawData,
  });

  if (error) {
    logger.warn('Failed to save scan log', error.message);
  }
};


module.exports = { scanPlant };