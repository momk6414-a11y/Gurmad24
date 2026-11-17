'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, demo } = require('./helper');

test('public Gaalkacyo directory exposes 17 unverified public listings with the corrected Digfeer phone', async t => {
  const app = await start(); t.after(app.stop);
  const response = await app.client().get('/api/hospitals');
  assert.equal(response.status, 200);
  assert.equal(response.data.directory.length, 17);
  assert.ok(response.data.directory.every(h => h.directoryOnly && h.verified === false));
  assert.equal(response.data.directory.find(h => h.name === 'Digfeer Eye Specialist Hospital').phone, '+252 90 765 8641');
  const samePhone = response.data.directory.filter(h => h.phone === '+252 61 782 0040');
  assert.equal(samePhone.length, 2);
  assert.ok(samePhone.every(h => h.verificationNote.includes('suuragal')));
});

test('hospital visit cards require patient consent and remain private to the patient and issuing hospital', async t => {
  const app = await start(); t.after(app.stop);
  const hospital = await demo(app, 'hospital');
  const patient = await demo(app, 'patient');
  const org = app.store.find('orgs', o => o.type === 'hospital' && o.isDemoSeed);
  const preferredDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const request = await patient.post('/api/appointments', { orgId: org.id, category: 'checkup', preferredDate });
  assert.equal(request.status, 201);
  const appointmentId = request.data.appointment.id;
  assert.equal((await hospital.patch('/api/org/appointments/' + appointmentId, { status: 'confirmed' })).status, 200);

  const payload = { appointmentId, doctorName: 'Dr Test', specialty: 'General', visitDate: preferredDate, service: 'Consultation', summary: 'Short patient-approved visit summary.' };
  assert.equal((await hospital.post('/api/org/visits', payload)).status, 403);
  assert.equal((await patient.post('/api/appointments/' + appointmentId + '/visit-consent', { consent: true })).status, 200);
  const created = await hospital.post('/api/org/visits', payload);
  assert.equal(created.status, 201);
  assert.equal((await hospital.post('/api/org/visits', payload)).status, 409);
  const own = await patient.get('/api/visits');
  assert.equal(own.status, 200);
  assert.equal(own.data.visits.length, 1);
  assert.equal(own.data.visits[0].doctorName, 'Dr Test');

  const stranger = app.client();
  const login = await stranger.post('/api/auth/login', { email: 'patient@demo.gurmad24.test', password: 'DemoPass12345' });
  assert.equal(login.status, 200);
  assert.equal((await stranger.get('/api/visits')).data.visits.length, 1);
  assert.equal((await patient.post('/api/org/visits', payload)).status, 403);
});
