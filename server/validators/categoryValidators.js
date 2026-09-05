const { body, param } = require('express-validator');
const { validate } = require('./authValidators');

const createCategoryRules = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  body('imageUrl').optional({ nullable: true }).isURL().withMessage('Image must be a valid URL'),
  body('seoTitle').optional({ nullable: true }).isString().trim().isLength({ max: 200 }),
  body('seoDescription').optional({ nullable: true }).isString().trim().isLength({ max: 300 }),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
  validate,
];

const updateCategoryRules = [
  param('id').isUUID().withMessage('Invalid category id'),
  ...createCategoryRules.slice(0, -1).map((rule) => rule.optional()),
  body('replacementCategoryId').optional({ nullable: true }).isUUID(),
  validate,
];

const deleteCategoryRules = [
  param('id').isUUID().withMessage('Invalid category id'),
  body('replacementCategoryId').optional({ nullable: true }).isUUID(),
  validate,
];

module.exports = { createCategoryRules, updateCategoryRules, deleteCategoryRules };
