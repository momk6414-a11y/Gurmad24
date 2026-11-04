'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');
const { commissionCents, computeSubscription, addMonths } = require('../src/money');

let t, adminC, hosp, patient, orgId, cardId;
before(async () => { t = await H.start(); adminC = await H.admin(t); });
after(async () => { await t.stop(); });

const cardBody = { name: 'Test Card', priceCents: 1000, included: ['Visit'], excluded: ['Surgery'], validityDays: 30, eligibility: 'All', terms: 'Terms approved by the test hospital.', refundPolicy: 'Refund within 7 days of purchase.' };

test('commission calculations (integer cents, basis points)', () => {
  assert.equal(commissionCents(1000, 500), 50);
  assert.equal(commissionCents(333, 500), 17); // rounds 16.65
  assert.equal(commissionCents(0, 500), 0);
  assert.equal(commissionCents(1000, 0), 0);
  assert.throws(() => commissionCents(1000, 6000)); assert.throws(() => commissionCents(-1, 100)); assert.throws(() => commissionCents(1.5, 100));
});

test('subscription calculations: price, term, end-of-month clamping', () => {
  const plan = { id: 'p', active: true, monthlyCents: 2500, annualCents: 25000 };
  const m = computeSubscription(plan, 'monthly', '2026-01-31T00:00:00.000Z');
  assert.equal(m.priceCents, 2500); assert.equal(m.endsAt.slice(0, 10), '2026-02-28');
  const a = computeSubscription(plan, 'annual', '2026-03-15T00:00:00.000Z');
  assert.equal(a.priceCents, 25000); assert.equal(a.endsAt.slice(0, 10), '2027-03-15');
  assert.equal(addMonths('2024-01-31T00:00:00.000Z', 1).slice(0, 10), '2024-02-29');
  assert.throws(() => computeSubscription({ ...plan, active: false }, 'monthly', '2026-01-01T00:00:00.000Z'));
  assert.throws(() => computeSubscription(plan, 'weekly', '2026-01-01T00:00:00.000Z'));
});

test('hospital onboarding: register -> pending -> cannot publish -> admin verifies -> can publish', async () => {
  hosp = t.client();
  const r = await hosp.post('/api/auth/register-org', { orgType: 'hospital', orgName: 'Test Hospital', area: 'Testville', name: 'Hosp Admin', email: 'h@x.test', password: 'Hospital123', consent: true });
  assert.equal(r.status, 201); assert.equal(r.data.org.status, 'pending'); assert.equal(r.data.user.role, 'hospital_admin'); orgId = r.data.org.id;
  // not in public directory yet
  assert.ok(!(await t.client().get('/api/hospitals')).data.hospitals.some(h => h.id === orgId));
  const c = await hosp.post('/api/org/cards', cardBody); assert.equal(c.status, 201); assert.equal(c.data.card.status, 'draft'); cardId = c.data.card.id;
  assert.equal((await hosp.post(`/api/org/cards/${cardId}/publish`, { attest: true })).status, 403); // org not verified
  assert.equal((await adminC.patch(`/api/admin/orgs/${orgId}`, { status: 'verified' })).status, 200);
  assert.equal((await hosp.post(`/api/org/cards/${cardId}/publish`, { attest: false })).status, 400); // attestation required
  const p = await hosp.post(`/api/org/cards/${cardId}/publish`, { attest: true }); assert.equal(p.status, 200); assert.equal(p.data.card.status, 'published'); assert.ok(p.data.card.hospitalApprovedAt);
  assert.ok((await t.client().get('/api/hospitals')).data.hospitals.some(h => h.id === orgId && h.verified));
});

