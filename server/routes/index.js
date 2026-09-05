const express = require('express');
const authRoutes = require('./authRoutes');
const articleRoutes = require('./articleRoutes');
const adminArticleRoutes = require('./adminArticleRoutes');
const categoryRoutes = require('./categoryRoutes');
const adminCategoryRoutes = require('./adminCategoryRoutes');
const tagRoutes = require('./tagRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const mediaRoutes = require('./mediaRoutes');
const newsletterRoutes = require('./newsletterRoutes');
const adminNewsletterRoutes = require('./adminNewsletterRoutes');
const submissionRoutes = require('./submissionRoutes');
const adminSubmissionRoutes = require('./adminSubmissionRoutes');
const settingsRoutes = require('./settingsRoutes');
const adminSettingsRoutes = require('./adminSettingsRoutes');
const adminUserRoutes = require('./adminUserRoutes');
const adminAuditLogRoutes = require('./adminAuditLogRoutes');
const adminAnalyticsRoutes = require('./adminAnalyticsRoutes');
const commentRoutes = require('./commentRoutes');
const adminCommentRoutes = require('./adminCommentRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/articles', articleRoutes);
router.use('/admin/articles', adminArticleRoutes);
router.use('/categories', categoryRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/tags', tagRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/media', mediaRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/admin/newsletter', adminNewsletterRoutes);
router.use('/submissions', submissionRoutes);
router.use('/admin/submissions', adminSubmissionRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin/settings', adminSettingsRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/admin/audit-logs', adminAuditLogRoutes);
router.use('/admin/analytics', adminAnalyticsRoutes);
router.use('/comments', commentRoutes);
router.use('/admin/comments', adminCommentRoutes);

// Not yet built: full-text /search is currently served by GET /articles?search=
// (see articleRoutes) rather than a separate endpoint.

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'SHEREBLOG NEWS API is running' });
});

module.exports = router;