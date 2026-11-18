'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, admin, newPatient } = require('./helper');

const inDays = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const ticket = (o = {}) => ({ kind: 'ticket', fromCity: 'Gaalkacyo', toCity: 'Nairobi', departDate: inDays(10), returnDate: inDays(20), passengers: 2, cabin: 'economy', consent: true, ...o });
const visa = (o = {}) => ({ kind: 'visa', country: 'Kenya', visaType: 'medical', travelDate: inDays(30), travelers: 1, consent: true, ...o });

test('travel requests need login, consent and valid dates; nothing is booked or charged', async t => {
  const app = await start(); t.after(app.stop);
  assert.equal((await app.client().post('/api/travel', ticket())).status, 401);
  const p = await newPatient(app, 'trav1@test.local');
  assert.equal((await p.post('/api/travel', ticket({ consent: false }))).status, 400);
  assert.equal((await p.post('/api/travel', ticket({ departDate: inDays(-1) }))).status, 400);
  assert.equal((await p.post('/api/travel', ticket({ returnDate: inDays(5) }))).status, 400);
  assert.equal((await p.post('/api/travel', ticket({ toCity: 'gaalkacyo' }))).status, 400);
  assert.equal((await p.post('/api/travel', visa({ visaType: 'nope' }))).status, 400);
  const t1 = await p.post('/api/travel', ticket());
  assert.equal(t1.status, 201);
  assert.equal(t1.data.request.status, 'requested');
  assert.match(t1.data.request.code, /^DEMO-TRV-\d{6}$/);
  assert.equal(t1.data.message, 'DEMO_TRAVEL_REQUEST_ONLY');
  assert.equal(app.store.col('transactions').length, 0);
  const v1 = await p.post('/api/travel', visa());
  assert.equal(v1.status, 201);
  assert.equal((await p.get('/api/travel')).data.requests.length, 2);
  assert.equal(JSON.stringify(t1.data).includes('passport'), false);
});

test('travel requests are private to their owner; patients cannot use admin routes', async t => {
  const app = await start(); t.after(app.stop);
  const a = await newPatient(app, 'trav2@test.local'); const b = await newPatient(app, 'trav3@test.local');
  const r = (await a.post('/api/travel', visa())).data.request;
  assert.equal((await b.get('/api/travel')).data.requests.length, 0);
  assert.equal((await b.post(`/api/travel/${r.id}/cancel`)).status, 404);
  assert.equal((await b.get('/api/admin/travel')).status, 403);
  assert.equal((await b.patch(`/api/admin/travel/${r.id}`, { status: 'reviewing' })).status, 403);
});

test('administrator reviews requests through a fixed status flow; owner can cancel only while active', async t => {
  const app = await start(); t.after(app.stop);
  const p = await newPatient(app, 'trav4@test.local'); const ad = await admin(app);
  const r = (await p.post('/api/travel', ticket())).data.request;
  assert.equal((await ad.patch(`/api/admin/travel/${r.id}`, { status: 'completed' })).status, 409);
  const rev = await ad.patch(`/api/admin/travel/${r.id}`, { status: 'reviewing', adminNote: 'Checking fares' });
  assert.equal(rev.status, 200); assert.equal(rev.data.request.status, 'reviewing');
  const list = await ad.get('/api/admin/travel?status=reviewing');
  assert.equal(list.data.requests.length, 1); assert.equal(list.data.requests[0].patientName, 'Test Patient');
  assert.equal((await ad.patch(`/api/admin/travel/${r.id}`, { status: 'quoted', adminNote: 'Quote sent' })).status, 200);
  assert.equal((await p.post(`/api/travel/${r.id}/cancel`)).status, 409);
  const r2 = (await p.post('/api/travel', visa())).data.request;
  assert.equal((await p.post(`/api/travel/${r2.id}/cancel`)).data.request.status, 'cancelled');
  assert.ok(app.store.col('audit').some(x => x.action === 'travel.reviewing'));
});

test('travel data is in the privacy export and contact details are wiped on account deletion', async t => {
  const app = await start(); t.after(app.stop);
  const p = await newPatient(app, 'trav5@test.local');
  await p.post('/api/travel', visa({ contactPhone: '+252611111111', note: 'private note' }));
  assert.equal((await p.get('/api/auth/export')).data.travel.length, 1);
  assert.equal((await p.post('/api/auth/delete-account', { password: 'Patient1234' })).status, 200);
  const rec = app.store.col('travel')[0];
  assert.equal(rec.contactPhone, ''); assert.equal(rec.note, '');
});
