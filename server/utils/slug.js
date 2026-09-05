const slugify = require('slugify');

const slugifyOptions = { lower: true, strict: true, trim: true };

/**
 * Turns a title into a URL-safe slug base, e.g. "Breaking: Big News!"
 * -> "breaking-big-news".
 */
function slugifyBase(text) {
  return slugify(text, slugifyOptions);
}

/**
 * Generates a slug guaranteed to be unique within `table` (checked via the
 * provided Supabase client), appending -2, -3, ... on collision. Pass the
 * current record's id via excludeId when updating, so a record doesn't
 * collide with its own existing slug.
 */
async function generateUniqueSlug(supabase, table, text, excludeId = null) {
  const base = slugifyBase(text) || 'untitled';
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).select('id').eq('slug', candidate).limit(1);
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

module.exports = { slugifyBase, generateUniqueSlug };
