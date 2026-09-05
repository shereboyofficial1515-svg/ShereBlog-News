const express = require('express');
const articleController = require('../controllers/articleController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listArticlesRules, idParamRule } = require('../validators/articleValidators');

const router = express.Router();

const STAFF_ROLES = ['author', 'editor', 'admin', 'super_admin', 'moderator'];

router.get('/', requireAuth, requireRole(...STAFF_ROLES), listArticlesRules, articleController.listAdminArticles);
router.get('/:id', requireAuth, requireRole(...STAFF_ROLES), idParamRule, articleController.getAdminArticleById);

module.exports = router;
