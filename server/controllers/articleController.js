const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateUniqueSlug } = require('../utils/slug');
const { sanitizeArticleContent, stripAllHtml } = require('../utils/sanitize');
const { syncArticleTags } = require('../services/tagService');
const { recordAudit } = require('../services/auditService');
const { notifySubscribersOfNewArticle } = require('../services/newsletterNotifyService');

const PUBLIC_SELECT = `
  id, title, subtitle, slug, content, excerpt, featured_image_url, featured_image_caption,
  featured_image_alt, status, seo_title, seo_description, seo_keywords, canonical_url,
  source, is_featured, is_breaking, breaking_priority, views_count, published_at, created_at, updated_at,
  category:categories(id, name, slug),
  author:users(id, full_name, avatar_url, bio),
  tags:article_tags(tag:tags(id, name, slug))
`;

const ADMIN_SELECT = `${PUBLIC_SELECT}, scheduled_at`;

/**
 * Reshapes a Supabase row (with nested category/author/tags joins) into
 * the flat-ish camelCase JSON shape the frontend expects.
 */
function formatArticle(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    featuredImageUrl: row.featured_image_url,
    featuredImageCaption: row.featured_image_caption,
    featuredImageAlt: row.featured_image_alt,
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoKeywords: row.seo_keywords,
    canonicalUrl: row.canonical_url,
    source: row.source,
    isFeatured: row.is_featured,
    isBreaking: row.is_breaking,
    breakingPriority: row.breaking_priority,
    viewsCount: row.views_count,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.category || null,
    author: row.author || null,
    tags: (row.tags || []).map((t) => t.tag).filter(Boolean),
  };
}

function estimateReadingTimeMinutes(html) {
  const text = stripAllHtml(html);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ----------------------------------------------------------------------
// PUBLIC ENDPOINTS
// ----------------------------------------------------------------------

/**
 * GET /api/articles
 * Public listing — published articles only, with filters + pagination.
 */
const listPublicArticles = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('articles')
    .select(PUBLIC_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);

  if (req.query.category) {
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', req.query.category)
      .single();
    if (!cat) {
      return res.status(200).json({ success: true, data: { articles: [], total: 0, page, pageSize } });
    }
    query = query.eq('category_id', cat.id);
  }

  if (req.query.author) {
    query = query.eq('author_id', req.query.author);
  }

  if (req.query.search) {
    query = query.textSearch('search_vector', req.query.search, { type: 'websearch' });
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  let articles = (data || []).map(formatArticle).map((a) => ({
    ...a,
    readingTimeMinutes: estimateReadingTimeMinutes(a.content),
  }));

  if (req.query.tag) {
    articles = articles.filter((a) => a.tags.some((t) => t.slug === req.query.tag));
  }

  res.status(200).json({
    success: true,
    data: { articles, total: count || 0, page, pageSize },
  });
});

/**
 * GET /api/articles/:slug
 * Public article detail — published only. Records a view.
 */
const getPublicArticleBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const { data: row, error } = await supabaseAdmin
    .from('articles')
    .select(PUBLIC_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !row) {
    throw ApiError.notFound('Article not found');
  }

  // Fire-and-forget view tracking — never blocks the response, and a
  // failure here should never break the article page for the reader.
  supabaseAdmin
    .from('article_views')
    .insert({ article_id: row.id, ip_hash: req.ip ? Buffer.from(req.ip).toString('base64') : null })
    .then(() => {})
    .catch(() => {});
  supabaseAdmin
    .from('articles')
    .update({ views_count: (row.views_count || 0) + 1 })
    .eq('id', row.id)
    .then(() => {})
    .catch(() => {});

  const article = formatArticle(row);
  article.readingTimeMinutes = estimateReadingTimeMinutes(article.content);

  // Related articles: same category, excluding this one.
  let related = [];
  if (row.category?.id) {
    const { data: relatedRows } = await supabaseAdmin
      .from('articles')
      .select(PUBLIC_SELECT)
      .eq('status', 'published')
      .eq('category_id', row.category.id)
      .neq('id', row.id)
      .order('published_at', { ascending: false })
      .limit(4);
    related = (relatedRows || []).map(formatArticle);
  }

  res.status(200).json({ success: true, data: { article, related } });
});

// ----------------------------------------------------------------------
// ADMIN ENDPOINTS
// ----------------------------------------------------------------------

/**
 * GET /api/admin/articles
 * Staff listing — any status, filterable. Authors implicitly see
 * everything here too (frontend can further scope to "mine"), since
 * ownership enforcement happens on write actions, not on visibility of
 * the list itself — reviewers/editors need to see everyone's drafts.
 */
