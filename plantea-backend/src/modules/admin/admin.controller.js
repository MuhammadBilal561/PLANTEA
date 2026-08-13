// =============================================================
// src/modules/admin/admin.controller.js
// Plantea — Admin HTTP Controller
// =============================================================

const adminService = require('./admin.service');
const ApiResponse = require('../../utils/ApiResponse');

/** GET /api/admin/users — List users (filter/search/paginate) */
const listUsers = async (req, res, next) => {
  try {
    const { role, search, page, limit } = req.query;
    const result = await adminService.listUsers({ role, search, page, limit });
    return ApiResponse.success(res, result, 'Users retrieved.');
  } catch (err) { next(err); }
};

/** PATCH /api/admin/users/:id/verify — Verify/unverify a seller */
const verifySeller = async (req, res, next) => {
  try {
    const user = await adminService.setSellerVerified(req.params.id, req.body.is_verified);
    return ApiResponse.success(res, { user }, 'Seller verification updated.');
  } catch (err) { next(err); }
};

/** PATCH /api/admin/users/:id/active — Activate/deactivate a user */
const toggleActive = async (req, res, next) => {
  try {
    const user = await adminService.setUserActive(req.params.id, req.body.is_active);
    return ApiResponse.success(res, { user }, 'User status updated.');
  } catch (err) { next(err); }
};

/** GET /api/admin/verifications — Pending seller verification requests */
const verificationRequests = async (req, res, next) => {
  try {
    const requests = await adminService.getVerificationRequests();
    return ApiResponse.success(res, { requests }, 'Verification requests retrieved.');
  } catch (err) { next(err); }
};

module.exports = { listUsers, verifySeller, toggleActive, verificationRequests };