test('health card validation and marketplace browse / compare / detail', async () => {
  assert.equal((await hosp.post('/api/org/cards', { ...cardBody, priceCents: -5 })).status, 400);
  assert.equal((await hosp.post('/api/org/cards', { ...cardBody, terms: 'short' })).status, 400);
  const pub = t.client();
  const list = (await pub.get('/api/cards')).data.cards; assert.ok(list.length >= 5);
  const mine = list.find(c => c.id === cardId); assert.equal(mine.hospital.verified, true); assert.equal(mine.notInsurance, true);
  const cheap = (await pub.get('/api/cards?sort=price_asc&max=4')).data.cards; assert.ok(cheap.every(c => c.priceCents <= 400));
  const cmp = await pub.get(`/api/cards/compare?ids=${cardId},${list[0].id}`); assert.equal(cmp.data.cards.length, 2);
  assert.equal((await pub.get(`/api/cards/compare?ids=${cardId}`)).status, 400);
  assert.equal((await pub.get('/api/cards/' + cardId)).data.card.name, 'Test Card');
});

test('editing a published card sends it back to draft (hospital must re-approve)', async () => {
  const r = await hosp.patch(`/api/org/cards/${cardId}`, { priceCents: 1200 });
  assert.equal(r.data.card.status, 'draft'); assert.equal((await t.client().get('/api/cards/' + cardId)).status, 404);
  assert.equal((await hosp.post(`/api/org/cards/${cardId}/publish`, { attest: true })).status, 200);
});

test('another hospital cannot touch my card', async () => {
  const other = t.client(); await other.post('/api/auth/register-org', { orgType: 'hospital', orgName: 'Other H', name: 'Other', email: 'o@x.test', password: 'Hospital123', consent: true });
  assert.equal((await other.patch(`/api/org/cards/${cardId}`, { priceCents: 1 })).status, 404);
  assert.equal((await other.post(`/api/org/cards/${cardId}/archive`)).status, 404);
});

test('card order: sandbox payment, commission split, receipt, history', async () => {
  patient = await H.newPatient(t, 'buyer@x.test');
  assert.equal((await patient.post('/api/orders', { cardId })).status, 400); // terms must be accepted
  const r = await patient.post('/api/orders', { cardId, acceptTerms: true });
  assert.equal(r.status, 201);
  assert.equal(r.data.order.priceCents, 1200); assert.equal(r.data.order.commissionBps, 500); assert.equal(r.data.order.commissionCents, 60);
  assert.equal(r.data.order.status, 'paid_sandbox'); assert.match(r.data.order.providerRef, /^SBX-/); assert.equal(r.data.sandbox, true);
  assert.match(r.data.receipt.number, /^RCPT-\d{4}-\d{6}$/); assert.match(r.data.receipt.notice, /DEMO/);
  const hist = (await patient.get('/api/orders')).data.orders; assert.equal(hist.length, 1);
  assert.equal(hist[0].cardSnapshot.name, 'Test Card');
  // snapshot is immutable even if the hospital changes the card later
  await hosp.patch(`/api/org/cards/${cardId}`, { name: 'Renamed Card' }); assert.equal((await patient.get('/api/orders')).data.orders[0].cardSnapshot.name, 'Test Card');
  await hosp.post(`/api/org/cards/${cardId}/publish`, { attest: true });
  // draft/suspended cards cannot be ordered
  const d = (await hosp.post('/api/org/cards', cardBody)).data.card;
  assert.equal((await patient.post('/api/orders', { cardId: d.id, acceptTerms: true })).status, 404);
  // anonymous cannot order; other patient cannot see my order
  assert.equal((await t.client().post('/api/orders', { cardId, acceptTerms: true })).status, 401);
  const p2 = await H.newPatient(t, 'buyer2@x.test'); assert.equal((await p2.get('/api/orders/' + hist[0].id)).status, 404);
});

test('per-organisation commission override applies to new orders', async () => {
  assert.equal((await adminC.patch(`/api/admin/orgs/${orgId}`, { cardCommissionBps: 1000 })).status, 200);
  const r = await patient.post('/api/orders', { cardId, acceptTerms: true });
  assert.equal(r.data.order.commissionBps, 1000); assert.equal(r.data.order.commissionCents, 120);
  assert.equal((await adminC.patch(`/api/admin/orgs/${orgId}`, { cardCommissionBps: 99999 })).status, 400);
  await adminC.patch(`/api/admin/orgs/${orgId}`, { cardCommissionBps: null });
  assert.equal((await patient.post('/api/orders', { cardId, acceptTerms: true })).data.order.commissionBps, 500);
});

