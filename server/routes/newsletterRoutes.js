const express = require('express');
const newsletterController = require('../controllers/newsletterController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { subscribeRules, unsubscribeRules } = require('../validators/newsletterValidators');

const router = express.Router();

// --- Public ------------------------------------------------------------
router.post('/subscribe', subscribeRules, newsletterController.subscribe);
router.get('/confirm', newsletterController.confirm);
router.post('/unsubscribe', unsubscribeRules, newsletterController.unsubscribe);

module.exports = router;
