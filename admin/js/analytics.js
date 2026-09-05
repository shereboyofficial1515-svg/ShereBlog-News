(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  function renderStats(data) {
    document.getElementById('stat-grid').innerHTML = `
      <div class="a-card a-stat-card"><div class="a-stat-label">Total Views (All Time)</div><div class="a-stat-value">${data.totalViewsAllTime}</div></div>
      <div class="a-card a-stat-card"><div class="a-stat-label">Views (Last ${data.recentDays} Days)</div><div class="a-stat-value">${data.totalViewsRecent}</div></div>`;
  }

  function renderTrend(trend) {
    const max = Math.max(1, ...trend.map((t) => t.views));
    const width = 600;
    const height = 140;
    const barWidth = width / trend.length;
    const bars = trend.map((t, i) => {
      const h = (t.views / max) * (height - 24);
      const x = i * barWidth;
      const y = height - h - 20;
      return `<rect x="${x + 2}" y="${y}" width="${barWidth - 4}" height="${h}" fill="var(--a-red)" rx="2"></rect>
              <text x="${x + barWidth / 2}" y="${height - 4}" font-size="8" fill="var(--a-slate)" text-anchor="middle">${new Date(t.date).getDate()}</text>`;
    }).join('');
    document.getElementById('trend-chart').innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; font-family:var(--a-mono);">${bars}</svg>`;
  }

  function renderCategoryBars(rows) {
    const el = document.getElementById('category-chart');
    if (!rows.length) {
      el.innerHTML = `<p style="color:var(--a-slate); font-size:0.85rem;">No published articles with views yet.</p>`;
      return;
    }
    const max = Math.max(1, ...rows.map((r) => r.views));
    el.innerHTML = rows.slice(0, 8).map((r) => `
      <div class="bar-row">
        <div class="bar-label">${utils.escapeHtml(r.category)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(r.views / max) * 100}%;"></div></div>
        <div class="bar-value">${r.views}</div>
      </div>`).join('');
  }

  function renderTopArticles(articles) {
    const el = document.getElementById('top-articles-list');
    if (!articles.length) {
      el.innerHTML = `<p style="color:var(--a-slate); font-size:0.85rem;">No published articles yet.</p>`;
      return;
    }
    el.innerHTML = articles.map((a, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--a-border); font-size:0.85rem;">
        <span style="display:flex; align-items:center; gap:0.6rem; min-width:0;">
          <span style="color:var(--a-slate); font-family:var(--a-mono); font-size:0.75rem;">${i + 1}</span>
          <a href="/admin/post-editor.html?id=${a.id}" style="font-weight:600;">${utils.escapeHtml(a.title)}</a>
          ${a.category ? `<span class="a-badge a-badge-scheduled">${utils.escapeHtml(a.category)}</span>` : ''}
        </span>
        <span style="color:var(--a-slate); white-space:nowrap; margin-left:1rem;">${a.viewsCount} views</span>
      </div>`).join('');
  }

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'analytics', title: 'Analytics', breadcrumb: 'Traffic & performance' });
    if (!user) return;

    document.getElementById('stat-grid').innerHTML = Array.from({ length: 2 }).map(() => `<div class="a-card a-stat-card"><div class="a-skeleton" style="width:60%;margin-bottom:10px;"></div><div class="a-skeleton" style="width:40%;height:26px;"></div></div>`).join('');

    try {
      const data = await api.getAnalytics({ days: 14 });
      renderStats(data);
      renderTrend(data.trend);
      renderCategoryBars(data.viewsByCategory);
      renderTopArticles(data.topArticles);
    } catch (err) {
      utils.toast(err.message || 'Could not load analytics.', 'error');
    }
  }

  init();
})();
