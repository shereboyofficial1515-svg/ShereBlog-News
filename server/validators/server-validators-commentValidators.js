const { body, param, query } = require('express-validator');
const { validate } = require('./authValidators');

const createCommentRules = [
    body('articleId').isUUID().withMessage('Invalid article'),
    body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('content').isString().trim().isLength({ min: 2, max: 2000 }).withMessage('Comment is required'),
    // Honeypot field: a real browser never fills this (it's hidden via
    // CSS on the form); a naive bot filling every field will trip it.
    body('website').optional().isString().isLength({ max: 0 }).withMessage('Spam detected'),
    validate,
];

const listPublicCommentsRules = [
    query('articleId').isUUID().withMessage('Invalid article'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    validate,
];

const listAdminCommentsRules = [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'spam']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate,
];

const updateCommentRules = [
    param('id').isUUID(),
    body('status').isIn(['pending', 'approved', 'rejected', 'spam']).withMessage('Invalid status'),
    validate,
];

module.exports = { createCommentRules, listPublicCommentsRules, listAdminCommentsRules, updateCommentRules };