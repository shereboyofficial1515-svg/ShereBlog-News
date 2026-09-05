(function () {
  const { escapeHtml, toast } = window.SHEREBLOG.utils;

  const NAV_LINKS = [
    { label: 'Home', href: '/index.html' },
    { label: 'Politics', href: '/category.html?slug=politics' },
    { label: 'Entertainment', href: '/category.html?slug=entertainment' },
    { label: 'Sports', href: '/category.html?slug=sports' },
    { label: 'Business', href: '/category.html?slug=business' },
    { label: 'Technology', href: '/category.html?slug=technology' },
    { label: 'World', href: '/category.html?slug=world' },
    { label: 'Lifestyle', href: '/category.html?slug=lifestyle' },
  ];

  function navHtml(compact) {
    return NAV_LINKS.map(
      (link) => `<li><a href="${link.href}">${escapeHtml(link.label)}</a></li>`
    ).join('');
  }

  function headerHtml() {
    return `
      <a class="skip-link" href="#main-content">Skip to content</a>
      <div id="breaking-bar-mount"></div>
      <header class="site-header">
        <div class="container masthead">
          <a href="/index.html" class="logo" aria-label="SHEREBLOG NEWS home">
            <span class="logo-shere">Shere</span><span class="logo-blog">blog</span><span class="logo-news">NEWS</span>
          </a>
          <div class="masthead-actions">
            <button class="icon-btn" id="search-toggle" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <a href="/submit-news.html" class="btn btn-ghost" style="display:none" id="submit-news-link">Submit News</a>
            <button class="icon-btn mobile-menu-btn" id="mobile-menu-toggle" aria-label="Open menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
        <nav class="main-nav" aria-label="Main">
          <div class="container"><ul>${navHtml()}</ul></div>
        </nav>
      </header>
      <div class="mobile-drawer" id="mobile-drawer">
        <div class="mobile-drawer-backdrop" id="mobile-drawer-backdrop"></div>
        <div class="mobile-drawer-panel">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="logo" style="font-size:1.2rem;"><span class="logo-shere">Shere</span><span class="logo-blog">blog</span></span>
            <button class="icon-btn" id="mobile-drawer-close" aria-label="Close menu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <ul>${navHtml()}<li><a href="/submit-news.html">Submit News</a></li><li><a href="/search.html">Search</a></li></ul>
        </div>
      </div>`;
  }

  function footerHtml() {
    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-about" style="padding-top: var(--space-7);">
            <span class="logo" style="font-size:1.4rem;"><span class="logo-shere">Shere</span><span class="logo-blog">blog</span><span class="logo-news">NEWS</span></span>
            <p style="margin-top: var(--space-3);">Independent digital news covering politics, business, entertainment, sports, technology and the stories that matter — reported clearly, published fast.</p>
            <div class="footer-socials">
              <a class="icon-btn" href="#" aria-label="Facebook"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg></a>
              <a class="icon-btn" href="#" aria-label="TikTok"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8a4.3 4.3 0 0 1-3.1-1.3v9.6a5.5 5.5 0 1 1-4.7-5.4v2.3a3.1 3.1 0 1 0 2.2 3v-13h2.4a4.3 4.3 0 0 0 3.2 3.7v1.1z"/></svg></a>
              <a class="icon-btn" href="#" aria-label="WhatsApp"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.3A10 10 0 1 0 12 2zm5.6 14.2c-.2.6-1.4 1.2-1.9 1.2-.5 0-1.1.2-3.6-.8-3-1.2-4.9-4.2-5-4.4-.2-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.2-.2.5-.3.7-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.5.6c-.1.2-.2.4 0 .6.2.4 1 1.5 2.1 2.4 1.4 1.2 1.7 1.3 1.9 1.2.2-.1.9-.8 1.1-1 .2-.3.4-.2.7-.1l1.9 1c.2.1.4.2.4.4 0 .2 0 .9-.2 1.5z"/></svg></a>
            </div>
          </div>
          <div class="footer-grid">
            <div></div>
            <div>
              <h4>Categories</h4>
              <ul>${NAV_LINKS.slice(1).map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><a href="/about.html">About Us</a></li>
                <li><a href="/contact.html">Contact Us</a></li>
                <li><a href="/editorial-policy.html">Editorial Policy</a></li>
                <li><a href="/submit-news.html">Submit News</a></li>
              </ul>
            </div>
            <div>
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy-policy.html">Privacy Policy</a></li>
                <li><a href="/terms-of-service.html">Terms of Service</a></li>
                <li><a href="/cookie-policy.html">Cookie Policy</a></li>
                <li><a href="/disclaimer.html">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© <span id="footer-year"></span> SHEREBLOG NEWS. All rights reserved.</span>
            <span>Reported with care, published fast.</span>
          </div>
        </div>
      </footer>`;
  }

  function newsletterBoxHtml(id) {
    return `
      <div class="newsletter-box">
        <div>
          <h3>Stay Updated</h3>
          <p>Get the latest SHEREBLOG NEWS stories delivered to your inbox.</p>
        </div>
        <form class="newsletter-form" id="${id}">
          <label class="sr-only" for="${id}-email">Email address</label>
          <input type="email" id="${id}-email" name="email" placeholder="Enter your email" required />
          <button type="submit" class="btn btn-primary">Subscribe</button>
        </form>
      </div>`;
  }

  function wireNewsletterForms() {
    document.querySelectorAll('.newsletter-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const btn = form.querySelector('button');
        const originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Subscribing...';
        try {
          await window.SHEREBLOG.api.subscribeNewsletter(input.value);
          toast('You are subscribed! Check your inbox to confirm.');
          form.reset();
        } catch (err) {
          toast(err.message || 'Could not subscribe. Please try again.', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = originalLabel;
        }
      });
    });
  }

  function markActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    const currentSlug = new URLSearchParams(window.location.search).get('slug');
    document.querySelectorAll('.main-nav a, .mobile-drawer-panel a').forEach((a) => {
      const url = new URL(a.getAttribute('href'), window.location.origin);
      const linkFile = url.pathname.split('/').pop();
      const linkSlug = url.searchParams.get('slug');
      if (linkFile === current && (linkSlug || null) === (currentSlug || null)) {
        a.classList.add('active');
      }
    });
  }

  function wireMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const openBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-drawer-close');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    if (!drawer) return;
    const open = () => { drawer.classList.add('open'); closeBtn.focus(); };
    const close = () => { drawer.classList.remove('open'); openBtn.focus(); };
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });
  }

  function wireSearchToggle() {
    const btn = document.getElementById('search-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window.location.href = '/search.html';
    });
  }

  async function renderBreakingBar() {
    const mount = document.getElementById('breaking-bar-mount');
    if (!mount) return;
    try {
      // Breaking-news state comes from settings; the settings API lands in
      // a later phase, so this degrades gracefully to "nothing shown" if
      // it 404s rather than breaking the page.
      const res = await fetch('/api/settings/breaking-news');
      if (!res.ok) return;
      const body = await res.json();
      const bn = body && body.data;
      if (!bn || !bn.enabled) return;
      const text = bn.customText || (bn.article ? bn.article.title : '');
      if (!text) return;
      mount.innerHTML = `
        <div class="breaking-bar">
          <div class="container breaking-bar-inner">
            <span class="breaking-label"><span class="breaking-dot"></span> Breaking</span>
            <span class="breaking-text">${bn.article ? `<a href="/article.html?slug=${encodeURIComponent(bn.article.slug)}">${escapeHtml(text)}</a>` : escapeHtml(text)}</span>
          </div>
        </div>`;
    } catch (err) {
      // Silently degrade — breaking bar is an enhancement, not critical.
    }
  }

  function mountLayout() {
    const headerMount = document.getElementById('site-header-mount');
    const footerMount = document.getElementById('site-footer-mount');
    if (headerMount) headerMount.innerHTML = headerHtml();
    if (footerMount) footerMount.innerHTML = footerHtml();
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    markActiveNav();
    wireMobileDrawer();
    wireSearchToggle();
    wireNewsletterForms();
    renderBreakingBar();
  }

  window.SHEREBLOG = window.SHEREBLOG || {};
  window.SHEREBLOG.layout = { mountLayout, newsletterBoxHtml, wireNewsletterForms };

  document.addEventListener('DOMContentLoaded', mountLayout);
})();