test('admin can change global commission settings (validated, audited)', async () => {
  assert.equal((await adminC.put('/api/admin/settings', { cardCommissionBps: 700 })).data.settings.cardCommissionBps, 700);
  assert.equal((await patient.post('/api/orders', { cardId, acceptTerms: true })).data.order.commissionBps, 700);
  assert.equal((await adminC.put('/api/admin/settings', { cardCommissionBps: -1 })).status, 400);
  assert.equal((await patient.put('/api/admin/settings', { cardCommissionBps: 1 })).status, 403);
  await adminC.put('/api/admin/settings', { cardCommissionBps: 500 });
  assert.ok((await adminC.get('/api/admin/audit?action=settings')).data.audit.length >= 2);
});

test('refund workflow: request -> admin approve -> ledger reversed + credit note; deny path', async () => {
  const o1 = (await patient.get('/api/orders')).data.orders.find(o => o.status === 'paid_sandbox');
  assert.equal((await patient.post(`/api/orders/${o1.id}/refund-request`, { reason: 'x' })).status, 400);
  assert.equal((await patient.post(`/api/orders/${o1.id}/refund-request`, { reason: 'Changed my mind' })).data.order.status, 'refund_requested');
  assert.equal((await patient.post(`/api/orders/${o1.id}/refund-request`, { reason: 'Again please' })).status, 409);
  const before = (await adminC.get('/api/admin/reports/revenue')).data.totals.totalPlatformCents;
  const ap = await adminC.post(`/api/admin/orders/${o1.id}/refund`, { decision: 'approve', note: 'ok' });
  assert.equal(ap.data.order.status, 'refunded'); assert.match(ap.data.creditNote.number, /^CRN-/); assert.equal(ap.data.creditNote.totalCents, -o1.priceCents);
  const after = (await adminC.get('/api/admin/reports/revenue')).data.totals.totalPlatformCents; assert.equal(before - after, o1.commissionCents);
  assert.equal((await adminC.post(`/api/admin/orders/${o1.id}/refund`, { decision: 'approve' })).status, 409); // no double refund
  const o2 = (await patient.get('/api/orders')).data.orders.find(o => o.status === 'paid_sandbox');
  await patient.post(`/api/orders/${o2.id}/refund-request`, { reason: 'Please refund me' });
  const dn = await adminC.post(`/api/admin/orders/${o2.id}/refund`, { decision: 'deny', note: 'Outside policy' });
  assert.equal(dn.data.order.status, 'paid_sandbox'); assert.equal(dn.data.order.refund.decision, 'deny');
  assert.equal((await patient.post('/api/admin/orders/' + o2.id + '/refund', { decision: 'approve' })).status, 403);
});

test('subscriptions: plans by org type, sandbox payment, invoice, renewal extends term, analytics gating', async () => {
  assert.equal((await hosp.get('/api/org/reports/analytics')).status, 402);
  const plans = (await hosp.get('/api/org/plans')).data.plans; assert.ok(plans.length >= 2 && plans.every(p => ['hospital', 'any'].includes(p.audience)));
  const premium = plans.find(p => p.features.includes('analytics'));
  const s1 = await hosp.post('/api/org/subscriptions', { planId: premium.id, period: 'monthly' });
  assert.equal(s1.status, 201); assert.equal(s1.data.subscription.priceCents, premium.monthlyCents); assert.match(s1.data.invoice.number, /^INV-/);
  const s2 = await hosp.post('/api/org/subscriptions', { planId: premium.id, period: 'annual' });
  assert.equal(s2.data.subscription.startsAt, s1.data.subscription.endsAt); // continues after the current term
  assert.equal((await hosp.get('/api/org/reports/analytics')).status, 200);
  const amb = plans.find(p => p.audience === 'ambulance'); assert.equal(amb, undefined);
  const ambPlan = t.store.find('plans', p => p.audience === 'ambulance');
  assert.equal((await hosp.post('/api/org/subscriptions', { planId: ambPlan.id, period: 'monthly' })).status, 404);
  assert.equal((await t.client().get('/api/org/subscriptions')).status, 401);
});

