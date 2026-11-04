'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');

let t, op, amb, adm;
before(async () => { t = await H.start(); op = await H.demo(t, 'operator'); amb = await H.demo(t, 'ambulance'); adm = await H.admin(t); });
after(async () => { await t.stop(); });

test('public simulated request: clearly SIMULATION, validated, rate limited', async () => {
  const c = t.client();
  assert.equal((await c.post('/api/emergency/simulate', { category: 'bogus' })).status, 400);
  const r = await c.post('/api/emergency/simulate', { category: 'general', area: 'Aagga A', note: 'synthetic test' });
  assert.equal(r.status, 201); assert.equal(r.data.case.mode, 'SIMULATION'); assert.match(r.data.notice, /NO_REAL_HELP/); assert.match(r.data.case.code, /^SIM-/);
  assert.equal((await c.get('/api/health')).data.liveDispatch, false);
});

test('operator workflow: assign provider, state machine, history', async () => {
  const cases = (await op.get('/api/ops/cases')).data.cases; const rec = cases.find(c => c.status === 'received');
  const provs = (await op.get('/api/ops/providers')).data.providers; assert.ok(provs.length >= 1);
  assert.equal((await op.patch(`/api/ops/cases/${rec.id}`, { status: 'arrived' })).status, 409); // invalid jump
  assert.equal((await op.patch(`/api/ops/cases/${rec.id}`, { status: 'assigned' })).status, 409); // needs provider
  assert.equal((await op.patch(`/api/ops/cases/${rec.id}`, { assignedOrgId: 'nope' })).status, 400);
  const a = await op.patch(`/api/ops/cases/${rec.id}`, { assignedOrgId: provs[0].id }); assert.equal(a.data.case.status, 'assigned');
  assert.ok(a.data.case.history.length >= 2);
  // provider sees and advances only own requests
  const reqs = (await amb.get('/api/org/requests')).data.requests; assert.ok(reqs.some(r => r.id === rec.id));
  assert.equal((await amb.patch(`/api/org/requests/${rec.id}`, { status: 'arrived' })).status, 409);
  for (const s of ['en_route', 'arrived', 'handed_over']) assert.equal((await amb.patch(`/api/org/requests/${rec.id}`, { status: s })).status, 200);
  assert.equal((await op.patch(`/api/ops/cases/${rec.id}`, { status: 'closed' })).data.case.status, 'closed');
  assert.equal((await op.patch(`/api/ops/cases/${rec.id}`, { status: 'received' })).status, 409); // closed is terminal
  const st = (await op.get('/api/ops/stats')).data; assert.equal(st.mode, 'SIMULATION'); assert.ok(st.total >= 4); assert.ok(st.avgMinutesToHandover !== null);
});

test('provider decline returns the case to the queue; other providers cannot touch it', async () => {
  const c = (await op.post('/api/ops/cases', { category: 'transport', area: 'X' })).data.case;
  const prov = (await op.get('/api/ops/providers')).data.providers.find(p => p.name.includes('1'));
  await op.patch(`/api/ops/cases/${c.id}`, { assignedOrgId: prov.id });
  const other = (await adm.get('/api/admin/orgs')).data.orgs.find(o => o.type === 'ambulance' && o.id !== prov.id);
  const mk = await adm.post('/api/admin/users', { name: 'Amb Two', email: 'amb2@x.test', role: 'provider_admin', orgId: other.id }); const a2 = await H.login(t, 'amb2@x.test', mk.data.temporaryPassword);
  assert.equal((await a2.patch(`/api/org/requests/${c.id}`, { status: 'en_route' })).status, 404);
  assert.equal((await amb.patch(`/api/org/requests/${c.id}`, { status: 'received', note: 'No vehicle free' })).status, 200);
  assert.equal((await op.get(`/api/ops/cases/${c.id}`)).data.case.assignedOrgId, null);
});

test('role permissions matrix', async () => {
  const pat = await H.demo(t, 'patient'); const hos = await H.demo(t, 'hospital');
  const matrix = [
    ['GET', '/api/ops/cases', { patient: 403, hospital: 403, ambulance: 403, operator: 200, admin: 200 }],
    ['GET', '/api/admin/users', { patient: 403, hospital: 403, ambulance: 403, operator: 403, admin: 200 }],
    ['GET', '/api/org/cards', { patient: 403, hospital: 200, ambulance: 403, operator: 403, admin: 403 }],
    ['GET', '/api/org/requests', { patient: 403, hospital: 403, ambulance: 200, operator: 403, admin: 403 }],
    ['GET', '/api/orders', { patient: 200, hospital: 403, ambulance: 403, operator: 403, admin: 403 }],
    ['GET', '/api/admin/audit', { patient: 403, hospital: 403, ambulance: 403, operator: 403, admin: 200 }],
  ];
  const who = { patient: pat, hospital: hos, ambulance: amb, operator: op, admin: adm };
  for (const [m, p, exp] of matrix) for (const [r, code] of Object.entries(exp)) assert.equal((await who[r].raw(m, p)).status, code, `${r} ${p}`);
  // hospital cannot use the provider-only availability endpoint and ambulance cannot create cards
  assert.equal((await hos.patch('/api/org/availability', { available: true })).status, 403);
  assert.equal((await amb.post('/api/org/cards', { name: 'x' })).status, 403);
});

test('audit log records sensitive actions with actor', async () => {
  const log = (await adm.get('/api/admin/audit?limit=500')).data.audit; const acts = new Set(log.map(a => a.action));
  for (const a of ['auth.login', 'case.update', 'case.provider_update']) assert.ok(acts.has(a), a);
  assert.ok(log.find(a => a.action === 'case.update').actorId);
});

test('migrations, backup and restore', async () => {
  assert.ok(t.store.data.meta.version >= 3); assert.equal(t.store.migrate(require('../src/migrations')), 0); // idempotent
  const name = t.store.backup(); assert.ok(t.store.listBackups().includes(name));
  assert.equal((await adm.post('/api/admin/backups')).status, 201);
});

test('data retention anonymises old closed cases', async () => {
  const { runRetention } = require('../src/seed');
  const c = t.store.col('cases').find(x => x.status === 'closed'); c.updatedAt = new Date(Date.now() - 400 * 86400000).toISOString(); c.area = 'Somewhere'; c.note = 'note';
  assert.ok(runRetention(t.store, 365) >= 1); assert.equal(c.area, ''); assert.ok(c.anonymizedAt);
});
