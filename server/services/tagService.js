const { supabaseAdmin } = require('../config/supabase');
const { slugifyBase } = require('../utils/slug');

/**
 * Given an array of tag name strings, ensures each exists in `tags`
 * (creating any that don't) and returns their ids.
 */
async function upsertTagsByName(tagNames = []) {
  const cleaned = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
  if (cleaned.length === 0) return [];

  const ids = [];
  for (const name of cleaned) {
    const slug = slugifyBase(name);
    const { data: existing } = await supabaseAdmin.from('tags').select('id').eq('slug', slug).single();
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const { data: created, error } = await supabaseAdmin
      .from('tags')
      .insert({ name, slug })
      .select('id')
      .single();
    if (error) throw error;
    ids.push(created.id);
  }
  return ids;
}

/**
 * Replaces an article's tag associations wholesale with the given tag
 * name list (simplest correct approach for an editor "tags" field).
 */
async function syncArticleTags(articleId, tagNames = []) {
  const tagIds = await upsertTagsByName(tagNames);

  await supabaseAdmin.from('article_tags').delete().eq('article_id', articleId);

  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({ article_id: articleId, tag_id: tagId }));
    const { error } = await supabaseAdmin.from('article_tags').insert(rows);
    if (error) throw error;
  }
}

module.exports = { upsertTagsByName, syncArticleTags };
