(function () {
  const { api } = window.SHEREBLOG;
  const { escapeHtml, toast } = window.SHEREBLOG.utils;
  const { newsCard } = window.SHEREBLOG.cards;

  const slug = new URLSearchParams(window.location.search).get('slug');
  let page = 1;
  const PAGE_SIZE = 12;

  function renderNotFound() {
    document.getElementById('category-title').textContent = 'Category not found';
    document.getElementById('category-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <h3>We couldn't find that category</h3>
        <p>It may have been renamed or removed. Try browsing from the homepage instead.</p>
        <a class="btn btn-primary" href="/index.html" style="margin-top:12px;">Back to homepage</a>
      </div>`;
  }

  async function loadPage(append = false) {
    const grid = document.getElementById('category-grid');
    const btn = document.getElementById('load-more-btn');
    try {
      const { category, articles, total } = await api.getCategoryBySlug(slug, { page, pageSize: PAGE_SIZE });

      document.getElementById('page-title').textContent = `${category.name} — SHEREBLOG NEWS`;
      document.getElementById('category-title').textContent = category.name;
      document.getElementById('category-description').textContent = category.description || `The latest ${category.name.toLowerCase()} news from SHEREBLOG NEWS.`;
      document.getElementById('meta-description').setAttribute('content', category.seoDescription || category.description || '');

      if (!append && articles.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>No stories in ${escapeHtml(category.name)} yet</h3><p>Check back soon.</p></div>`;
        btn.style.display = 'none';
        return;
      }

      grid.insertAdjacentHTML(append ? 'beforeend' : 'beforeend', articles.map(newsCard).join(''));

      if (page * PAGE_SIZE >= total) {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
      }
    } catch (err) {
      if (!append) renderNotFound();
      else toast(err.message || 'Could not load more stories.', 'error');
    }
  }

  document.getElementById('load-more-btn').addEventListener('click', () => {
    page += 1;
    loadPage(true);
  });

  if (!slug) {
    renderNotFound();
  } else {
    loadPage();
  }
})();
