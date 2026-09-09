/**
 * SHEREBLOG NEWS ADMIN — API client
 * Handles the JWT access/refresh cycle for the admin dashboard.
 */
(function () {
  const BASE_URL = '/api';
  const ACCESS_KEY = 'shereblog_admin_access_token';
  const REFRESH_KEY = 'shereblog_admin_refresh_token';
  const USER_KEY = 'shereblog_admin_user';

  function getAccessToken() { return localStorage.getItem(ACCESS_KEY); }
  function getRefreshToken() { return localStorage.getItem(REFRESH_KEY); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession({ accessToken, refreshToken, user }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  let refreshPromise = null;
  async function refreshAccessToken() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const body = await res.json();
      setSession({ accessToken: body.data.accessToken });
      return body.data.accessToken;
    })();
    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  async function request(path, options = {}, retry = true) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401 && retry && getRefreshToken()) {
      try {
        await refreshAccessToken();
        return request(path, options, false);
      } catch (err) {
        clearSession();
        window.location.href = '/admin/index.html';
        throw new Error('Session expired');
      }
    }

    let body;
    try { body = await res.json(); } catch (e) { body = null; }

    if (!res.ok || !body || body.success === false) {
      const message = (body && body.message) || 'Something went wrong. Please try again.';
      const error = new Error(message);
      error.status = res.status;
      error.details = body && body.details;
      throw error;
    }

    return body.data;
  }

  const adminApi = {
    // Auth
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false),
    logout: () => request('/auth/logout', { method: 'POST' }).catch(() => {}),
    me: () => request('/auth/me'),

    // Dashboard
    getDashboardStats: () => request('/admin/dashboard/stats'),

    // Articles (admin view — all statuses)
    listArticles: (params = {}) => request(`/admin/articles?${new URLSearchParams(params)}`),
    getArticle: (id) => request(`/admin/articles/${id}`),
    createArticle: (payload) => request('/articles', { method: 'POST', body: JSON.stringify(payload) }),
    updateArticle: (id, payload) => request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    trashArticle: (id) => request(`/articles/${id}`, { method: 'DELETE' }),
    restoreArticle: (id) => request(`/articles/${id}/restore`, { method: 'POST' }),
    permanentlyDeleteArticle: (id) => request(`/articles/${id}/permanent`, { method: 'DELETE' }),
    duplicateArticle: (id) => request(`/articles/${id}/duplicate`, { method: 'POST' }),

    // Categories
    listAdminCategories: () => request('/admin/categories'),
    createCategory: (payload) => request('/categories', { method: 'POST', body: JSON.stringify(payload) }),
    updateCategory: (id, payload) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteCategory: (id, payload) => request(`/categories/${id}`, { method: 'DELETE', body: JSON.stringify(payload || {}) }),

    // Tags
    listTags: () => request('/tags'),

    // Media
    listMedia: (params = {}) => request(`/media?${new URLSearchParams(params)}`),
    uploadMedia: async (file, meta = {}) => {
      const fd = new FormData();
      fd.append('file', file);
      if (meta.altText) fd.append('altText', meta.altText);
      if (meta.caption) fd.append('caption', meta.caption);
      const token = getAccessToken();
      const res = await fetch(`${BASE_URL}/media`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.success === false) {
        throw new Error((body && body.message) || 'Upload failed');
      }
      return body.data;
    },
    updateMedia: (id, payload) => request(`/media/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteMedia: (id) => request(`/media/${id}`, { method: 'DELETE' }),

    // Submissions
    listSubmissions: (params = {}) => request(`/admin/submissions?${new URLSearchParams(params)}`),
    getSubmission: (id) => request(`/admin/submissions/${id}`),
    updateSubmission: (id, payload) => request(`/admin/submissions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    convertSubmission: (id) => request(`/admin/submissions/${id}/convert`, { method: 'POST' }),

    // Newsletter subscribers
    listSubscribers: (params = {}) => request(`/admin/newsletter/subscribers?${new URLSearchParams(params)}`),
    updateSubscriberStatus: (id, status) => request(`/admin/newsletter/subscribers/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    deleteSubscriber: (id) => request(`/admin/newsletter/subscribers/${id}`, { method: 'DELETE' }),

    // Settings
    getSettings: () => request('/admin/settings'),
    updateSettings: (key, value) => request(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify(value) }),

    // Users
    listUsers: (params = {}) => request(`/admin/users?${new URLSearchParams(params)}`),
    createUser: (payload) => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
    updateUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    resetUserPassword: (id, newPassword) => request(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

    // Audit logs
    listAuditLogs: (params = {}) => request(`/admin/audit-logs?${new URLSearchParams(params)}`),

    // Analytics
    getAnalytics: (params = {}) => request(`/admin/analytics?${new URLSearchParams(params)}`),

    // Comments
    listComments: (params = {}) => request(`/admin/comments?${new URLSearchParams(params)}`),
    updateCommentStatus: (id, status) => request(`/admin/comments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    deleteComment: (id) => request(`/admin/comments/${id}`, { method: 'DELETE' }),
  };

  window.SHEREBLOG_ADMIN = window.SHEREBLOG_ADMIN || {};
  window.SHEREBLOG_ADMIN.api = adminApi;
  window.SHEREBLOG_ADMIN.session = { getAccessToken, getUser, setSession, clearSession };
})();
