'use strict';
// Hospital portal + Ambulance/Lab provider portal. Every handler is scoped to the caller's own organisation.
const { v, validate, HttpError } = require('../validate');
const D = require('../domain');
const { created, csv } = require('../app');
const { getProvider } = require('../payments');
const { computeSubscription, commissionCents } = require('../money');

const ORG_ROLES = ['hospital_admin', 'provider_admin'];

module.exports = function (app) {
  const { store } = app.ctx;
  const myOrg = req => { const o = store.get('orgs', req.user.orgId); if (!o) throw new HttpError(404, 'org_not_found'); return o; };
  const hospitalOnly = req => { const o = myOrg(req); if (o.type !== 'hospital') throw new HttpError(403, 'forbidden'); return o; };
  const monthlyBucket = (list, f) => { const m = {}; for (const x of list) { const k = D.monthKey(x.ts || x.createdAt); m[k] = f(m[k] || { month: k }, x); } return Object.values(m).sort((a, b) => a.month.localeCompare(b.month)); };

  // ---------- Organisation profile
  app.get('/api/org', { auth: ORG_ROLES, summary: 'My organisation profile and verification status' }, req => ({ org: D.orgPrivate(myOrg(req)) }));
  app.patch('/api/org', { auth: ORG_ROLES, summary: 'Update my organisation profile (public fields only)' }, req => {
    const o = myOrg(req);
    const b = validate({ name: v.str({ min: 2, max: 100 }), area: v.str({ max: 60 }), address: v.str({ max: 150 }), phone: v.str({ max: 30 }), publicEmail: v.str({ max: 100 }), description: v.str({ max: 500 }), hours: v.str({ max: 100 }), serviceAreas: v.list(v.str({ max: 40 }), { max: 15 }) }, req.body, { partial: true });
    Object.assign(o, b); store.save(); app.audit(req, 'org.update', 'org', o.id);
    return { org: D.orgPrivate(o) };
  });
  app.patch('/api/org/availability', { auth: ['provider_admin'], summary: 'Set provider availability' }, req => {
    const o = myOrg(req); const b = validate({ available: v.bool({ required: true }) }, req.body);
    o.available = b.available; store.save(); app.audit(req, 'org.availability', 'org', o.id, b);
    return { org: D.orgPrivate(o) };
  });

  // ---------- Services & prices (hospital price list / provider service listings)
  const svcSchema = { name: v.str({ min: 2, max: 100, required: true }), priceCents: v.int({ min: 0, max: 100000000, default: 0 }), note: v.str({ max: 200, default: '' }), active: v.bool({ default: true }) };
  app.get('/api/org/services', { auth: ORG_ROLES, summary: 'My service list' }, req => ({ services: store.filter('services', s => s.orgId === req.user.orgId) }));
  app.post('/api/org/services', { auth: ORG_ROLES, summary: 'Add a service/price' }, req => {
    const o = myOrg(req); const b = validate(svcSchema, req.body);
    const s = store.insert('services', { id: store.id('sv_'), orgId: o.id, ...b, createdAt: new Date().toISOString() });
    app.audit(req, 'service.create', 'service', s.id); return created({ service: s });
  });
  app.patch('/api/org/services/:id', { auth: ORG_ROLES, summary: 'Edit a service/price' }, req => {
    const s = store.get('services', req.params.id); if (!s || s.orgId !== req.user.orgId) throw new HttpError(404, 'not_found');
    Object.assign(s, validate(svcSchema, req.body, { partial: true })); store.save(); app.audit(req, 'service.update', 'service', s.id); return { service: s };
  });
  app.del('/api/org/services/:id', { auth: ORG_ROLES, summary: 'Delete a service' }, req => {
    const s = store.get('services', req.params.id); if (!s || s.orgId !== req.user.orgId) throw new HttpError(404, 'not_found');
    store.remove('services', s.id); app.audit(req, 'service.delete', 'service', s.id); return { ok: true };
  });

  // ---------- Health cards (hospital approves its own text, price, validity, terms)
  const cardSchema = {
    name: v.str({ min: 3, max: 80, required: true }), priceCents: v.int({ min: 0, max: 100000000, required: true }),
    included: v.list(v.str({ max: 120 }), { max: 20 }), excluded: v.list(v.str({ max: 120 }), { max: 20 }),
    validityDays: v.int({ min: 1, max: 1095, required: true }), eligibility: v.str({ max: 300, default: '' }),
    terms: v.str({ min: 10, max: 1500, required: true }), refundPolicy: v.str({ min: 10, max: 600, required: true }),
  };
  app.get('/api/org/cards', { auth: ['hospital_admin'], summary: 'My hospital health cards' }, req => ({ cards: store.filter('cards', c => c.hospitalId === req.user.orgId).map(c => D.cardView(store, c)) }));
  app.post('/api/org/cards', { auth: ['hospital_admin'], summary: 'Create a health card (starts as draft)' }, req => {
    const o = hospitalOnly(req); const b = validate(cardSchema, req.body);
    const now = new Date().toISOString();
    const c = store.insert('cards', { id: store.id('cd_'), hospitalId: o.id, ...b, included: b.included || [], excluded: b.excluded || [], status: 'draft', hospitalApprovedAt: null, approvedBy: null, createdAt: now, updatedAt: now });
    app.audit(req, 'card.create', 'card', c.id); return created({ card: D.cardView(store, c, o) });
  });
  app.patch('/api/org/cards/:id', { auth: ['hospital_admin'], summary: 'Edit a card (published cards return to draft until re-approved)' }, req => {
    const o = hospitalOnly(req); const c = store.get('cards', req.params.id); if (!c || c.hospitalId !== o.id) throw new HttpError(404, 'not_found');
    if (c.status === 'suspended') throw new HttpError(409, 'card_suspended');
    Object.assign(c, validate(cardSchema, req.body, { partial: true }));
    if (c.status === 'published') { c.status = 'draft'; c.hospitalApprovedAt = null; c.approvedBy = null; } // changes must be re-approved by the hospital
    c.updatedAt = new Date().toISOString(); store.save(); app.audit(req, 'card.update', 'card', c.id);
    return { card: D.cardView(store, c, o) };
  });
  app.post('/api/org/cards/:id/publish', { auth: ['hospital_admin'], summary: 'Hospital approves card text/price/terms and publishes (hospital must be verified)' }, req => {
    const o = hospitalOnly(req); const c = store.get('cards', req.params.id); if (!c || c.hospitalId !== o.id) throw new HttpError(404, 'not_found');
    const b = validate({ attest: v.bool({ required: true }) }, req.body);
    if (!b.attest) throw new HttpError(400, 'validation_failed', { attest: 'required' });
    if (o.status !== 'verified') throw new HttpError(403, 'org_not_verified');
    if (c.status === 'suspended') throw new HttpError(409, 'card_suspended');
    c.status = 'published'; c.hospitalApprovedAt = new Date().toISOString(); c.approvedBy = req.user.id; c.updatedAt = c.hospitalApprovedAt; store.save();
    app.audit(req, 'card.publish', 'card', c.id); return { card: D.cardView(store, c, o) };
  });
  app.post('/api/org/cards/:id/archive', { auth: ['hospital_admin'], summary: 'Archive (unpublish) a card' }, req => {
    const o = hospitalOnly(req); const c = store.get('cards', req.params.id); if (!c || c.hospitalId !== o.id) throw new HttpError(404, 'not_found');
    if (c.status === 'suspended') throw new HttpError(409, 'card_suspended');
    c.status = 'archived'; c.updatedAt = new Date().toISOString(); store.save(); app.audit(req, 'card.archive', 'card', c.id);
    return { card: D.cardView(store, c, o) };
  });

  // ---------- Orders & sales
  app.get('/api/org/orders', { auth: ['hospital_admin'], summary: 'Card orders for my hospital (no patient identity shown)' }, req => ({
    orders: store.filter('orders', o => o.hospitalId === req.user.orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => ({
      id: o.id, code: o.code, card: o.cardSnapshot.name, priceCents: o.priceCents, commissionCents: o.commissionCents, netCents: o.priceCents - o.commissionCents, status: o.status, createdAt: o.createdAt, validUntil: o.validUntil,
    })),
  }));
  function salesReport(orgId, from, to) {
    const tx = store.filter('transactions', t => t.orgId === orgId && ['card_sale', 'card_refund'].includes(t.type) && (!from || t.ts.slice(0, 10) >= from) && (!to || t.ts.slice(0, 10) <= to));
    const gross = tx.reduce((a, t) => a + t.grossCents, 0), fees = tx.reduce((a, t) => a + t.platformCents, 0);
    return { orders: tx.filter(t => t.type === 'card_sale').length, refunds: tx.filter(t => t.type === 'card_refund').length, grossCents: gross, platformFeeCents: fees, netCents: gross - fees, tx };
  }
  app.get('/api/org/reports/sales', { auth: ['hospital_admin'], summary: 'Sales and revenue summary (?from=YYYY-MM-DD&to=)' }, req => {
    const r = salesReport(req.user.orgId, req.query.from, req.query.to); delete r.tx; return { report: r, currency: D.settings(store).currency, sandbox: true };
  });
  app.get('/api/org/reports/sales.csv', { auth: ['hospital_admin'], summary: 'Sales CSV export' }, req => {
    const r = salesReport(req.user.orgId, req.query.from, req.query.to);
    return csv('sales.csv', [['date', 'type', 'reference', 'gross', 'platform_fee', 'net']].concat(r.tx.map(t => [t.ts.slice(0, 10), t.type, t.note, (t.grossCents / 100).toFixed(2), (t.platformCents / 100).toFixed(2), ((t.grossCents - t.platformCents) / 100).toFixed(2)])));
  });
  app.get('/api/org/reports/analytics', { auth: ORG_ROLES, summary: 'Premium analytics (requires an active plan with the analytics feature)' }, req => {
    if (!D.activeSubscription(store, req.user.orgId, 'analytics')) throw new HttpError(402, 'subscription_required');
    const tx = store.filter('transactions', t => t.orgId === req.user.orgId && ['card_sale', 'card_refund'].includes(t.type));
    const orders = store.filter('orders', o => o.hospitalId === req.user.orgId);
    const byCard = {}; for (const o of orders) { const k = o.cardSnapshot.name; byCard[k] = byCard[k] || { card: k, orders: 0, grossCents: 0 }; byCard[k].orders++; byCard[k].grossCents += o.priceCents; }
    return { monthly: monthlyBucket(tx, (m, t) => ({ ...m, grossCents: (m.grossCents || 0) + t.grossCents, orders: (m.orders || 0) + (t.type === 'card_sale' ? 1 : 0) })), byCard: Object.values(byCard).sort((a, b) => b.grossCents - a.grossCents), refundRate: orders.length ? orders.filter(o => o.status === 'refunded').length / orders.length : 0 };
  });

  // ---------- Appointment requests
  app.get('/api/org/appointments', { auth: ['hospital_admin', 'provider_admin'], summary: 'Appointment requests for my organisation' }, req => ({
    appointments: store.filter('appointments', a => a.orgId === req.user.orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(a => {
      const u = store.get('users', a.userId);
      return { ...a, patientName: u ? u.name : '', serviceName: a.serviceId ? (store.get('services', a.serviceId) || {}).name : null };
    }),
  }));
  app.patch('/api/org/appointments/:id', { auth: ['hospital_admin', 'provider_admin'], summary: 'Confirm / decline / complete an appointment (lab: enter amount for commission)' }, req => {
    const o = myOrg(req); const a = store.get('appointments', req.params.id); if (!a || a.orgId !== o.id) throw new HttpError(404, 'not_found');
    const b = validate({ status: v.enum(['confirmed', 'declined', 'completed'], { required: true }), orgNote: v.str({ max: 200, default: '' }), amountCents: v.int({ min: 0, max: 100000000 }) }, req.body);
    const ok = { requested: ['confirmed', 'declined'], confirmed: ['completed', 'declined'] }[a.status] || [];
    if (!ok.includes(b.status)) throw new HttpError(409, 'invalid_transition');
    a.status = b.status; a.orgNote = b.orgNote; a.updatedAt = new Date().toISOString();
    if (b.status === 'completed' && !a.feeTxId) {
      const r = D.ratesFor(store, o); let fee = 0;
      if (o.type === 'lab' && b.amountCents) { a.amountCents = b.amountCents; fee = commissionCents(b.amountCents, r.labCommissionBps); }
      else if (o.type === 'hospital') fee = r.appointmentFeeCents;
      if (fee > 0) { const t = D.recordTx(store, { type: o.type === 'lab' ? 'lab_commission' : 'appointment_fee', orgId: o.id, refType: 'appointment', refId: a.id, grossCents: a.amountCents || 0, platformCents: fee, note: 'Appointment ' + a.id }); a.feeTxId = t.id; }
    }
    store.save(); app.audit(req, 'appointment.' + b.status, 'appointment', a.id);
    return { appointment: a };
  });

  // ---------- Complaints / support for my organisation
  app.get('/api/org/complaints', { auth: ORG_ROLES, summary: 'Complaints about my organisation' }, req => ({ complaints: store.filter('complaints', c => c.orgId === req.user.orgId).map(c => ({ ...c, userId: undefined })) }));
  app.post('/api/org/complaints/:id/respond', { auth: ORG_ROLES, summary: 'Respond to a complaint' }, req => {
    const c = store.get('complaints', req.params.id); if (!c || c.orgId !== req.user.orgId) throw new HttpError(404, 'not_found');
    const b = validate({ text: v.str({ min: 2, max: 1000, required: true }) }, req.body);
    c.responses.push({ ts: new Date().toISOString(), by: 'organisation', text: b.text }); if (c.status === 'open') c.status = 'in_review'; c.updatedAt = new Date().toISOString(); store.save();
    app.audit(req, 'complaint.org_response', 'complaint', c.id); return { complaint: { ...c, userId: undefined } };
  });

  // ---------- Subscriptions (sandbox payment)
  app.get('/api/org/plans', { auth: ORG_ROLES, summary: 'Subscription plans available to my organisation type' }, req => {
    const o = myOrg(req); return { plans: store.filter('plans', p => p.active && (p.audience === o.type || p.audience === 'any')) };
  });
  app.get('/api/org/subscriptions', { auth: ORG_ROLES, summary: 'My subscriptions' }, req => ({
    subscriptions: store.filter('subscriptions', s => s.orgId === req.user.orgId).map(s => ({ ...s, planName: (store.get('plans', s.planId) || {}).name })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));
  app.post('/api/org/subscriptions', { auth: ORG_ROLES, summary: 'Subscribe / renew a plan (SANDBOX payment)' }, async req => {
    const o = myOrg(req); const b = validate({ planId: v.str({ required: true, max: 60 }), period: v.enum(['monthly', 'annual'], { required: true }) }, req.body);
    const plan = store.get('plans', b.planId);
    if (!plan || !plan.active || !(plan.audience === o.type || plan.audience === 'any')) throw new HttpError(404, 'plan_unavailable');
    const existing = store.filter('subscriptions', s => s.orgId === o.id && s.planId === plan.id && s.status === 'active' && new Date(s.endsAt) > new Date()).sort((a, b2) => b2.endsAt.localeCompare(a.endsAt))[0];
    const start = existing ? existing.endsAt : new Date().toISOString(); // renewal continues after current term
    const term = computeSubscription(plan, b.period, start);
    const pay = await getProvider('sandbox').charge({ amountCents: term.priceCents, currency: D.settings(store).currency, reference: plan.id });
    const now = new Date().toISOString();
    const sub = store.insert('subscriptions', { id: store.id('sb_'), orgId: o.id, planId: plan.id, period: b.period, priceCents: term.priceCents, status: 'active', startsAt: term.startsAt, endsAt: term.endsAt, createdAt: now });
    const tx = D.recordTx(store, { type: 'subscription', orgId: o.id, userId: req.user.id, refType: 'subscription', refId: sub.id, grossCents: term.priceCents, platformCents: term.priceCents, providerRef: pay.providerRef, note: plan.name + ' / ' + b.period });
    const inv = D.issueDoc(store, 'invoice', { orgId: o.id, refType: 'subscription', refId: sub.id, lines: [{ desc: `${plan.name} (${b.period})`, amountCents: term.priceCents }] });
    sub.txId = tx.id; sub.invoiceId = inv.id; store.save(); app.audit(req, 'subscription.create', 'subscription', sub.id, { planId: plan.id, period: b.period });
    return created({ subscription: sub, invoice: inv, sandbox: true });
  });
  app.post('/api/org/subscriptions/:id/cancel', { auth: ORG_ROLES, summary: 'Cancel a subscription (access continues until the paid term ends; no refund in demo)' }, req => {
    const s = store.get('subscriptions', req.params.id); if (!s || s.orgId !== req.user.orgId) throw new HttpError(404, 'not_found');
    s.status = 'cancelled'; store.save(); app.audit(req, 'subscription.cancel', 'subscription', s.id); return { subscription: s };
  });
  app.get('/api/org/invoices', { auth: ORG_ROLES, summary: 'Invoices and statements issued to my organisation' }, req => ({ invoices: store.filter('invoices', d => d.orgId === req.user.orgId && d.kind !== 'receipt').sort((a, b) => b.ts.localeCompare(a.ts)) }));

  // ---------- Provider: incoming (simulated) emergency requests assigned to me
  app.get('/api/org/requests', { auth: ['provider_admin'], summary: 'Simulated requests assigned to my organisation' }, req => ({
    requests: store.filter('cases', c => c.assignedOrgId === req.user.orgId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(c => ({ id: c.id, code: c.code, mode: c.mode, category: c.category, area: c.area, status: c.status, updatedAt: c.updatedAt, next: D.PROVIDER_STEPS[c.status] || [] })),
  }));
  app.patch('/api/org/requests/:id', { auth: ['provider_admin'], summary: 'Advance an assigned simulated request (en_route / arrived / handed_over / decline)' }, req => {
    const c = store.get('cases', req.params.id); if (!c || c.assignedOrgId !== req.user.orgId) throw new HttpError(404, 'not_found');
    const b = validate({ status: v.enum(['en_route', 'arrived', 'handed_over', 'received'], { required: true }), note: v.str({ max: 200, default: '' }) }, req.body);
    if (!(D.PROVIDER_STEPS[c.status] || []).includes(b.status)) throw new HttpError(409, 'invalid_transition');
    const now = new Date().toISOString();
    c.history.push({ ts: now, status: b.status, by: 'provider:' + req.user.orgId, note: b.note });
    if (b.status === 'received') c.assignedOrgId = null; // declined -> back to the operator queue
    c.status = b.status; c.updatedAt = now; store.save(); app.audit(req, 'case.provider_update', 'case', c.id, { status: b.status });
    return { request: { id: c.id, code: c.code, status: c.status } };
  });
  app.get('/api/org/reports/revenue', { auth: ['provider_admin'], summary: 'Provider revenue report (platform fees charged to me)' }, req => {
    const tx = store.filter('transactions', t => t.orgId === req.user.orgId);
    return { feesPaidCents: tx.reduce((a, t) => a + t.platformCents, 0), grossHandledCents: tx.reduce((a, t) => a + t.grossCents, 0), monthly: monthlyBucket(tx, (m, t) => ({ ...m, feesCents: (m.feesCents || 0) + t.platformCents })), sandbox: true };
  });
};
