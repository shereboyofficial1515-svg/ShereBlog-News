/**
 * Wraps an async Express route handler so rejected promises are forwarded
 * to next() and handled by the centralized error handler, instead of
 * needing a try/catch in every single controller function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
