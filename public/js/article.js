(function () {
  const { api } = window.SHEREBLOG;
  const { escapeHtml, formatDate, placeholderImage, toast } = window.SHEREBLOG.utils;
  const { newsCard } = window.SHEREBLOG.cards;

  function shareUrl(platform, url, title) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
      case 'x':
        return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
      default:
        return url;
    }
  }

  function setMeta(article, url) {
    const title = article.seoTitle || article.title;
    const description = article.seoDescription || article.excerpt || '';
    document.getElementById('page-title').textContent = `${title} — SHEREBLOG NEWS`;
    document.getElementById('meta-description').setAttribute('content', description);
    document.getElementById('og-title').setAttribute('content', title);
    document.getElementById('og-description').setAttribute('content', description);
    document.getElementById('og-image').setAttribute('content', article.featuredImageUrl || placeholderImage(article.slug));
    document.getElementById('canonical-link').setAttribute('href', article.canonicalUrl || url);

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description,
      image: article.featuredImageUrl ? [article.featuredImageUrl] : undefined,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: article.author ? { '@type': 'Person', name: article.author.fullName } : undefined,
      publisher: { '@type': 'Organization', name: 'SHEREBLOG NEWS' },
    };
    document.getElementById('article-schema').textContent = JSON.stringify(schema);
  }

  function renderArticle(article) {
    const url = window.location.href;
    setMeta(article, url);

    const authorImg = article.author?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(article.author?.fullName || 'SN')}`;

    document.getElementById('article-root').innerHTML = `
      <div class="container">
        <div class="article-header">
          ${article.category ? `<a class="category-chip" href="/category.html?slug=${encodeURIComponent(article.category.slug)}">${escapeHtml(article.category.name)}</a>` : ''}
          <h1>${escapeHtml(article.title)}</h1>
          ${article.subtitle ? `<p class="article-subtitle">${escapeHtml(article.subtitle)}</p>` : ''}
          <div class="article-byline">
            <img src="${escapeHtml(authorImg)}" alt="" />
            <div>
              <div class="article-byline-name">${escapeHtml(article.author?.fullName || 'SHEREBLOG NEWS Staff')}</div>
              <div class="dateline">${formatDate(article.publishedAt)}${article.updatedAt && article.updatedAt !== article.publishedAt ? ` · Updated ${formatDate(article.updatedAt)}` : ''} · ${article.readingTimeMinutes} min read · ${article.viewsCount || 0} views</div>
            </div>
          </div>
        </div>
      </div>

      ${article.featuredImageUrl ? `
      <figure class="article-hero container">
        <img src="${escapeHtml(article.featuredImageUrl)}" alt="${escapeHtml(article.featuredImageAlt || article.title)}" />
        ${article.featuredImageCaption ? `<figcaption>${escapeHtml(article.featuredImageCaption)}</figcaption>` : ''}
      </figure>` : ''}

      <div class="container">
        <div class="article-body-wrap">
          <div class="share-rail" aria-label="Share this article">
            <a class="icon-btn" href="${shareUrl('facebook', url, article.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>
            </a>
            <a class="icon-btn" href="${shareUrl('whatsapp', url, article.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.3A10 10 0 1 0 12 2zm5.6 14.2c-.2.6-1.4 1.2-1.9 1.2-.5 0-1.1.2-3.6-.8-3-1.2-4.9-4.2-5-4.4-.2-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.2-.2.5-.3.7-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.5.6c-.1.2-.2.4 0 .6.2.4 1 1.5 2.1 2.4 1.4 1.2 1.7 1.3 1.9 1.2.2-.1.9-.8 1.1-1 .2-.3.4-.2.7-.1l1.9 1c.2.1.4.2.4.4 0 .2 0 .9-.2 1.5z"/></svg>
            </a>
            <a class="icon-btn" href="${shareUrl('x', url, article.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share on X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.9L4.4 22H1.3l8.1-9.3L1 2h7l4.9 6.3L18.9 2z"/></svg>
            </a>
            <button class="icon-btn" id="copy-link-btn" aria-label="Copy link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>
            </button>
          </div>
          <div>
            <div class="article-content">${article.content}</div>
            ${article.tags && article.tags.length ? `
            <div class="article-tags">
              ${article.tags.map((t) => `<a class="category-chip" href="/search.html?tag=${encodeURIComponent(t.slug)}">#${escapeHtml(t.name)}</a>`).join('')}
            </div>` : ''}
            ${article.source ? `<div class="article-source">Source: ${escapeHtml(article.source)}</div>` : ''}
          </div>
        </div>
      </div>`;

    document.getElementById('copy-link-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard');
      } catch (err) {
        toast('Could not copy link', 'error');
      }
    });
  }

  function renderRelated(related) {
    if (!related || related.length === 0) return;
    document.getElementById('related-section').style.display = '';
    document.getElementById('related-grid').innerHTML = related.map(newsCard).join('');
  }

  function commentItemHtml(c) {
    return `
      <div class="comment-item">
        <div class="comment-item-header">
          <span class="comment-item-name">${escapeHtml(c.name)}</span>
          <span class="dateline">${formatDate(c.createdAt)}</span>
        </div>
        <p class="comment-item-content">${escapeHtml(c.content)}</p>
      </div>`;
  }

  function commentFormHtml() {
    return `
      <form class="comment-form" id="comment-form">
        <div class="comment-form-row">
          <input type="text" id="comment-name" placeholder="Your name" required maxlength="100" />
          <input type="email" id="comment-email" placeholder="Your email (not shown publicly)" required maxlength="200" />
        </div>
        <textarea id="comment-content" rows="3" placeholder="Add a comment..." required maxlength="2000" style="margin-bottom: var(--space-3);"></textarea>
        <!-- Honeypot: invisible to real visitors via CSS, but a naive bot
             filling every field trips server-side validation. -->
        <div class="honeypot-field" aria-hidden="true">
          <label for="comment-website">Website</label>
          <input type="text" id="comment-website" tabindex="-1" autocomplete="off" />
        </div>
        <button type="submit" class="btn btn-primary">Post Comment</button>
        <p class="dateline" style="margin-top: var(--space-2);">Comments are reviewed before they appear publicly.</p>
      </form>`;
  }

  async function loadCommentList(articleId) {
    const listEl = document.getElementById('comment-list');
    try {
      const { comments } = await api.getComments(articleId);
      listEl.innerHTML = comments.length
        ? comments.map(commentItemHtml).join('')
        : `<p class="dateline">No comments yet — be the first to share your thoughts.</p>`;
    } catch (err) {
      listEl.innerHTML = '';
    }
  }

  async function renderComments(article) {
    const section = document.getElementById('comments-section');
    const formMount = document.getElementById('comment-form-mount');

    let enabled = true;
    try {
      const { enabled: e } = await api.getCommentsEnabled();
      enabled = e;
    } catch (err) {
      // If the check itself fails, default to showing the form rather
      // than silently hiding a working feature over a transient error.
      enabled = true;
    }

    if (enabled) {
      formMount.innerHTML = commentFormHtml();
      document.getElementById('comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Posting...';
        try {
          await api.postComment({
            articleId: article.id,
            name: document.getElementById('comment-name').value.trim(),
            email: document.getElementById('comment-email').value.trim(),
            content: document.getElementById('comment-content').value.trim(),
            website: document.getElementById('comment-website').value,
          });
          toast('Thanks — your comment is awaiting moderation.');
          e.target.reset();
        } catch (err) {
          toast(err.message || 'Could not post your comment.', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = originalLabel;
        }
      });
    } else {
      formMount.innerHTML = `<div class="comments-disabled-note">Commenting is currently turned off for this site.</div>`;
    }

    section.style.display = '';
    await loadCommentList(article.id);
  }

  function renderNotFound() {
    document.getElementById('article-root').innerHTML = `
      <div class="container">
        <div class="empty-state">
          <h3>This story couldn't be found</h3>
          <p>It may have been moved, unpublished, or the link is incorrect.</p>
          <a class="btn btn-primary" href="/index.html" style="margin-top:12px;">Back to homepage</a>
        </div>
      </div>`;
  }

  async function init() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) {
      renderNotFound();
      return;
    }
    try {
      const { article, related } = await api.getArticleBySlug(slug);
      renderArticle(article);
      renderRelated(related);
      renderComments(article);
    } catch (err) {
      renderNotFound();
    }
  }

  init();
})();