const express = require('express');
const submissionController = require('../controllers/submissionController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { updateSubmissionRules, listSubmissionsRules } = require('../validators/submissionValidators');

const router = express.Router();

const MODERATE_ROLES = ['moderator', 'editor', 'admin', 'super_admin'];

router.get('/', requireAuth, requireRole(...MODERATE_ROLES), listSubmissionsRules, submissionController.listSubmissions);
router.get('/:id', requireAuth, requireRole(...MODERATE_ROLES), submissionController.getSubmission);
router.put('/:id', requireAuth, requireRole(...MODERATE_ROLES), updateSubmissionRules, submissionController.updateSubmission);
router.post('/:id/convert', requireAuth, requireRole('editor', 'admin', 'super_admin'), submissionController.convertToArticle);

module.exports = router;
