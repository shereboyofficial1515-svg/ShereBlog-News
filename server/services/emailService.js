const env = require('../config/env');

/**
 * Thin email-sending abstraction, as required by the spec: everything
 * else in the codebase calls sendEmail()/renderTemplate() and never
 * talks to a provider directly, so swapping providers later only means
 * editing this one file.
 *
 * Concrete implementation: a Resend-compatible REST call
 * (POST https://api.resend.com/emails with a Bearer key), because it's
 * the simplest well-known API to demonstrate the pattern against. If
 * your provider differs (SendGrid, Mailgun, SES, Postmark...), swap the
 * fetch call below for that provider's API — nothing else in the
 * codebase needs to change.
 *
 * Honesty note: without EMAIL_PROVIDER_API_KEY set, no network call is
 * made — the email is logged to the server console instead, so
 * confirmation/unsubscribe links are still usable in development.
 */
async function sendEmail({ to, subject, html }) {
  if (!env.email.providerApiKey) {
    // eslint-disable-next-line no-console
    console.log(`[email:dev-mode] Would send to ${to} — subject: "${subject}"\n${html}\n`);
    return { delivered: false, mode: 'logged' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.email.providerApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${env.email.fromName} <${env.email.from}>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      // eslint-disable-next-line no-console
      console.error(`[email] provider send failed (${res.status}): ${errBody}`);
      return { delivered: false, mode: 'error' };
    }
    return { delivered: true, mode: 'sent' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] provider send threw:', err.message);
    return { delivered: false, mode: 'error' };
  }
}

function newsletterConfirmationTemplate({ confirmUrl }) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2>Confirm your SHEREBLOG NEWS subscription</h2>
      <p>Click the link below to start receiving the latest stories in your inbox.</p>
      <p><a href="${confirmUrl}" style="background:#b23a2e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Confirm subscription</a></p>
      <p style="color:#888;font-size:12px;">If you didn't request this, you can ignore this email.</p>
    </div>`;
}

function newArticleNotificationTemplate({ title, imageUrl, description, articleUrl, unsubscribeUrl }) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      ${imageUrl ? `<img src="${imageUrl}" alt="" style="width:100%;border-radius:8px;" />` : ''}
      <h2>${title}</h2>
      <p>${description || ''}</p>
      <p><a href="${articleUrl}" style="background:#b23a2e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Read Article</a></p>
      <p style="color:#888;font-size:12px;"><a href="${unsubscribeUrl}">Unsubscribe</a> from SHEREBLOG NEWS emails.</p>
    </div>`;
}

module.exports = { sendEmail, newsletterConfirmationTemplate, newArticleNotificationTemplate };
