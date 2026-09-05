const { body, query, param } = require('express-validator');
const { validate } = require('./authValidators');

const VALID_STATUSES = ['draft', 'pending_review', 'scheduled', 'published', 'archived', 'trash'];
const STATUSES_REQUIRING_CONTENT = ['published', 'scheduled'];

/**
 * Builds the shared field rules for both create and update. `isUpdate`
 * relaxes `title` to optional (a PUT can touch just one field) — every
 * other field is already optional/conditional on both create and update,
 * so there's no need for the old "take createArticleRules and slap
 * .optional() on every single rule" approach, which was fragile (it
 * could double-wrap conditional chains like scheduledAt's `.if()`).
 */
function articleFieldRules(isUpdate) {
  return [
    isUpdate
      ? body('title').optional().isString().trim().isLength({ min: 3, max: 300 }).withMessage('Title must be 3-300 characters')
      : body('title').isString().trim().isLength({ min: 3, max: 300 }).withMessage('Title must be 3-300 characters'),

    body('subtitle').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),

    // Content is allowed to be empty for drafts / pending review / archived
    // — a draft is explicitly meant to hold incomplete work-in-progress.
    // It's only required, non-empty, once the article is actually being
    // published or scheduled.
    body('content').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Content must be text'),
    body('content').custom((value, { req }) => {
      const status = req.body.status || 'draft';
      if (STATUSES_REQUIRING_CONTENT.includes(status) && (!value || !String(value).trim())) {
        throw new Error('Article content is required before publishing or scheduling');
      }
      return true;
    }),

    body('excerpt').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),
    body('categoryId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid category'),
    body('tags').optional({ nullable: true }).isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('featuredImageUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Featured image must be a valid URL'),
    body('featuredImageCaption').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    body('featuredImageAlt').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
    body('scheduledAt')
      .if(body('status').equals('scheduled'))
      .notEmpty().withMessage('scheduledAt is required when status is scheduled')
      .isISO8601().withMessage('scheduledAt must be a valid ISO 8601 datetime')
      .custom((value) => new Date(value) > new Date())
      .withMessage('scheduledAt must be in the future'),
    body('seoTitle').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 200 }),
    body('seoDescription').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    body('seoKeywords').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    body('canonicalUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Canonical URL must be valid'),
    body('source').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 200 }),
    body('isFeatured').optional().isBoolean(),
    body('isBreaking').optional().isBoolean(),
    body('breakingPriority').optional().isInt({ min: 0, max: 100 }),
  ];
}

const createArticleRules = [...articleFieldRules(false), validate];

const updateArticleRules = [param('id').isUUID().withMessage('Invalid article id'), ...articleFieldRules(true), validate];

const listArticlesRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('category').optional().isString().trim(),
  query('tag').optional().isString().trim(),
  query('author').optional().isUUID(),
  query('status').optional().isIn(VALID_STATUSES),
  query('search').optional().isString().trim().isLength({ max: 200 }),
  validate,
];

const idParamRule = [param('id').isUUID().withMessage('Invalid id'), validate];

module.exports = {
  VALID_STATUSES,
  createArticleRules,
  updateArticleRules,
  listArticlesRules,
  idParamRule,
};