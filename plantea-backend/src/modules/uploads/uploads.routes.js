// =============================================================
// src/modules/uploads/uploads.routes.js
// Plantea — Self-hosted image uploads (free, no external storage)
// =============================================================
// Responsibility: Accept base64 images and store them locally in
//   ./uploads, served back as static files. This keeps the app
//   100% self-contained and free (no S3/Supabase needed).
// =============================================================

const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { verifyToken } = require('../../middleware/auth.middleware');
const ApiResponse = require('../../utils/ApiResponse');
const logger = require('../../utils/logger');

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const sniffExt = (buffer) => {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'webp';
  return null;
};

// POST /api/uploads  { image_base64 } or { mime_type, image_base64 }
router.post('/', verifyToken, (req, res, next) => {
  try {
    const { image_base64 } = req.body || {};
    if (!image_base64 || typeof image_base64 !== 'string') {
      return ApiResponse.error(res, 'image_base64 is required.', 400);
    }

    // Accept both raw base64 and data-URI ("data:image/jpeg;base64,...")
    let mime = req.body?.mime_type || null;
    let b64 = image_base64;
    const dataUriMatch = image_base64.match(/^data:([^;]+);base64,(.*)$/s);
    if (dataUriMatch) {
      mime = mime || dataUriMatch[1];
      b64 = dataUriMatch[2];
    }

    const buffer = Buffer.from(b64, 'base64');
    if (!buffer.length) {
      return ApiResponse.error(res, 'Could not decode image.', 400);
    }

    // 6 MB cap keeps the SQLite/db and disk happy
    if (buffer.length > 6 * 1024 * 1024) {
      return ApiResponse.error(res, 'Image too large (max 6 MB).', 413);
    }

    let ext = mime ? EXT_BY_MIME[mime] : null;
    if (!ext) ext = sniffExt(buffer);
    if (!ext) ext = 'jpg';

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    logger.info(`Image uploaded: ${filename} (${buffer.length} bytes)`);

    return ApiResponse.success(res, {
      url: `/uploads/${filename}`,
      filename,
    }, 'Image uploaded successfully.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
