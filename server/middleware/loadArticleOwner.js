const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Looks up the article referenced by req.params.id, attaches it to
 * req.article, and sets req.resourceOwnerId to its author_id so that
 * requireRoleOrOwner() can decide whether the current user may act on it
 * (e.g. an author editing only their own articles).
 */
const loadArticleOwner = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .select('id, author_id, status')
    .eq('id', id)
    .single();

  if (error || !article) {
    throw ApiError.notFound('Article not found');
  }

  req.article = article;
  req.resourceOwnerId = article.author_id;
  next();
});

module.exports = { loadArticleOwner };
