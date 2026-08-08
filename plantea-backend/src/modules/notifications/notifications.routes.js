// =============================================================
// src/modules/notifications/notifications.routes.js
// Plantea — Notifications Route Definitions
// =============================================================
// Responsibility: Map HTTP endpoints to notification controllers.
// =============================================================

const { Router } = require('express');
const notificationsController = require('./notifications.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

const router = Router();

// All notification routes require authentication
router.use(verifyToken);

// GET /api/notifications - Get user's notifications
router.get('/', notificationsController.getNotifications);

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', notificationsController.markAllAsRead);

module.exports = router;
