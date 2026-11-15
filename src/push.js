'use strict';
// Push notifications (Android, via Firebase Cloud Messaging HTTP v1). Zero dependencies.
// Device tokens live on the user record (user.deviceTokens) so no database migration is needed.
// Sending is a no-op until FIREBASE_SERVICE_ACCOUNT_JSON is set (see docs/PUSH_NOTIFICATIONS.md).
// Never put patient/medical details in a notification: lock screens are visible to others.
const crypto = require('crypto');

const MAX_TOKENS = 5;
const PLATFORMS = ['android'];
const b64url = b => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function registerToken(store, user, token, platform) {
  if (!PLATFORMS.includes(platform)) return false;
  // A device token belongs to exactly one user (someone else logging in on the same phone takes it over).
  for (const u of store.col('users')) {
    if (u.id !== user.id && Array.isArray(u.deviceTokens) && u.deviceTokens.some(d => d.token === token)) {
      u.deviceTokens = u.deviceTokens.filter(d => d.token !== token);
    }
  }
  const list = (Array.isArray(user.deviceTokens) ? user.deviceTokens : []).filter(d => d.token !== token);
  list.push({ token, platform, ts: new Date().toISOString() });
  user.deviceTokens = list.slice(-MAX_TOKENS);
  store.save();
  return true;
}

function removeToken(store, user, token) {
  const before = (user.deviceTokens || []).length;
  user.deviceTokens = (user.deviceTokens || []).filter(d => d.token !== token);
  if (user.deviceTokens.length !== before) store.save();
}

function parseAccount(json) {
  if (!json) return null;
  try {
    const a = typeof json === 'string' ? JSON.parse(json) : json;
    return a && a.client_email && a.private_key && a.project_id ? a : null;
  } catch (_) { return null; }
}

function createSender(env = process.env, fetchImpl = globalThis.fetch) {
  const account = parseAccount(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  let cached = null; // { token, exp }

  async function accessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.exp - 60 > now) return cached.token;
    const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
    const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claims).sign(account.private_key);
    const res = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + claims + '.' + b64url(sig) }).toString(),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) throw new Error('fcm_auth_failed');
    cached = { token: data.access_token, exp: now + (data.expires_in || 3600) };
    return cached.token;
  }

  return {
    configured: !!account,
    // Sends a short notification to every registered device of the user. Returns counts; never throws.
    async sendToUser(store, user, { title, body }) {
      const devices = Array.isArray(user.deviceTokens) ? [...user.deviceTokens] : [];
      if (!account) return { configured: false, devices: devices.length, sent: 0, removed: 0 };
      let sent = 0; let removed = 0;
      try {
        const bearer = await accessToken();
        for (const d of devices) {
          const res = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token: d.token, notification: { title: String(title).slice(0, 80), body: String(body).slice(0, 200) }, android: { priority: 'HIGH' } } }),
          });
          if (res.ok) sent++;
          else if (res.status === 404 || res.status === 400) { removeToken(store, user, d.token); removed++; } // unregistered / invalid token
        }
      } catch (_) { /* delivery is best-effort */ }
      return { configured: true, devices: devices.length, sent, removed };
    },
  };
}

module.exports = { registerToken, removeToken, createSender, PLATFORMS };
