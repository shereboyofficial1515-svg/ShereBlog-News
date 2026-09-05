const express = require('express');
const commentController = require('../controllers/commentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listAdminCommentsRules, updateCommentRules } = require('../validators/commentValidators');

const router = express.Router();

const MODERATE_ROLES = ['moderator', 'editor', 'admin', 'super_admin'];

router.get('/', requireAuth, requireRole(...MODERATE_ROLES), listAdminCommentsRules, commentController.listAdminComments);
router.put('/:id', requireAuth, requireRole(...MODERATE_ROLES), updateCommentRules, commentController.updateComment);
router.delete('/:id', requireAuth, requireRole(...MODERATE_ROLES), commentController.deleteComment);

module.exports = router;