// =============================================================
// src/modules/notifications/notifications.service.js
// Plantea — Notifications Business Logic
// =============================================================
// Responsibility: Handle notification retrieval and management.
//
// SE Principle — Pagination:
//   Notifications are paginated to prevent loading too much data
//   at once, improving performance and user experience.
// =============================================================

const supabase = require('../../config/supabase');
const logger = require('../../utils/logger');

/**
 * Get user's notifications with pagination.
 * 
 * @param {string} userId - User's UUID
 * @param {number} limit - Number of notifications to fetch (default 20)
 * @param {string} cursor - Last notification ID for pagination (optional)
 * @returns {object} - { notifications, unreadCount }
 */
const getNotifications = async (userId, limit = 20, cursor = null) => {
  // Build query
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Add cursor for pagination if provided
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: notifications, error } = await query;

  if (error) {
    logger.error(`Failed to fetch notifications for user ${userId}:`, error.message);
    const err = new Error('Failed to fetch notifications');
    err.statusCode = 500;
    throw err;
  }

  // Get unread count
  const { count: unreadCount, error: countError } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (countError) {
    logger.warn(`Failed to get unread count for user ${userId}:`, countError.message);
  }

  logger.info(`Notifications fetched for user ${userId}: ${notifications.length} items`);

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
  };
};

/**
 * Mark all notifications as read for a user.
 * 
 * @param {string} userId - User's UUID
 * @returns {object} - Success message
 */
const markAllAsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    logger.error(`Failed to mark notifications as read for user ${userId}:`, error.message);
    const err = new Error('Failed to mark notifications as read');
    err.statusCode = 500;
    throw err;
  }

  logger.info(`All notifications marked as read for user ${userId}`);
  return { message: 'All notifications marked as read' };
};

module.exports = { getNotifications, markAllAsRead };
