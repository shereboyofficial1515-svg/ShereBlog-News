const express = require('express');
const categoryController = require('../controllers/categoryController');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createCategoryRules,
  updateCategoryRules,
  deleteCategoryRules,
} = require('../validators/categoryValidators');

const router = express.Router();

const MANAGE_ROLES = ['admin', 'super_admin'];

// --- Public ------------------------------------------------------------
router.get('/', categoryController.listPublicCategories);
router.get('/:slug', categoryController.getPublicCategoryBySlug);

// --- Admin: manage ---------------------------------------------------
router.post('/', requireAuth, requireRole(...MANAGE_ROLES), createCategoryRules, categoryController.createCategory);
router.put('/:id', requireAuth, requireRole(...MANAGE_ROLES), updateCategoryRules, categoryController.updateCategory);
router.delete('/:id', requireAuth, requireRole(...MANAGE_ROLES), deleteCategoryRules, categoryController.deleteCategory);

module.exports = router;
