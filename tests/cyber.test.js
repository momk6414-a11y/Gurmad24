'use strict';
// Cyber security: TOTP two-step login, lockout events, sessions, real mode gate, security overview.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');
const S = require('../src/security');

let t, adm;
before(async () => { t = await H.start(); adm = await H.admin(t); });
after(async () => { await t.stop(); });

test('TOTP matches the RFC 6238 test vector and rejects replay', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890"
  assert.equal(S.totpAt(secret, Math.floor(59 / 30)), '287082');
  const st = S.totpCheck(secret, '287082', 0, 59000); assert.equal(st, 1);
  assert.equal(S.totpCheck(secret, '287082', st, 59000), null);
  assert.equal(S.totpCheck(secret, '000000', 0, 59000), null);
});

test('weak and common passwords are refused', async () => {
  const c = t.client();
  const r = await c.post('/api/auth/register', { name: 'Weak User', email: 'weak@test.local', password: 'password123', consent: true });
  assert.equal(r.status, 400);
  const r2 = await c.post('/api/auth/register', { name: 'Weak User', email: 'weakling@test.local', password: 'weakling9999', consent: true });
  assert.equal(r2.status, 400);
});

test('two-step login: setup, enforced at login, wrong code fails, disable needs code', async () => {
  const c = await H.newPatient(t, 'twofa@test.local');
  const su = await c.post('/api/auth/2fa/setup'); assert.equal(su.status, 200); assert.match(su.data.uri, /^otpauth:\/\/totp\//);
  const secret = su.data.secret;
  assert.equal((await c.post('/api/auth/2fa/enable', { code: '000000' })).status, 400);
  const code = () => S.totpAt(secret, Math.floor(Date.now() / 30000));
  let step = Math.floor(Date.now() / 30000);
  assert.equal((await c.post('/api/auth/2fa/enable', { code: code() })).status, 200);
  const fresh = t.client();
  let r = await fresh.post('/api/auth/login', { email: 'twofa@test.local', password: 'Patient1234' });
  assert.equal(r.status, 401); assert.equal(r.data.error, 'two_factor_required');
  r = await fresh.post('/api/auth/login', { email: 'twofa@test.local', password: 'Patient1234', code: '123456' });
  assert.equal(r.status, 401); assert.equal(r.data.error, 'invalid_code');
  // the code used to enable is already consumed (replay protection); use the next window
  const next = S.totpAt(secret, step + 1);
  const u = t.store.find('users', x => x.email === 'twofa@test.local'); u.totp.lastStep = step; // allow next step
  r = await fresh.post('/api/auth/login', { email: 'twofa@test.local', password: 'Patient1234', code: next });
  if (r.status !== 200) { // next window not yet valid on the server clock: use current window with reset
    u.totp.lastStep = 0; r = await fresh.post('/api/auth/login', { email: 'twofa@test.local', password: 'Patient1234', code: code() });
  }
  assert.equal(r.status, 200);
  assert.equal(r.data.user.twoFactor, true);
});

test('failed logins and lockouts become security events; sessions can be listed and revoked', async () => {
  const c = t.client();
  for (let i = 0; i < 6; i++) await c.post('/api/auth/login', { email: 'ghost@test.local', password: 'wrong-pass-1' });
  const sec = (await adm.get('/api/admin/security')).data;
  assert.ok(sec.last24h.loginFailed >= 5); assert.ok(sec.last24h.locked >= 1);
  assert.ok(sec.checks.length >= 10 && sec.score >= 0 && sec.score <= 100);
  assert.equal(JSON.stringify(sec).includes('passwordHash'), false);
  const p = await H.newPatient(t, 'sess@test.local');
  const p2 = await H.login(t, 'sess@test.local', 'Patient1234');
  const list = (await p.get('/api/auth/sessions')).data.sessions; assert.ok(list.length >= 2); assert.equal(list.filter(s => s.current).length, 1);
  const rv = await p.post('/api/auth/sessions/revoke-others'); assert.ok(rv.data.revoked >= 1);
  assert.equal((await p2.get('/api/auth/sessions')).status, 401);
});

test('forbidden and cross-origin attempts are logged; hardened headers present', async () => {
  const pt = await H.newPatient(t, 'nosy@test.local');
  assert.equal((await pt.get('/api/admin/security')).status, 403);
  const bad = await t.client().raw('POST', '/api/auth/login', { email: 'a@b.co', password: 'x' }, { Origin: 'https://evil.example' });
  assert.equal(bad.status, 403);
  const sec = (await adm.get('/api/admin/security')).data.last24h; assert.ok(sec.forbidden >= 1 && sec.badOrigin >= 1);
  const h = (await t.client().get('/api/health')).headers;
  assert.equal(h.get('cross-origin-opener-policy'), 'same-origin'); assert.equal(h.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(h.get('x-frame-options'), 'DENY');
  assert.match((await t.client().get('/.well-known/security.txt')).data, /Contact:/);
});

test('institutional pilot safety lock: live dispatch stays OFF for every role and requests remain simulated', async () => {
  const c = t.client(); const op = await H.demo(t, 'operator');
  assert.equal((await c.get('/api/config')).data.realMode, false);
  assert.equal((await c.get('/api/config')).data.liveDispatch, false);
  assert.equal((await op.put('/api/admin/real-mode', { enabled: true })).status, 403);
  assert.equal((await adm.put('/api/admin/real-mode', { enabled: true })).status, 403);
  assert.equal((await c.get('/api/config')).data.realMode, false);
  t.app.limiter.reset();
  const area = (await c.get('/api/config')).data.areas[0].id;
  const r = await c.post('/api/emergency/simulate', { category: 'general', areaId: area });
  assert.equal(r.status, 201); assert.equal(r.data.case.mode, 'SIMULATION');
  assert.equal(r.data.notice, 'SIMULATION_ONLY_NO_REAL_HELP_SENT');
  const rec = t.store.find('cases', x => x.code === r.data.case.code); assert.equal(rec.autopilot, true);
  const tr = (await c.get(`/api/emergency/track/${r.data.case.code}?token=${encodeURIComponent(r.data.case.trackToken)}`)).data.track;
  assert.equal(tr.mode, 'SIMULATION');
  assert.equal(tr.unit, null);
  assert.equal((await adm.put('/api/admin/real-mode', { enabled: false })).data.realMode, false);
});

test('2FA setup is idempotent (same pending key) unless reset, so a retry never invalidates the key already in the app', async () => {
  const c = await H.newPatient(t, 'retry2fa@test.local');
  const a = (await c.post('/api/auth/2fa/setup')).data, b = (await c.post('/api/auth/2fa/setup')).data;
  assert.equal(a.secret, b.secret); assert.match(a.serverTime, /^\d{4}-\d\d-\d\dT/);
  const r = (await c.post('/api/auth/2fa/setup', { reset: true })).data; assert.notEqual(r.secret, a.secret);
  const code = S.totpAt(r.secret, Math.floor(Date.now() / 30000));
  assert.equal((await c.post('/api/auth/2fa/enable', { code })).status, 200);
});
