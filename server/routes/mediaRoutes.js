const express = require('express');
const mediaController = require('../controllers/mediaController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { singleFileUpload } = require('../middleware/upload');

const router = express.Router();

const STAFF_ROLES = ['author', 'editor', 'admin', 'super_admin'];

router.get('/', requireAuth, requireRole(...STAFF_ROLES, 'moderator'), mediaController.listMedia);
router.post('/', requireAuth, requireRole(...STAFF_ROLES), singleFileUpload('file'), mediaController.uploadMedia);
router.put('/:id', requireAuth, requireRole(...STAFF_ROLES), mediaController.updateMedia);
router.delete('/:id', requireAuth, requireRole('admin', 'super_admin', 'editor'), mediaController.deleteMedia);

module.exports = router;
