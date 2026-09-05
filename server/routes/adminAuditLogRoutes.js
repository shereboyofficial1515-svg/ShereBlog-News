const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin', 'super_admin'), auditLogController.listAuditLogs);

module.exports = router;
