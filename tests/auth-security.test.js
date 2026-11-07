'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const H = require('./helper');
const S = require('../src/security');
const { ensureAdmin } = require('../src/seed');

let t;
before(async () => { t = await H.start(); });
after(async () => { await t.stop(); });

test('registration requires consent, strong password and unique email', async () => {
  const c = t.client();
  assert.equal((await c.post('/api/auth/register', { name: 'A B', email: 'a@x.test', password: 'Passw0rd12', consent: false })).status, 400);
  assert.equal((await c.post('/api/auth/register', { name: 'A B', email: 'a@x.test', password: 'short', consent: true })).status, 400);
  assert.equal((await c.post('/api/auth/register', { name: 'A B', email: 'a@x.test', password: 'onlyletters', consent: true })).status, 400);
  assert.equal((await c.post('/api/auth/register', { name: 'A B', email: 'not-an-email', password: 'Passw0rd12', consent: true })).status, 400);
  const ok = await c.post('/api/auth/register', { name: 'A B', email: 'a@x.test', password: 'Passw0rd12', consent: true });
  assert.equal(ok.status, 201); assert.equal(ok.data.user.role, 'patient');
  assert.equal(ok.data.user.passwordHash, undefined);
  assert.equal((await t.client().post('/api/auth/register', { name: 'A B', email: 'A@X.test', password: 'Passw0rd12', consent: true })).status, 409);
});

test('login, session cookie flags, me and logout', async () => {
  const c = t.client();
  const r = await c.post('/api/auth/login', { email: 'a@x.test', password: 'Passw0rd12' });
  assert.equal(r.status, 200);
  const sc = r.headers.get('set-cookie'); assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Lax/);
  assert.equal((await c.get('/api/auth/me')).data.user.email, 'a@x.test');
  assert.equal((await c.post('/api/auth/logout')).status, 200);
  assert.equal((await c.get('/api/auth/me')).data.user, null);
});

test('wrong password is rejected and account locks after 5 failures', async () => {
  const c = t.client();
  for (let i = 0; i < 5; i++) assert.equal((await c.post('/api/auth/login', { email: 'a@x.test', password: 'wrongwrong1' })).status, 401);
  assert.equal((await c.post('/api/auth/login', { email: 'a@x.test', password: 'Passw0rd12' })).status, 429);
});

test('passwords are stored as salted scrypt hashes, never plain', () => {
  const h = S.hashPassword('Secret123'); assert.match(h, /^scrypt\$/); assert.ok(!h.includes('Secret123'));
  assert.ok(S.verifyPassword('Secret123', h)); assert.ok(!S.verifyPassword('secret123', h));
  assert.notEqual(S.hashPassword('Secret123'), h); // random salt
  const raw = JSON.stringify(t.store.data); assert.ok(!raw.includes('Passw0rd12'));
});

test('generated passwords preserve their format and admin setup does not log credentials', () => {
  for (let i = 0; i < 10; i++) assert.match(S.randomPassword(), /^[a-zA-Z0-9]{6}-[a-zA-Z0-9]{6}7[a-zA-Z0-9]{2}$/);

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'g24-seed-test-'));
  try {
    for (const adminPassword of ['', 'ConfiguredSecret123']) {
      const users = [];
      const messages = [];
      const app = { ctx: { store: { find: () => null } }, createUser: user => users.push(user) };
      ensureAdmin(app, { adminPassword, adminEmail: 'admin-secret@example.test', dataDir }, message => messages.push(message));
      assert.equal(users.length, 1);
      assert.equal(messages.length, 1);
      assert.ok(!messages[0].includes(users[0].password));
      assert.ok(!messages[0].includes('admin-secret@example.test'));
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('API security: auth required, role enforced, CSRF origin, JSON only, body limit, headers', async () => {
  const anon = t.client();
  assert.equal((await anon.get('/api/orders')).status, 401);
  assert.equal((await anon.get('/api/admin/users')).status, 401);
  const pat = await H.newPatient(t, 'sec@x.test'); // fresh user (a@x.test is locked by the previous test)
  assert.equal((await pat.get('/api/admin/users')).status, 403);
  assert.equal((await pat.get('/api/ops/cases')).status, 403);
  assert.equal((await pat.get('/api/org')).status, 403);
  // cross-site origin on a state-changing call
  assert.equal((await pat.raw('POST', '/api/complaints', { subject: 'abc', message: 'hello there' }, { Origin: 'https://evil.example' })).status, 403);
  // non-JSON body
  const res = await fetch(t.base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x=1' });
  assert.equal(res.status, 415);
  // oversized body -> clean 413
  const big = await fetch(t.base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@x.test', password: 'x'.repeat(70000) }) });
  assert.equal(big.status, 413);
  // headers
  const h = await fetch(t.base + '/api/health');
  assert.equal(h.headers.get('x-content-type-options'), 'nosniff'); assert.match(h.headers.get('content-security-policy'), /default-src 'self'/);
  // path traversal
  const tr = await fetch(t.base + '/..%2f..%2fetc/passwd'); const trBody = await tr.text(); assert.ok([200, 403, 404].includes(tr.status)); assert.ok(!/root:/.test(trBody)); // never leaks files outside public/
  const tr2 = await fetch(t.base + '/%2e%2e/%2e%2e/package.json'); assert.ok(!/"name": "gurmad24"/.test(await tr2.text()));
  // unknown fields are ignored (mass assignment): cannot self-assign admin
  const reg = await t.client().post('/api/auth/register', { name: 'Evil One', email: 'evil@x.test', password: 'Passw0rd12', consent: true, role: 'admin' });
  assert.equal(reg.data.user.role, 'patient');
});

test('rate limiting returns 429', async () => {
  const t2 = await H.start({ rateLimit: { authPerMin: 3, globalPerMin: 100000 } });
  const c = t2.client(); let last;
  for (let i = 0; i < 5; i++) last = await c.post('/api/auth/login', { email: 'nobody@x.test', password: 'Whatever123' });
  assert.equal(last.status, 429); await t2.stop();
});

test('privacy: export and account deletion anonymise personal data', async () => {
  const c = await H.newPatient(t, 'del@x.test');
  const ex = await c.get('/api/auth/export'); assert.equal(ex.status, 200); assert.equal(ex.data.user.email, 'del@x.test');
  assert.equal((await c.post('/api/auth/delete-account', { password: 'wrong12345' })).status, 401);
  assert.equal((await c.post('/api/auth/delete-account', { password: 'Patient1234' })).status, 200);
  assert.equal((await c.get('/api/auth/me')).data.user, null);
  assert.equal((await t.client().post('/api/auth/login', { email: 'del@x.test', password: 'Patient1234' })).status, 401);
  const u = t.store.find('users', x => x.id.startsWith('u_') && x.deletedAt); assert.match(u.email, /^deleted-/); assert.equal(u.name, 'Deleted user');
});

test('data persists to disk and reloads (persistent database)', async () => {
  t.store.flush();
  const { Store } = require('../src/store');
  const again = new Store(t.config.dataDir).load();
  assert.ok(again.find('users', u => u.email === 'a@x.test'));
  assert.ok(again.data.meta.version >= 3);
});
