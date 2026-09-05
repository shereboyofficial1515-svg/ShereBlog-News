(function () {
    const status = new URLSearchParams(window.location.search).get('status');
    const icon = document.getElementById('confirm-icon');
    const title = document.getElementById('confirm-title');
    const body = document.getElementById('confirm-body');
    if (status === 'success') {
        icon.textContent = '✅';
        title.textContent = "You're subscribed!";
        body.textContent = 'Thanks for confirming — the latest SHEREBLOG NEWS stories will land in your inbox.';
    } else {
        icon.textContent = '⚠️';
        title.textContent = 'This link is invalid or expired';
        body.textContent = 'Try subscribing again from the homepage.';
    }
})();