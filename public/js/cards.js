(function () {
  const { escapeHtml, formatDate, placeholderImage } = window.SHEREBLOG.utils;

  function newsCard(article) {
    const img = article.featuredImageUrl || placeholderImage(article.slug);
    const category = article.category ? article.category.name : '';
    const author = article.author ? article.author.fullName : 'SHEREBLOG NEWS';
    return `
      <article class="news-card">
        <a href="/article.html?slug=${encodeURIComponent(article.slug)}" class="news-card-image">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(article.featuredImageAlt || article.title)}" loading="lazy" />
        </a>
        <div class="news-card-body">
          ${category ? `<span class="category-chip">${escapeHtml(category)}</span>` : ''}
          <h3><a href="/article.html?slug=${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></h3>
          <p class="news-card-excerpt">${escapeHtml(article.excerpt || '')}</p>
          <div class="news-card-meta">
            <span class="dateline">${escapeHtml(author)} · ${formatDate(article.publishedAt)}</span>
            ${article.readingTimeMinutes ? `<span class="dateline">${article.readingTimeMinutes} min read</span>` : ''}
          </div>
        </div>
      </article>`;
  }

  function featuredLead(article) {
    const img = article.featuredImageUrl || placeholderImage(article.slug, 1200, 675);
    const category = article.category ? article.category.name : '';
    const author = article.author ? article.author.fullName : 'SHEREBLOG NEWS';
    return `
      <a href="/article.html?slug=${encodeURIComponent(article.slug)}" class="featured-lead">
        <div class="featured-lead-image">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(article.featuredImageAlt || article.title)}" />
        </div>
        <div class="featured-lead-body">
          ${category ? `<span class="category-chip">${escapeHtml(category)}</span>` : ''}
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.excerpt || '')}</p>
          <span class="dateline">${escapeHtml(author)} · ${formatDate(article.publishedAt)}</span>
        </div>
      </a>`;
  }

  function secondaryCard(article) {
    const img = article.featuredImageUrl || placeholderImage(article.slug, 300, 220);
    return `
      <a href="/article.html?slug=${encodeURIComponent(article.slug)}" class="secondary-card">
        <div class="secondary-card-image">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(article.featuredImageAlt || article.title)}" loading="lazy" />
        </div>
        <div class="secondary-card-body">
          ${article.category ? `<span class="category-chip">${escapeHtml(article.category.name)}</span>` : ''}
          <h4>${escapeHtml(article.title)}</h4>
          <span class="dateline">${formatDate(article.publishedAt)}</span>
        </div>
      </a>`;
  }

  function skeletonCards(count, className) {
    return Array.from({ length: count })
      .map(() => `<div class="${className} skeleton" style="height:220px;"></div>`)
      .join('');
  }

  window.SHEREBLOG = window.SHEREBLOG || {};
  window.SHEREBLOG.cards = { newsCard, featuredLead, secondaryCard, skeletonCards };
})();
