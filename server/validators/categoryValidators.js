const { body, param } = require('express-validator');
const { validate } = require('./authValidators');

/**
 * `isUpdate` relaxes `name` to optional (a PUT can touch just one
 * field). Every optional field uses `checkFalsy: true` alongside
 * `nullable: true` — the admin category form sends `null` for any
 * field left blank (e.g. Image URL), and without checkFalsy that null
 * could still reach isURL()/isString() and fail validation instead of
 * being treated as "not provided." (This mirrors the same fix already
 * applied to server/validators/articleValidators.js.)
 */
function categoryFieldRules(isUpdate) {
  return [
    isUpdate
      ? body('name').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
      : body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('description').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),
    body('imageUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Image must be a valid URL'),
    body('seoTitle').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 200 }),
    body('seoDescription').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    body('isActive').optional().isBoolean(),
    body('sortOrder').optional().isInt({ min: 0 }),
  ];
}

const createCategoryRules = [...categoryFieldRules(false), validate];

const updateCategoryRules = [
  param('id').isUUID().withMessage('Invalid category id'),
  ...categoryFieldRules(true),
  body('replacementCategoryId').optional({ nullable: true, checkFalsy: true }).isUUID(),
  validate,
];

const deleteCategoryRules = [
  param('id').isUUID().withMessage('Invalid category id'),
  body('replacementCategoryId').optional({ nullable: true, checkFalsy: true }).isUUID(),
  validate,
];

module.exports = { createCategoryRules, updateCategoryRules, deleteCategoryRules };
