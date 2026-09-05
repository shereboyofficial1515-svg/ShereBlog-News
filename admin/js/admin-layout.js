/**
 * Renders the admin sidebar + topbar into #admin-sidebar-mount /
 * #admin-topbar-mount. Call window.SHEREBLOG_ADMIN.layout.mount({
 *   active: 'dashboard', title: 'Dashboard', breadcrumb: 'Overview'
 * }) after auth-guard's authReady promise resolves.
 *
 * Items are marked `built: false` where the page doesn't exist yet
 * (Phase 5/6) — they render as disabled with a "Soon" tag rather than
 * linking to a 404, consistent with not faking functionality.
 */
(function () {
  const { utils } = window.SHEREBLOG_ADMIN;

  const NAV_SECTIONS = [
    {
      label: 'Overview',
      items: [
        { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard.html', built: true, roles: null },
      ],
    },
    {
      label: 'Content',
      items: [
        { key: 'posts', label: 'Posts', href: '/admin/posts.html', built: true, roles: null },
        { key: 'new-post', label: 'Create New Post', href: '/admin/post-editor.html', built: true, roles: null },
        { key: 'categories', label: 'Categories', href: '/admin/categories.html', built: true, roles: ['super_admin', 'admin', 'editor'] },
        { key: 'media', label: 'Media Library', href: '/admin/media.html', built: true, roles: null },
        { key: 'submissions', label: 'News Submissions', href: '/admin/submissions.html', built: true, roles: ['moderator', 'editor', 'admin', 'super_admin'] },
        { key: 'comments', label: 'Comments / Moderation', href: '/admin/comments.html', built: true, roles: ['moderator', 'editor', 'admin', 'super_admin'] },
      ],
    },
    {
      label: 'Audience',
      items: [
        { key: 'subscribers', label: 'Newsletter Subscribers', href: '/admin/subscribers.html', built: true, roles: ['editor', 'admin', 'super_admin'] },
        { key: 'analytics', label: 'Analytics', href: '/admin/analytics.html', built: true, roles: ['editor', 'admin', 'super_admin'] },
      ],
    },
    {
      label: 'Administration',
      items: [
        { key: 'users', label: 'Users', href: '/admin/users.html', built: true, roles: ['super_admin', 'admin'] },
        { key: 'appearance', label: 'Appearance', href: '/admin/settings.html', built: true, roles: ['super_admin', 'admin'] },
        { key: 'settings', label: 'Settings', href: '/admin/settings.html', built: true, roles: ['super_admin', 'admin'] },
        { key: 'security', label: 'Security', href: '/admin/audit-logs.html', built: true, roles: ['super_admin', 'admin'] },
      ],
    },
  ];

  const ICONS = {
    dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    posts: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>',
    'new-post': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    categories: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>',
    media: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    submissions: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    comments: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    subscribers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>',
    analytics: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-8"/></svg>',
    users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    appearance: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20 4 4 0 0 0 0-8 2 2 0 0 1 0-4 4 4 0 0 0 0-8z"/></svg>',
    settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    security: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  };

  function navItemHtml(item, activeKey, userRole) {
    if (item.roles && !item.roles.includes(userRole)) return '';
    const icon = ICONS[item.key] || '';
    if (!item.built) {
      return `<a href="#" class="nav-disabled" tabindex="-1" aria-disabled="true" title="Coming in a later phase" style="opacity:0.4;cursor:not-allowed;">${icon}<span>${item.label}</span></a>`;
    }
    return `<a href="${item.href}" class="${item.key === activeKey ? 'active' : ''}">${icon}<span>${item.label}</span></a>`;
  }

  function sidebarHtml(activeKey, user) {
    const role = user?.role || '';
    return `
      <div class="admin-sidebar-brand">
        <span class="dot"></span> SHEREBLOG NEWS <span style="color:#64709a;font-weight:500;">Admin</span>
      </div>
      <nav class="admin-nav" aria-label="Admin">
        ${NAV_SECTIONS.map((section) => {
      const items = section.items.map((item) => navItemHtml(item, activeKey, role)).filter(Boolean).join('');
      if (!items) return '';
      return `<div class="admin-nav-group"><div class="admin-nav-label">${section.label}</div>${items}</div>`;
    }).join('')}
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user-chip">
          <div class="admin-user-avatar">${utils.initials(user?.fullName)}</div>
          <div>
            <div class="admin-user-name">${utils.escapeHtml(user?.fullName || '')}</div>
            <div class="admin-user-role">${utils.escapeHtml((user?.role || '').replace('_', ' '))}</div>
          </div>
        </div>
        <button class="admin-logout-btn" id="admin-logout-btn">Log out</button>
      </div>`;
  }

  function topbarHtml({ title, breadcrumb }) {
    return `
      <div style="display:flex; align-items:center; gap:0.8rem;">
        <button class="a-btn a-btn-ghost admin-mobile-menu-btn" id="admin-mobile-menu-btn" aria-label="Open menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div>
          <h1>${title}</h1>
          ${breadcrumb ? `<div class="admin-breadcrumb">${breadcrumb}</div>` : ''}
        </div>
      </div>
      <a href="/index.html" target="_blank" class="a-btn a-btn-ghost a-btn-sm">View site ↗</a>`;
  }

  async function mount({ active, title, breadcrumb }) {
    const user = await window.SHEREBLOG_ADMIN.authReady;
    if (!user) return null;

    document.getElementById('admin-sidebar-mount').innerHTML = sidebarHtml(active, user);
    document.getElementById('admin-topbar-mount').innerHTML = topbarHtml({ title, breadcrumb });

    document.getElementById('admin-logout-btn').addEventListener('click', async () => {
      await window.SHEREBLOG_ADMIN.api.logout();
      window.SHEREBLOG_ADMIN.session.clearSession();
      window.location.href = '/admin/index.html';
    });

    const sidebar = document.querySelector('.admin-sidebar');
    const menuBtn = document.getElementById('admin-mobile-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    return user;
  }

  window.SHEREBLOG_ADMIN = window.SHEREBLOG_ADMIN || {};
  window.SHEREBLOG_ADMIN.layout = { mount };
})();