test('reports: org sales, admin revenue by stream, CSV export (formula-injection safe)', async () => {
  const sales = (await hosp.get('/api/org/reports/sales')).data.report;
  assert.ok(sales.orders >= 4); assert.equal(sales.netCents, sales.grossCents - sales.platformFeeCents); assert.equal(sales.refunds, 1);
  const rev = (await adminC.get('/api/admin/reports/revenue?period=month')).data;
  assert.ok(rev.totals.subscriptions >= 6000 + 60000); assert.ok(rev.totals.cardCommission > 0);
  assert.equal(rev.totals.totalPlatformCents, rev.totals.cardCommission + rev.totals.subscriptions + rev.totals.appointmentFees + rev.totals.labCommission + rev.totals.sponsored);
  assert.equal((await adminC.get('/api/admin/reports/revenue?period=year')).data.rows.length, 1);
  const csv = await adminC.get('/api/admin/export/transactions.csv'); assert.equal(csv.status, 200); assert.match(csv.headers.get('content-type'), /text\/csv/); assert.match(csv.data, /card_sale/);
  assert.equal((await patient.get('/api/admin/export/transactions.csv')).status, 403);
  assert.match((await hosp.get('/api/org/reports/sales.csv')).data, /^date,type,reference/);
  const dash = (await adminC.get('/api/admin/dashboard')).data; assert.ok(dash.platformRevenueTotalCents > 0);
});

test('appointments: request, validation, hospital confirm/complete, fee, lab commission, cancel', async () => {
  const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  assert.equal((await patient.post('/api/appointments', { orgId, category: 'general', preferredDate: '2020-01-01' })).status, 400);
  assert.equal((await patient.post('/api/appointments', { orgId, category: 'surgery', preferredDate: future })).status, 400);
  const ap = await patient.post('/api/appointments', { orgId, category: 'checkup', preferredDate: future, contactPhone: '000', note: 'Morning please' });
  assert.equal(ap.status, 201); assert.equal(ap.data.appointment.status, 'requested');
  const id = ap.data.appointment.id;
  const list = (await hosp.get('/api/org/appointments')).data.appointments; assert.equal(list[0].patientName, 'Test Patient'); assert.equal(list[0].email, undefined);
  assert.equal((await hosp.patch(`/api/org/appointments/${id}`, { status: 'completed' })).status, 409); // must confirm first
  assert.equal((await hosp.patch(`/api/org/appointments/${id}`, { status: 'confirmed', orgNote: 'See you' })).data.appointment.status, 'confirmed');
  await adminC.put('/api/admin/settings', { appointmentFeeCents: 150 });
  const done = await hosp.patch(`/api/org/appointments/${id}`, { status: 'completed' }); assert.equal(done.status, 200);
  const fee = t.store.find('transactions', x => x.type === 'appointment_fee'); assert.equal(fee.platformCents, 150);
  await hosp.patch(`/api/org/appointments/${id}`, { status: 'completed' }).catch(() => 0);
  assert.equal(t.store.filter('transactions', x => x.type === 'appointment_fee').length, 1); // no double charge
  // lab: percentage commission on the amount entered
  await adminC.put('/api/admin/settings', { labCommissionBps: 1000 });
  const lab = t.store.find('orgs', o => o.type === 'lab');
  const la = (await patient.post('/api/appointments', { orgId: lab.id, category: 'lab_test', preferredDate: future })).data.appointment;
  const labC = await H.login(t, 'x', 'y').catch(() => null); // no lab user yet -> create one via admin
  const mk = await adminC.post('/api/admin/users', { name: 'Lab Admin', email: 'lab@x.test', role: 'provider_admin', orgId: lab.id }); assert.equal(mk.status, 201); assert.ok(mk.data.temporaryPassword);
  const lc = await H.login(t, 'lab@x.test', mk.data.temporaryPassword);
  await lc.patch(`/api/org/appointments/${la.id}`, { status: 'confirmed' });
  await lc.patch(`/api/org/appointments/${la.id}`, { status: 'completed', amountCents: 800 });
  assert.equal(t.store.find('transactions', x => x.type === 'lab_commission').platformCents, 80);
  assert.equal((await patient.post(`/api/appointments/${(await patient.post('/api/appointments', { orgId, category: 'general', preferredDate: future })).data.appointment.id}/cancel`)).data.appointment.status, 'cancelled');
  assert.equal((await hosp.patch(`/api/org/appointments/${la.id}`, { status: 'confirmed' })).status, 404); // other org's appointment
});

