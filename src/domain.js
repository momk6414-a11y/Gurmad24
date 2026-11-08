'use strict';
// Shared domain helpers: settings, rates, views (what each audience may see), ledger, documents.
const { commissionCents } = require('./money');

const settings = store => store.data.settings;

function ratesFor(store, org) {
  const s = settings(store); const c = (org && org.contract) || {};
  return {
    cardCommissionBps: c.cardCommissionBps ?? s.cardCommissionBps,
    labCommissionBps: c.labCommissionBps ?? s.labCommissionBps,
    appointmentFeeCents: c.appointmentFeeCents ?? s.appointmentFeeCents,
  };
}

const userView = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, orgId: u.orgId || null, lang: u.lang || 'so', active: u.active, createdAt: u.createdAt, twoFactor: !!(u.totp && u.totp.enabled) });

function orgPublic(o) {
  return { id: o.id, type: o.type, name: o.name, area: o.area, address: o.address || '', phone: o.phone || '', email: o.publicEmail || '', description: o.description || '', hours: o.hours || '', verified: o.status === 'verified', available: o.type === 'hospital' ? undefined : !!o.available, serviceAreas: o.serviceAreas || [], lat: o.lat ?? null, lng: o.lng ?? null };
}
const orgPrivate = o => ({ ...orgPublic(o), status: o.status, statusNote: o.statusNote || '', contract: o.contract, createdAt: o.createdAt });

function cardView(store, c, org) {
  org = org || store.get('orgs', c.hospitalId);
  return {
    id: c.id, name: c.name, priceCents: c.priceCents, currency: settings(store).currency, included: c.included, excluded: c.excluded,
    validityDays: c.validityDays, eligibility: c.eligibility, terms: c.terms, refundPolicy: c.refundPolicy, status: c.status,
    hospital: org ? { id: org.id, name: org.name, verified: org.status === 'verified', area: org.area, phone: org.phone || '', email: org.publicEmail || '', address: org.address || '' } : null,
    hospitalApprovedAt: c.hospitalApprovedAt || null, updatedAt: c.updatedAt,
    notInsurance: true, // Health cards are hospital service products, NOT insurance (shown in UI)
  };
}

// ---- Ledger. platformCents = what GURMAD 24 earns from the transaction (negative on refunds).
function recordTx(store, f) {
  const t = {
    id: store.id('t_'), ts: new Date().toISOString(), type: f.type, status: f.status || 'succeeded',
    orgId: f.orgId || null, userId: f.userId || null, refType: f.refType || null, refId: f.refId || null,
    grossCents: f.grossCents || 0, platformCents: f.platformCents || 0, currency: settings(store).currency,
    provider: f.provider || 'sandbox', providerRef: f.providerRef || null, sandbox: true, note: f.note || '',
  };
  store.insert('transactions', t); return t;
}

function issueDoc(store, kind, f) {
  const prefix = { receipt: 'RCPT', invoice: 'INV', statement: 'STMT', credit: 'CRN' }[kind];
  const year = new Date().getUTCFullYear();
  const n = store.next(kind);
  const d = {
    id: store.id('d_'), kind, number: `${prefix}-${year}-${String(n).padStart(6, '0')}`, ts: new Date().toISOString(),
    orgId: f.orgId || null, userId: f.userId || null, lines: f.lines, totalCents: f.lines.reduce((a, l) => a + l.amountCents, 0),
    currency: settings(store).currency, refType: f.refType || null, refId: f.refId || null, sandbox: true,
    notice: 'DEMO / SANDBOX DOCUMENT - not a tax invoice, no real payment was made.',
  };
  store.insert('invoices', d); return d;
}

const monthKey = iso => String(iso).slice(0, 7);

function activeSubscription(store, orgId, feature) {
  const now = Date.now();
  return store.filter('subscriptions', s => s.orgId === orgId && s.status === 'active' && new Date(s.endsAt).getTime() > now)
    .find(s => { if (!feature) return true; const p = store.get('plans', s.planId); return p && (p.features || []).includes(feature); });
}

function cardCommission(store, org, priceCents) { return commissionCents(priceCents, ratesFor(store, org).cardCommissionBps); }

const CASE_FLOW = {
  received: ['assigned', 'cancelled'],
  assigned: ['en_route', 'received', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['handed_over', 'cancelled'],
  handed_over: ['closed'],
  closed: [], cancelled: [],
};
const PROVIDER_STEPS = { assigned: ['en_route', 'received'], en_route: ['arrived'], arrived: ['handed_over'] };

module.exports = { settings, ratesFor, userView, orgPublic, orgPrivate, cardView, recordTx, issueDoc, monthKey, activeSubscription, cardCommission, CASE_FLOW, PROVIDER_STEPS };
