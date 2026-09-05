const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword } = require('../utils/password');
const { recordAudit } = require('../services/auditService');

function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    role: row.roles?.name || null,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

const SELECT = 'id, email, full_name, avatar_url, bio, status, last_login_at, created_at, roles(name)';

/**
 * GET /api/admin/users
 * Requires: admin or super_admin.
 */
const listUsers = asyncHandler(async (req, res) => {
  let query = supabaseAdmin.from('users').select(SELECT).order('created_at', { ascending: false });
  if (req.query.search) query = query.ilike('email', `%${req.query.search}%`);

  const { data, error } = await query;
  if (error) throw ApiError.internal(error.message);

  res.status(200).json({ success: true, data: { users: (data || []).map(formatUser) } });
});

/**
 * POST /api/admin/users
 * Requires: admin or super_admin. Only a super_admin may create another
 * super_admin — an ordinary admin escalating their own privileges (or
 * anyone else's) to the top role is exactly the kind of thing frontend
 * button-hiding can't be trusted to prevent, so it's enforced here.
 */
const createUser = asyncHandler(async (req, res) => {
  const { email, fullName, password, role } = req.body;

  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    throw ApiError.forbidden('Only a Super Admin can create another Super Admin');
  }

  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const { data: roleRow, error: roleError } = await supabaseAdmin.from('roles').select('id').eq('name', role).single();
  if (roleError || !roleRow) throw ApiError.badRequest('Invalid role');

  const passwordHash = await hashPassword(password);

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({ email, full_name: fullName, password_hash: passwordHash, role_id: roleRow.id, status: 'active' })
    .select(SELECT)
    .single();

  if (error) throw ApiError.internal(error.message);

  await recordAudit({ userId: req.user.id, action: 'user_created', resourceType: 'user', resourceId: created.id, metadata: { email, role }, ipAddress: req.ip });

  res.status(201).json({ success: true, message: 'User created', data: { user: formatUser(created) } });
});

/**
 * PUT /api/admin/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body;

  if (b.role === 'super_admin' && req.user.role !== 'super_admin') {
    throw ApiError.forbidden('Only a Super Admin can grant the Super Admin role');
  }
  if (id === req.user.id && b.status === 'disabled') {
    throw ApiError.badRequest('You cannot disable your own account');
  }

  const update = {};
  if (b.fullName !== undefined) update.full_name = b.fullName;
  if (b.bio !== undefined) update.bio = b.bio;
  if (b.status !== undefined) update.status = b.status;
  if (b.role !== undefined) {
    const { data: roleRow, error: roleError } = await supabaseAdmin.from('roles').select('id').eq('name', b.role).single();
    if (roleError || !roleRow) throw ApiError.badRequest('Invalid role');
    update.role_id = roleRow.id;
  }

  const { data: updated, error } = await supabaseAdmin.from('users').update(update).eq('id', id).select(SELECT).single();
  if (error || !updated) throw ApiError.notFound('User not found');

  await recordAudit({ userId: req.user.id, action: b.status === 'disabled' ? 'user_disabled' : 'user_edited', resourceType: 'user', resourceId: id, metadata: { fields: Object.keys(update) }, ipAddress: req.ip });

  res.status(200).json({ success: true, message: 'User updated', data: { user: formatUser(updated) } });
});

/**
 * POST /api/admin/users/:id/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const passwordHash = await hashPassword(req.body.newPassword);
  const { error } = await supabaseAdmin
    .from('users')
    .update({ password_hash: passwordHash, failed_login_attempts: 0, locked_until: null })
    .eq('id', req.params.id);
  if (error) throw ApiError.internal(error.message);

  await recordAudit({ userId: req.user.id, action: 'user_password_reset', resourceType: 'user', resourceId: req.params.id, ipAddress: req.ip });

  res.status(200).json({ success: true, message: "User's password has been reset" });
});

/**
 * DELETE /api/admin/users/:id
 * Requires: super_admin only — permanently removing an account is
 * higher-stakes than disabling it, so it's restricted further.
 */
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account');

  const { error } = await supabaseAdmin.from('users').delete().eq('id', req.params.id);
  if (error) throw ApiError.internal(error.message);

  await recordAudit({ userId: req.user.id, action: 'user_deleted', resourceType: 'user', resourceId: req.params.id, ipAddress: req.ip });

  res.status(200).json({ success: true, message: 'User deleted' });
});

module.exports = { listUsers, createUser, updateUser, resetPassword, deleteUser };
