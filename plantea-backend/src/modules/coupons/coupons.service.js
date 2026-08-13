// =============================================================
// src/modules/coupons/coupons.service.js
// Plantea — Promotions / Coupon Codes Business Logic
// =============================================================
// Responsibility: Validate and apply promo codes at checkout, track
//   usage, and let sellers/admins manage coupons.
// =============================================================

const { query, get, run, uuid } = require('../../config/db');
const { roundMoney, applyPercentDiscount } = require('../../utils/money');
const logger = require('../../utils/logger');

/** Normalize a coupon code (upper-case, trimmed). */
const normalizeCode = (code) => String(code || '').trim().toUpperCase();

/**
 * Validate a coupon against an order subtotal and (optionally) a user.
 * Throws a 400 with a user-friendly message on failure.
 * @returns {object} coupon
 */
const validateCoupon = (code, subtotal, userId = null) => {
  const coupon = get('SELECT * FROM coupons WHERE code = ?', [normalizeCode(code)]);
  if (!coupon) {
    const err = new Error('Invalid coupon code.');
    err.statusCode = 400;
    throw err;
  }

  if (!coupon.is_active) {
    const err = new Error('This coupon is no longer active.');
    err.statusCode = 400;
    throw err;
  }

  const now = Date.now();
  if (coupon.starts_at && now < new Date(coupon.starts_at).getTime()) {
    const err = new Error('This coupon is not active yet.');
    err.statusCode = 400;
    throw err;
  }
  if (coupon.expires_at && now > new Date(coupon.expires_at).getTime()) {
    const err = new Error('This coupon has expired.');
    err.statusCode = 400;
    throw err;
  }

  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    const err = new Error('This coupon has reached its usage limit.');
    err.statusCode = 400;
    throw err;
  }

  const subtotalVal = Number(subtotal) || 0;
  if (coupon.min_order_pkr > 0 && subtotalVal < coupon.min_order_pkr) {
    const err = new Error(`Minimum order of Rs. ${coupon.min_order_pkr} required for this coupon.`);
    err.statusCode = 400;
    throw err;
  }

  return coupon;
};

/**
 * Compute the discount (PKR) a coupon grants on a subtotal.
 * @returns {number} discount amount
 */
const computeDiscount = (coupon, subtotal) => {
  if (coupon.type === 'fixed') {
    return roundMoney(Math.min(Number(coupon.value), Number(subtotal)));
  }
  // percent
  let discount = roundMoney(Number(subtotal) * (Number(coupon.value) / 100));
  if (coupon.max_discount_pkr != null) {
    discount = Math.min(discount, Number(coupon.max_discount_pkr));
  }
  return roundMoney(discount);
};

/**
 * Validate a coupon and return the discount it would grant.
 * Used by the checkout preview endpoint (no usage consumed).
 */
const previewCoupon = (code, subtotal, userId = null) => {
  const coupon = validateCoupon(code, subtotal, userId);
  const discount = computeDiscount(coupon, subtotal);
  return {
    code: coupon.code,
    type: coupon.type,
    discount_pkr: discount,
    new_total: roundMoney(Number(subtotal) - discount),
  };
};

/**
 * Apply a coupon at order placement: validate, compute discount, and
 * atomically increment usage. Runs synchronously inside the order
 * transaction so stock + coupon usage commit together.
 * @returns {number} discount in PKR (0 if no code)
 */
const applyCoupon = (code, subtotal, userId = null) => {
  if (!code || !normalizeCode(code)) return 0;
  const coupon = validateCoupon(code, subtotal, userId);
  const discount = computeDiscount(coupon, subtotal);
  run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
  logger.info(`Coupon ${coupon.code} applied: ${discount} PKR off`);
  return discount;
};

/**
 * Create a coupon (admin only in production; sellers may self-serve here).
 */
const createCoupon = (creatorId, couponData) => {
  const {
    code, type = 'percent', value, min_order_pkr = 0,
    max_discount_pkr, starts_at, expires_at, usage_limit
  } = couponData;

  if (type !== 'fixed' && type !== 'percent') {
    const err = new Error('Coupon type must be percent or fixed.');
    err.statusCode = 422;
    throw err;
  }
  if (!value || Number(value) <= 0) {
    const err = new Error('Coupon value must be a positive number.');
    err.statusCode = 422;
    throw err;
  }

  const id = uuid();
  try {
    run(
      `INSERT INTO coupons
         (id, code, type, value, min_order_pkr, max_discount_pkr, starts_at, expires_at, usage_limit, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, normalizeCode(code), type, Number(value), Number(min_order_pkr) || 0,
        max_discount_pkr != null ? Number(max_discount_pkr) : null,
        starts_at || null, expires_at || null,
        usage_limit != null ? Number(usage_limit) : null,
        creatorId
      ]
    );
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const err = new Error('A coupon with this code already exists.');
      err.statusCode = 409;
      throw err;
    }
    throw e;
  }

  return get('SELECT * FROM coupons WHERE id = ?', [id]);
};

/** List coupons (admin/seller management). */
const listCoupons = () => {
  return query('SELECT * FROM coupons ORDER BY created_at DESC');
};

/** Toggle a coupon active/inactive. */
const toggleCoupon = (couponId, isActive) => {
  const coupon = get('SELECT id FROM coupons WHERE id = ?', [couponId]);
  if (!coupon) {
    const err = new Error('Coupon not found.');
    err.statusCode = 404;
    throw err;
  }
  run('UPDATE coupons SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, couponId]);
  return get('SELECT * FROM coupons WHERE id = ?', [couponId]);
};

module.exports = {
  validateCoupon,
  computeDiscount,
  previewCoupon,
  applyCoupon,
  createCoupon,
  listCoupons,
  toggleCoupon,
};
