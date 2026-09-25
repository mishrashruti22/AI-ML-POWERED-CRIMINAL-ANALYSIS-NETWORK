/**
 * ProbNexus — User Management Routes
 * All routes require JWT auth + ADMIN role.
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

// All user management routes require auth + admin
router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', userController.getStats);
router.get('/', userController.listUsers);
router.get('/:userId/sessions', userController.getUserSessions);

module.exports = router;
