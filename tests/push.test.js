'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const H = require('./helper');
const { createSender } = require('../src/push');

let t;
before(async () => { t = await H.start(); });
after(async () => { await t.stop(); });

const TOK_A = 'a'.repeat(40);
const TOK_B = 'b'.repeat(40);

test('device registration requires login and validates input', async () => {
  const anon = t.client();
  assert.equal((await anon.post('/api/me/devices', { token: TOK_A, platform: 'android' })).status, 401);
  const admin = await H.admin(t);
  assert.equal((await admin.post('/api/me/devices', { token: 'short', platform: 'android' })).status, 400);
  assert.equal((await admin.post('/api/me/devices', { token: TOK_A, platform: 'ios' })).status, 400);
  assert.equal((await admin.post('/api/me/devices', { token: TOK_A, platform: 'android' })).status, 200);
});

test('tokens are stored privately, deduped, and removable', async () => {
  const admin = await H.admin(t);
  await admin.post('/api/me/devices', { token: TOK_A, platform: 'android' });
  await admin.post('/api/me/devices', { token: TOK_A, platform: 'android' });
  const u = t.store.col('users').find(x => x.email === 'admin@test.local');
  assert.equal(u.deviceTokens.filter(d => d.token === TOK_A).length, 1);
  const me = await admin.get('/api/auth/me');
  assert.ok(!JSON.stringify(me.data).includes(TOK_A), 'token must never be returned to clients');
  assert.equal((await admin.post('/api/me/devices/remove', { token: TOK_A })).status, 200);
  assert.ok(!(u.deviceTokens || []).some(d => d.token === TOK_A));
});

test('a token moves to the newest user on the same phone', async () => {
  const admin = await H.admin(t);
  const demo = await H.demo(t, 'patient').catch(() => null);
  if (!demo) return; // demo users not seeded in this configuration
  await admin.post('/api/me/devices', { token: TOK_B, platform: 'android' });
  await demo.post('/api/me/devices', { token: TOK_B, platform: 'android' });
  const holders = t.store.col('users').filter(x => (x.deviceTokens || []).some(d => d.token === TOK_B));
  assert.equal(holders.length, 1);
  assert.notEqual(holders[0].email, 'admin@test.local');
});

test('admin test endpoint reports not configured without Firebase credentials', async () => {
  const admin = await H.admin(t);
  const r = await admin.post('/api/admin/push/test', {});
  assert.equal(r.status, 200);
  assert.equal(r.data.configured, false);
  assert.equal(r.data.sent, 0);
});

test('FCM sender: auth, send, and prune dead tokens (fake network)', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'svc@proj.iam.gserviceaccount.com', project_id: 'proj', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes('oauth2')) return { ok: true, status: 200, json: async () => ({ access_token: 'at', expires_in: 3600 }) };
    return opts.body.includes('dead') ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({}) };
  };
  const sender = createSender({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }, fakeFetch);
  assert.equal(sender.configured, true);
  const live = 'l'.repeat(30); const dead = 'dead' + 'd'.repeat(30);
  const user = { id: 'u_x', deviceTokens: [{ token: live, platform: 'android' }, { token: dead, platform: 'android' }] };
  const store = { save() {}, col: () => [user] };
  const r = await sender.sendToUser(store, user, { title: 'T', body: 'B' });
  assert.deepEqual({ sent: r.sent, removed: r.removed, devices: r.devices }, { sent: 1, removed: 1, devices: 2 });
  assert.equal(user.deviceTokens.length, 1);
  assert.equal(calls.filter(c => c.url.includes('oauth2')).length, 1);
  assert.ok(calls.some(c => c.url === 'https://fcm.googleapis.com/v1/projects/proj/messages:send' && c.opts.headers.Authorization === 'Bearer at'));
});

test('invalid service account JSON leaves push disabled', () => {
  assert.equal(createSender({ FIREBASE_SERVICE_ACCOUNT_JSON: '{not json' }, async () => {}).configured, false);
  assert.equal(createSender({}, async () => {}).configured, false);
});
