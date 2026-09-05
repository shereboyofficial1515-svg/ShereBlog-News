(function () {
    const { api, utils } = window.SHEREBLOG_ADMIN;

    let page = 1;
    const pageSize = 25;
    let total = 0;

    function rowHtml(c) {
        return `
      <tr data-id="${c.id}">
        <td style="max-width:320px;">${utils.escapeHtml(c.content)}</td>
        <td>${utils.escapeHtml(c.name)}<br><span style="color:var(--a-slate); font-size:0.78rem;">${utils.escapeHtml(c.email)}</span></td>
        <td>${c.article ? `<a href="/article.html?slug=${encodeURIComponent(c.article.slug)}" target="_blank" style="color:var(--a-slate); font-size:0.82rem;">${utils.escapeHtml(c.article.title)}</a>` : '—'}</td>
        <td style="white-space:nowrap; color:var(--a-slate); font-size:0.8rem;">${utils.timeAgo(c.createdAt)}</td>
        <td style="text-align:right; white-space:nowrap;">
          ${c.status !== 'approved' ? `<button class="a-btn a-btn-ghost a-btn-sm approve-btn" data-id="${c.id}">Approve</button>` : ''}
          ${c.status !== 'rejected' ? `<button class="a-btn a-btn-ghost a-btn-sm reject-btn" data-id="${c.id}">Reject</button>` : ''}
          ${c.status !== 'spam' ? `<button class="a-btn a-btn-ghost a-btn-sm spam-btn" data-id="${c.id}">Spam</button>` : ''}
          <button class="a-btn a-btn-danger a-btn-sm delete-btn" data-id="${c.id}">Delete</button>
        </td>
      </tr>`;
    }

    async function loadTable() {
        const tbody = document.getElementById('comments-table-body');
        tbody.innerHTML = Array.from({ length: 4 }).map(() => `<tr class="a-skeleton-row"><td colspan="5"><div class="a-skeleton"></div></td></tr>`).join('');
        try {
            const status = document.getElementById('status-filter').value;
            const res = await api.listComments({ page, pageSize, status });
            total = res.total;

            tbody.innerHTML = res.comments.length
                ? res.comments.map(rowHtml).join('')
                : `<tr><td colspan="5"><div class="a-empty"><h3>No comments here</h3><p>Nothing matches this filter.</p></div></td></tr>`;

            wireRowActions();

            const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
            const end = Math.min(page * pageSize, total);
            document.getElementById('pagination-info').textContent = `${start}-${end} of ${total}`;
            document.getElementById('prev-page-btn').disabled = page <= 1;
            document.getElementById('next-page-btn').disabled = page * pageSize >= total;
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="a-empty"><h3>Couldn't load comments</h3><p>${utils.escapeHtml(err.message)}</p></div></td></tr>`;
        }
    }

    function wireRowActions() {
        const setStatus = (btn, status) => {
            btn.addEventListener('click', async () => {
                try {
                    await api.updateCommentStatus(btn.dataset.id, status);
                    utils.toast(`Comment marked ${status}`);
                    loadTable();
                } catch (err) {
                    utils.toast(err.message || 'Could not update comment.', 'error');
                }
            });
        };
        document.querySelectorAll('.approve-btn').forEach((b) => setStatus(b, 'approved'));
        document.querySelectorAll('.reject-btn').forEach((b) => setStatus(b, 'rejected'));
        document.querySelectorAll('.spam-btn').forEach((b) => setStatus(b, 'spam'));
        document.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!window.confirm('Permanently delete this comment?')) return;
                try {
                    await api.deleteComment(btn.dataset.id);
                    utils.toast('Comment deleted');
                    loadTable();
                } catch (err) {
                    utils.toast(err.message || 'Could not delete comment.', 'error');
                }
            });
        });
    }

    document.getElementById('status-filter').addEventListener('change', () => { page = 1; loadTable(); });
    document.getElementById('prev-page-btn').addEventListener('click', () => { if (page > 1) { page -= 1; loadTable(); } });
    document.getElementById('next-page-btn').addEventListener('click', () => { if (page * pageSize < total) { page += 1; loadTable(); } });

    async function init() {
        const user = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'comments', title: 'Comments', breadcrumb: 'Moderate reader comments' });
        if (!user) return;
        loadTable();
    }

    init();
})();