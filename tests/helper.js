'use strict';
// Test helper: starts an isolated server (temp data dir) and gives cookie-aware clients. Synthetic data only.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build } = require('../src/bootstrap');

async function start(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g24-test-'));
  const { app, store, config } = build({ DATA_DIR: dir, ADMIN_EMAIL: 'admin@test.local', ADMIN_PASSWORD: 'AdminPass123', DEMO_PASSWORD: 'DemoPass12345', autoBackup: false, quiet: true, rateLimit: { authPerMin: 10000, globalPerMin: 1000000 }, ...extra });
  const server = await app.listen(0, '127.0.0.1');
  const base = 'http://127.0.0.1:' + server.address().port;
  const stop = async () => { await app.shutdown(); fs.rmSync(dir, { recursive: true, force: true }); };
  return { app, store, config, base, stop, client: () => client(base) };
}

function client(base) {
  let cookie = '';
  const call = async (method, p, body, headers = {}) => {
    const res = await fetch(base + p, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = res.headers.get('set-cookie'); if (sc) { const c = sc.split(';')[0]; cookie = c.endsWith('=') ? '' : c; }
    const ct = res.headers.get('content-type') || ''; const data = ct.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  };
  return { get: p => call('GET', p), post: (p, b = {}) => call('POST', p, b), patch: (p, b = {}) => call('PATCH', p, b), put: (p, b = {}) => call('PUT', p, b), del: p => call('DELETE', p), raw: call, clearCookie: () => { cookie = ''; } };
}

async function login(t, email, password) { const c = t.client(); const r = await c.post('/api/auth/login', { email, password }); if (r.status !== 200) throw new Error('login failed ' + email + ' ' + r.status); return c; }
const admin = t => login(t, 'admin@test.local', 'AdminPass123');
const demo = (t, who) => login(t, `${who}@demo.gurmad24.test`, 'DemoPass12345');
async function newPatient(t, email) { const c = t.client(); const r = await c.post('/api/auth/register', { name: 'Test Patient', email, password: 'Patient1234', consent: true }); if (r.status !== 201) throw new Error('register ' + r.status + JSON.stringify(r.data)); return c; }

module.exports = { start, client, login, admin, demo, newPatient };
