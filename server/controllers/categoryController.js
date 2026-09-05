const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateUniqueSlug } = require('../utils/slug');
const { recordAudit } = require('../services/auditService');

function formatCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/categories
 * Public — active categories only, ordered for the main nav.
 */
const listPublicCategories = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw ApiError.internal(error.message);
  res.status(200).json({ success: true, data: { categories: (data || []).map(formatCategory) } });
});

/**
 * GET /api/categories/:slug
 * Public category page: category info + a page of its published articles.
 */
const getPublicCategoryBySlug = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: category, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('slug', req.params.slug)
    .eq('is_active', true)
    .single();

  if (error || !category) throw ApiError.notFound('Category not found');

  const { data: articles, count } = await supabaseAdmin
    .from('articles')
    .select(
      'id, title, slug, excerpt, featured_image_url, featured_image_alt, published_at, author:users(id, full_name, avatar_url), category:categories(id, name, slug)',
      { count: 'exact' }
    )
    .eq('status', 'published')
    .eq('category_id', category.id)
    .order('published_at', { ascending: false })
    .range(from, to);

  // Reshape to the same camelCase card shape used everywhere else on the
  // public site, so category.html can reuse the shared newsCard() renderer
  // without needing a second, slightly-different card template.
  const formattedArticles = (articles || []).map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    featuredImageUrl: a.featured_image_url,
    featuredImageAlt: a.featured_image_alt,
    publishedAt: a.published_at,
    author: a.author ? { id: a.author.id, fullName: a.author.full_name, avatarUrl: a.author.avatar_url } : null,
    category: a.category,
  }));

  res.status(200).json({
    success: true,
    data: {
      category: formatCategory(category),
      articles: formattedArticles,
      total: count || 0,
      page,
      pageSize,
    },
  });
});

/**
 * GET /api/admin/categories
 * Staff — all categories including inactive, for the management screen.
 */
const listAdminCategories = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('categories').select('*').order('sort_order', { ascending: true });
  if (error) throw ApiError.internal(error.message);
  res.status(200).json({ success: true, data: { categories: (data || []).map(formatCategory) } });
});

/**
 * POST /api/categories
 * Requires: admin or super_admin.
 */
const createCategory = asyncHandler(async (req, res) => {
  const b = req.body;
  const slug = await generateUniqueSlug(supabaseAdmin, 'categories', b.name);

  const { data: created, error } = await supabaseAdmin
    .from('categories')
    .insert({
      name: b.name,
      slug,
      description: b.description || null,
      image_url: b.imageUrl || null,
      seo_title: b.seoTitle || null,
      seo_description: b.seoDescription || null,
      is_active: b.isActive !== undefined ? b.isActive : true,
      sort_order: b.sortOrder || 0,
    })
    .select('*')
    .single();

  if (error) throw ApiError.internal(error.message);

  await recordAudit({
    userId: req.user.id,
    action: 'category_created',
    resourceType: 'category',
    resourceId: created.id,
    metadata: { name: created.name },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, message: 'Category created', data: { category: formatCategory(created) } });
});

/**
 * PUT /api/categories/:id
 * Requires: admin or super_admin.
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('id', id)
    .single();
  if (fetchError || !existing) throw ApiError.notFound('Category not found');

  const update = {};
  if (b.name !== undefined) {
    update.name = b.name;
    if (b.name !== existing.name) {
      update.slug = await generateUniqueSlug(supabaseAdmin, 'categories', b.name, id);
    }
  }
  if (b.description !== undefined) update.description = b.description;
  if (b.imageUrl !== undefined) update.image_url = b.imageUrl;
  if (b.seoTitle !== undefined) update.seo_title = b.seoTitle;
  if (b.seoDescription !== undefined) update.seo_description = b.seoDescription;
  if (b.isActive !== undefined) update.is_active = b.isActive;
  if (b.sortOrder !== undefined) update.sort_order = b.sortOrder;

  const { data: updated, error } = await supabaseAdmin
    .from('categories')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw ApiError.internal(error.message);

  await recordAudit({
    userId: req.user.id,
    action: 'category_edited',
    resourceType: 'category',
    resourceId: id,
    metadata: { fields: Object.keys(update) },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Category updated', data: { category: formatCategory(updated) } });
});

/**
 * DELETE /api/categories/:id
 * Requires: admin or super_admin. Refuses to delete a category that
 * still has articles unless a replacementCategoryId is supplied, in
 * which case those articles are reassigned first.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { replacementCategoryId } = req.body;

  const { count } = await supabaseAdmin
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    if (!replacementCategoryId) {
      throw ApiError.conflict(
        `This category has ${count} article(s). Provide replacementCategoryId to reassign them before deleting, or choose a different category to delete.`
      );
    }
    if (replacementCategoryId === id) {
      throw ApiError.badRequest('Replacement category must be different from the category being deleted');
    }
    const { data: replacement } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', replacementCategoryId)
      .single();
    if (!replacement) throw ApiError.badRequest('Replacement category not found');

    await supabaseAdmin.from('articles').update({ category_id: replacementCategoryId }).eq('category_id', id);
  }

  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
  if (error) throw ApiError.internal(error.message);

  await recordAudit({
    userId: req.user.id,
    action: 'category_deleted',
    resourceType: 'category',
    resourceId: id,
    metadata: { reassignedTo: replacementCategoryId || null, articleCount: count || 0 },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Category deleted' });
});

module.exports = {
  listPublicCategories,
  getPublicCategoryBySlug,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
