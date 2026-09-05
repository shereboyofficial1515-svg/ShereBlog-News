/**
 * Auth guard for protected admin pages. Include this script (after
 * admin-api.js) at the top of <body> on every page except index.html
 * (the login page). It does not trust the presence of a token alone —
 * it verifies the token against /api/auth/me so a stale/invalid token
 * can't leave someone looking at a dashboard they're not authorized for.
 */
(function () {
  const { session, api } = window.SHEREBLOG_ADMIN;

  window.SHEREBLOG_ADMIN.authReady = (async () => {
    const token = session.getAccessToken();
    if (!token) {
      window.location.href = '/admin/index.html';
      return null;
    }
    try {
      const { user } = await api.me();
      session.setSession({ user });
      return user;
    } catch (err) {
      session.clearSession();
      window.location.href = '/admin/index.html';
      return null;
    }
  })();
})();
