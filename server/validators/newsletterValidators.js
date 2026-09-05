const { body, query } = require('express-validator');
const { validate } = require('./authValidators');

const subscribeRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  validate,
];

const unsubscribeRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  validate,
];

const listSubscribersRules = [
  query('status').optional().isIn(['pending', 'confirmed', 'unsubscribed']),
  query('search').optional().isString().trim().isLength({ max: 200 }),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
];

module.exports = { subscribeRules, unsubscribeRules, listSubscribersRules };
