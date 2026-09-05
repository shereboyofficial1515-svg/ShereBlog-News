const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const jsonRateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  });
};

/**
 * General limiter applied to all /api routes.
 */
const generalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

/**
 * Stricter limiter for auth endpoints (login especially) to slow down
 * credential-stuffing/brute-force attempts. Keyed by IP + email so one
 * IP can't lock out a legitimate user by hammering a different account,
 * and one email can't be brute-forced from many IPs without also
 * tripping the IP-based general limiter.
 */
const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
  keyGenerator: (req) => `${req.ip}:${(req.body && req.body.email) || ''}`,
});

module.exports = { generalLimiter, authLimiter };
