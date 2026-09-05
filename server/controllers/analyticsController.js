const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/analytics
 * Requires: editor, admin, or super_admin. Every number here is a real
 * aggregate query — no synthetic/sample data.
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 14;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [totalViewsRes, topArticlesRes, recentViewsRes, categoriesRes] = await Promise.all([
    supabaseAdmin.from('article_views').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('articles')
      .select('id, title, slug, views_count, category:categories(name)')
      .eq('status', 'published')
      .order('views_count', { ascending: false })
      .limit(10),
    supabaseAdmin.from('article_views').select('viewed_at, article_id').gte('viewed_at', since),
    supabaseAdmin.from('categories').select('id, name'),
  ]);

  if (totalViewsRes.error) throw ApiError.internal(totalViewsRes.error.message);

  // Views-by-day trend, computed in JS from raw rows (avoids requiring a
  // custom Postgres function just for a date_trunc grouping).
  const dayBuckets = {};
  for (let i = 0; i < days; i += 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dayBuckets[d] = 0;
  }
  (recentViewsRes.data || []).forEach((v) => {
    const day = v.viewed_at.slice(0, 10);
    if (day in dayBuckets) dayBuckets[day] += 1;
  });
  const trend = Object.entries(dayBuckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, views]) => ({ date, views }));

  // Views by category: join published articles' views_count grouped by
  // category, computed in JS from a single query rather than N+1 calls.
  const { data: articlesWithCategory } = await supabaseAdmin
    .from('articles')
    .select('views_count, category:categories(id, name)')
    .eq('status', 'published');

  const byCategory = {};
  (articlesWithCategory || []).forEach((a) => {
    const name = a.category?.name || 'Uncategorized';
    byCategory[name] = (byCategory[name] || 0) + (a.views_count || 0);
  });
  const viewsByCategory = Object.entries(byCategory)
    .map(([category, views]) => ({ category, views }))
    .sort((a, b) => b.views - a.views);

  res.status(200).json({
    success: true,
    data: {
      totalViewsAllTime: totalViewsRes.count || 0,
      totalViewsRecent: (recentViewsRes.data || []).length,
      recentDays: days,
      trend,
      viewsByCategory,
      topArticles: (topArticlesRes.data || []).map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        viewsCount: a.views_count,
        category: a.category?.name || null,
      })),
    },
  });
});

module.exports = { getAnalytics };
