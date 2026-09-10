(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  let page = 1;
  const pageSize = 24;
  let total = 0;
  let items = [];
  let activeItem = null;

  function tileHtml(item) {
    if (item.fileType === 'image') {
      return `
        <div class="media-tile" data-id="${item.id}">
          <div class="media-tile-thumb"><img src="${utils.escapeHtml(item.fileUrl)}" alt="${utils.escapeHtml(item.altText || '')}" loading="lazy" /></div>
          <div class="media-tile-name">${utils.escapeHtml(item.fileName)}</div>
        </div>`;
    }
    return `
      <div class="media-tile" data-id="${item.id}">
        <div class="media-tile-thumb"><div class="media-tile-doc">📄<br>${utils.escapeHtml((item.mimeType || '').split('/').pop())}</div></div>
        <div class="media-tile-name">${utils.escapeHtml(item.fileName)}</div>
      </div>`;
  }

  async function loadGrid() {
    const grid = document.getElementById('media-grid');
    grid.innerHTML = Array.from({ length: 8 }).map(() => `<div class="media-tile"><div class="a-skeleton" style="aspect-ratio:1;"></div></div>`).join('');

    try {
      const params = { page, pageSize };
      const search = document.getElementById('search-input').value.trim();
      const type = document.getElementById('type-filter').value;
      if (search) params.search = search;
      if (type) params.type = type;

      const res = await api.listMedia(params);
      items = res.media;
      total = res.total;

      if (!items.length) {
        grid.innerHTML = `<div class="a-empty" style="grid-column:1/-1;"><h3>No files yet</h3><p>Upload your first image or document above.</p></div>`;
      } else {
        grid.innerHTML = items.map(tileHtml).join('');
        grid.querySelectorAll('.media-tile').forEach((tile) => {
          tile.addEventListener('click', () => openModal(tile.dataset.id));
        });
      }

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      document.getElementById('pagination-info').textContent = `${start}-${end} of ${total}`;
      document.getElementById('prev-page-btn').disabled = page <= 1;
      document.getElementById('next-page-btn').disabled = page * pageSize >= total;
    } catch (err) {
      grid.innerHTML = `<div class="a-empty" style="grid-column:1/-1;"><h3>Couldn't load media</h3><p>${utils.escapeHtml(err.message)}</p></div>`;
    }
  }

  // --- Upload ------------------------------------------------------
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  document.getElementById('browse-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) doUpload(fileInput.files[0]); });

  ['dragenter', 'dragover'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  });

  async function doUpload(file) {
    const progress = document.getElementById('upload-progress');
    progress.style.display = '';
    progress.textContent = `Uploading ${file.name}…`;
    progress.style.color = 'var(--a-slate)';
    try {
      await api.uploadMedia(file);
      utils.toast('File uploaded');
      progress.style.display = 'none';
      page = 1;
      loadGrid();
    } catch (err) {
      progress.textContent = err.message || 'Upload failed';
      progress.style.color = 'var(--a-red-dark)';
    } finally {
      fileInput.value = '';
    }
  }

  // --- Detail / edit / delete modal -----------------------------------
  const modal = document.getElementById('media-modal');
  function openModal(id) {
    activeItem = items.find((i) => i.id === id);
    if (!activeItem) return;
    document.getElementById('media-modal-preview').innerHTML = activeItem.fileType === 'image'
      ? `<img src="${utils.escapeHtml(activeItem.fileUrl)}" style="width:100%; max-height:45vh; object-fit:contain; display:block;" />`
      : `<div style="padding:2rem; text-align:center; font-family:var(--a-mono); color:var(--a-slate);">📄 ${utils.escapeHtml(activeItem.fileName)}</div>`;
    document.getElementById('media-url-field').value = activeItem.fileUrl;
    document.getElementById('media-alt-field').value = activeItem.altText || '';
    document.getElementById('media-caption-field').value = activeItem.caption || '';
    modal.style.display = 'flex';
  }
  document.getElementById('media-modal-close').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('copy-url-btn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(document.getElementById('media-url-field').value);
    utils.toast('URL copied');
  });

  document.getElementById('save-media-btn').addEventListener('click', async () => {
    try {
      await api.updateMedia(activeItem.id, {
        altText: document.getElementById('media-alt-field').value.trim(),
        caption: document.getElementById('media-caption-field').value.trim(),
      });
      utils.toast('Saved');
      modal.style.display = 'none';
      loadGrid();
    } catch (err) {
      utils.toast(err.message || 'Could not save changes.', 'error');
    }
  });

  document.getElementById('delete-media-btn').addEventListener('click', async () => {
    if (!window.confirm(`Delete "${activeItem.fileName}"? This can't be undone.`)) return;
    try {
      await api.deleteMedia(activeItem.id);
      utils.toast('File deleted');
      modal.style.display = 'none';
      loadGrid();
    } catch (err) {
      utils.toast(err.message || 'Could not delete file.', 'error');
    }
  });

  const debouncedReload = utils.debounce(() => { page = 1; loadGrid(); }, 350);
  document.getElementById('search-input').addEventListener('input', debouncedReload);
  document.getElementById('type-filter').addEventListener('change', () => { page = 1; loadGrid(); });
  document.getElementById('prev-page-btn').addEventListener('click', () => { if (page > 1) { page -= 1; loadGrid(); } });
  document.getElementById('next-page-btn').addEventListener('click', () => { if (page * pageSize < total) { page += 1; loadGrid(); } });

  async function init() {
    const user = await window.SHEREBLOG_ADMIN.layout.mount({ active: 'media', title: 'Media Library', breadcrumb: 'Images & documents' });
    if (!user) return;
    loadGrid();
  }

  init();
})();
