const express = require('express');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const env = require('./config/env');
const apiRoutes = require('./routes');
const seoController = require('./controllers/seoController');
const { securityHeaders, corsMiddleware } = require('./middleware/security');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { startScheduler } = require('./services/schedulerService');

const app = express();

// --- Core security & performance middleware -------------------------
app.set('trust proxy', 1); // needed for correct req.ip behind a proxy/load balancer
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (!env.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// --- API routes --------------------------------------------------------
app.use('/api', generalLimiter, apiRoutes);

// --- SEO: dynamic sitemap & robots.txt, generated from real content ----
app.get('/sitemap.xml', seoController.getSitemap);
app.get('/robots.txt', seoController.getRobotsTxt);

// --- Static frontends ----------------------------------------------
// Public site and admin dashboard are static HTML/CSS/vanilla-JS,
// served directly by Express. They call the /api routes above via fetch().
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// --- Error handling (must be last) ----------------------------------
app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`SHEREBLOG NEWS server running on port ${env.port} [${env.nodeEnv}]`);
  startScheduler();
});

module.exports = app;
