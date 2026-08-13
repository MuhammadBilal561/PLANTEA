// =============================================================
// src/modules/admin/admin.routes.js
// Plantea — Admin Routes (admin role only)
// =============================================================

const { Router } = require('express');
const { body } = require('express-validator');
const adminController = require('./admin.controller');
const { verifyToken, allowRoles } = require('../../middleware/auth.middleware');

const router = Router();

router.use(verifyToken, allowRoles(['admin']));

router.get('/users', adminController.listUsers);
router.get('/verifications', adminController.verificationRequests);
router.patch('/users/:id/verify', adminController.verifySeller);
router.patch('/users/:id/active', adminController.toggleActive);

module.exports = router;
