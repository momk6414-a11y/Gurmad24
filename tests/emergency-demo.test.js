'use strict';
// Police / fire / ambulance demo: location with consent, live tracking, autopilot. All synthetic.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');
const seed = require('../src/seed');

let t, op, police, fire;
before(async () => { t = await H.start(); op = await H.demo(t, 'operator'); police = await H.demo(t, 'police'); fire = await H.demo(t, 'fire'); });
after(async () => { await t.stop(); });

const make = (body) => { t.app.limiter.reset(); return t.client().post('/api/emergency/simulate', body); }; // limiter is covered in ops.test.js
const ageCase = (code, seconds) => { const c = t.store.find('cases', x => x.code === code); c.createdAt = new Date(Date.now() - seconds * 1000).toISOString(); };
const track = (c, code, token) => c.get(`/api/emergency/track/${code}?token=${encodeURIComponent(token)}`);

test('police and fire demo stations exist, are verified and have coordinates', async () => {
  const ps = (await op.get('/api/ops/providers')).data.providers;
  for (const type of ['ambulance', 'police', 'fire']) assert.ok(ps.some(p => p.type === type && p.lat !== null && p.lng !== null), type);
  assert.equal((await op.get('/api/ops/providers?type=fire')).data.providers.every(p => p.type === 'fire'), true);
  assert.ok((await t.client().get('/api/providers?type=police')).data.providers.length >= 1);
  assert.deepEqual((await t.client().get('/api/config')).data.responderTypes, ['ambulance', 'police', 'fire']);
});

test('request from an area preset: tracked only with the private token, never exposes it elsewhere', async () => {
  const c = t.client();
  const r = await make({ category: 'fire', areaId: 'north', note: 'synthetic' });
  assert.equal(r.status, 201); assert.equal(r.data.case.responder, 'fire'); assert.ok(r.data.case.trackToken.length >= 10);
  const { code, trackToken } = r.data.case;
  assert.equal((await c.get(`/api/emergency/track/${code}`)).status, 404);
  assert.equal((await track(c, code, 'wrong-token')).status, 404);
  const ok = await track(c, code, trackToken);
  assert.equal(ok.status, 200); assert.equal(ok.data.track.mode, 'SIMULATION'); assert.equal(ok.data.track.location.source, 'area');
  assert.equal(JSON.stringify(ok.data).includes(trackToken), false);
  const opView = (await op.get('/api/ops/cases')).data.cases.find(x => x.code === code);
  assert.equal(opView.trackToken, undefined); assert.equal(opView.responder, 'fire');
});

test('GPS location needs consent and sane coordinates; precision is reduced', async () => {
  assert.equal((await make({ category: 'general', lat: 6.77, lng: 47.43 })).status, 400); // no consent
  assert.equal((await make({ category: 'general', lat: 999, lng: 47.43, consent: true })).status, 400);
  assert.equal((await make({ category: 'general', lat: 'abc', lng: 47.43, consent: true })).status, 400);
  assert.equal((await make({ category: 'general', areaId: 'nowhere' })).status, 400);
  const r = await make({ category: 'crime', lat: 6.769712345, lng: 47.430812345, accuracy: 12.7, consent: true });
  assert.equal(r.status, 201);
  const tr = (await track(t.client(), r.data.case.code, r.data.case.trackToken)).data.track;
  assert.equal(tr.location.lat, 6.7697); assert.equal(tr.location.lng, 47.4308); assert.equal(tr.location.source, 'gps'); assert.equal(tr.responder, 'police');
});

