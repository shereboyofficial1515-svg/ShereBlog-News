(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;
  let settings = {};

  // --- Tabs -----------------------------------------------------
  document.querySelectorAll('.settings-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-tabs button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    });
  });

  function populate() {
    const s = settings.site || {};
    document.getElementById('site-name').value = s.name || '';
    document.getElementById('site-description').value = s.description || '';
    document.getElementById('site-logo').value = s.logo_url || '';
    document.getElementById('site-favicon').value = s.favicon_url || '';
    document.getElementById('site-contact-email').value = s.contact_email || '';
    document.getElementById('site-footer-text').value = s.footer_text || '';

    const seo = settings.seo || {};
    document.getElementById('seo-default-title').value = seo.default_title || '';
    document.getElementById('seo-default-description').value = seo.default_description || '';
    document.getElementById('seo-keywords').value = seo.keywords || '';
    document.getElementById('seo-google-verification').value = seo.google_verification || '';
    document.getElementById('sitemap-link').textContent = `${window.location.origin}/sitemap.xml`;
    document.getElementById('robots-link').textContent = `${window.location.origin}/robots.txt`;

    const social = settings.social || {};
    ['facebook', 'tiktok', 'whatsapp', 'twitter', 'instagram', 'youtube'].forEach((k) => {
      const el = document.getElementById(`social-${k}`);
      if (el) el.value = social[k] || '';
    });

    const bn = settings.breaking_news || {};
    document.getElementById('bn-enabled').checked = !!bn.enabled;
    document.getElementById('bn-article').value = bn.article_id || '';
    document.getElementById('bn-text').value = bn.custom_text || '';
    document.getElementById('bn-priority').value = bn.priority || 0;

    const nl = settings.newsletter || {};
    document.getElementById('nl-enabled').checked = nl.enabled !== false;
    document.getElementById('nl-sender-name').value = nl.sender_name || '';
    document.getElementById('nl-sender-email').value = nl.sender_email || '';

    const pub = settings.publishing || {};
    document.getElementById('pub-default-status').value = pub.default_status || 'draft';
    document.getElementById('pub-default-category').value = pub.default_category_id || '';

    const sec = settings.security || {};
    document.getElementById('sec-attempt-limit').value = sec.login_attempt_limit || 5;
    document.getElementById('sec-lockout-minutes').value = sec.lockout_minutes || 15;

    const comments = settings.comments || {};
    document.getElementById('comments-enabled').checked = comments.enabled !== false;
  }

  function collectValue(key) {
    switch (key) {
      case 'site':
        return {
          name: document.getElementById('site-name').value.trim(),
          description: document.getElementById('site-description').value.trim(),
          logo_url: document.getElementById('site-logo').value.trim(),
          favicon_url: document.getElementById('site-favicon').value.trim(),
          contact_email: document.getElementById('site-contact-email').value.trim(),
          footer_text: document.getElementById('site-footer-text').value.trim(),
        };
      case 'seo':
        return {
          default_title: document.getElementById('seo-default-title').value.trim(),
          default_description: document.getElementById('seo-default-description').value.trim(),
          keywords: document.getElementById('seo-keywords').value.trim(),
          google_verification: document.getElementById('seo-google-verification').value.trim(),
        };
      case 'social':
        return {
          facebook: document.getElementById('social-facebook').value.trim() || '#',
          tiktok: document.getElementById('social-tiktok').value.trim() || '#',
          whatsapp: document.getElementById('social-whatsapp').value.trim() || '#',
          twitter: document.getElementById('social-twitter').value.trim() || '#',
          instagram: document.getElementById('social-instagram').value.trim() || '#',
          youtube: document.getElementById('social-youtube').value.trim() || '#',
        };
      case 'breaking_news':
        return {
          enabled: document.getElementById('bn-enabled').checked,
          article_id: document.getElementById('bn-article').value || null,
          custom_text: document.getElementById('bn-text').value.trim(),
          priority: parseInt(document.getElementById('bn-priority').value, 10) || 0,
        };
      case 'newsletter':
        return {
          enabled: document.getElementById('nl-enabled').checked,
          sender_name: document.getElementById('nl-sender-name').value.trim(),
          sender_email: document.getElementById('nl-sender-email').value.trim(),
        };
      case 'publishing':
        return {
          default_status: document.getElementById('pub-default-status').value,
          default_category_id: document.getElementById('pub-default-category').value || null,
        };
      case 'security':
        return {
          login_attempt_limit: parseInt(document.getElementById('sec-attempt-limit').value, 10) || 5,
          lockout_minutes: parseInt(document.getElementById('sec-lockout-minutes').value, 10) || 15,
        };
      case 'comments':
        return {
          enabled: document.getElementById('comments-enabled').checked,
        };
      default:
        return {};
    }
  }

  document.querySelectorAll('.save-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const value = collectValue(key);
        await api.updateSettings(key, value);
        settings[key] = value;
        utils.toast('Settings saved');
      } catch (err) {
        utils.toast(err.message || 'Could not save settings.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });

  async function loadReferenceData() {
    try {
      const { categories } = await api.listAdminCategories();
      const catOptions = categories.map((c) => `<option value="${c.id}">${utils.escapeHtml(c.name)}</option>`).join('');
      document.getElementById('pub-default-category').insertAdjacentHTML('beforeend', catOptions);
    } catch (err) { /* non-critical */ }

    try {
      const { articles } = await api.listArticles({ status: 'published', pageSize: 50 });
      const artOptions = articles.map((a) => `<option value="${a.id}">${utils.escapeHtml(a.title)}</option>`).join('');
      document.getElementById('bn-article').insertAdjacentHTML('beforeend', artOptions);
    } catch (err) { /* non-critical */ }
  }

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'settings', title: 'Settings', breadcrumb: 'Site configuration & appearance' });
    if (!user) return;

    await loadReferenceData();
    try {
      const res = await api.getSettings();
      settings = res.settings;
      populate();
    } catch (err) {
      utils.toast(err.message || 'Could not load settings.', 'error');
    }
  }

  init();
})();