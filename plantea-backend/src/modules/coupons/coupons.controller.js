// =============================================================
// src/modules/coupons/coupons.controller.js
// Plantea — Promotions / Coupon Codes HTTP Controller
// =============================================================

const { validationResult } = require('express-validator');
const couponsService = require('./coupons.service');
const ApiResponse = require('../../utils/ApiResponse');

/** POST /api/coupons/preview — Validate a code and return discount (checkout) */
const previewCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return ApiResponse.error(res, 'Coupon code is required.', 400);

    const result = await couponsService.previewCoupon(code, Number(subtotal) || 0, req.user?.id);
    return ApiResponse.success(res, result, 'Coupon applied.');
  } catch (err) { next(err); }
};

/** POST /api/coupons — Create a coupon (seller/admin) */
const createCoupon = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }
    const coupon = await couponsService.createCoupon(req.user.id, req.body);
    return ApiResponse.success(res, { coupon }, 'Coupon created.', 201);
  } catch (err) { next(err); }
};

/** GET /api/coupons — List coupons (admin) */
const listCoupons = async (req, res, next) => {
  try {
    const coupons = await couponsService.listCoupons();
    return ApiResponse.success(res, { coupons }, 'Coupons retrieved.');
  } catch (err) { next(err); }
};

/** PATCH /api/coupons/:id — Toggle active/inactive (admin) */
const toggleCoupon = async (req, res, next) => {
  try {
    const coupon = await couponsService.toggleCoupon(req.params.id, req.body.is_active);
    return ApiResponse.success(res, { coupon }, 'Coupon updated.');
  } catch (err) { next(err); }
};

module.exports = { previewCoupon, createCoupon, listCoupons, toggleCoupon };
