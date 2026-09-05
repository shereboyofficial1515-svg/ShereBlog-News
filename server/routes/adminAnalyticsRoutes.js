const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('editor', 'admin', 'super_admin'), analyticsController.getAnalytics);

module.exports = router;
