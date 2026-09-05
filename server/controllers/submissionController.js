const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { stripAllHtml, sanitizeArticleContent } = require('../utils/sanitize');
const { generateUniqueSlug } = require('../utils/slug');
const { recordAudit } = require('../services/auditService');

function formatSubmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    submitterName: row.submitter_name,
    email: row.email,
    phone: row.phone,
    title: row.title,
    category: row.category || null,
    description: row.description,
    fullStory: row.full_story,
    source: row.source,
    location: row.location,
    imageUrl: row.image_url,
    documentUrl: row.document_url,
    consentGiven: row.consent_given,
    status: row.status,
    internalNotes: row.internal_notes,
    reviewedBy: row.reviewer ? { id: row.reviewer.id, fullName: row.reviewer.full_name } : null,
    reviewedAt: row.reviewed_at,
    convertedArticleId: row.converted_article_id,
    createdAt: row.created_at,
  };
}

const SELECT = `
  id, submitter_name, email, phone, title, description, full_story, source, location,
  image_url, document_url, consent_given, status, internal_notes, reviewed_at, converted_article_id, created_at,
  category:categories(id, name, slug),
  reviewer:users!news_submissions_reviewed_by_fkey(id, full_name)
`;

/**
 * POST /api/submissions
 * Public. Never auto-publishes — always lands as 'pending' for review.
 */
const createSubmission = asyncHandler(async (req, res) => {
  const b = req.body;

  const { data: created, error } = await supabaseAdmin
    .from('news_submissions')
    .insert({
      submitter_name: stripAllHtml(b.submitterName),
      email: b.email,
      phone: b.phone ? stripAllHtml(b.phone) : null,
      title: stripAllHtml(b.title),
      category_id: b.categoryId || null,
      description: stripAllHtml(b.description),
      full_story: stripAllHtml(b.fullStory),
      source: b.source ? stripAllHtml(b.source) : null,
      location: b.location ? stripAllHtml(b.location) : null,
      image_url: b.imageUrl || null,
      document_url: b.documentUrl || null,
      consent_given: true,
      status: 'pending',
      internal_notes: b.additionalInfo ? `Submitter's additional info: ${stripAllHtml(b.additionalInfo)}` : null,
    })
    .select('id')
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ success: true, message: 'Thank you — your story has been submitted for review.', data: { id: created.id } });
});

/**
 * GET /api/admin/submissions
 * Staff (moderator and above).
 */
const listSubmissions = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin.from('news_submissions').select(SELECT, { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (req.query.status) query = query.eq('status', req.query.status);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.status(200).json({ success: true, data: { submissions: (data || []).map(formatSubmission), total: count || 0, page, pageSize } });
});

/**
 * GET /api/admin/submissions/:id
 */
const getSubmission = asyncHandler(async (req, res) => {
  const { data: row, error } = await supabaseAdmin.from('news_submissions').select(SELECT).eq('id', req.params.id).single();
  if (error || !row) throw ApiError.notFound('Submission not found');
  res.status(200).json({ success: true, data: { submission: formatSubmission(row) } });
});

/**
 * PUT /api/admin/submissions/:id
 * Approve / reject / archive / mark reviewed / add internal notes.
 */
const updateSubmission = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.status !== undefined) {
    update.status = req.body.status;
    update.reviewed_by = req.user.id;
    update.reviewed_at = new Date().toISOString();
  }
  if (req.body.internalNotes !== undefined) update.internal_notes = stripAllHtml(req.body.internalNotes || '');

  const { data: updated, error } = await supabaseAdmin.from('news_submissions').update(update).eq('id', req.params.id).select(SELECT).single();
  if (error || !updated) throw ApiError.notFound('Submission not found');

  await recordAudit({
    userId: req.user.id,
    action: req.body.status === 'approved' ? 'submission_approved' : req.body.status === 'rejected' ? 'submission_rejected' : 'submission_updated',
    resourceType: 'news_submission',
    resourceId: req.params.id,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Submission updated', data: { submission: formatSubmission(updated) } });
});

/**
 * POST /api/admin/submissions/:id/convert
 * Turns an approved submission into a new article draft, pre-filled
 * from the submission, ready for an editor to polish in the article
 * editor. Never publishes directly.
 */
const convertToArticle = asyncHandler(async (req, res) => {
  const { data: submission, error: fetchError } = await supabaseAdmin.from('news_submissions').select('*').eq('id', req.params.id).single();
  if (fetchError || !submission) throw ApiError.notFound('Submission not found');

  const slug = await generateUniqueSlug(supabaseAdmin, 'articles', submission.title);
  const contentHtml = `<p>${sanitizeArticleContent(submission.full_story).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;

  const { data: article, error: insertError } = await supabaseAdmin
    .from('articles')
    .insert({
      title: submission.title,
      slug,
      content: contentHtml,
      excerpt: submission.description,
      category_id: submission.category_id,
      author_id: req.user.id,
      status: 'draft',
      source: submission.source || `Reader submission from ${submission.submitter_name}`,
      featured_image_url: submission.image_url,
    })
    .select('id, slug')
    .single();

  if (insertError) throw ApiError.internal(insertError.message);

  await supabaseAdmin.from('news_submissions').update({ converted_article_id: article.id, status: 'approved', reviewed_by: req.user.id, reviewed_at: new Date().toISOString() }).eq('id', submission.id);

  await recordAudit({
    userId: req.user.id,
    action: 'submission_converted_to_article',
    resourceType: 'news_submission',
    resourceId: submission.id,
    metadata: { articleId: article.id },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, message: 'Submission converted to a draft article', data: { articleId: article.id } });
});

module.exports = { createSubmission, listSubmissions, getSubmission, updateSubmission, convertToArticle };
