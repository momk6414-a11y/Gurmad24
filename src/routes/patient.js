'use strict';
const { v, validate, HttpError } = require('../validate');
const D = require('../domain');
const { created } = require('../app');
const { getProvider } = require('../payments');

const P = ['patient'];
const APPT_CATEGORIES = ['general', 'checkup', 'lab_test', 'follow_up', 'other'];

module.exports = function (app) {
  const { store, config } = app.ctx;
  const own = (coll, id, userId) => { const x = store.get(coll, id); if (!x || x.userId !== userId) throw new HttpError(404, 'not_found'); return x; };

  // ---------- Health card orders (sandbox payment)
  app.post('/api/orders', { auth: P, summary: 'Order a health card (SANDBOX payment, no real money)' }, async req => {
    const b = validate({ cardId: v.str({ required: true, max: 60 }), acceptTerms: v.bool({ required: true }) }, req.body);
    if (!b.acceptTerms) throw new HttpError(400, 'validation_failed', { acceptTerms: 'required' });
    const card = store.get('cards', b.cardId); const org = card && store.get('orgs', card.hospitalId);
    if (!card || card.status !== 'published' || !org || org.status !== 'verified') throw new HttpError(404, 'card_unavailable');
    const commissionBps = D.ratesFor(store, org).cardCommissionBps;
    const commission = D.cardCommission(store, org, card.priceCents);
    const pay = await getProvider('sandbox').charge({ amountCents: card.priceCents, currency: D.settings(store).currency, reference: card.id });
    if (pay.status !== 'succeeded') throw new HttpError(402, 'payment_failed');
    const now = new Date().toISOString();
    const order = {
      id: store.id('or_'), code: 'DEMO-ORD-' + String(store.next('order')).padStart(6, '0'), userId: req.user.id, cardId: card.id, hospitalId: org.id,
      cardSnapshot: { name: card.name, hospitalName: org.name, priceCents: card.priceCents, validityDays: card.validityDays, included: card.included, excluded: card.excluded, terms: card.terms, refundPolicy: card.refundPolicy, eligibility: card.eligibility },
      priceCents: card.priceCents, commissionBps, commissionCents: commission, status: 'paid_sandbox', paymentProvider: 'sandbox', providerRef: pay.providerRef,
      createdAt: now, validUntil: new Date(Date.now() + card.validityDays * 86400000).toISOString(), refund: null,
    };
    store.insert('orders', order);
    const tx = D.recordTx(store, { type: 'card_sale', orgId: org.id, userId: req.user.id, refType: 'order', refId: order.id, grossCents: card.priceCents, platformCents: commission, providerRef: pay.providerRef, note: order.code });
    const receipt = D.issueDoc(store, 'receipt', { userId: req.user.id, orgId: org.id, refType: 'order', refId: order.id, lines: [{ desc: `${card.name} - ${org.name}`, amountCents: card.priceCents }] });
    order.receiptId = receipt.id; order.txId = tx.id; store.save();
    app.audit(req, 'order.create', 'order', order.id, { cardId: card.id, priceCents: card.priceCents });
    return created({ order, receipt, sandbox: true, message: 'DEMO_ORDER_NO_REAL_PAYMENT' });
  });

  app.get('/api/orders', { auth: P, summary: 'My purchase history' }, req => ({ orders: store.filter('orders', o => o.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
  app.get('/api/orders/:id', { auth: P, summary: 'One of my orders with its receipt' }, req => {
    const o = own('orders', req.params.id, req.user.id);
    return { order: o, receipt: store.get('invoices', o.receiptId) };
  });
  app.post('/api/orders/:id/refund-request', { auth: P, summary: 'Request a refund (decided by admin per the hospital refund policy)' }, req => {
    const o = own('orders', req.params.id, req.user.id);
    const b = validate({ reason: v.str({ min: 3, max: 300, required: true }) }, req.body);
    if (o.status !== 'paid_sandbox') throw new HttpError(409, 'not_refundable');
    o.status = 'refund_requested'; o.refund = { requestedAt: new Date().toISOString(), reason: b.reason, decision: null };
    store.save(); app.audit(req, 'order.refund_requested', 'order', o.id);
    return { order: o };
  });

  // ---------- Appointment requests (hospital or lab)
  app.post('/api/appointments', { auth: P, summary: 'Request an appointment at a verified hospital/lab' }, req => {
    const b = validate({
      orgId: v.str({ required: true, max: 60 }), serviceId: v.str({ max: 60 }), category: v.enum(APPT_CATEGORIES, { required: true }),
      preferredDate: v.date({ required: true }), contactPhone: v.str({ max: 30, default: '' }), note: v.str({ max: 140, default: '' }),
    }, req.body);
    const org = store.get('orgs', b.orgId);
    if (!org || org.status !== 'verified' || !['hospital', 'lab'].includes(org.type)) throw new HttpError(404, 'org_unavailable');
    if (b.preferredDate < new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'validation_failed', { preferredDate: 'in_past' });
    if (b.serviceId) { const s = store.get('services', b.serviceId); if (!s || s.orgId !== org.id || !s.active) throw new HttpError(400, 'validation_failed', { serviceId: 'invalid' }); }
    const now = new Date().toISOString();
    const a = store.insert('appointments', { id: store.id('ap_'), userId: req.user.id, orgId: org.id, serviceId: b.serviceId || null, category: b.category, preferredDate: b.preferredDate, contactPhone: b.contactPhone, note: b.note, status: 'requested', orgNote: '', amountCents: null, createdAt: now, updatedAt: now });
    app.audit(req, 'appointment.request', 'appointment', a.id, { orgId: org.id });
    return created({ appointment: a });
  });
  app.get('/api/appointments', { auth: P, summary: 'My appointment requests' }, req => ({
    appointments: store.filter('appointments', a => a.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(a => ({ ...a, orgName: (store.get('orgs', a.orgId) || {}).name })),
  }));
  app.post('/api/appointments/:id/cancel', { auth: P, summary: 'Cancel my appointment request' }, req => {
    const a = own('appointments', req.params.id, req.user.id);
    if (!['requested', 'confirmed'].includes(a.status)) throw new HttpError(409, 'cannot_cancel');
    a.status = 'cancelled'; a.updatedAt = new Date().toISOString(); store.save(); app.audit(req, 'appointment.cancel', 'appointment', a.id);
    return { appointment: a };
  });

  // ---------- Support / complaints
  app.post('/api/complaints', { auth: P, summary: 'Contact support or file a complaint' }, req => {
    const b = validate({ orgId: v.str({ max: 60 }), orderId: v.str({ max: 60 }), subject: v.str({ min: 3, max: 100, required: true }), message: v.str({ min: 5, max: 1000, required: true }) }, req.body);
    if (b.orgId && !store.get('orgs', b.orgId)) throw new HttpError(400, 'validation_failed', { orgId: 'invalid' });
    if (b.orderId) { own('orders', b.orderId, req.user.id); }
    const now = new Date().toISOString();
    const c = store.insert('complaints', { id: store.id('cm_'), code: 'CMP-' + String(store.next('complaint')).padStart(5, '0'), userId: req.user.id, orgId: b.orgId || null, orderId: b.orderId || null, subject: b.subject, status: 'open', responses: [{ ts: now, by: 'patient', text: b.message }], createdAt: now, updatedAt: now });
    app.audit(req, 'complaint.create', 'complaint', c.id);
    return created({ complaint: c });
  });
  app.get('/api/complaints', { auth: P, summary: 'My support tickets' }, req => ({ complaints: store.filter('complaints', c => c.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
  app.post('/api/complaints/:id/reply', { auth: P, summary: 'Add a message to my ticket' }, req => {
    const c = own('complaints', req.params.id, req.user.id);
    const b = validate({ text: v.str({ min: 1, max: 1000, required: true }) }, req.body);
    c.responses.push({ ts: new Date().toISOString(), by: 'patient', text: b.text }); if (c.status === 'resolved') c.status = 'open'; c.updatedAt = new Date().toISOString(); store.save();
    return { complaint: c };
  });
};
module.exports.APPT_CATEGORIES = APPT_CATEGORIES;
