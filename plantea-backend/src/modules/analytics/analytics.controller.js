// =============================================================
// src/modules/analytics/analytics.controller.js
// Plantea — Analytics HTTP Controller
// =============================================================

const analyticsService = require('./analytics.service');
const ApiResponse = require('../../utils/ApiResponse');

/** GET /api/analytics/seller — Seller dashboard metrics */
const getSellerAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getSellerAnalytics(req.user.id);
    return ApiResponse.success(res, data, 'Seller analytics retrieved.');
  } catch (err) { next(err); }
};

/** GET /api/analytics/admin — Platform-wide metrics */
const getAdminAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getAdminAnalytics();
    return ApiResponse.success(res, data, 'Platform analytics retrieved.');
  } catch (err) { next(err); }
};

module.exports = { getSellerAnalytics, getAdminAnalytics };
