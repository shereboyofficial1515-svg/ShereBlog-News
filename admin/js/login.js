(function () {
    const { api, session } = window.SHEREBLOG_ADMIN;

    // If already logged in with a valid session, skip straight to dashboard.
    if (session.getAccessToken()) {
        api.me().then(() => { window.location.href = '/admin/dashboard.html'; }).catch(() => session.clearSession());
    }

    const form = document.getElementById('login-form');
    const errorBox = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Logging in...';
        try {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const data = await api.login(email, password);
            session.setSession(data);
            window.location.href = '/admin/dashboard.html';
        } catch (err) {
            errorBox.textContent = err.message || 'Login failed. Please try again.';
            errorBox.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Log In';
        }
    });
})();