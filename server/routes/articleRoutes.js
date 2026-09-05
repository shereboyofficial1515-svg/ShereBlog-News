const express = require('express');
const articleController = require('../controllers/articleController');
const { requireAuth, requireRole, requireRoleOrOwner } = require('../middleware/auth');
const { loadArticleOwner } = require('../middleware/loadArticleOwner');
const {
  createArticleRules,
  updateArticleRules,
  listArticlesRules,
  idParamRule,
} = require('../validators/articleValidators');

const router = express.Router();

const STAFF_ROLES = ['author', 'editor', 'admin', 'super_admin'];
const ELEVATED_ROLES = ['editor', 'admin', 'super_admin'];

// --- Public ------------------------------------------------------------
router.get('/', listArticlesRules, articleController.listPublicArticles);
router.get('/:slug', articleController.getPublicArticleBySlug);

// --- Staff: create --------------------------------------------------
router.post('/', requireAuth, requireRole(...STAFF_ROLES), createArticleRules, articleController.createArticle);

// --- Staff: update (owner or elevated role) -------------------------
router.put(
  '/:id',
  requireAuth,
  idParamRule,
  loadArticleOwner,
  requireRoleOrOwner(...ELEVATED_ROLES),
  updateArticleRules,
  articleController.updateArticle
);

// --- Staff: duplicate (owner or elevated role) ----------------------
router.post(
  '/:id/duplicate',
  requireAuth,
  idParamRule,
  loadArticleOwner,
  requireRoleOrOwner(...ELEVATED_ROLES),
  articleController.duplicateArticle
);

// --- Staff: trash / restore (owner or elevated role) -----------------
router.delete(
  '/:id',
  requireAuth,
  idParamRule,
  loadArticleOwner,
  requireRoleOrOwner(...ELEVATED_ROLES),
  articleController.trashArticle
);

router.post(
  '/:id/restore',
  requireAuth,
  idParamRule,
  loadArticleOwner,
  requireRoleOrOwner(...ELEVATED_ROLES),
  articleController.restoreArticle
);

// --- Permanent delete: admin/super_admin only, no owner exception ----
router.delete(
  '/:id/permanent',
  requireAuth,
  idParamRule,
  requireRole('admin', 'super_admin'),
  articleController.permanentlyDeleteArticle
);

module.exports = router;
