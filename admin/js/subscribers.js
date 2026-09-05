(function () {
  const { api, utils, session } = window.SHEREBLOG_ADMIN;

  let page = 1;
  const pageSize = 25;
  let total = 0;

  const STATUS_BADGE = { confirmed: 'a-badge-published', pending: 'a-badge-pending_review', unsubscribed: 'a-badge-trash' };

  function rowHtml(s) {
    return `
      <tr data-id="${s.id}">
        <td>${utils.escapeHtml(s.email)}</td>
        <td><span class="a-badge ${STATUS_BADGE[s.status] || ''}">${s.status}</span></td>
        <td>${utils.formatDate(s.subscribedAt)}</td>
        <td>${s.unsubscribedAt ? utils.formatDate(s.unsubscribedAt) : '—'}</td>
        <td style="text-align:right; white-space:nowrap;">
          ${s.status !== 'unsubscribed' ? `<button class="a-btn a-btn-ghost a-btn-sm disable-btn" data-id="${s.id}">Disable</button>` : ''}
          <button class="a-btn a-btn-danger a-btn-sm delete-btn" data-id="${s.id}" data-email="${utils.escapeHtml(s.email)}">Delete</button>
        </td>
      </tr>`;
  }

  async function loadTable() {
    const tbody = document.getElementById('subscribers-table-body');
    tbody.innerHTML = Array.from({ length: 5 }).map(() => `<tr class="a-skeleton-row"><td colspan="5"><div class="a-skeleton"></div></td></tr>`).join('');
    try {
      const params = { page, pageSize };
      const search = document.getElementById('search-input').value.trim();
      const status = document.getElementById('status-filter').value;
      if (search) params.search = search;
      if (status) params.status = status;

      const res = await api.listSubscribers(params);
      total = res.total;

      tbody.innerHTML = res.subscribers.length
        ? res.subscribers.map(rowHtml).join('')
        : `<tr><td colspan="5"><div class="a-empty"><h3>No subscribers found</h3><p>Try a different search or filter.</p></div></td></tr>`;

      wireRowActions();

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      document.getElementById('pagination-info').textContent = `${start}-${end} of ${total}`;
      document.getElementById('prev-page-btn').disabled = page <= 1;
      document.getElementById('next-page-btn').disabled = page * pageSize >= total;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="a-empty"><h3>Couldn't load subscribers</h3><p>${utils.escapeHtml(err.message)}</p></div></td></tr>`;
    }
  }

  function wireRowActions() {
    document.querySelectorAll('.disable-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api.updateSubscriberStatus(btn.dataset.id, 'unsubscribed');
          utils.toast('Subscriber disabled');
          loadTable();
        } catch (err) {
          utils.toast(err.message || 'Could not update subscriber.', 'error');
        }
      });
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm(`Permanently delete ${btn.dataset.email}?`)) return;
        try {
          await api.deleteSubscriber(btn.dataset.id);
          utils.toast('Subscriber deleted');
          loadTable();
        } catch (err) {
          utils.toast(err.message || 'Could not delete subscriber.', 'error');
        }
      });
    });
  }

  document.getElementById('export-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-btn');
    btn.disabled = true;
    btn.textContent = 'Exporting...';
    try {
      const token = session.getAccessToken();
      const res = await fetch('/api/admin/newsletter/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'newsletter-subscribers.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      utils.toast(err.message || 'Could not export subscribers.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Export CSV';
    }
  });

  const debouncedReload = utils.debounce(() => { page = 1; loadTable(); }, 350);
  document.getElementById('search-input').addEventListener('input', debouncedReload);
  document.getElementById('status-filter').addEventListener('change', () => { page = 1; loadTable(); });
  document.getElementById('prev-page-btn').addEventListener('click', () => { if (page > 1) { page -= 1; loadTable(); } });
  document.getElementById('next-page-btn').addEventListener('click', () => { if (page * pageSize < total) { page += 1; loadTable(); } });

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'subscribers', title: 'Newsletter Subscribers', breadcrumb: 'Manage your mailing list' });
    if (!user) return;
    loadTable();
  }

  init();
})();
