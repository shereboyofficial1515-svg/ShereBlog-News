const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { recordAudit } = require('../services/auditService');
const { sendEmail, newsletterConfirmationTemplate } = require('../services/emailService');

function formatSubscriber(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    subscribedAt: row.subscribed_at,
    unsubscribedAt: row.unsubscribed_at,
  };
}

/**
 * POST /api/newsletter/subscribe
 * Public. Double opt-in: stores as 'pending' and emails a confirmation
 * link — a subscriber only counts as active once they click it.
 */
const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(24).toString('hex');

  // Insert first, and only fall back to an update if the row already
  // exists. This makes the endpoint safe against two near-simultaneous
  // requests for the same email (double-click, retry, etc.) — the
  // database's unique constraint on `email` is the single source of
  // truth for "does this row exist," not a separate check-then-act
  // query that a second request could race past before the first
  // request's insert lands.
  const { data: created, error: insertError } = await supabaseAdmin
    .from('newsletter_subscribers')
    .insert({ email, status: 'pending', confirmation_token: token })
    .select('id, status')
    .single();

  if (insertError) {
    const isDuplicate = insertError.code === '23505';
    if (!isDuplicate) throw ApiError.internal(insertError.message);

    const { data: existing } = await supabaseAdmin.from('newsletter_subscribers').select('id, status').eq('email', email).single();

    if (existing && existing.status === 'confirmed') {
      return res.status(200).json({ success: true, message: 'You are already subscribed.' });
    }

    // Row exists but isn't confirmed yet (pending or previously
    // unsubscribed) — re-issue a fresh confirmation token for it.
    if (existing) {
      await supabaseAdmin.from('newsletter_subscribers').update({ confirmation_token: token, status: 'pending' }).eq('id', existing.id);
    }
  }

  const confirmUrl = `${env.frontendUrl}/api/newsletter/confirm?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Confirm your SHEREBLOG NEWS subscription',
    html: newsletterConfirmationTemplate({ confirmUrl }),
  });

  res.status(201).json({ success: true, message: 'Check your inbox to confirm your subscription.' });
});

/**
 * GET /api/newsletter/confirm?token=...
 * Public. Confirms a pending subscription.
 */
const confirm = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw ApiError.badRequest('Missing confirmation token');

  const { data: subscriber, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .update({ status: 'confirmed', confirmation_token: null })
    .eq('confirmation_token', token)
    .select('*')
    .single();

  if (error || !subscriber) {
    return res.redirect(`${env.frontendUrl}/newsletter-confirmed.html?status=invalid`);
  }

  res.redirect(`${env.frontendUrl}/newsletter-confirmed.html?status=success`);
});

/**
 * POST /api/newsletter/unsubscribe
 * Public.
 */
const unsubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('email', email);
  if (error) throw ApiError.internal(error.message);

  res.status(200).json({ success: true, message: 'You have been unsubscribed.' });
});

/**
 * GET /api/admin/newsletter/subscribers
 * Staff.
 */
const listSubscribers = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('newsletter_subscribers')
    .select('*', { count: 'exact' })
    .order('subscribed_at', { ascending: false })
    .range(from, to);

  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.search) query = query.ilike('email', `%${req.query.search}%`);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.status(200).json({ success: true, data: { subscribers: (data || []).map(formatSubscriber), total: count || 0, page, pageSize } });
});

/**
 * GET /api/admin/newsletter/export
 * Staff — returns CSV.
 */
const exportSubscribers = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('email, status, subscribed_at, unsubscribed_at')
    .order('subscribed_at', { ascending: false });
  if (error) throw ApiError.internal(error.message);

  const header = 'email,status,subscribed_at,unsubscribed_at\n';
  const rows = (data || [])
    .map((r) => [r.email, r.status, r.subscribed_at || '', r.unsubscribed_at || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
  res.status(200).send(header + rows);
});

/**
 * PUT /api/admin/newsletter/subscribers/:id
 * Staff — disable (unsubscribe) a subscriber on their behalf.
 */
const updateSubscriberStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'unsubscribed'].includes(status)) throw ApiError.badRequest('Invalid status');

  const update = { status };
  if (status === 'unsubscribed') update.unsubscribed_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .update(update)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error || !updated) throw ApiError.notFound('Subscriber not found');

  res.status(200).json({ success: true, message: 'Subscriber updated', data: { subscriber: formatSubscriber(updated) } });
});

/**
 * DELETE /api/admin/newsletter/subscribers/:id
 * Staff.
 */
const deleteSubscriber = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('newsletter_subscribers').delete().eq('id', req.params.id);
  if (error) throw ApiError.internal(error.message);

  await recordAudit({ userId: req.user.id, action: 'newsletter_subscriber_deleted', resourceType: 'newsletter_subscriber', resourceId: req.params.id, ipAddress: req.ip });

  res.status(200).json({ success: true, message: 'Subscriber deleted' });
});

module.exports = { subscribe, confirm, unsubscribe, listSubscribers, exportSubscribers, updateSubscriberStatus, deleteSubscriber };