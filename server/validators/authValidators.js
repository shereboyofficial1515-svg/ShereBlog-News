const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after the express-validator chain and turns any failures into a
 * single consistent 422 ApiError instead of each controller having to
 * check validationResult itself.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      ApiError.unprocessable(
        'Validation failed',
        errors.array().map((e) => ({ field: e.path, message: e.msg }))
      )
    );
  }
  next();
};

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
];

const refreshRules = [
  body('refreshToken').isString().notEmpty().withMessage('Refresh token is required'),
  validate,
];

module.exports = { loginRules, refreshRules, validate };
