const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/audit-logs
 * Requires: admin or super_admin.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('audit_logs')
    .select('id, action, resource_type, resource_id, metadata, ip_address, created_at, user:users(id, full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (req.query.action) query = query.eq('action', req.query.action);
  if (req.query.resourceType) query = query.eq('resource_type', req.query.resourceType);
  if (req.query.userId) query = query.eq('user_id', req.query.userId);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  const logs = (data || []).map((row) => ({
    id: row.id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    user: row.user ? { id: row.user.id, fullName: row.user.full_name, email: row.user.email } : null,
  }));

  res.status(200).json({ success: true, data: { logs, total: count || 0, page, pageSize } });
});

module.exports = { listAuditLogs };
