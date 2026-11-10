'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');

let t, admin;
before(async () => { t = await H.start(); admin = await H.admin(t); });
after(async () => { await t.stop(); });

const cardBody = {
  name: 'Tenant Isolation Test Card',
  priceCents: 2500,
  included: ['General consultation'],
  excluded: ['Surgery'],
  validityDays: 30,
  eligibility: 'Test users',
  terms: 'Synthetic test terms approved for tenant isolation coverage.',
  refundPolicy: 'Synthetic test refund policy for automated tests.',
};

test('hospital portal isolates services, cards, orders, appointments, complaints, subscriptions and invoices', async () => {
  async function registerHospital(email, orgName) {
    const client = t.client();
    const result = await client.post('/api/auth/register-org', {
      orgType: 'hospital',
      orgName,
      name: 'Portal Manager',
      email,
      password: 'HospitalPass123',
      consent: true,
    });
    assert.equal(result.status, 201);
    assert.equal(result.data.org.status, 'pending');
    assert.equal(result.data.user.role, 'hospital_admin');
    assert.equal((await admin.patch('/api/admin/orgs/' + result.data.org.id, { status: 'verified' })).status, 200);
    return { client, org: result.data.org };
  }

  const first = await registerHospital('first@tenant.test', 'First Tenant Hospital');
  const second = await registerHospital('second@tenant.test', 'Second Tenant Hospital');

  // Services belong only to their owning hospital.
  const service = await first.client.post('/api/org/services', {
    name: 'Private tenant service',
    priceCents: 2500,
    active: true,
  });
  assert.equal(service.status, 201);
  const serviceId = service.data.service.id;
  assert.ok((await first.client.get('/api/org/services')).data.services.some(x => x.id === serviceId));
  assert.ok(!(await second.client.get('/api/org/services')).data.services.some(x => x.id === serviceId));
  assert.equal((await second.client.patch('/api/org/services/' + serviceId, { priceCents: 1 })).status, 404);
  assert.equal((await second.client.del('/api/org/services/' + serviceId)).status, 404);

  // Cards and card redemption are restricted to the issuing hospital.
  const createdCard = await first.client.post('/api/org/cards', cardBody);
  assert.equal(createdCard.status, 201);
  const cardId = createdCard.data.card.id;
  assert.equal((await first.client.post('/api/org/cards/' + cardId + '/publish', { attest: true })).status, 200);
  assert.ok(!(await second.client.get('/api/org/cards')).data.cards.some(x => x.id === cardId));
  assert.equal((await second.client.patch('/api/org/cards/' + cardId, { priceCents: 1 })).status, 404);
  assert.equal((await second.client.post('/api/org/cards/' + cardId + '/archive')).status, 404);

  const patient = await H.newPatient(t, 'tenant-patient@test.local');
  const purchased = await patient.post('/api/orders', { cardId, acceptTerms: true });
  assert.equal(purchased.status, 201);
  const cardCode = purchased.data.order.cardCode;
  assert.equal((await first.client.get('/api/org/orders')).data.orders.length, 1);
  assert.equal((await second.client.get('/api/org/orders')).data.orders.length, 0);
  assert.equal((await second.client.get('/api/org/cards/lookup?code=' + encodeURIComponent(cardCode))).status, 403);
  assert.equal((await second.client.post('/api/org/cards/redeem', { code: cardCode, service: 'General consultation' })).status, 403);

  // Sales totals and CSV exports must not reveal another hospital's transactions.
  const secondSales = (await second.client.get('/api/org/reports/sales')).data;
  assert.equal(secondSales.report.orders, 0);
  assert.equal(secondSales.report.grossCents, 0);
  assert.equal(secondSales.sandbox, true);
  const secondCsv = (await second.client.get('/api/org/reports/sales.csv')).data;
  assert.match(secondCsv, /^date,type,reference/);
  assert.ok(!secondCsv.includes(purchased.data.order.code));

  // Appointment requests are visible and actionable only by their destination hospital.
  const preferredDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const appointment = await patient.post('/api/appointments', {
    orgId: first.org.id,
    serviceId,
    category: 'general',
    preferredDate,
    note: 'Synthetic isolation test request',
  });
  assert.equal(appointment.status, 201);
  const appointmentId = appointment.data.appointment.id;
  assert.equal((await first.client.get('/api/org/appointments')).data.appointments.length, 1);
  assert.equal((await second.client.get('/api/org/appointments')).data.appointments.length, 0);
  assert.equal((await second.client.patch('/api/org/appointments/' + appointmentId, { status: 'confirmed' })).status, 404);

  // Complaints are restricted to the organisation they reference.
  const complaint = await patient.post('/api/complaints', {
    orgId: first.org.id,
    subject: 'Tenant isolation question',
    message: 'Synthetic test message for the first hospital only.',
  });
  assert.equal(complaint.status, 201);
  const complaintId = complaint.data.complaint.id;
  assert.equal((await first.client.get('/api/org/complaints')).data.complaints.length, 1);
  assert.equal((await second.client.get('/api/org/complaints')).data.complaints.length, 0);
  assert.equal((await second.client.post('/api/org/complaints/' + complaintId + '/respond', { text: 'Unauthorised response' })).status, 404);

  // Subscriptions and invoices are scoped by organisation id as well.
  const plans = (await first.client.get('/api/org/plans')).data.plans;
  const plan = plans.find(x => x.active && ['hospital', 'any'].includes(x.audience));
  assert.ok(plan, 'an active hospital-compatible test plan exists');
  const subscription = await first.client.post('/api/org/subscriptions', { planId: plan.id, period: 'monthly' });
  assert.equal(subscription.status, 201);
  const subscriptionId = subscription.data.subscription.id;
  assert.equal((await first.client.get('/api/org/subscriptions')).data.subscriptions.length, 1);
  assert.equal((await second.client.get('/api/org/subscriptions')).data.subscriptions.length, 0);
  assert.equal((await second.client.post('/api/org/subscriptions/' + subscriptionId + '/cancel')).status, 404);
  assert.ok((await first.client.get('/api/org/invoices')).data.invoices.length >= 1);
  assert.equal((await second.client.get('/api/org/invoices')).data.invoices.length, 0);
});
