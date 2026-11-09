'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');
const catalog = require('../src/catalog');

let t;
before(async () => { t = await H.start(); });
after(async () => { await t.stop(); });

test('specialty is detected from the hospital name', () => {
  const s = n => catalog.specialtyOf({ name: n, description: '' });
  assert.equal(s('Digfeer eye specialists'), 'eye');
  assert.equal(s('Isbitaalka Ilkaha Dental Care'), 'dental');
  assert.equal(s('Children Hospital'), 'pediatric');
  assert.equal(s('Isbitaalka Hooyada iyo Dhalmada'), 'maternity');
  assert.equal(s('Isbitaal Guud Gaalkacyo'), 'general');
});

test('new hospital gets starter services/cards; cards go live only after verification; never duplicated or overwritten', async () => {
  const c = t.client();
  const r = await c.post('/api/auth/register-org', { name: 'Eye Admin', email: 'eye@test.local', password: 'EyePass12345', consent: true, orgType: 'hospital', orgName: 'Digfeer eye specialists', area: 'Gaalkacyo' });
  assert.equal(r.status, 201);
  const org = t.store.find('orgs', o => o.name === 'Digfeer eye specialists');
  const adm = await H.admin(t);

  // pending: nothing is created yet at registration; applying makes drafts only
  catalog.applyToHospital(t.store, org);
  assert.ok(t.store.filter('cards', x => x.hospitalId === org.id).every(x => x.status === 'draft'), 'pending hospital: drafts only');

  assert.equal((await adm.patch('/api/admin/orgs/' + org.id, { status: 'verified' })).status, 200);
  const pub = (await t.client().get('/api/hospitals/' + org.id)).data;
  assert.ok(pub.services.length >= 5, 'services listed');
  assert.ok(pub.cards.length >= 2 && pub.cards.every(x => /ndha/i.test(x.name)), 'eye-specific published cards');

  const before = [t.store.filter('services', s => s.orgId === org.id).length, t.store.filter('cards', x => x.hospitalId === org.id).length];
  const again = (await adm.post('/api/admin/catalog/apply', {})).data.results.find(x => x.orgId === org.id);
  assert.deepEqual([again.services, again.cards, again.published], [0, 0, 0]);
  assert.deepEqual([t.store.filter('services', s => s.orgId === org.id).length, t.store.filter('cards', x => x.hospitalId === org.id).length], before);

  // hospital edits a card (goes back to draft): the catalogue must not re-publish it
  const card = t.store.find('cards', x => x.hospitalId === org.id); card.status = 'draft'; card.hospitalApprovedAt = null;
  catalog.applyToAll(t.store);
  assert.equal(card.status, 'draft');
});

test('non-admin cannot run the catalogue', async () => {
  assert.equal((await (await H.demo(t, 'hospital')).post('/api/admin/catalog/apply', {})).status, 403);
  assert.equal((await t.client().post('/api/admin/catalog/apply', {})).status, 401);
});

test('health and admin dashboard report whether storage is persistent', async () => {
  const h = (await t.client().get('/api/health')).data;
  assert.equal(typeof h.storagePersistent, 'boolean');
  assert.equal(h.storage, h.storagePersistent ? 'persistent-json' : 'ephemeral-json');
  const d = (await (await H.admin(t)).get('/api/admin/dashboard')).data;
  assert.equal(d.storagePersistent, h.storagePersistent);
  const { load } = require('../src/config');
  assert.equal(load({ DATA_DIR: require('os').tmpdir() + '/g24-cfg-a', RENDER: 'true' }).persistentStorage, false);
  assert.equal(load({ DATA_DIR: require('os').tmpdir() + '/g24-cfg-b', RENDER: 'true', PERSISTENT_STORAGE: 'true' }).persistentStorage, true);
});
