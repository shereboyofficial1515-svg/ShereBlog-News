const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/tags
 * Public — all tags, for tag clouds / filter UIs.
 */
const listTags = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('tags').select('id, name, slug').order('name', { ascending: true });
  if (error) throw ApiError.internal(error.message);
  res.status(200).json({ success: true, data: { tags: data || [] } });
});

module.exports = { listTags };
