const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Requires a valid access token. Attaches { id, email, role } to req.user.
 * This is a hard authentication gate — it does NOT check permissions,
 * only identity. Use requireRole()/requirePermission() after this for
 * authorization.
 */
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Authentication token missing');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    // Re-check the user still exists and is active on every request —
    // a disabled/deleted user's old token must stop working immediately,
    // not just at next expiry.
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, status, role_id, roles(name)')
      .eq('id', decoded.sub)
      .single();

    if (error || !user) {
      throw ApiError.unauthorized('User no longer exists');
    }
    if (user.status !== 'active') {
      throw ApiError.forbidden('This account has been disabled');
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.roles?.name || null,
      roleId: user.role_id,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Authorization guard: restricts a route to a specific set of roles.
 * Must run after requireAuth. Permission is enforced here on the
 * backend — the frontend hiding a button is never sufficient on its own.
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

/**
 * Ownership-or-role guard: allows the action if the requester's role is
 * in allowedRoles OR they own the resource (req.resourceOwnerId set by
 * an earlier middleware/controller that looked up the resource).
 * Useful for "authors can edit their own articles" style rules.
 */
const requireRoleOrOwner = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }
  if (req.resourceOwnerId && req.resourceOwnerId === req.user.id) {
    return next();
  }
  return next(ApiError.forbidden('You do not have permission to perform this action'));
};

module.exports = { requireAuth, requireRole, requireRoleOrOwner };
