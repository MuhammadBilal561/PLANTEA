// =============================================================
// src/utils/createNotification.js
// Plantea — Notification Creation Utility
// =============================================================
// Responsibility: Create notifications for users without breaking
//   the main application flow if notification creation fails
//   (graceful degradation).
// =============================================================

const { run, uuid } = require('../config/db');
const logger = require('./logger');

/**
 * Create a notification for a user.
 * Never throws — logs and returns false on failure.
 *
 * @param {string} userId - UUID of the user to notify
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Promise<boolean>} - true if successful
 */
async function createNotification(userId, type, title, message) {
  try {
    run(
      'INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?, 0)',
      [uuid(), userId, type, title, message]
    );
    logger.info(`Notification created for user ${userId}: ${type}`);
    return true;
  } catch (err) {
    logger.error(`Error creating notification for user ${userId}:`, err.message);
    return false;
  }
}

module.exports = createNotification;
