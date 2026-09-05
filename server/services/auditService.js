const { supabaseAdmin } = require('../config/supabase');

/**
 * Records an admin/staff action to the audit_logs table.
 * Fire-and-forget by design: an audit-log failure should never block or
 * fail the primary request, but it is logged to the server console so
 * it doesn't disappear silently.
 *
 * NEVER pass passwords, tokens, or other secrets in `metadata`.
 */
async function recordAudit({ userId, action, resourceType = null, resourceId = null, metadata = {}, ipAddress = null }) {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      ip_address: ipAddress,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[audit] failed to record audit log:', error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] unexpected error recording audit log:', err);
  }
}

module.exports = { recordAudit };
