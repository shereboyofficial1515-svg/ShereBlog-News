(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  let page = 1;
  const pageSize = 30;
  let total = 0;

  const ACTION_LABELS = {
    admin_logged_in: 'logged in',
    admin_logged_out: 'logged out',
    article_created: 'created an article',
    article_edited: 'edited an article',
    article_published: 'published an article',
    article_deleted: 'moved an article to trash',
    article_restored: 'restored an article',
    article_permanently_deleted: 'permanently deleted an article',
    article_auto_published_on_schedule: 'auto-published on schedule',
    category_created: 'created a category',
    category_edited: 'edited a category',
    category_deleted: 'deleted a category',
    media_deleted: 'deleted a media file',
    submission_approved: 'approved a submission',
    submission_rejected: 'rejected a submission',
    submission_updated: 'updated a submission',
    submission_converted_to_article: 'converted a submission to an article',
    newsletter_subscriber_deleted: 'deleted a newsletter subscriber',
    settings_changed: 'changed settings',
    user_created: 'created a user',
    user_edited: 'edited a user',
    user_disabled: 'disabled a user',
    user_deleted: 'deleted a user',
    user_password_reset: "reset a user's password",
  };

  function rowHtml(log) {
    return `
      <tr>
        <td style="white-space:nowrap; color:var(--a-slate); font-size:0.8rem;">${utils.formatDateTime(log.createdAt)}</td>
        <td>${log.user ? utils.escapeHtml(log.user.fullName) : '<span style="color:var(--a-slate);">System</span>'}</td>
        <td>${ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}</td>
        <td style="font-family:var(--a-mono); font-size:0.78rem; color:var(--a-slate);">${log.resourceType || ''}${log.resourceId ? ` #${String(log.resourceId).slice(0, 8)}` : ''}</td>
        <td style="font-family:var(--a-mono); font-size:0.78rem; color:var(--a-slate);">${utils.escapeHtml(log.ipAddress || '—')}</td>
      </tr>`;
  }

  async function loadTable() {
    const tbody = document.getElementById('audit-table-body');
    tbody.innerHTML = Array.from({ length: 6 }).map(() => `<tr class="a-skeleton-row"><td colspan="5"><div class="a-skeleton"></div></td></tr>`).join('');
    try {
      const params = { page, pageSize };
      const resourceType = document.getElementById('resource-filter').value;
      if (resourceType) params.resourceType = resourceType;

      const res = await api.listAuditLogs(params);
      total = res.total;

      tbody.innerHTML = res.logs.length
        ? res.logs.map(rowHtml).join('')
        : `<tr><td colspan="5"><div class="a-empty"><h3>No activity recorded</h3></div></td></tr>`;

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      document.getElementById('pagination-info').textContent = `${start}-${end} of ${total}`;
      document.getElementById('prev-page-btn').disabled = page <= 1;
      document.getElementById('next-page-btn').disabled = page * pageSize >= total;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="a-empty"><h3>Couldn't load audit log</h3><p>${utils.escapeHtml(err.message)}</p></div></td></tr>`;
    }
  }

  document.getElementById('resource-filter').addEventListener('change', () => { page = 1; loadTable(); });
  document.getElementById('prev-page-btn').addEventListener('click', () => { if (page > 1) { page -= 1; loadTable(); } });
  document.getElementById('next-page-btn').addEventListener('click', () => { if (page * pageSize < total) { page += 1; loadTable(); } });

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'security', title: 'Audit Log', breadcrumb: 'Security & activity trail' });
    if (!user) return;
    loadTable();
  }

  init();
})();