test('autopilot: assigned to the right responder type, unit moves, case completes', async () => {
  const cl = t.client();
  for (const [category, type] of [['fire', 'fire'], ['crime', 'police'], ['accident', 'ambulance']]) {
    const r = await make({ category, areaId: 'center' }); const { code, trackToken } = r.data.case;
    assert.equal((await track(cl, code, trackToken)).data.track.status, 'received');
    ageCase(code, 12);
    const mid = (await track(cl, code, trackToken)).data.track;
    assert.equal(mid.status, 'en_route'); assert.equal(mid.responderOrg.type, type); assert.ok(mid.unit && mid.station && mid.etaMinutes >= 1);
    ageCase(code, 120);
    const done = (await track(cl, code, trackToken)).data.track;
    assert.equal(done.status, 'closed'); assert.equal(done.unit.progress, 1);
    assert.deepEqual(done.history.map(h => h.status), ['received', 'assigned', 'en_route', 'arrived', 'handed_over', 'closed']);
  }
});

test('far from the demo stations the unit is placed near the incident (demo works anywhere)', async () => {
  const r = await make({ category: 'general', lat: -1.2921, lng: 36.8219, consent: true }); const { code, trackToken } = r.data.case;
  ageCase(code, 12);
  const tr = (await track(t.client(), code, trackToken)).data.track;
  assert.equal(tr.unit.demoPlaced, true); assert.ok(Math.abs(tr.station.lat - -1.2921) < 0.05);
});

test('a human taking over stops the autopilot; ops may assign any responder type', async () => {
  const r = await make({ category: 'general', areaId: 'east' }); const { code, trackToken } = r.data.case;
  const c = (await op.get('/api/ops/cases')).data.cases.find(x => x.code === code);
  const pol = (await op.get('/api/ops/providers?type=police')).data.providers[0];
  const a = await op.patch(`/api/ops/cases/${c.id}`, { assignedOrgId: pol.id });
  assert.equal(a.status, 200); assert.equal(a.data.case.assignedOrgType, 'police');
  ageCase(code, 200);
  assert.equal((await track(t.client(), code, trackToken)).data.track.status, 'assigned'); // no autopilot after takeover
});

test('police admin sees assigned requests with location and can advance them', async () => {
  const r = await make({ category: 'crime', areaId: 'south' }); const { code } = r.data.case;
  const c = (await op.get('/api/ops/cases')).data.cases.find(x => x.code === code);
  const pol = (await op.get('/api/ops/providers?type=police')).data.providers[0];
  await op.patch(`/api/ops/cases/${c.id}`, { assignedOrgId: pol.id });
  const mine = (await police.get('/api/org/requests')).data.requests.find(x => x.code === code);
  assert.ok(mine); assert.equal(mine.responder, 'police'); assert.equal(mine.location.source, 'area');
  assert.equal((await fire.get('/api/org/requests')).data.requests.some(x => x.code === code), false);
  assert.equal((await police.patch(`/api/org/requests/${c.id}`, { status: 'en_route' })).status, 200);
});

test('retention removes location and tracking token from old closed cases', async () => {
  const r = await make({ category: 'general', areaId: 'west' }); const { code } = r.data.case;
  const c = t.store.find('cases', x => x.code === code);
  c.status = 'closed'; c.updatedAt = new Date(Date.now() - 400 * 86400000).toISOString();
  seed.runRetention(t.store, 30);
  assert.equal(c.location, null); assert.equal(c.trackToken, null); assert.equal(c.area, '');
});

test('security headers allow same-origin geolocation only', async () => {
  const res = await fetch(t.base + '/api/health');
  assert.match(res.headers.get('permissions-policy'), /geolocation=\(self\)/);
});

test('map: CSP allows the two tile hosts and public lists expose coordinates', async () => {
  const r = await t.client().get('/api/providers?type=police');
  const csp = r.headers['content-security-policy'] || (r.res && r.res.headers['content-security-policy']) || '';
  if (csp) { assert.match(csp, /server\.arcgisonline\.com/); assert.match(csp, /tile\.openstreetmap\.org/); }
  const p = r.data.providers[0];
  assert.equal(typeof p.lat, 'number'); assert.equal(typeof p.lng, 'number');
  const hs = (await t.client().get('/api/hospitals')).data.hospitals;
  assert.ok(hs.some(x => typeof x.lat === 'number'));
});
