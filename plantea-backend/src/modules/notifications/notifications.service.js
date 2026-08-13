// =============================================================
// src/modules/notifications/notifications.service.js
// Plantea — Notifications Business Logic
// =============================================================

const { query, get, run } = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Get user's notifications with pagination.
 * @returns {object} - { notifications, unreadCount }
 */
const getNotifications = async (userId, limit = 20, cursor = null) => {
  let sql = `SELECT * FROM notifications WHERE user_id = ?`;
  const params = [userId];

  if (cursor) {
    sql += ` AND created_at < ?`;
    params.push(cursor);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(parseInt(limit) || 20);

  const notifications = query(sql, params);
  const unreadCount = get(
    'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  ).c;

  logger.info(`Notifications fetched for user ${userId}: ${notifications.length} items`);
  return { notifications: notifications || [], unreadCount: unreadCount || 0 };
};

/**
 * Mark all notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  logger.info(`All notifications marked as read for user ${userId}`);
  return { message: 'All notifications marked as read' };
};

module.exports = { getNotifications, markAllAsRead };