test('complaints: patient files, hospital responds, admin resolves', async () => {
  const cm = await patient.post('/api/complaints', { orgId, subject: 'Question about card', message: 'How do I use the card?' }); assert.equal(cm.status, 201);
  const id = cm.data.complaint.id;
  assert.equal((await hosp.get('/api/org/complaints')).data.complaints.length, 1);
  assert.equal((await hosp.get('/api/org/complaints')).data.complaints[0].userId, undefined);
  assert.equal((await hosp.post(`/api/org/complaints/${id}/respond`, { text: 'Show the order code.' })).data.complaint.status, 'in_review');
  assert.equal((await adminC.patch(`/api/admin/complaints/${id}`, { status: 'resolved', text: 'Closed' })).data.complaint.status, 'resolved');
  assert.equal((await patient.get('/api/complaints')).data.complaints[0].responses.length, 3);
});

test('admin: user management guards (last admin, self-demotion) and org rejection hides cards', async () => {
  const me = (await adminC.get('/api/auth/me')).data.user;
  assert.equal((await adminC.patch(`/api/admin/users/${me.id}`, { role: 'patient' })).status, 409);
  assert.equal((await adminC.patch(`/api/admin/users/${me.id}`, { active: false })).status, 409);
  await adminC.patch(`/api/admin/orgs/${orgId}`, { status: 'suspended', statusNote: 'test' });
  assert.equal((await t.client().get('/api/cards/' + cardId)).status, 404);
  assert.equal((await patient.post('/api/orders', { cardId, acceptTerms: true })).status, 404);
  await adminC.patch(`/api/admin/orgs/${orgId}`, { status: 'verified' });
  assert.equal((await adminC.post(`/api/admin/cards/${cardId}/suspend`)).data.card.status, 'suspended');
  assert.equal((await hosp.post(`/api/org/cards/${cardId}/publish`, { attest: true })).status, 409);
  assert.equal((await adminC.post(`/api/admin/cards/${cardId}/restore`)).data.card.status, 'published');
});

test('sponsored listings are labelled, billed and visible publicly', async () => {
  const r = await adminC.post('/api/admin/sponsored', { orgId, headline: 'Open weekends', text: 'Ad text', feeCents: 500, months: 1 }); assert.equal(r.status, 201);
  const pub = (await t.client().get('/api/sponsored')).data; assert.equal(pub.label, 'SPONSORED'); assert.equal(pub.listings.length, 1);
  assert.equal(t.store.find('transactions', x => x.type === 'sponsored').platformCents, 500);
  await adminC.patch(`/api/admin/sponsored/${r.data.listing.id}`, { active: false }); assert.equal((await t.client().get('/api/sponsored')).data.listings.length, 0);
});

test('monthly settlement statement nets commission from gross sales', async () => {
  const month = new Date().toISOString().slice(0, 7);
  const st = await adminC.post('/api/admin/statements', { orgId, month }); assert.equal(st.status, 201);
  const lines = st.data.statement.lines; assert.ok(lines[0].amountCents > 0); assert.ok(lines[2].amountCents < 0);
  assert.equal(st.data.statement.totalCents, lines.reduce((a, l) => a + l.amountCents, 0));
  assert.equal((await adminC.post('/api/admin/statements', { orgId, month: '2026-1' })).status, 400);
});

test('payments: only the sandbox provider is connected; real providers are refused honestly', async () => {
  const { getProvider, listProviders } = require('../src/payments');
  assert.equal(getProvider('sandbox').real, false);
  assert.throws(() => getProvider('mobile_money'), e => e.status === 501 && e.message === 'provider_not_connected');
  assert.ok(listProviders().filter(p => p.connected).every(p => p.id === 'sandbox'));
});
