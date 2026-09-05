const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { loginRules, refreshRules } = require('../validators/authValidators');

const router = express.Router();

router.post('/login', authLimiter, loginRules, authController.login);
router.post('/refresh', authLimiter, refreshRules, authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
