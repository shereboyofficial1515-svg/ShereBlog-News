(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  let categories = [];
  let editingId = null;
  let deletingId = null;

  function rowHtml(cat) {
    return `
      <tr>
        <td class="a-table-title">${utils.escapeHtml(cat.name)}</td>
        <td style="font-family:var(--a-mono); font-size:0.78rem; color:var(--a-slate);">${utils.escapeHtml(cat.slug)}</td>
        <td style="color:var(--a-slate); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${utils.escapeHtml(cat.description || '—')}</td>
        <td>${cat.isActive ? '<span class="a-badge a-badge-published">Active</span>' : '<span class="a-badge a-badge-draft">Inactive</span>'}</td>
        <td>${cat.sortOrder}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="a-btn a-btn-ghost a-btn-sm edit-btn" data-id="${cat.id}">Edit</button>
          <button class="a-btn a-btn-danger a-btn-sm delete-btn" data-id="${cat.id}" data-name="${utils.escapeHtml(cat.name)}">Delete</button>
        </td>
      </tr>`;
  }

  async function loadTable() {
    const tbody = document.getElementById('categories-table-body');
    try {
      const res = await api.listAdminCategories();
      categories = res.categories;
      tbody.innerHTML = categories.length
        ? categories.map(rowHtml).join('')
        : `<tr><td colspan="6"><div class="a-empty"><h3>No categories yet</h3><p>Create your first category to start organizing articles.</p></div></td></tr>`;
      wireRowButtons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="a-empty"><h3>Couldn't load categories</h3><p>${utils.escapeHtml(err.message)}</p></div></td></tr>`;
    }
  }

  function wireRowButtons() {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.id, btn.dataset.name));
    });
  }

  // --- Create/Edit modal ------------------------------------------
  const modal = document.getElementById('category-modal');
  function openModal(id) {
    editingId = id || null;
    const cat = id ? categories.find((c) => c.id === id) : null;
    document.getElementById('category-modal-title').textContent = cat ? 'Edit Category' : 'New Category';
    document.getElementById('cat-name').value = cat?.name || '';
    document.getElementById('cat-description').value = cat?.description || '';
    document.getElementById('cat-image').value = cat?.imageUrl || '';
    document.getElementById('cat-sort').value = cat?.sortOrder ?? 0;
    document.getElementById('cat-active').checked = cat ? cat.isActive : true;
    modal.style.display = 'flex';
    document.getElementById('cat-name').focus();
  }
  function closeModal() { modal.style.display = 'none'; }
  document.getElementById('new-category-btn').addEventListener('click', () => openModal(null));
  document.getElementById('category-modal-cancel').addEventListener('click', closeModal);

  document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('cat-name').value.trim(),
      description: document.getElementById('cat-description').value.trim() || null,
      imageUrl: document.getElementById('cat-image').value.trim() || null,
      sortOrder: parseInt(document.getElementById('cat-sort').value, 10) || 0,
      isActive: document.getElementById('cat-active').checked,
    };
    const saveBtn = document.getElementById('category-modal-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      if (editingId) {
        await api.updateCategory(editingId, payload);
        utils.toast('Category updated');
      } else {
        await api.createCategory(payload);
        utils.toast('Category created');
      }
      closeModal();
      loadTable();
    } catch (err) {
      utils.toast(err.message || 'Could not save category.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Category';
    }
  });

  // --- Delete modal (with reassign-if-in-use flow) --------------------
  const deleteModal = document.getElementById('delete-modal');
  function openDeleteModal(id, name) {
    deletingId = id;
    document.getElementById('delete-modal-body').textContent = `Delete "${name}"? If it has existing articles, you'll be asked to reassign them first.`;
    document.getElementById('reassign-field').style.display = 'none';
    const select = document.getElementById('reassign-select');
    select.innerHTML = categories.filter((c) => c.id !== id).map((c) => `<option value="${c.id}">${utils.escapeHtml(c.name)}</option>`).join('');
    deleteModal.style.display = 'flex';
  }
  document.getElementById('delete-modal-cancel').addEventListener('click', () => { deleteModal.style.display = 'none'; });

  document.getElementById('delete-modal-confirm').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('delete-modal-confirm');
    confirmBtn.disabled = true;
    try {
      const reassignVisible = document.getElementById('reassign-field').style.display !== 'none';
      const payload = reassignVisible ? { replacementCategoryId: document.getElementById('reassign-select').value } : {};
      await api.deleteCategory(deletingId, payload);
      utils.toast('Category deleted');
      deleteModal.style.display = 'none';
      loadTable();
    } catch (err) {
      if (err.status === 409) {
        // Backend refused because articles exist — reveal the reassign
        // picker and let the admin retry with a replacement chosen.
        document.getElementById('reassign-field').style.display = '';
        utils.toast(err.message, 'error');
      } else {
        utils.toast(err.message || 'Could not delete category.', 'error');
        deleteModal.style.display = 'none';
      }
    } finally {
      confirmBtn.disabled = false;
    }
  });

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({
      active: 'categories',
      title: 'Categories',
      breadcrumb: 'Organize your content',
    });
    if (!user) return;
    loadTable();
  }

  init();
})();
