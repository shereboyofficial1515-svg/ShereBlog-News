const express = require('express');
const settingsController = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const MANAGE_ROLES = ['admin', 'super_admin'];

router.get('/', requireAuth, requireRole(...MANAGE_ROLES), settingsController.getAllSettings);
router.put('/:key', requireAuth, requireRole(...MANAGE_ROLES), settingsController.updateSettings);

module.exports = router;
