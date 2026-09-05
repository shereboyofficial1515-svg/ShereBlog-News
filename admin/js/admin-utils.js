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
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function timeAgo(isoString) {
    if (!isoString) return '';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [name, secs] of units) {
      const val = Math.floor(seconds / secs);
      if (val >= 1) return `${val} ${name}${val > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  function toast(message, type = 'success') {
    let region = document.querySelector('.a-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'a-toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const el = document.createElement('div');
    el.className = `a-toast ${type}`;
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  const STATUS_LABELS = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    scheduled: 'Scheduled',
    published: 'Published',
    archived: 'Archived',
    trash: 'Trash',
  };

  function statusBadge(status) {
    return `<span class="a-badge a-badge-${status}">${STATUS_LABELS[status] || status}</span>`;
  }

  window.SHEREBLOG_ADMIN = window.SHEREBLOG_ADMIN || {};
  window.SHEREBLOG_ADMIN.utils = {
    escapeHtml, formatDate, formatDateTime, timeAgo, initials, debounce, toast, statusBadge, STATUS_LABELS,
  };
})();
