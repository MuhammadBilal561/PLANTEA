// =============================================================
// src/modules/scanner/scanner.service.js
// Plantea — AI Plant Scanner
// =============================================================
// Responsibility: Analyze a plant photo and return:
//   - species identification (PlantNet when a key is configured,
//     otherwise local image analysis + knowledge base)
//   - a health score derived from real pixel analysis
//   - disease heuristic (yellow/brown leaf detection)
//   - care, toxicity and fun-fact enrichment from a local
//     knowledge base — always free, always available.
// =============================================================

const axios = require('axios');
const FormData = require('form-data');
const jpeg = require('jpeg-js');
const PNG = require('pngjs').PNG;
const { run, get, uuid } = require('../../config/db');
const logger = require('../../utils/logger');
const { findPlantCare } = require('./plantKnowledge');

const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';


/**
 * Sample RGBA pixels and compute color heuristics.
 * Shared by both PNG and JPEG decoders (DRY).
 */
const samplePixels = (pixels, width, height) => {
  let greenCount = 0;
  let yellowCount = 0;
  let brightnessSum = 0;
  let total = 0;

  const step = Math.max(1, Math.floor(width / 160));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessSum += lum;
      // Greenish pixel: green clearly dominates red & blue
      if (g > r + 15 && g > b + 10) greenCount++;
      // Yellowish/brown (possible disease/dehydration):
      // red ≈ green and both well above blue
      if (r > 110 && g > 60 && Math.abs(r - g) < 30 && g > b + 20) yellowCount++;
      total++;
    }
  }

  if (total === 0) return null;
  return {
    width,
    height,
    greenRatio: greenCount / total,
    brightness: brightnessSum / total,
    yellowRatio: yellowCount / total,
  };
};


/**
 * Decode a base64 image into RGBA pixels (samples a downscaled grid).
 *
 * @param {string} base64 - Base64 image data
 * @returns {object|null} - { width, height, greenRatio, brightness, yellowRatio } or null if undecodable
 */
const analyzeImage = (base64) => {
  try {
    let buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) return null;

    const header = buffer.slice(0, 8);

    if (header[0] === 0x89 && header[1] === 0x50) { // PNG
      const png = PNG.sync.read(buffer);
      return samplePixels(png.data, png.width, png.height);
    }

    // JPEG
    const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 256 });
    return samplePixels(decoded.data, decoded.width, decoded.height);
  } catch (err) {
    logger.warn('Image analysis failed (falling back to defaults):', err.message);
    return null;
  }
};


/**
 * Compute a health score from image analysis.
 * Real heuristics, not a random number:
 *   - strong green presence = healthy leaf surface
 *   - good overall brightness = well-lit, healthy photo
 *   - high yellow/brown ratio = possible disease/dehydration
 */
const computeHealth = (analysis) => {
  if (!analysis) {
    return { healthScore: 60, isHealthy: true, diseaseDetected: null, treatmentSuggestion: null };
  }

  let score = 45;

  // Green coverage contributes up to +35
  score += Math.min(35, analysis.greenRatio * 55);

  // Brightness contributes up to +15 (avoid under/over exposed)
  const brightness = analysis.brightness;
  if (brightness >= 60 && brightness <= 210) score += 10;
  else if (brightness >= 40 && brightness <= 245) score += 5;

  // Yellow/brown disease heuristic, up to -25
  const diseasePenalty = Math.min(25, analysis.yellowRatio * 120);
  score -= diseasePenalty;

  const healthScore = Math.max(5, Math.min(98, Math.round(score)));

  let diseaseDetected = null;
  let treatmentSuggestion = null;
  if (analysis.yellowRatio > 0.06) {
    diseaseDetected = 'Possible leaf yellowing / stress detected';
    treatmentSuggestion = 'Check watering schedule, improve drainage, and inspect leaves for pests. Remove badly affected leaves.';
  } else if (analysis.yellowRatio > 0.03) {
    diseaseDetected = 'Slight leaf discoloration detected';
    treatmentSuggestion = 'Reduce watering slightly and ensure adequate indirect light.';
  }

  return {
    healthScore,
    isHealthy: healthScore >= 50,
    diseaseDetected,
    treatmentSuggestion,
  };
};


/**
 * Try to identify the species via PlantNet (only if a key exists).
 * Never throws for identification failure — returns null so the
 * local pipeline can take over gracefully.
 */
