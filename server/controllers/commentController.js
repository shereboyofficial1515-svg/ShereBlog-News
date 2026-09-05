const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { stripAllHtml } = require('../utils/sanitize');
const { recordAudit } = require('../services/auditService');

function formatComment(row) {
    if (!row) return null;
    return {
        id: row.id,
        articleId: row.article_id,
        name: row.name,
        email: row.email,
        content: row.content,
        status: row.status,
        createdAt: row.created_at,
    };
}

// Public-facing shape never includes the commenter's email.
function formatPublicComment(row) {
    const c = formatComment(row);
    delete c.email;
    delete c.articleId;
    return c;
}

/**
 * POST /api/comments
 * Public. Always lands as 'pending' — never auto-approved, per spec §40.
 * A hidden honeypot field ("website") catches naive bots: it's blank for
 * real users (hidden via CSS) and the validator rejects any submission
 * where it's filled in.
 */
const createComment = asyncHandler(async (req, res) => {
    const { data: commentsSetting } = await supabaseAdmin.from('settings').select('value').eq('key', 'comments').single();
    if (commentsSetting?.value?.enabled === false) {
        throw ApiError.forbidden('Comments are currently disabled on this site.');
    }

    const { data: article } = await supabaseAdmin.from('articles').select('id').eq('id', req.body.articleId).eq('status', 'published').single();
    if (!article) throw ApiError.badRequest('Article not found');

    const { data: created, error } = await supabaseAdmin
        .from('comments')
        .insert({
            article_id: req.body.articleId,
            name: stripAllHtml(req.body.name),
            email: req.body.email,
            content: stripAllHtml(req.body.content),
            status: 'pending',
        })
        .select('id')
        .single();

    if (error) throw ApiError.internal(error.message);

    res.status(201).json({ success: true, message: 'Thanks — your comment is awaiting moderation.', data: { id: created.id } });
});

/**
 * GET /api/comments?articleId=...
 * Public. Approved comments only, paginated.
 */
const listPublicComments = asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabaseAdmin
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('article_id', req.query.articleId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) throw ApiError.internal(error.message);

    res.status(200).json({ success: true, data: { comments: (data || []).map(formatPublicComment), total: count || 0, page, pageSize } });
});

/**
 * GET /api/admin/comments
 * Staff. All statuses, filterable.
 */
const listAdminComments = asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
        .from('comments')
        .select('*, article:articles(id, title, slug)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (req.query.status) query = query.eq('status', req.query.status);
    else query = query.eq('status', 'pending');

    const { data, error, count } = await query;
    if (error) throw ApiError.internal(error.message);

    const comments = (data || []).map((row) => ({ ...formatComment(row), article: row.article }));

    res.status(200).json({ success: true, data: { comments, total: count || 0, page, pageSize } });
});

/**
 * PUT /api/admin/comments/:id
 * Staff. Approve / reject / mark spam / move back to pending.
 */
const updateComment = asyncHandler(async (req, res) => {
    const { data: updated, error } = await supabaseAdmin
        .from('comments')
        .update({ status: req.body.status })
        .eq('id', req.params.id)
        .select('*')
        .single();

    if (error || !updated) throw ApiError.notFound('Comment not found');

    await recordAudit({
        userId: req.user.id,
        action: `comment_${req.body.status}`,
        resourceType: 'comment',
        resourceId: req.params.id,
        ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Comment updated', data: { comment: formatComment(updated) } });
});

/**
 * DELETE /api/admin/comments/:id
 * Staff.
 */
const deleteComment = asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin.from('comments').delete().eq('id', req.params.id);
    if (error) throw ApiError.internal(error.message);

    await recordAudit({ userId: req.user.id, action: 'comment_deleted', resourceType: 'comment', resourceId: req.params.id, ipAddress: req.ip });

    res.status(200).json({ success: true, message: 'Comment deleted' });
});

module.exports = { createComment, listPublicComments, listAdminComments, updateComment, deleteComment };