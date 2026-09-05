(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  let users = [];
  let editingId = null;
  let resettingId = null;
  let currentUser = null;

  function rowHtml(u) {
    const isSelf = currentUser && u.id === currentUser.id;
    return `
      <tr>
        <td class="a-table-title">${utils.escapeHtml(u.fullName)}${isSelf ? ' <span style="color:var(--a-slate); font-weight:400;">(you)</span>' : ''}</td>
        <td>${utils.escapeHtml(u.email)}</td>
        <td><span class="a-badge a-badge-scheduled">${u.role.replace('_', ' ')}</span></td>
        <td>${u.status === 'active' ? '<span class="a-badge a-badge-published">Active</span>' : '<span class="a-badge a-badge-trash">Disabled</span>'}</td>
        <td>${u.lastLoginAt ? utils.timeAgo(u.lastLoginAt) : 'Never'}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="a-btn a-btn-ghost a-btn-sm edit-btn" data-id="${u.id}">Edit</button>
          <button class="a-btn a-btn-ghost a-btn-sm reset-btn" data-id="${u.id}" data-name="${utils.escapeHtml(u.fullName)}">Reset Password</button>
          ${!isSelf ? `<button class="a-btn a-btn-danger a-btn-sm delete-btn" data-id="${u.id}" data-name="${utils.escapeHtml(u.fullName)}">Delete</button>` : ''}
        </td>
      </tr>`;
  }

  async function loadTable() {
    const tbody = document.getElementById('users-table-body');
    try {
      const params = {};
      const search = document.getElementById('search-input').value.trim();
      if (search) params.search = search;

      const res = await api.listUsers(params);
      users = res.users;
      tbody.innerHTML = users.length
        ? users.map(rowHtml).join('')
        : `<tr><td colspan="6"><div class="a-empty"><h3>No users found</h3></div></td></tr>`;
      wireRowButtons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="a-empty"><h3>Couldn't load users</h3><p>${utils.escapeHtml(err.message)}</p></div></td></tr>`;
    }
  }

  function wireRowButtons() {
    document.querySelectorAll('.edit-btn').forEach((btn) => btn.addEventListener('click', () => openUserModal(btn.dataset.id)));
    document.querySelectorAll('.reset-btn').forEach((btn) => btn.addEventListener('click', () => openResetModal(btn.dataset.id, btn.dataset.name)));
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm(`Permanently delete ${btn.dataset.name}? This cannot be undone.`)) return;
        try {
          await api.deleteUser(btn.dataset.id);
          utils.toast('User deleted');
          loadTable();
        } catch (err) {
          utils.toast(err.message || 'Could not delete user.', 'error');
        }
      });
    });
  }

  // --- Create/Edit modal ------------------------------------------
  const modal = document.getElementById('user-modal');
  function openUserModal(id) {
    editingId = id || null;
    const u = id ? users.find((x) => x.id === id) : null;
    document.getElementById('user-modal-title').textContent = u ? 'Edit User' : 'New User';
    document.getElementById('u-name').value = u?.fullName || '';
    document.getElementById('u-email').value = u?.email || '';
    document.getElementById('u-email').disabled = !!u;
    document.getElementById('u-password').value = '';
    document.getElementById('u-password-field').style.display = u ? 'none' : '';
    document.getElementById('u-password').required = !u;
    document.getElementById('u-role').value = u?.role || 'author';
    document.getElementById('u-status-field').style.display = u ? '' : 'none';
    document.getElementById('u-status').value = u?.status || 'active';
    modal.style.display = 'flex';
  }
  document.getElementById('new-user-btn').addEventListener('click', () => openUserModal(null));
  document.getElementById('user-modal-cancel').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('user-modal-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      if (editingId) {
        await api.updateUser(editingId, {
          fullName: document.getElementById('u-name').value.trim(),
          role: document.getElementById('u-role').value,
          status: document.getElementById('u-status').value,
        });
        utils.toast('User updated');
      } else {
        await api.createUser({
          fullName: document.getElementById('u-name').value.trim(),
          email: document.getElementById('u-email').value.trim(),
          password: document.getElementById('u-password').value,
          role: document.getElementById('u-role').value,
        });
        utils.toast('User created');
      }
      modal.style.display = 'none';
      loadTable();
    } catch (err) {
      utils.toast(err.message || 'Could not save user.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save User';
    }
  });

  // --- Reset password modal ------------------------------------------
  const resetModal = document.getElementById('reset-password-modal');
  function openResetModal(id, name) {
    resettingId = id;
    document.getElementById('reset-password-body').textContent = `Set a new password for ${name}.`;
    document.getElementById('new-password-field').value = '';
    resetModal.style.display = 'flex';
  }
  document.getElementById('reset-password-cancel').addEventListener('click', () => { resetModal.style.display = 'none'; });
  document.getElementById('reset-password-confirm').addEventListener('click', async () => {
    const pw = document.getElementById('new-password-field').value;
    if (pw.length < 10) {
      utils.toast('Password must be at least 10 characters.', 'error');
      return;
    }
    try {
      await api.resetUserPassword(resettingId, pw);
      utils.toast('Password reset');
      resetModal.style.display = 'none';
    } catch (err) {
      utils.toast(err.message || 'Could not reset password.', 'error');
    }
  });

  document.getElementById('search-input').addEventListener('input', utils.debounce(loadTable, 350));

  async function init() {
    currentUser = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'users', title: 'Users', breadcrumb: 'Manage platform staff & roles' });
    if (!currentUser) return;
    loadTable();
  }

  init();
})();
