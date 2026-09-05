const env = require('../config/env');

/**
 * 404 handler — for any request that didn't match a route.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Centralized error handler. Every thrown ApiError (or unexpected error)
 * ends up here via next(err). Returns a consistent JSON shape and never
 * leaks stack traces or internal details to the client in production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Postgres unique-constraint violations that slip through uncaught
  // anywhere in the app (e.g. a genuine simultaneous-request race on a
  // unique column) are a client-fixable "this already exists" case, not
  // a server fault — surface them as 409 rather than an opaque 500.
  if (!err.isApiError && err.code === '23505') {
    return res.status(409).json({ success: false, message: 'That value already exists.' });
  }

  const statusCode = err.isApiError ? err.statusCode : 500;
  const message = err.isApiError ? err.message : 'Something went wrong. Please try again.';

  if (!err.isApiError || statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = {
    success: false,
    message,
  };

  if (err.details) {
    body.details = err.details;
  }

  if (!env.isProduction && !err.isApiError) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = { notFoundHandler, errorHandler };