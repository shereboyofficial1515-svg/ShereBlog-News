(function () {
  const { api } = window.SHEREBLOG;
  const { escapeHtml, debounce } = window.SHEREBLOG.utils;
  const { newsCard } = window.SHEREBLOG.cards;

  const input = document.getElementById('search-input');
  const form = document.getElementById('search-form');
  const grid = document.getElementById('search-grid');
  const meta = document.getElementById('search-meta');

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q') || '';
  const initialTag = params.get('tag') || '';
  input.value = initialQuery;

  async function runSearch(query, tag) {
    if (!query && !tag) {
      grid.innerHTML = '';
      meta.textContent = '';
      return;
    }
    grid.innerHTML = window.SHEREBLOG.cards.skeletonCards(6, 'news-card');
    try {
      const searchParams = tag ? { tag } : {};
      const { articles, total } = query
        ? await api.search(query, searchParams)
        : await api.getArticles(searchParams);

      meta.textContent = tag
        ? `${total} result${total === 1 ? '' : 's'} tagged #${tag}`
        : `${total} result${total === 1 ? '' : 's'} for "${query}"`;

      if (articles.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>No results found</h3><p>Try a different search term, or browse by category from the homepage.</p></div>`;
        return;
      }
      grid.innerHTML = articles.map(newsCard).join('');
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>Search failed</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  function updateUrl(query) {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    url.searchParams.delete('tag');
    window.history.replaceState({}, '', url);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    updateUrl(input.value.trim());
    runSearch(input.value.trim(), '');
  });

  input.addEventListener('input', debounce(() => {
    updateUrl(input.value.trim());
    runSearch(input.value.trim(), '');
  }, 400));

  runSearch(initialQuery, initialTag);
})();