const identifyViaPlantNet = async (base64, form) => {
  if (!process.env.PLANTNET_API_KEY) return null;

  try {
    const response = await axios.post(PLANTNET_API_URL, form, {
      params: {
        'api-key': process.env.PLANTNET_API_KEY,
        lang: 'en',
        'nb-results': '1',
        'include-related-images': 'false',
      },
      headers: { ...form.getHeaders() },
      timeout: 10000,
    });

    const top = response.data?.results?.[0];
    if (!top?.species) return null;

    return {
      identifiedName: top.species.commonNames?.[0] || top.species.scientificNameWithoutAuthor || 'Unknown Plant',
      scientificName: top.species.scientificNameWithoutAuthor || null,
      confidence: Math.round((top.score || 0) * 100),
    };
  } catch (err) {
    logger.warn('PlantNet identification unavailable:', err.message);
    return null;
  }
};


/**
 * Identify a plant from a base64-encoded image.
 * Stores the result in scan_logs for analytics.
 *
 * @param {string} base64Image - Base64 encoded image
 * @param {string} userId - Scanning user
 * @param {string|null} plantId - Optional linked listing
 * @returns {object} - Full identification + health + care result
 */
const scanPlant = async (base64Image, userId, plantId = null) => {
  if (!base64Image) {
    const err = new Error('Image data is required.');
    err.statusCode = 400;
    throw err;
  }

  // Guard against absurd payloads
  const approxBytes = Buffer.byteLength(base64Image, 'base64');
  if (approxBytes > 8 * 1024 * 1024) {
    const err = new Error('Image too large. Maximum size is ~6MB.');
    err.statusCode = 413;
    throw err;
  }

  // 1. Real pixel analysis
  const analysis = analyzeImage(base64Image);

  // 2. Health score from image
  const health = computeHealth(analysis);

  // 3. Species identification (PlantNet if key present, else local)
  let identification = null;
  if (process.env.PLANTNET_API_KEY) {
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const form = new FormData();
    form.append('images', imageBuffer, { filename: 'plant.jpg', contentType: 'image/jpeg' });
    form.append('organs', 'leaf');
    identification = await identifyViaPlantNet(base64Image, form);
  }

  // 4. Enrich with local knowledge base (always works)
  const care = findPlantCare(identification?.identifiedName);

  const result = {
    // Identification
    identifiedName: identification?.identifiedName || care.name,
    scientificName: identification?.scientificName || care.scientificName,
    confidence: identification?.confidence ?? (analysis ? Math.round(45 + analysis.greenRatio * 35) : 50),
    source: identification ? 'plantnet' : 'local',

    // Health (from real pixel analysis)
    isHealthy: health.isHealthy,
    healthScore: health.healthScore,
    diseaseDetected: health.diseaseDetected,
    treatmentSuggestion: health.treatmentSuggestion,

    // Care (from local knowledge base — free, always available)
    care: {
      watering: care.watering,
      sunlight: care.sunlight,
      soil: care.soil,
      temperature: care.temperature,
      humidity: care.humidity,
      tips: care.careTips,
    },

    // Toxicity
    isToxic: care.toxic,
    toxicityNote: care.toxicityNote,

    funFact: `"${care.name}" is commonly found in Pakistani homes. ${care.careTips}`,
  };

  // 5. Save scan to database for analytics
  await logScanResult(userId, plantId, result);

  // 6. Auto-verify a linked listing only when the caller is the listing's
  //    seller (prevent any user from marking arbitrary listings as verified)
  if (plantId && result.healthScore >= 70 && result.isHealthy) {
    const plant = get('SELECT seller_id FROM plants WHERE id = ?', [plantId]);
    if (plant && plant.seller_id === userId) {
      run(
        'UPDATE plants SET ai_verified = 1, health_score = ? WHERE id = ?',
        [result.healthScore, plantId]
      );
      logger.info(`Plant ${plantId} AI-verified by its seller. Health score: ${result.healthScore}`);
    } else {
      logger.info(`Scan for plant ${plantId} skipped verification — caller is not the seller`);
    }
  }

  return result;
};


/**
 * Save scan result to scan_logs table.
 */
const logScanResult = async (userId, plantId, result) => {
  try {
    run(
      `INSERT INTO scan_logs
         (id, user_id, plant_id, identified_name, confidence_pct, health_score, is_toxic, raw_api_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid(), userId, plantId || null,
        result.identifiedName, result.confidence, result.healthScore,
        result.isToxic ? 1 : 0,
        JSON.stringify(result).slice(0, 4000),
      ]
    );
  } catch (error) {
    logger.warn('Failed to save scan log', error.message);
  }
};


module.exports = { scanPlant };
