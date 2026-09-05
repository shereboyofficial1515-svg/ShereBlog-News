(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  let page = 1;
  const pageSize = 15;
  let total = 0;
  let activeSubmission = null;

  const STATUS_BADGE = {
    pending: 'a-badge-pending_review',
    reviewed: 'a-badge-scheduled',
    approved: 'a-badge-published',
    rejected: 'a-badge-trash',
    archived: 'a-badge-archived',
  };

  function rowHtml(s) {
    return `
      <tr data-id="${s.id}">
        <td class="a-table-title">${utils.escapeHtml(s.title)}</td>
        <td>${utils.escapeHtml(s.submitterName)}<br><span style="color:var(--a-slate); font-size:0.78rem;">${utils.escapeHtml(s.email)}</span></td>
        <td>${s.category ? utils.escapeHtml(s.category.name) : '—'}</td>
        <td><span class="a-badge ${STATUS_BADGE[s.status] || ''}">${s.status}</span></td>
        <td>${utils.timeAgo(s.createdAt)}</td>
        <td style="text-align:right;"><button class="a-btn a-btn-ghost a-btn-sm view-btn" data-id="${s.id}">Review</button></td>
      </tr>`;
  }

  async function loadTable() {
    const tbody = document.getElementById('submissions-table-body');
    tbody.innerHTML = Array.from({ length: 4 }).map(() => `<tr class="a-skeleton-row"><td colspan="6"><div class="a-skeleton"></div></td></tr>`).join('');
    try {
      const status = document.getElementById('status-filter').value;
      const params = { page, pageSize };
      if (status) params.status = status;

      const res = await api.listSubmissions(params);
      total = res.total;

      tbody.innerHTML = res.submissions.length
        ? res.submissions.map(rowHtml).join('')
        : `<tr><td colspan="6"><div class="a-empty"><h3>No submissions</h3><p>Nothing here for this filter.</p></div></td></tr>`;

      tbody.querySelectorAll('.view-btn').forEach((btn) => btn.addEventListener('click', () => openDetail(btn.dataset.id)));

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      document.getElementById('pagination-info').textContent = `${start}-${end} of ${total}`;
      document.getElementById('prev-page-btn').disabled = page <= 1;
      document.getElementById('next-page-btn').disabled = page * pageSize >= total;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="a-empty"><h3>Couldn't load submissions</h3><p>${utils.escapeHtml(err.message)}</p></div></td></tr>`;
    }
  }

  const modal = document.getElementById('detail-modal');
  async function openDetail(id) {
    try {
      const { submission } = await api.getSubmission(id);
      activeSubmission = submission;
      document.getElementById('detail-title').textContent = submission.title;
      document.getElementById('detail-meta').textContent = `${submission.submitterName} · ${submission.email}${submission.phone ? ' · ' + submission.phone : ''}${submission.location ? ' · ' + submission.location : ''} · ${utils.formatDateTime(submission.createdAt)}`;
      document.getElementById('detail-description').textContent = submission.description;
      document.getElementById('detail-fullstory').textContent = submission.fullStory;
      document.getElementById('detail-notes').value = submission.internalNotes || '';
      document.getElementById('convert-btn').disabled = !!submission.convertedArticleId;
      document.getElementById('convert-btn').textContent = submission.convertedArticleId ? 'Already Converted' : 'Approve & Convert to Draft';
      modal.style.display = 'flex';
    } catch (err) {
      utils.toast(err.message || 'Could not load submission.', 'error');
    }
  }

  document.querySelectorAll('.a-modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.style.display = 'none'; });
  });

  async function updateStatus(status) {
    try {
      await api.updateSubmission(activeSubmission.id, { status });
      utils.toast(`Marked as ${status}`);
      modal.style.display = 'none';
      loadTable();
    } catch (err) {
      utils.toast(err.message || 'Could not update submission.', 'error');
    }
  }

  document.getElementById('mark-reviewed-btn').addEventListener('click', () => updateStatus('reviewed'));
  document.getElementById('reject-btn').addEventListener('click', () => updateStatus('rejected'));
  document.getElementById('archive-btn').addEventListener('click', () => updateStatus('archived'));

  document.getElementById('save-notes-btn').addEventListener('click', async () => {
    try {
      await api.updateSubmission(activeSubmission.id, { internalNotes: document.getElementById('detail-notes').value.trim() });
      utils.toast('Notes saved');
    } catch (err) {
      utils.toast(err.message || 'Could not save notes.', 'error');
    }
  });

  document.getElementById('convert-btn').addEventListener('click', async () => {
    const btn = document.getElementById('convert-btn');
    btn.disabled = true;
    btn.textContent = 'Converting...';
    try {
      const { articleId } = await api.convertSubmission(activeSubmission.id);
      utils.toast('Draft article created');
      modal.style.display = 'none';
      window.location.href = `/admin/post-editor.html?id=${articleId}`;
    } catch (err) {
      utils.toast(err.message || 'Could not convert submission.', 'error');
      btn.disabled = false;
      btn.textContent = 'Approve & Convert to Draft';
    }
  });

  document.getElementById('status-filter').addEventListener('change', () => { page = 1; loadTable(); });
  document.getElementById('prev-page-btn').addEventListener('click', () => { if (page > 1) { page -= 1; loadTable(); } });
  document.getElementById('next-page-btn').addEventListener('click', () => { if (page * pageSize < total) { page += 1; loadTable(); } });

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'submissions', title: 'News Submissions', breadcrumb: 'Reader tips awaiting review' });
    if (!user) return;
    loadTable();
  }

  init();
})();
