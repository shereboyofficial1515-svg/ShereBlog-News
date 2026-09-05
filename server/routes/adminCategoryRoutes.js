const express = require('express');
const categoryController = require('../controllers/categoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin', 'super_admin', 'editor'), categoryController.listAdminCategories);

module.exports = router;
