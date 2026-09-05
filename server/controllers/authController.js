const { supabaseAdmin } = require('../config/supabase');
const { verifyPassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { recordAudit } = require('../services/auditService');

const DEFAULT_LOGIN_ATTEMPT_LIMIT = 5;
const DEFAULT_LOCKOUT_MINUTES = 15;

async function getSecuritySettings() {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'security').single();
  return {
    loginAttemptLimit: data?.value?.login_attempt_limit || DEFAULT_LOGIN_ATTEMPT_LIMIT,
    lockoutMinutes: data?.value?.lockout_minutes || DEFAULT_LOCKOUT_MINUTES,
  };
}

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, password_hash, full_name, status, role_id, failed_login_attempts, locked_until, roles(name)')
    .eq('email', email)
    .single();

  // Deliberately identical error for "no such user" and "wrong password"
  // so the endpoint doesn't leak which emails are registered.
  const invalidCredentials = () => ApiError.unauthorized('Invalid email or password');

  if (error || !user) {
    throw invalidCredentials();
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw ApiError.forbidden('This account is temporarily locked due to repeated failed login attempts. Please try again later.');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('This account has been disabled. Contact an administrator.');
  }

  const passwordValid = await verifyPassword(password, user.password_hash);

  if (!passwordValid) {
    const { loginAttemptLimit, lockoutMinutes } = await getSecuritySettings();
    const attempts = (user.failed_login_attempts || 0) + 1;
    const update = { failed_login_attempts: attempts };
    if (attempts >= loginAttemptLimit) {
      update.locked_until = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
      update.failed_login_attempts = 0;
    }
    await supabaseAdmin.from('users').update(update).eq('id', user.id);
    throw invalidCredentials();
  }

  // Successful login: reset lockout counters, record last login.
  await supabaseAdmin
    .from('users')
    .update({ failed_login_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  const role = user.roles?.name || null;
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role });
  const refreshToken = signRefreshToken({ sub: user.id });

  await recordAudit({
    userId: user.id,
    action: 'admin_logged_in',
    resourceType: 'user',
    resourceId: user.id,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role,
      },
    },
  });
});

/**
 * POST /api/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, status, roles(name)')
    .eq('id', decoded.sub)
    .single();

  if (error || !user || user.status !== 'active') {
    throw ApiError.unauthorized('Unable to refresh session');
  }

  const role = user.roles?.name || null;
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role });

  res.status(200).json({
    success: true,
    data: { accessToken },
  });
});

/**
 * GET /api/auth/me
 */
const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

/**
 * POST /api/auth/logout
 * Stateless JWTs can't be server-invalidated without a blocklist; this
 * endpoint exists for a consistent client contract and audit trail.
 * Clients must discard both tokens on logout.
 */
const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await recordAudit({
      userId: req.user.id,
      action: 'admin_logged_out',
      resourceType: 'user',
      resourceId: req.user.id,
      ipAddress: req.ip,
    });
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

module.exports = { login, refresh, me, logout };
