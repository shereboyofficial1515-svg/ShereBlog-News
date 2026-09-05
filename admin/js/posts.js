(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  let page = 1;
  const pageSize = 15;
  let total = 0;
  let currentUser = null;

  function confirmDialog(title, body) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      document.getElementById('confirm-modal-title').textContent = title;
      document.getElementById('confirm-modal-body').textContent = body;
      modal.style.display = 'flex';

      const cleanup = (result) => {
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      };
      const confirmBtn = document.getElementById('confirm-modal-confirm');
      const cancelBtn = document.getElementById('confirm-modal-cancel');
      const onConfirm = () => cleanup(true);
      const onCancel = () => cleanup(false);
      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  function canEdit(article) {
    if (!currentUser) return false;
    if (['editor', 'admin', 'super_admin'].includes(currentUser.role)) return true;
    return article.author && article.author.id === currentUser.id;
  }

  function rowHtml(article) {
    const editable = canEdit(article);
    return `
      <tr data-id="${article.id}">
        <td><input type="checkbox" class="row-checkbox" value="${article.id}" ${editable ? '' : 'disabled'} /></td>
        <td>
          <a class="a-table-title" href="/admin/post-editor.html?id=${article.id}">${utils.escapeHtml(article.title)}</a>
        </td>
        <td>${article.category ? utils.escapeHtml(article.category.name) : '<span style="color:var(--a-slate);">—</span>'}</td>
        <td>${article.author ? utils.escapeHtml(article.author.fullName) : '—'}</td>
        <td>${utils.statusBadge(article.status)}</td>
        <td>${article.publishedAt ? utils.formatDate(article.publishedAt) : (article.scheduledAt ? `Sched. ${utils.formatDateTime(article.scheduledAt)}` : '—')}</td>
        <td>${utils.timeAgo(article.updatedAt)}</td>
        <td>${article.viewsCount ?? 0}</td>
        <td style="text-align:right; white-space:nowrap;">
          <div style="display:inline-flex; gap:6px;">
            ${editable ? `<a class="a-btn a-btn-ghost a-btn-sm" href="/admin/post-editor.html?id=${article.id}">Edit</a>` : ''}
            ${editable ? `<button class="a-btn a-btn-ghost a-btn-sm dup-btn" data-id="${article.id}">Duplicate</button>` : ''}
            ${editable ? (article.status === 'trash'
              ? `<button class="a-btn a-btn-ghost a-btn-sm restore-btn" data-id="${article.id}">Restore</button>`
              : `<button class="a-btn a-btn-danger a-btn-sm trash-btn" data-id="${article.id}" data-title="${utils.escapeHtml(article.title)}">Delete</button>`) : ''}
          </div>
        </td>
      </tr>`;
  }

  async function loadCategoriesFilter() {
    try {
      const { categories } = await api.listAdminCategories();
      const select = document.getElementById('category-filter');
      categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    } catch (err) { /* filter is a nice-to-have; page still works without it */ }
  }

  function currentFilters() {
    const filters = { page, pageSize };
    const search = document.getElementById('search-input').value.trim();
    const status = document.getElementById('status-filter').value;
    const category = document.getElementById('category-filter').value;
    if (search) filters.search = search;
    if (status) filters.status = status;
    if (category) filters.category = category;
    return filters;
  }

  function updateBulkBar() {
    const checked = document.querySelectorAll('.row-checkbox:checked');
    document.getElementById('bulk-publish-btn').style.display = checked.length ? '' : 'none';
    document.getElementById('bulk-trash-btn').style.display = checked.length ? '' : 'none';
  }

  async function loadTable() {
    const tbody = document.getElementById('posts-table-body');
    tbody.innerHTML = Array.from({ length: 5 }).map(() => `<tr class="a-skeleton-row"><td colspan="9"><div class="a-skeleton"></div></td></tr>`).join('');

    try {
      const { articles, total: t } = await api.listArticles(currentFilters());
      total = t;

      if (!articles.length) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="a-empty"><h3>No posts found</h3><p>Try adjusting your filters, or create a new post.</p></div></td></tr>`;
      } else {
        tbody.innerHTML = articles.map(rowHtml).join('');
      }

      document.getElementById('select-all').checked = false;
      updateBulkBar();
      wireRowActions();

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      document.getElementById('pagination-info').textContent = `${start}-${end} of ${total}`;
      document.getElementById('prev-page-btn').disabled = page <= 1;
      document.getElementById('next-page-btn').disabled = page * pageSize >= total;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="a-empty"><h3>Couldn't load posts</h3><p>${utils.escapeHtml(err.message)}</p></div></td></tr>`;
    }
  }

  function wireRowActions() {
    document.querySelectorAll('.row-checkbox').forEach((cb) => cb.addEventListener('change', updateBulkBar));

    document.querySelectorAll('.trash-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog('Move to trash?', `"${btn.dataset.title}" will be moved to trash. You can restore it later.`);
        if (!ok) return;
        try {
          await api.trashArticle(btn.dataset.id);
          utils.toast('Post moved to trash');
          loadTable();
        } catch (err) {
          utils.toast(err.message || 'Could not delete post.', 'error');
        }
      });
    });

    document.querySelectorAll('.restore-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api.restoreArticle(btn.dataset.id);
          utils.toast('Post restored to draft');
          loadTable();
        } catch (err) {
          utils.toast(err.message || 'Could not restore post.', 'error');
        }
      });
    });

    document.querySelectorAll('.dup-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api.duplicateArticle(btn.dataset.id);
          utils.toast('Post duplicated');
          loadTable();
        } catch (err) {
          utils.toast(err.message || 'Could not duplicate post.', 'error');
        }
      });
    });
  }

  document.getElementById('select-all').addEventListener('change', (e) => {
    document.querySelectorAll('.row-checkbox:not(:disabled)').forEach((cb) => { cb.checked = e.target.checked; });
    updateBulkBar();
  });

  document.getElementById('bulk-trash-btn').addEventListener('click', async () => {
    const ids = Array.from(document.querySelectorAll('.row-checkbox:checked')).map((cb) => cb.value);
    const ok = await confirmDialog('Move selected posts to trash?', `${ids.length} post(s) will be moved to trash.`);
    if (!ok) return;
    try {
      await Promise.all(ids.map((id) => api.trashArticle(id)));
      utils.toast(`${ids.length} post(s) moved to trash`);
      loadTable();
    } catch (err) {
      utils.toast('Some posts could not be deleted.', 'error');
      loadTable();
    }
  });

  document.getElementById('bulk-publish-btn').addEventListener('click', async () => {
    const ids = Array.from(document.querySelectorAll('.row-checkbox:checked')).map((cb) => cb.value);
    try {
      await Promise.all(ids.map((id) => api.updateArticle(id, { status: 'published' })));
      utils.toast(`${ids.length} post(s) published`);
      loadTable();
    } catch (err) {
      utils.toast(err.message || 'Some posts could not be published (you may need editor/admin permissions).', 'error');
      loadTable();
    }
  });

  const debouncedReload = utils.debounce(() => { page = 1; loadTable(); }, 350);
  document.getElementById('search-input').addEventListener('input', debouncedReload);
  document.getElementById('status-filter').addEventListener('change', () => { page = 1; loadTable(); });
  document.getElementById('category-filter').addEventListener('change', () => { page = 1; loadTable(); });
  document.getElementById('prev-page-btn').addEventListener('click', () => { if (page > 1) { page -= 1; loadTable(); } });
  document.getElementById('next-page-btn').addEventListener('click', () => { if (page * pageSize < total) { page += 1; loadTable(); } });

  async function init() {
    currentUser = await window.SHEREBLOG_ADMIN.layout.mount({
      active: 'posts',
      title: 'Posts',
      breadcrumb: 'Manage all articles',
    });
    if (!currentUser) return;
    loadCategoriesFilter();
    loadTable();
  }

  init();
})();
