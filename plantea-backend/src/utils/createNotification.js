// =============================================================
// src/utils/createNotification.js
// Plantea — Notification Creation Utility
// =============================================================
// Responsibility: Create notifications for users without breaking
//   the main application flow if notification creation fails.
//
// SE Principle — Graceful Degradation:
//   Notifications are important but not critical. If notification
//   creation fails, we log the error but don't throw it, allowing
//   the main operation (e.g., order placement) to succeed.
// =============================================================

const logger = require('./logger');

/**
 * Create a notification for a user.
 * 
 * This function never throws errors - it logs them instead.
 * This ensures that notification failures don't break critical
 * operations like order placement or status updates.
 * 
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - UUID of the user to notify
 * @param {string} type - Notification type (e.g., 'order_placed', 'payment_success')
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Promise<boolean>} - true if successful, false if failed
 */
async function createNotification(supabase, userId, type, title, message) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
      });

    if (error) {
      logger.warn(`Failed to create notification for user ${userId}:`, error.message);
      return false;
    }

    logger.info(`Notification created for user ${userId}: ${type}`);
    return true;

  } catch (err) {
    // Never throw - just log and return false
    logger.error(`Error creating notification for user ${userId}:`, err.message);
    return false;
  }
}

module.exports = createNotification;
