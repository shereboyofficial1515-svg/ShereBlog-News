const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/stats',
  requireAuth,
  requireRole('super_admin', 'admin', 'editor', 'moderator'),
  dashboardController.getStats
);

module.exports = router;
