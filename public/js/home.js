(function () {
  const { api } = window.SHEREBLOG;
  const { featuredLead, secondaryCard, newsCard } = window.SHEREBLOG.cards;
  const { toast } = window.SHEREBLOG.utils;

  let page = 1;
  const PAGE_SIZE = 9;
  let loading = false;
  let exhausted = false;

  async function loadFeatured() {
    const mount = document.getElementById('featured-grid');
    try {
      const { articles } = await api.getArticles({ pageSize: 4 });
      if (!articles.length) {
        mount.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>No stories published yet</h3><p>Check back soon — new stories will appear here as they're published.</p></div>`;
        return;
      }
      const [lead, ...rest] = articles;
      mount.innerHTML = `
        ${featuredLead(lead)}
        <div class="featured-secondary">
          ${rest.map(secondaryCard).join('')}
        </div>`;
    } catch (err) {
      mount.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>Couldn't load featured stories</h3><p>${err.message}</p></div>`;
    }
  }

  async function loadLatest(append = false) {
    if (loading || exhausted) return;
    loading = true;
    const grid = document.getElementById('latest-grid');
    const btn = document.getElementById('load-more-btn');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    try {
      const { articles, total } = await api.getArticles({ page, pageSize: PAGE_SIZE });
      if (page === 1 && articles.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>No stories yet</h3><p>New articles will show up here as soon as they're published.</p></div>`;
      } else {
        grid.insertAdjacentHTML('beforeend', articles.map(newsCard).join(''));
      }
      if (page * PAGE_SIZE >= total || articles.length < PAGE_SIZE) {
        exhausted = true;
        btn.style.display = 'none';
      } else {
        btn.textContent = 'Load More';
        btn.disabled = false;
      }
      page += 1;
    } catch (err) {
      toast(err.message || 'Could not load more stories.', 'error');
      btn.textContent = 'Load More';
      btn.disabled = false;
    } finally {
      loading = false;
    }
  }

  document.getElementById('newsletter-mount').innerHTML = window.SHEREBLOG.layout.newsletterBoxHtml('home-newsletter');
  window.SHEREBLOG.layout.wireNewsletterForms();

  document.getElementById('load-more-btn').addEventListener('click', () => loadLatest(true));

  loadFeatured();
  loadLatest();
})();
