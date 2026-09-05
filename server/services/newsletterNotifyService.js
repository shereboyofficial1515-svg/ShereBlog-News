const { supabaseAdmin } = require('../config/supabase');
const env = require('../config/env');
const { sendEmail, newArticleNotificationTemplate } = require('./emailService');

/**
 * Fire-and-forget: emails every confirmed subscriber that a new article
 * has been published. Called from articleController right after a
 * publish transition — never awaited by the request, so a slow or
 * partially-failing send never delays the API response to the editor.
 */
async function notifySubscribersOfNewArticle(article) {
  try {
    const { data: subscribers, error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'confirmed');

    if (error || !subscribers || subscribers.length === 0) return;

    const articleUrl = `${env.frontendUrl}/article.html?slug=${encodeURIComponent(article.slug)}`;

    // Sent sequentially with no artificial delay removed on purpose —
    // this is a small-scale, best-effort notifier; a high-volume
    // production deployment would queue these instead of sending inline.
    for (const sub of subscribers) {
      const unsubscribeUrl = `${env.frontendUrl}/unsubscribe.html?email=${encodeURIComponent(sub.email)}`;
      // eslint-disable-next-line no-await-in-loop
      await sendEmail({
        to: sub.email,
        subject: `New on SHEREBLOG NEWS: ${article.title}`,
        html: newArticleNotificationTemplate({
          title: article.title,
          imageUrl: article.featuredImageUrl,
          description: article.excerpt,
          articleUrl,
          unsubscribeUrl,
        }),
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[newsletter-notify] failed to notify subscribers:', err.message);
  }
}

module.exports = { notifySubscribersOfNewArticle };
