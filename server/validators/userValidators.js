const { body, param } = require('express-validator');
const { validate } = require('./authValidators');

const ROLE_NAMES = ['super_admin', 'admin', 'editor', 'author', 'moderator'];

const createUserRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('fullName').isString().trim().isLength({ min: 2, max: 150 }).withMessage('Full name is required'),
  body('password').isString().isLength({ min: 10 }).withMessage('Password must be at least 10 characters'),
  body('role').isIn(ROLE_NAMES).withMessage('Invalid role'),
  validate,
];

const updateUserRules = [
  param('id').isUUID(),
  body('fullName').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('role').optional().isIn(ROLE_NAMES),
  body('status').optional().isIn(['active', 'disabled']),
  body('bio').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 1000 }),
  validate,
];

const resetPasswordRules = [
  param('id').isUUID(),
  body('newPassword').isString().isLength({ min: 10 }).withMessage('Password must be at least 10 characters'),
  validate,
];

module.exports = { ROLE_NAMES, createUserRules, updateUserRules, resetPasswordRules };
