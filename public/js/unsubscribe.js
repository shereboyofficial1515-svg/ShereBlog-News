(function () {
    const emailFromUrl = new URLSearchParams(window.location.search).get('email');
    if (emailFromUrl) document.getElementById('unsub-email').value = emailFromUrl;

    document.getElementById('unsub-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const result = document.getElementById('unsub-result');
        try {
            const email = document.getElementById('unsub-email').value;
            await window.SHEREBLOG.api.unsubscribeNewsletter(email);
            result.textContent = "You have been unsubscribed. We're sorry to see you go.";
            result.style.color = 'var(--success)';
        } catch (err) {
            result.textContent = err.message || 'Something went wrong. Please try again.';
            result.style.color = 'var(--wire-red)';
        }
    });
})();