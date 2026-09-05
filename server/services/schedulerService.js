const { supabaseAdmin } = require('../config/supabase');
const { recordAudit } = require('./auditService');
const { notifySubscribersOfNewArticle } = require('./newsletterNotifyService');

const CHECK_INTERVAL_MS = 60 * 1000; // check every minute

/**
 * Finds articles with status='scheduled' whose scheduled_at has passed
 * and flips them to 'published'. Scheduled articles are never exposed
 * publicly before this runs, because the public article endpoints only
 * ever query status='published'.
 */
async function publishDueArticles() {
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabaseAdmin
    .from('articles')
    .select('id, title, slug, excerpt, featured_image_url')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[scheduler] failed to query due articles:', error.message);
    return;
  }
  if (!due || due.length === 0) return;

  for (const article of due) {
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({ status: 'published', published_at: nowIso, scheduled_at: null })
      .eq('id', article.id);

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error(`[scheduler] failed to publish article ${article.id}:`, updateError.message);
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`[scheduler] published scheduled article: ${article.title} (${article.id})`);
    await recordAudit({
      userId: null,
      action: 'article_auto_published_on_schedule',
      resourceType: 'article',
      resourceId: article.id,
    });
    notifySubscribersOfNewArticle({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      featuredImageUrl: article.featured_image_url,
    }); // fire-and-forget
  }
}

/**
 * Starts the interval. Called once from server.js. Runs an immediate
 * check on boot in case articles came due while the server was down.
 */
function startScheduler() {
  publishDueArticles();
  setInterval(publishDueArticles, CHECK_INTERVAL_MS);
}

module.exports = { startScheduler, publishDueArticles };