const listAdminArticles = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('articles')
    .select(ADMIN_SELECT, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (req.query.status) {
    query = query.eq('status', req.query.status);
  } else {
    query = query.neq('status', 'trash');
  }
  if (req.query.category) {
    query = query.eq('category_id', req.query.category);
  }
  if (req.query.author) {
    query = query.eq('author_id', req.query.author);
  }
  if (req.query.search) {
    query = query.ilike('title', `%${req.query.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.status(200).json({
    success: true,
    data: { articles: (data || []).map(formatArticle), total: count || 0, page, pageSize },
  });
});

/**
 * GET /api/admin/articles/:id
 */
const getAdminArticleById = asyncHandler(async (req, res) => {
  const { data: row, error } = await supabaseAdmin
    .from('articles')
    .select(ADMIN_SELECT)
    .eq('id', req.params.id)
    .single();

  if (error || !row) throw ApiError.notFound('Article not found');

  res.status(200).json({ success: true, data: { article: formatArticle(row) } });
});

/**
 * POST /api/articles
 * Requires: author, editor, admin, or super_admin.
 */
const createArticle = asyncHandler(async (req, res) => {
  const b = req.body;
  const slug = await generateUniqueSlug(supabaseAdmin, 'articles', b.title);
  const status = b.status || 'draft';
  const now = new Date().toISOString();

  const insertRow = {
    title: b.title,
    subtitle: b.subtitle || null,
    slug,
    content: sanitizeArticleContent(b.content),
    excerpt: b.excerpt ? stripAllHtml(b.excerpt) : null,
    featured_image_url: b.featuredImageUrl || null,
    featured_image_caption: b.featuredImageCaption || null,
    featured_image_alt: b.featuredImageAlt || null,
    category_id: b.categoryId || null,
    author_id: req.user.id,
    status,
    seo_title: b.seoTitle || null,
    seo_description: b.seoDescription || null,
    seo_keywords: b.seoKeywords || null,
    canonical_url: b.canonicalUrl || null,
    source: b.source || null,
    is_featured: !!b.isFeatured,
    is_breaking: !!b.isBreaking,
    breaking_priority: b.breakingPriority || 0,
    scheduled_at: status === 'scheduled' ? b.scheduledAt : null,
    published_at: status === 'published' ? now : null,
  };

  const { data: created, error } = await supabaseAdmin
    .from('articles')
    .insert(insertRow)
    .select(ADMIN_SELECT)
    .single();

  if (error) throw ApiError.internal(error.message);

  if (Array.isArray(b.tags)) {
    await syncArticleTags(created.id, b.tags);
  }

  await recordAudit({
    userId: req.user.id,
    action: 'article_created',
    resourceType: 'article',
    resourceId: created.id,
    metadata: { title: created.title, status: created.status },
    ipAddress: req.ip,
  });

  const { data: fresh } = await supabaseAdmin.from('articles').select(ADMIN_SELECT).eq('id', created.id).single();

  if (fresh.status === 'published') {
    notifySubscribersOfNewArticle(formatArticle(fresh)); // fire-and-forget
  }

  res.status(201).json({ success: true, message: 'Article created', data: { article: formatArticle(fresh) } });
});

/**
 * PUT /api/articles/:id
 * Requires: editor/admin/super_admin, OR the author who owns it
 * (enforced by requireRoleOrOwner + loadArticleOwner in the route).
 */
const updateArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('articles')
    .select('id, title, slug, status, published_at, author_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) throw ApiError.notFound('Article not found');

  // Plain authors may only edit their own articles, and — separately
  // from ownership — should not be the ones flipping something straight
  // to "published"; that stays with editor/admin/super_admin.
  const isElevated = ['editor', 'admin', 'super_admin'].includes(req.user.role);
  if (b.status === 'published' && !isElevated) {
    throw ApiError.forbidden('Only an editor or admin can publish an article');
  }

  const update = {};
  if (b.title !== undefined) update.title = b.title;
  if (b.title !== undefined && b.title !== existing.title) {
    update.slug = await generateUniqueSlug(supabaseAdmin, 'articles', b.title, id);
  }
  if (b.subtitle !== undefined) update.subtitle = b.subtitle;
  if (b.content !== undefined) update.content = sanitizeArticleContent(b.content);
  if (b.excerpt !== undefined) update.excerpt = stripAllHtml(b.excerpt || '');
  if (b.featuredImageUrl !== undefined) update.featured_image_url = b.featuredImageUrl;
  if (b.featuredImageCaption !== undefined) update.featured_image_caption = b.featuredImageCaption;
  if (b.featuredImageAlt !== undefined) update.featured_image_alt = b.featuredImageAlt;
  if (b.categoryId !== undefined) update.category_id = b.categoryId;
  if (b.seoTitle !== undefined) update.seo_title = b.seoTitle;
  if (b.seoDescription !== undefined) update.seo_description = b.seoDescription;
  if (b.seoKeywords !== undefined) update.seo_keywords = b.seoKeywords;
  if (b.canonicalUrl !== undefined) update.canonical_url = b.canonicalUrl;
  if (b.source !== undefined) update.source = b.source;
  if (b.isFeatured !== undefined) update.is_featured = !!b.isFeatured;
  if (b.isBreaking !== undefined) update.is_breaking = !!b.isBreaking;
  if (b.breakingPriority !== undefined) update.breaking_priority = b.breakingPriority;

  if (b.status !== undefined) {
    update.status = b.status;
    if (b.status === 'scheduled') {
      update.scheduled_at = b.scheduledAt;
      update.published_at = null;
    } else if (b.status === 'published' && !existing.published_at) {
      update.published_at = new Date().toISOString();
      update.scheduled_at = null;
    } else if (b.status !== 'published') {
      update.scheduled_at = b.status === 'scheduled' ? update.scheduled_at : null;
    }
  }

  const { error: updateError } = await supabaseAdmin.from('articles').update(update).eq('id', id);
  if (updateError) throw ApiError.internal(updateError.message);

  if (Array.isArray(b.tags)) {
    await syncArticleTags(id, b.tags);
  }

  await recordAudit({
    userId: req.user.id,
    action: 'article_edited',
    resourceType: 'article',
    resourceId: id,
    metadata: { fields: Object.keys(update) },
    ipAddress: req.ip,
  });
  if (update.status === 'published') {
    await recordAudit({
      userId: req.user.id,
      action: 'article_published',
      resourceType: 'article',
      resourceId: id,
      ipAddress: req.ip,
    });
  }

  const { data: fresh } = await supabaseAdmin.from('articles').select(ADMIN_SELECT).eq('id', id).single();

  // Notify subscribers only on the transition INTO published (not on
  // every subsequent edit of an already-published article).
  if (update.status === 'published' && existing.status !== 'published') {
    notifySubscribersOfNewArticle(formatArticle(fresh)); // fire-and-forget
  }

  res.status(200).json({ success: true, message: 'Article updated', data: { article: formatArticle(fresh) } });
});

/**
 * POST /api/articles/:id/duplicate
 */
const duplicateArticle = asyncHandler(async (req, res) => {
  const { data: source, error } = await supabaseAdmin.from('articles').select('*').eq('id', req.params.id).single();
  if (error || !source) throw ApiError.notFound('Article not found');

  const newTitle = `${source.title} (Copy)`;
  const slug = await generateUniqueSlug(supabaseAdmin, 'articles', newTitle);

  const { id, created_at, updated_at, views_count, published_at, scheduled_at, search_vector, ...rest } = source;

  const { data: created, error: insertError } = await supabaseAdmin
    .from('articles')
    .insert({ ...rest, title: newTitle, slug, status: 'draft', author_id: req.user.id, published_at: null, scheduled_at: null, views_count: 0 })
    .select(ADMIN_SELECT)
    .single();

  if (insertError) throw ApiError.internal(insertError.message);

  res.status(201).json({ success: true, message: 'Article duplicated', data: { article: formatArticle(created) } });
});

/**
 * DELETE /api/articles/:id
 * Soft delete: moves to trash. Requires editor/admin/super_admin, or the
 * owning author.
 */
const trashArticle = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('articles').update({ status: 'trash' }).eq('id', req.params.id);
  if (error) throw ApiError.internal(error.message);

  await recordAudit({
    userId: req.user.id,
    action: 'article_deleted',
    resourceType: 'article',
    resourceId: req.params.id,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Article moved to trash' });
});

/**
 * POST /api/articles/:id/restore
 */
const restoreArticle = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('articles').update({ status: 'draft' }).eq('id', req.params.id);
  if (error) throw ApiError.internal(error.message);

  await recordAudit({
    userId: req.user.id,
    action: 'article_restored',
    resourceType: 'article',
    resourceId: req.params.id,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Article restored to draft' });
});

/**
 * DELETE /api/articles/:id/permanent
 * Requires: admin or super_admin only (enforced in route).
 */
const permanentlyDeleteArticle = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('articles').delete().eq('id', req.params.id);
  if (error) throw ApiError.internal(error.message);

  await recordAudit({
    userId: req.user.id,
    action: 'article_permanently_deleted',
    resourceType: 'article',
    resourceId: req.params.id,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Article permanently deleted' });
});

module.exports = {
  listPublicArticles,
  getPublicArticleBySlug,
  listAdminArticles,
  getAdminArticleById,
  createArticle,
  updateArticle,
  duplicateArticle,
  trashArticle,
  restoreArticle,
  permanentlyDeleteArticle,
};
