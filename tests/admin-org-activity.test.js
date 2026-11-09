'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');

let t, admin, hospital, patient, orgId;
before(async () => {
  t = await H.start();
  admin = await H.admin(t);
  hospital = t.client();
  const registered = await hospital.post('/api/auth/register-org', {
    orgType: 'hospital', orgName: 'Activity Test Hospital', area: 'Gaalkacyo',
    name: 'Hospital Admin', email: 'activity-hospital@test.local',
    password: 'HospitalPass123', consent: true,
  });
  assert.equal(registered.status, 201);
  orgId = registered.data.org.id;
  await admin.patch('/api/admin/orgs/' + orgId, { status: 'verified' });
  patient = await H.newPatient(t, 'activity-patient@test.local');
});
after(async () => { await t.stop(); });

test('admin can drill into hospital activity and see completed patients by period', async () => {
  const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const requested = await patient.post('/api/appointments', {
    orgId, category: 'checkup', preferredDate: future, contactPhone: '+252610000000',
  });
  assert.equal(requested.status, 201);
  const appointmentId = requested.data.appointment.id;
  assert.equal((await hospital.patch('/api/org/appointments/' + appointmentId, { status: 'confirmed' })).status, 200);
  assert.equal((await hospital.patch('/api/org/appointments/' + appointmentId, { status: 'completed' })).status, 200);

  for (const period of ['day', 'week', 'month']) {
    const report = await admin.get('/api/admin/orgs/' + orgId + '/activity?period=' + period);
    assert.equal(report.status, 200);
    assert.equal(report.data.organisation.id, orgId);
    assert.equal(report.data.totals.appointmentsCompleted, 1);
    assert.equal(report.data.totals.uniquePatientsServed, 1);
    assert.equal(report.data.totals.appointmentsRequested, 1);
    assert.equal(report.data.recentAppointments[0].patientName, 'Test Patient');
  }
});

test('hospital activity endpoint is admin-only and validates period', async () => {
  assert.equal((await patient.get('/api/admin/orgs/' + orgId + '/activity')).status, 403);
  assert.equal((await admin.get('/api/admin/orgs/' + orgId + '/activity?period=year')).status, 400);
  assert.equal((await admin.get('/api/admin/orgs/not-real/activity')).status, 404);
});
