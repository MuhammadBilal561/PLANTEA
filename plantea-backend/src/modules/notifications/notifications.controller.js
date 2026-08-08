// =============================================================
// src/modules/notifications/notifications.controller.js
// Plantea — Notifications HTTP Controller
// =============================================================
// Responsibility: Handle HTTP request/response for notification routes.
// =============================================================

const notificationsService = require('./notifications.service');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * GET /api/notifications
 * Get user's notifications with pagination.
 */
const getNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    
    const result = await notificationsService.getNotifications(req.user.id, limit, cursor);
    
    return ApiResponse.success(res, result, 'Notifications fetched successfully');

  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationsService.markAllAsRead(req.user.id);
    
    return ApiResponse.success(res, {}, result.message);

  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAllAsRead };
