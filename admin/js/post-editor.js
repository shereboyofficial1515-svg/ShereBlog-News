(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  const articleId = new URLSearchParams(window.location.search).get('id');
  let currentUser = null;
  let isDirty = false;
  let isSaving = false;
  let autosaveTimer = null;
  let tags = [];
  let loadedArticle = null;

  const els = {
    title: document.getElementById('title-input'),
    subtitle: document.getElementById('subtitle-input'),
    content: document.getElementById('content-area'),
    status: document.getElementById('status-select'),
    scheduleFields: document.getElementById('schedule-fields'),
    scheduleDate: document.getElementById('schedule-date'),
    category: document.getElementById('category-select'),
    tagsInput: document.getElementById('tags-input-field'),
    tagsWrap: document.getElementById('tags-wrap'),
    slug: document.getElementById('slug-display'),
    imageUrl: document.getElementById('featured-image-url'),
    imageAlt: document.getElementById('featured-image-alt'),
    imageCaption: document.getElementById('featured-image-caption'),
    imagePreview: document.getElementById('featured-image-preview'),
    seoTitle: document.getElementById('seo-title'),
    seoDescription: document.getElementById('seo-description'),
    seoKeywords: document.getElementById('seo-keywords'),
    canonicalUrl: document.getElementById('canonical-url'),
    excerpt: document.getElementById('excerpt-input'),
    source: document.getElementById('source-input'),
    isFeatured: document.getElementById('is-featured-checkbox'),
    isBreaking: document.getElementById('is-breaking-checkbox'),
    saveDraftBtn: document.getElementById('save-draft-btn'),
    primaryBtn: document.getElementById('primary-action-btn'),
    unpublishBtn: document.getElementById('unpublish-btn'),
    trashBtn: document.getElementById('trash-btn'),
    saveIndicator: document.getElementById('save-indicator'),
  };

  function markDirty() {
    isDirty = true;
    els.saveIndicator.textContent = 'Unsaved changes';
  }

  // --- Tags -------------------------------------------------------
  function renderTags() {
    els.tagsWrap.querySelectorAll('.tag-pill').forEach((el) => el.remove());
    tags.forEach((tag, i) => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.innerHTML = `${utils.escapeHtml(tag)} <button type="button" aria-label="Remove tag">×</button>`;
      pill.querySelector('button').addEventListener('click', () => {
        tags.splice(i, 1);
        renderTags();
        markDirty();
      });
      els.tagsWrap.insertBefore(pill, els.tagsInput);
    });
  }
  els.tagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = els.tagsInput.value.trim().replace(/,$/, '');
      if (val && !tags.includes(val)) {
        tags.push(val);
        renderTags();
        markDirty();
      }
      els.tagsInput.value = '';
    } else if (e.key === 'Backspace' && !els.tagsInput.value && tags.length) {
      tags.pop();
      renderTags();
      markDirty();
    }
  });

  // --- Toolbar ------------------------------------------------------
  document.querySelectorAll('.editor-toolbar-btn[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.content.focus();
      const cmd = btn.dataset.cmd;
      const value = btn.dataset.value || null;
      document.execCommand(cmd, false, value);
      markDirty();
    });
  });
  document.getElementById('block-format-select').addEventListener('change', (e) => {
    els.content.focus();
    document.execCommand('formatBlock', false, e.target.value);
    markDirty();
  });
  document.getElementById('link-btn').addEventListener('click', () => {
    const url = window.prompt('Link URL:');
    if (url) {
      els.content.focus();
      document.execCommand('createLink', false, url);
      markDirty();
    }
  });
  document.getElementById('image-url-btn').addEventListener('click', () => {
    const url = window.prompt('Image URL:');
    if (url) {
      els.content.focus();
      document.execCommand('insertImage', false, url);
      markDirty();
    }
  });
  document.getElementById('image-library-btn').addEventListener('click', () => {
    window.SHEREBLOG_ADMIN.mediaPicker.open((item) => {
      els.content.focus();
      document.execCommand('insertImage', false, item.fileUrl);
      markDirty();
    });
  });
  document.getElementById('table-btn').addEventListener('click', () => {
    const rows = parseInt(window.prompt('Number of rows:', '2'), 10) || 2;
    const cols = parseInt(window.prompt('Number of columns:', '2'), 10) || 2;
    let html = '<table>';
    for (let r = 0; r < rows; r += 1) {
      html += '<tr>';
      for (let c = 0; c < cols; c += 1) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</table><p><br></p>';
    els.content.focus();
    document.execCommand('insertHTML', false, html);
    markDirty();
  });
  els.content.addEventListener('input', markDirty);

  // --- Write / Preview tabs -----------------------------------------
  document.getElementById('tab-write').addEventListener('click', () => switchMode('write'));
  document.getElementById('tab-preview').addEventListener('click', () => switchMode('preview'));
  function switchMode(mode) {
    document.getElementById('tab-write').classList.toggle('active', mode === 'write');
    document.getElementById('tab-preview').classList.toggle('active', mode === 'preview');
    document.getElementById('write-pane').style.display = mode === 'write' ? '' : 'none';
    document.getElementById('preview-pane').style.display = mode === 'preview' ? '' : 'none';
    if (mode === 'preview') renderPreview();
  }
  function renderPreview() {
    document.getElementById('preview-title').textContent = els.title.value || 'Untitled';
    document.getElementById('preview-subtitle').textContent = els.subtitle.value || '';
    const categoryLabel = els.category.selectedOptions[0]?.textContent || '';
    document.getElementById('preview-meta').textContent = `${categoryLabel} · ${currentUser?.fullName || ''} · ${new Date().toLocaleDateString()}`;
    const imgWrap = document.getElementById('preview-image-wrap');
    imgWrap.innerHTML = els.imageUrl.value
      ? `<img src="${utils.escapeHtml(els.imageUrl.value)}" alt="${utils.escapeHtml(els.imageAlt.value)}" style="width:100%;border-radius:10px;margin-bottom:1rem;" />`
      : '';
    document.getElementById('preview-body').innerHTML = els.content.innerHTML;
  }

  // --- Status / schedule UI ------------------------------------------
  function updateStatusUI() {
    const status = els.status.value;
    els.scheduleFields.style.display = status === 'scheduled' ? '' : 'none';

    const canPublish = currentUser && ['editor', 'admin', 'super_admin'].includes(currentUser.role);
    els.primaryBtn.textContent = canPublish ? 'Publish' : 'Submit for Review';

    els.unpublishBtn.style.display = loadedArticle && loadedArticle.status === 'published' && canPublish ? '' : 'none';
    els.trashBtn.style.display = loadedArticle ? '' : 'none';
  }
  els.status.addEventListener('change', () => { updateStatusUI(); markDirty(); });

  // --- Load reference data -------------------------------------------
  async function loadCategories() {
    const { categories } = await api.listAdminCategories();
    els.category.innerHTML = categories.map((c) => `<option value="${c.id}">${utils.escapeHtml(c.name)}</option>`).join('');
  }

  function populateForm(article) {
    loadedArticle = article;
    els.title.value = article.title || '';
    els.subtitle.value = article.subtitle || '';
    els.content.innerHTML = article.content || '';
    els.status.value = article.status || 'draft';
    els.category.value = article.category?.id || '';
    tags = (article.tags || []).map((t) => t.name);
    renderTags();
    els.slug.value = article.slug || '';
    els.imageUrl.value = article.featuredImageUrl || '';
    els.imageAlt.value = article.featuredImageAlt || '';
    els.imageCaption.value = article.featuredImageCaption || '';
    updateImagePreview();
    els.seoTitle.value = article.seoTitle || '';
    els.seoDescription.value = article.seoDescription || '';
    els.seoKeywords.value = article.seoKeywords || '';
    els.canonicalUrl.value = article.canonicalUrl || '';
    els.excerpt.value = article.excerpt || '';
    els.source.value = article.source || '';
    els.isFeatured.checked = !!article.isFeatured;
    els.isBreaking.checked = !!article.isBreaking;
    if (article.scheduledAt) {
      els.scheduleDate.value = new Date(article.scheduledAt).toISOString().slice(0, 16);
    }
    document.getElementById('page-title').textContent = `${article.title || 'Edit Post'} — SHEREBLOG NEWS Admin`;
    updateStatusUI();
    isDirty = false;
    els.saveIndicator.textContent = article.updatedAt ? `Last saved ${utils.timeAgo(article.updatedAt)}` : '';
  }

  els.imageUrl.addEventListener('input', updateImagePreview);
  function updateImagePreview() {
    if (els.imageUrl.value) {
      els.imagePreview.src = els.imageUrl.value;
      els.imagePreview.style.display = '';
    } else {
      els.imagePreview.style.display = 'none';
    }
  }

  document.getElementById('featured-image-library-btn').addEventListener('click', () => {
    window.SHEREBLOG_ADMIN.mediaPicker.open((item) => {
      els.imageUrl.value = item.fileUrl;
      if (item.altText && !els.imageAlt.value) els.imageAlt.value = item.altText;
      if (item.caption && !els.imageCaption.value) els.imageCaption.value = item.caption;
      updateImagePreview();
      markDirty();
    });
  });

  // --- Build payload & save -------------------------------------------
  function buildPayload(overrideStatus) {
    const payload = {
      title: els.title.value.trim(),
      subtitle: els.subtitle.value.trim() || null,
      content: els.content.innerHTML,
      excerpt: els.excerpt.value.trim() || null,
      categoryId: els.category.value || null,
      tags,
      featuredImageUrl: els.imageUrl.value.trim() || null,
      featuredImageCaption: els.imageCaption.value.trim() || null,
      featuredImageAlt: els.imageAlt.value.trim() || null,
      seoTitle: els.seoTitle.value.trim() || null,
      seoDescription: els.seoDescription.value.trim() || null,
      seoKeywords: els.seoKeywords.value.trim() || null,
      canonicalUrl: els.canonicalUrl.value.trim() || null,
      source: els.source.value.trim() || null,
      isFeatured: els.isFeatured.checked,
      isBreaking: els.isBreaking.checked,
      status: overrideStatus || els.status.value,
    };
    if (payload.status === 'scheduled') {
      if (!els.scheduleDate.value) throw new Error('Please choose a publish date and time for a scheduled post.');
      payload.scheduledAt = new Date(els.scheduleDate.value).toISOString();
    }
    return payload;
  }

  async function save(overrideStatus, options) {
    const silent = (options && options.silent) || false;
    if (isSaving) return undefined;
    if (!els.title.value.trim()) {
      if (!silent) utils.toast('Please add a title before saving.', 'error');
      return undefined;
    }
    isSaving = true;
    if (!silent) els.saveIndicator.textContent = 'Saving...';
    try {
      const payload = buildPayload(overrideStatus);
      let result;
      if (loadedArticle) {
        result = await api.updateArticle(loadedArticle.id, payload);
      } else {
        result = await api.createArticle(payload);
        // Move from "new post" URL to "editing this post" URL, without a
        // full page reload, so subsequent saves update instead of
        // creating duplicate articles.
        window.history.replaceState({}, '', `/admin/post-editor.html?id=${result.article.id}`);
      }
      loadedArticle = result.article;
      els.slug.value = loadedArticle.slug;
      isDirty = false;
      els.saveIndicator.textContent = `Saved ${utils.timeAgo(new Date().toISOString())}`;
      updateStatusUI();
      if (!silent) {
        const statusLabel = utils.STATUS_LABELS[loadedArticle.status] || loadedArticle.status;
        utils.toast(`Post saved as ${statusLabel}`);
      }
      return loadedArticle;
    } catch (err) {
      if (!silent) {
        // Surface the specific field error (e.g. "Article content is
        // required before publishing") instead of the generic
        // "Validation failed" message, so a real problem is
        // self-diagnosing instead of a mystery.
        const detail = Array.isArray(err.details) && err.details.length ? err.details[0].message : null;
        utils.toast(detail || err.message || 'Could not save post.', 'error');
      } else {
        els.saveIndicator.textContent = 'Autosave failed — check your connection';
      }
      throw err;
    } finally {
      isSaving = false;
    }
  }

  els.saveDraftBtn.addEventListener('click', () => save('draft'));

  els.primaryBtn.addEventListener('click', () => {
    const canPublish = currentUser && ['editor', 'admin', 'super_admin'].includes(currentUser.role);
    const status = els.status.value === 'scheduled' ? 'scheduled' : (canPublish ? 'published' : 'pending_review');
    save(status);
  });

  els.unpublishBtn.addEventListener('click', () => save('draft'));

  els.trashBtn.addEventListener('click', async () => {
    if (!loadedArticle) return;
    if (!window.confirm('Move this post to trash?')) return;
    try {
      await api.trashArticle(loadedArticle.id);
      utils.toast('Post moved to trash');
      window.location.href = '/admin/posts.html';
    } catch (err) {
      utils.toast(err.message || 'Could not move post to trash.', 'error');
    }
  });

  // --- Autosave every 20s if there's an existing post & unsaved changes
  function scheduleAutosave() {
    autosaveTimer = setInterval(() => {
      if (isDirty && loadedArticle && els.title.value.trim()) {
        save(undefined, { silent: true }).catch(() => { });
      }
    }, 20000);
  }

  // --- Warn before leaving with unsaved changes -----------------------
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  [els.title, els.subtitle, els.category, els.excerpt, els.source, els.seoTitle, els.seoDescription, els.seoKeywords, els.canonicalUrl, els.imageUrl, els.imageAlt, els.imageCaption, els.isFeatured, els.isBreaking].forEach((el) => {
    el.addEventListener('input', markDirty);
    el.addEventListener('change', markDirty);
  });

  async function init() {
    currentUser = await window.SHEREBLOG_ADMIN.layout.mount({
      active: articleId ? 'posts' : 'new-post',
      title: articleId ? 'Edit Post' : 'Create New Post',
      breadcrumb: 'Newsroom article editor',
    });
    if (!currentUser) return;

    await loadCategories();

    if (articleId) {
      try {
        const { article } = await api.getArticle(articleId);
        populateForm(article);
      } catch (err) {
        utils.toast('Could not load this post.', 'error');
        setTimeout(() => { window.location.href = '/admin/posts.html'; }, 1200);
        return;
      }
    } else {
      updateStatusUI();
    }

    scheduleAutosave();
  }

  init();
})();