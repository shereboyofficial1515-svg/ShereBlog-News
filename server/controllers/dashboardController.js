const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function countArticlesByStatus(status) {
  const { count } = await supabaseAdmin
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  return count || 0;
}

/**
 * GET /api/admin/dashboard/stats
 * Every number here is a real query — no placeholder counts. Tables for
 * submissions/subscribers already exist from the Phase 1 schema even
 * though their full CRUD API lands in a later phase, so their counts are
 * genuine now and will start moving once that phase ships.
 */
const getStats = asyncHandler(async (req, res) => {
  const [
    totalArticles,
    published,
    drafts,
    scheduled,
    pendingReview,
    { count: totalUsers },
    { count: pendingSubmissions },
    { count: newsletterSubscribers },
    { data: recentActivity },
    { data: mostRead },
  ] = await Promise.all([
    supabaseAdmin.from('articles').select('id', { count: 'exact', head: true }).neq('status', 'trash'),
    countArticlesByStatus('published'),
    countArticlesByStatus('draft'),
    countArticlesByStatus('scheduled'),
    countArticlesByStatus('pending_review'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('news_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabaseAdmin
      .from('audit_logs')
      .select('id, action, resource_type, resource_id, metadata, created_at, user:users(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('articles')
      .select('id, title, slug, views_count')
      .eq('status', 'published')
      .order('views_count', { ascending: false })
      .limit(5),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalArticles: totalArticles.count || 0,
      published,
      drafts,
      scheduled,
      pendingReview,
      totalUsers: totalUsers || 0,
      pendingSubmissions: pendingSubmissions || 0,
      newsletterSubscribers: newsletterSubscribers || 0,
      recentActivity: (recentActivity || []).map((a) => ({
        id: a.id,
        action: a.action,
        resourceType: a.resource_type,
        resourceId: a.resource_id,
        metadata: a.metadata,
        createdAt: a.created_at,
        userName: a.user?.full_name || 'System',
      })),
      mostReadArticles: (mostRead || []).map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        viewsCount: m.views_count,
      })),
    },
  });
});

module.exports = { getStats };
