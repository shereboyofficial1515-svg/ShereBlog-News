const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { recordAudit } = require('../services/auditService');

const VALID_KEYS = ['site', 'seo', 'social', 'breaking_news', 'newsletter', 'publishing', 'security', 'comments'];

/**
 * GET /api/settings/breaking-news
 * Public. Returns only what the breaking-news bar needs — never the
 * full settings object, so nothing internal (e.g. security thresholds)
 * is ever exposed to anonymous visitors.
 */
const getPublicBreakingNews = asyncHandler(async (req, res) => {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'breaking_news').single();
  const bn = data?.value || { enabled: false };

  if (!bn.enabled) {
    return res.status(200).json({ success: true, data: { enabled: false } });
  }

  let article = null;
  if (bn.article_id) {
    const { data: art } = await supabaseAdmin
      .from('articles')
      .select('id, title, slug')
      .eq('id', bn.article_id)
      .eq('status', 'published')
      .single();
    article = art || null;
  }

  res.status(200).json({
    success: true,
    data: { enabled: true, customText: bn.custom_text || null, priority: bn.priority || 0, article },
  });
});

/**
 * GET /api/settings/comments-enabled
 * Public. The public site checks this before showing a comment form —
 * defaults to enabled if the row doesn't exist yet (e.g. on a database
 * provisioned before this key was introduced).
 */
const getPublicCommentsEnabled = asyncHandler(async (req, res) => {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'comments').single();
  const enabled = data?.value?.enabled !== false;
  res.status(200).json({ success: true, data: { enabled } });
});

/**
 * GET /api/admin/settings
 * Staff (admin/super_admin) — returns every settings key as one object.
 */
const getAllSettings = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('settings').select('key, value, updated_at');
  if (error) throw ApiError.internal(error.message);

  const settings = {};
  (data || []).forEach((row) => {
    settings[row.key] = row.value;
  });
  VALID_KEYS.forEach((key) => {
    if (!(key in settings)) settings[key] = {};
  });

  res.status(200).json({ success: true, data: { settings } });
});

/**
 * PUT /api/admin/settings/:key
 * Staff (admin/super_admin) — replaces one settings key's value wholesale.
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.includes(key)) throw ApiError.badRequest(`Unknown settings key: ${key}`);

  // Upsert rather than a plain update: on a database provisioned before
  // a given key existed (e.g. 'comments', added after initial launch),
  // there's no row to update yet — onConflict lets this create it
  // instead of silently failing with "not found".
  const { data: updated, error } = await supabaseAdmin
    .from('settings')
    .upsert({ key, value: req.body, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select('key, value')
    .single();

  if (error || !updated) throw ApiError.internal((error && error.message) || 'Could not update settings');

  await recordAudit({
    userId: req.user.id,
    action: 'settings_changed',
    resourceType: 'settings',
    resourceId: key,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Settings updated', data: { key: updated.key, value: updated.value } });
});

module.exports = { getPublicBreakingNews, getPublicCommentsEnabled, getAllSettings, updateSettings };