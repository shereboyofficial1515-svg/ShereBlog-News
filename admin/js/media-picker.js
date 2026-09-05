/**
 * Reusable "browse Media Library" picker modal. Requires the markup
 * block with #media-picker-modal / #media-picker-grid / #media-picker-search
 * to be present on the page (post-editor.html includes it).
 *
 * Usage: window.SHEREBLOG_ADMIN.mediaPicker.open((item) => { ... use item.fileUrl ... });
 */
(function () {
  const { api, utils } = window.SHEREBLOG_ADMIN;

  let onSelectCallback = null;

  async function loadGrid(search) {
    const grid = document.getElementById('media-picker-grid');
    grid.innerHTML = Array.from({ length: 6 }).map(() => `<div class="a-skeleton" style="aspect-ratio:1;"></div>`).join('');
    try {
      const params = { type: 'image', pageSize: 40 };
      if (search) params.search = search;
      const { media } = await api.listMedia(params);

      if (!media.length) {
        grid.innerHTML = `<div class="a-empty" style="grid-column:1/-1;"><h3>No images yet</h3><p>Upload one from the Media Library.</p></div>`;
        return;
      }

      grid.innerHTML = media.map((m) => `
        <div class="media-picker-tile" data-url="${utils.escapeHtml(m.fileUrl)}" data-alt="${utils.escapeHtml(m.altText || '')}" data-caption="${utils.escapeHtml(m.caption || '')}"
             style="cursor:pointer; border-radius:6px; overflow:hidden; aspect-ratio:1; border:1px solid var(--a-border);">
          <img src="${utils.escapeHtml(m.fileUrl)}" alt="${utils.escapeHtml(m.altText || '')}" style="width:100%; height:100%; object-fit:cover;" />
        </div>`).join('');

      grid.querySelectorAll('.media-picker-tile').forEach((tile) => {
        tile.addEventListener('click', () => {
          if (onSelectCallback) {
            onSelectCallback({ fileUrl: tile.dataset.url, altText: tile.dataset.alt, caption: tile.dataset.caption });
          }
          close();
        });
      });
    } catch (err) {
      grid.innerHTML = `<div class="a-empty" style="grid-column:1/-1;"><h3>Couldn't load media</h3><p>${utils.escapeHtml(err.message)}</p></div>`;
    }
  }

  function open(onSelect) {
    onSelectCallback = onSelect;
    document.getElementById('media-picker-modal').style.display = 'flex';
    document.getElementById('media-picker-search').value = '';
    loadGrid('');
  }

  function close() {
    document.getElementById('media-picker-modal').style.display = 'none';
    onSelectCallback = null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('media-picker-modal');
    if (!modal) return; // page doesn't include the picker markup
    document.getElementById('media-picker-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.getElementById('media-picker-search').addEventListener('input', utils.debounce((e) => loadGrid(e.target.value.trim()), 300));
  });

  window.SHEREBLOG_ADMIN = window.SHEREBLOG_ADMIN || {};
  window.SHEREBLOG_ADMIN.mediaPicker = { open, close };
})();
