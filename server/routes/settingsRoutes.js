const express = require('express');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

router.get('/breaking-news', settingsController.getPublicBreakingNews);
router.get('/comments-enabled', settingsController.getPublicCommentsEnabled);
router.get('/branding', settingsController.getPublicBranding);

module.exports = router;
