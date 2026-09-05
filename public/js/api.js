/**
 * SHEREBLOG NEWS — public API client
 * Thin wrapper around fetch(). No build step, no framework — every page
 * includes this file and calls window.SHEREBLOG.api.*
 */
(function () {
  const BASE_URL = '/api';

  async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    let body;
    try {
      body = await res.json();
    } catch (err) {
      body = null;
    }

    if (!res.ok || !body || body.success === false) {
      const message = (body && body.message) || 'Something went wrong. Please try again.';
      const error = new Error(message);
      error.status = res.status;
      error.details = body && body.details;
      throw error;
    }

    return body.data;
  }

  const api = {
    getArticles: (params = {}) => request(`/articles?${new URLSearchParams(params)}`),
    getArticleBySlug: (slug) => request(`/articles/${encodeURIComponent(slug)}`),
    getCategories: () => request('/categories'),
    getCategoryBySlug: (slug, params = {}) =>
      request(`/categories/${encodeURIComponent(slug)}?${new URLSearchParams(params)}`),
    getTags: () => request('/tags'),
    search: (query, params = {}) => request(`/articles?${new URLSearchParams({ search: query, ...params })}`),
    subscribeNewsletter: (email) =>
      request('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email }) }),
    submitNews: (payload) => request('/submissions', { method: 'POST', body: JSON.stringify(payload) }),
    unsubscribeNewsletter: (email) => request('/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ email }) }),
    getComments: (articleId, params = {}) => request(`/comments?${new URLSearchParams({ articleId, ...params })}`),
    postComment: (payload) => request('/comments', { method: 'POST', body: JSON.stringify(payload) }),
    getCommentsEnabled: () => request('/settings/comments-enabled'),
  };

  window.SHEREBLOG = window.SHEREBLOG || {};
  window.SHEREBLOG.api = api;
})();