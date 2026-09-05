const express = require('express');
const newsletterController = require('../controllers/newsletterController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listSubscribersRules } = require('../validators/newsletterValidators');

const router = express.Router();

const MANAGE_ROLES = ['admin', 'super_admin', 'editor'];

router.get('/subscribers', requireAuth, requireRole(...MANAGE_ROLES), listSubscribersRules, newsletterController.listSubscribers);
router.get('/export', requireAuth, requireRole(...MANAGE_ROLES), newsletterController.exportSubscribers);
router.put('/subscribers/:id', requireAuth, requireRole(...MANAGE_ROLES), newsletterController.updateSubscriberStatus);
router.delete('/subscribers/:id', requireAuth, requireRole('admin', 'super_admin'), newsletterController.deleteSubscriber);

module.exports = router;
