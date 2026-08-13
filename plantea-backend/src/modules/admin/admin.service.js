// =============================================================
// src/modules/admin/admin.service.js
// Plantea — Admin Platform Management Business Logic
// =============================================================
// Responsibility: Admin-only operations — user management,
//   seller verification, coupon governance, moderation.
// =============================================================

const { query, get, run } = require('../../config/db');
const logger = require('../../utils/logger');

/** List users with role filter + pagination. */
const listUsers = async ({ role, search, page = 1, limit = 50 } = {}) => {
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(200, Math.max(1, parseInt(limit) || 50));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (role) { where.push('role = ?'); params.push(role); }
  if (search) {
    where.push('(LOWER(full_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?))');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = get(`SELECT COUNT(*) AS c FROM users ${whereSql}`, params).c;

  const users = query(
    `SELECT id, full_name, email, phone, role, city, is_active, is_verified, created_at
     FROM users ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { users, total, page, totalPages: Math.ceil(total / limit) || 1 };
};

/** Verify a seller (is_verified = 1) or unverify. */
const setSellerVerified = async (userId, isVerified) => {
  const user = get('SELECT id, role FROM users WHERE id = ?', [userId]);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  if (user.role !== 'seller') {
    const err = new Error('Only sellers can be verified.');
    err.statusCode = 400;
    throw err;
  }
  run('UPDATE users SET is_verified = ? WHERE id = ?', [isVerified ? 1 : 0, userId]);
  logger.info(`Seller ${userId} verified=${isVerified ? 'yes' : 'no'} by admin`);
  return get('SELECT id, full_name, email, role, is_verified FROM users WHERE id = ?', [userId]);
};

/** Activate / deactivate a user account. */
const setUserActive = async (userId, isActive) => {
  const user = get('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  run('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
  logger.info(`User ${userId} is_active=${isActive ? 'yes' : 'no'} by admin`);
  return get('SELECT id, full_name, email, role, is_active FROM users WHERE id = ?', [userId]);
};

/** Pending verification requests — sellers not yet verified. */
const getVerificationRequests = async () => {
  return query(
    `SELECT id, full_name, email, phone, city, bio, created_at
     FROM users WHERE role = 'seller' AND is_verified = 0
     ORDER BY created_at DESC`
  );
};

module.exports = {
  listUsers,
  setSellerVerified,
  setUserActive,
  getVerificationRequests,
};
