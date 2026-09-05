const { supabaseAdmin } = require('../config/supabase');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * GET /sitemap.xml
 * Generated live from real published articles and active categories —
 * not a static file, so it never goes stale as content changes.
 */
const getSitemap = asyncHandler(async (req, res) => {
  const base = env.frontendUrl;

  const [{ data: articles }, { data: categories }] = await Promise.all([
    supabaseAdmin.from('articles').select('slug, updated_at').eq('status', 'published').order('published_at', { ascending: false }),
    supabaseAdmin.from('categories').select('slug, updated_at').eq('is_active', true),
  ]);

  const staticUrls = ['/index.html', '/search.html', '/submit-news.html'];

  let urls = staticUrls.map((path) => `  <url><loc>${xmlEscape(base + path)}</loc></url>`).join('\n');

  (categories || []).forEach((c) => {
    urls += `\n  <url><loc>${xmlEscape(`${base}/category.html?slug=${c.slug}`)}</loc><lastmod>${new Date(c.updated_at).toISOString()}</lastmod></url>`;
  });

  (articles || []).forEach((a) => {
    urls += `\n  <url><loc>${xmlEscape(`${base}/article.html?slug=${a.slug}`)}</loc><lastmod>${new Date(a.updated_at).toISOString()}</lastmod></url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
});

/**
 * GET /robots.txt
 */
const getRobotsTxt = asyncHandler(async (req, res) => {
  const base = env.frontendUrl;
  const body = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`;
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(body);
});

module.exports = { getSitemap, getRobotsTxt };
