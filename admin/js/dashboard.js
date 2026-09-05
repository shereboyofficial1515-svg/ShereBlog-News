(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  const STAT_CARDS = [
    { key: 'totalArticles', label: 'Total Articles' },
    { key: 'published', label: 'Published' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'pendingReview', label: 'Pending Review' },
    { key: 'totalUsers', label: 'Active Users' },
    { key: 'pendingSubmissions', label: 'Pending Submissions' },
    { key: 'newsletterSubscribers', label: 'Newsletter Subscribers' },
  ];

  const ACTION_LABELS = {
    admin_logged_in: 'logged in',
    admin_logged_out: 'logged out',
    article_created: 'created an article',
    article_edited: 'edited an article',
    article_published: 'published an article',
    article_deleted: 'moved an article to trash',
    article_restored: 'restored an article',
    article_permanently_deleted: 'permanently deleted an article',
    article_auto_published_on_schedule: 'was auto-published on schedule',
    category_created: 'created a category',
    category_edited: 'edited a category',
    category_deleted: 'deleted a category',
  };

  function renderStats(stats) {
    document.getElementById('stat-grid').innerHTML = STAT_CARDS.map(
      (c) => `
      <div class="a-card a-stat-card">
        <div class="a-stat-label">${c.label}</div>
        <div class="a-stat-value">${stats[c.key] ?? 0}</div>
      </div>`
    ).join('');
  }

  function renderActivity(activity) {
    const el = document.getElementById('activity-list');
    if (!activity.length) {
      el.innerHTML = `<p style="color:var(--a-slate); font-size:0.85rem;">No activity recorded yet.</p>`;
      return;
    }
    el.innerHTML = activity.map((a) => `
      <div style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--a-border); font-size:0.85rem;">
        <span><strong>${utils.escapeHtml(a.userName)}</strong> ${ACTION_LABELS[a.action] || a.action.replace(/_/g, ' ')}</span>
        <span style="color:var(--a-slate); white-space:nowrap; margin-left:1rem;">${utils.timeAgo(a.createdAt)}</span>
      </div>`).join('');
  }

  function renderMostRead(articles) {
    const el = document.getElementById('most-read-list');
    if (!articles.length) {
      el.innerHTML = `<p style="color:var(--a-slate); font-size:0.85rem;">No published articles with views yet.</p>`;
      return;
    }
    el.innerHTML = articles.map((a, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--a-border); font-size:0.85rem;">
        <span style="display:flex; align-items:center; gap:0.6rem; min-width:0;">
          <span style="color:var(--a-slate); font-family:var(--a-mono); font-size:0.75rem;">${i + 1}</span>
          <a href="/admin/post-editor.html?id=${a.id}" style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${utils.escapeHtml(a.title)}</a>
        </span>
        <span style="color:var(--a-slate); white-space:nowrap; margin-left:1rem;">${a.viewsCount} views</span>
      </div>`).join('');
  }

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({
      active: 'dashboard',
      title: 'Dashboard',
      breadcrumb: 'Overview of your newsroom',
    });
    if (!user) return;

    document.getElementById('stat-grid').innerHTML = Array.from({ length: 8 })
      .map(() => `<div class="a-card a-stat-card"><div class="a-skeleton" style="width:60%;margin-bottom:10px;"></div><div class="a-skeleton" style="width:40%;height:26px;"></div></div>`)
      .join('');

    try {
      const stats = await api.getDashboardStats();
      renderStats(stats);
      renderActivity(stats.recentActivity);
      renderMostRead(stats.mostReadArticles);
    } catch (err) {
      utils.toast(err.message || 'Could not load dashboard stats.', 'error');
    }
  }

  init();
})();
