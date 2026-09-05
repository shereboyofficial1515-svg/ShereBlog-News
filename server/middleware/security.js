const helmet = require('helmet');
const cors = require('cors');
const env = require('../config/env');

/**
 * Helmet sets a broad set of secure HTTP headers (X-Content-Type-Options,
 * X-Frame-Options, Strict-Transport-Security, a Content-Security-Policy,
 * etc). CSP is scoped to only what the public/admin frontends actually
 * need — tighten further once external embeds (video/social) are added.
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", env.supabase.url].filter(Boolean),
      // Allows the Contact page's embedded Google Maps location iframe.
      frameSrc: ["'self'", 'https://maps.google.com', 'https://www.google.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: env.isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * CORS is locked to the configured frontend origin — the API is not
 * intended to be called from arbitrary third-party origins in the browser.
 */
const corsOptions = {
  origin: env.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = {
  securityHeaders,
  corsMiddleware: cors(corsOptions),
};