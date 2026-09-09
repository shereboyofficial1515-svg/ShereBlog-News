const { body, query } = require('express-validator');
const { validate } = require('./authValidators');

const createSubmissionRules = [
  body('submitterName').isString().trim().isLength({ min: 2, max: 150 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  // checkFalsy alongside nullable: the Submit News form sends `null`
  // (not `undefined`) for every optional field the visitor leaves
  // blank — without checkFalsy, that null can still reach isString()/
  // isUUID() and fail validation instead of being treated as "not
  // provided." (Same fix already applied to article/category validators.)
  body('phone').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 30 }),
  body('title').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Title is required'),
  body('categoryId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid category'),
  body('description').isString().trim().isLength({ min: 3, max: 500 }).withMessage('Description is required'),
  body('fullStory').isString().trim().isLength({ min: 10 }).withMessage('Full story is required'),
  body('source').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 200 }),
  body('location').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 150 }),
  body('additionalInfo').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),
  body('consentGiven').isBoolean().custom((v) => v === true).withMessage('You must confirm consent to share this information'),
  validate,
];

const updateSubmissionRules = [
  body('status').optional().isIn(['pending', 'reviewed', 'approved', 'rejected', 'archived']),
  body('internalNotes').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  validate,
];

const listSubmissionsRules = [
  query('status').optional().isIn(['pending', 'reviewed', 'approved', 'rejected', 'archived']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
];

module.exports = { createSubmissionRules, updateSubmissionRules, listSubmissionsRules };
