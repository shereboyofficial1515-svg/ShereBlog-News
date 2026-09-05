(function () {
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeAgo(isoString) {
    if (!isoString) return '';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    const units = [
      ['year', 31536000], ['month', 2592000], ['day', 86400],
      ['hour', 3600], ['minute', 60],
    ];
    for (const [name, secs] of units) {
      const val = Math.floor(seconds / secs);
      if (val >= 1) return `${val} ${name}${val > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  function placeholderImage(seed, w = 800, h = 500) {
    return `https://picsum.photos/seed/${encodeURIComponent(seed || 'shereblog')}/${w}/${h}`;
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function toast(message, type = 'success') {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const el = document.createElement('div');
    el.className = `toast${type === 'error' ? ' toast-error' : ''}`;
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  window.SHEREBLOG = window.SHEREBLOG || {};
  window.SHEREBLOG.utils = { escapeHtml, formatDate, timeAgo, placeholderImage, debounce, toast };
})();
