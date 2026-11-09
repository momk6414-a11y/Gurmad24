'use strict';
const { v, validate, HttpError } = require('../validate');
const D = require('../domain');
const S = require('../security');
const { created, csv } = require('../app');
const { getProvider, listProviders } = require('../payments');
const { addMonths } = require('../money');
const catalog = require('../catalog');

const A = ['admin'];
const ROLES = ['patient', 'hospital_admin', 'provider_admin', 'operator', 'admin'];

module.exports = function (app) {
  const { store } = app.ctx;
  const userAdminView = u => ({ ...D.userView(u), orgName: u.orgId ? (store.get('orgs', u.orgId) || {}).name : null, deletedAt: u.deletedAt });
  const activeAdmins = () => store.filter('users', u => u.role === 'admin' && u.active);

  // ---------- Dashboard & revenue
  const STREAMS = { card_sale: 'cardCommission', card_refund: 'cardCommission', subscription: 'subscriptions', appointment_fee: 'appointmentFees', lab_commission: 'labCommission', sponsored: 'sponsored' };
  function revenue(period, year) {
    const rows = {};
    for (const t of store.col('transactions')) {
      if (t.status !== 'succeeded') continue;
      const key = period === 'year' ? t.ts.slice(0, 4) : t.ts.slice(0, 7);
      if (period !== 'year' && year && !key.startsWith(year)) continue;
      const r = rows[key] = rows[key] || { period: key, cardGrossCents: 0, cardCommission: 0, subscriptions: 0, appointmentFees: 0, labCommission: 0, sponsored: 0, totalPlatformCents: 0, transactions: 0 };
      if (t.type === 'card_sale' || t.type === 'card_refund') r.cardGrossCents += t.grossCents;
      r[STREAMS[t.type]] += t.platformCents; r.totalPlatformCents += t.platformCents; r.transactions++;
    }
    const list = Object.values(rows).sort((a, b) => a.period.localeCompare(b.period));
    const totals = list.reduce((a, r) => { for (const k of Object.keys(r)) if (k !== 'period') a[k] = (a[k] || 0) + r[k]; return a; }, {});
    return { period, rows: list, totals, currency: D.settings(store).currency, sandbox: true };
  }
  app.get('/api/admin/dashboard', { auth: A, summary: 'Admin overview counters' }, () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const rev = revenue('month'); const cur = rev.rows.find(r => r.period === thisMonth);
    return {
      users: store.col('users').filter(u => !u.deletedAt).length, hospitalsVerified: store.filter('orgs', o => o.type === 'hospital' && o.status === 'verified').length,
      providersVerified: store.filter('orgs', o => o.type !== 'hospital' && o.status === 'verified').length, orgsPending: store.filter('orgs', o => o.status === 'pending').length,
      cardsPublished: store.filter('cards', c => c.status === 'published').length, orders: store.col('orders').length, refundsPending: store.filter('orders', o => o.status === 'refund_requested').length,
      complaintsOpen: store.filter('complaints', c => ['open', 'in_review'].includes(c.status)).length, casesTotal: store.col('cases').length,
      platformRevenueThisMonthCents: cur ? cur.totalPlatformCents : 0, platformRevenueTotalCents: rev.totals.totalPlatformCents || 0, currency: D.settings(store).currency, sandbox: true, storagePersistent: app.ctx.config.persistentStorage,
    };
  });
  app.get('/api/admin/reports/revenue', { auth: A, summary: 'Revenue report by month or year (?period=month|year&year=YYYY)' }, req => revenue(req.query.period === 'year' ? 'year' : 'month', req.query.year));

  // ---------- Users & roles
  app.get('/api/admin/users', { auth: A, summary: 'List users' }, () => ({ users: store.col('users').map(userAdminView) }));
  app.post('/api/admin/users', { auth: A, summary: 'Create a user with a role (operator, admin, org staff...)' }, req => {
    const b = validate({ name: v.str({ min: 2, max: 80, required: true }), email: v.email({ required: true }), role: v.enum(ROLES, { required: true }), orgId: v.str({ max: 60 }), password: v.str({ min: 1, max: 128 }) }, req.body);
    if (['hospital_admin', 'provider_admin'].includes(b.role)) { const o = store.get('orgs', b.orgId); if (!o) throw new HttpError(400, 'validation_failed', { orgId: 'required' }); if ((b.role === 'hospital_admin') !== (o.type === 'hospital')) throw new HttpError(400, 'validation_failed', { role: 'org_type_mismatch' }); }
    else delete b.orgId;
    const temp = b.password || S.randomPassword();
    const u = app.createUser({ ...b, password: temp, lang: 'so' });
    app.audit(req, 'user.create', 'user', u.id, { role: u.role });
    return created({ user: userAdminView(u), temporaryPassword: b.password ? undefined : temp });
  });
  app.patch('/api/admin/users/:id', { auth: A, summary: 'Change role / active flag' }, req => {
    const u = store.get('users', req.params.id); if (!u) throw new HttpError(404, 'not_found');
    const b = validate({ role: v.enum(ROLES), active: v.bool(), name: v.str({ min: 2, max: 80 }) }, req.body, { partial: true });
    const losesAdmin = u.role === 'admin' && ((b.role && b.role !== 'admin') || b.active === false);
    if (losesAdmin && activeAdmins().length <= 1) throw new HttpError(409, 'last_admin');
    if (u.id === req.user.id && (b.role || b.active === false)) throw new HttpError(409, 'cannot_change_self');
    Object.assign(u, b);
    if (b.active === false) for (const s of store.filter('sessions', x => x.userId === u.id)) store.remove('sessions', s.id);
    store.save(); app.audit(req, 'user.update', 'user', u.id, b); return { user: userAdminView(u) };
  });
  app.post('/api/admin/users/:id/reset-password', { auth: A, summary: 'Generate a temporary password (shown once)' }, req => {
    const u = store.get('users', req.params.id); if (!u || u.deletedAt) throw new HttpError(404, 'not_found');
    const temp = S.randomPassword(); u.passwordHash = S.hashPassword(temp);
    for (const s of store.filter('sessions', x => x.userId === u.id)) store.remove('sessions', s.id);
    store.save(); app.audit(req, 'user.password_reset', 'user', u.id); return { temporaryPassword: temp };
  });

  // ---------- Organisations (verification workflow + contract overrides)
  app.get('/api/admin/orgs', { auth: A, summary: 'All organisations (?status=pending)' }, req => ({ orgs: store.filter('orgs', o => !req.query.status || o.status === req.query.status).map(D.orgPrivate) }));
  app.patch('/api/admin/orgs/:id', { auth: A, summary: 'Verify / reject / suspend an organisation; set contract overrides' }, req => {
    const o = store.get('orgs', req.params.id); if (!o) throw new HttpError(404, 'not_found');
    const b = validate({
      status: v.enum(['pending', 'verified', 'rejected', 'suspended']), statusNote: v.str({ max: 300 }),
      cardCommissionBps: v.int({ min: 0, max: 5000 }), labCommissionBps: v.int({ min: 0, max: 5000 }), appointmentFeeCents: v.int({ min: 0, max: 1000000 }),
    }, req.body, { partial: true });
    if (b.status) { o.status = b.status; o.statusNote = b.statusNote || ''; o.verifiedAt = b.status === 'verified' ? new Date().toISOString() : o.verifiedAt; }
    for (const k of ['cardCommissionBps', 'labCommissionBps', 'appointmentFeeCents']) if (req.body[k] !== undefined) o.contract[k] = req.body[k] === null || req.body[k] === '' ? null : b[k];
    if (b.status === 'verified') catalog.applyToHospital(store, o); // newly verified hospital gets starter services/cards if it has none
    store.save(); app.audit(req, 'org.admin_update', 'org', o.id, { status: o.status, contract: o.contract }); return { org: D.orgPrivate(o) };
  });
  app.post('/api/admin/catalog/apply', { auth: A, summary: 'Add starter services and health cards to every hospital that has none (never overwrites)' }, req => {
    const results = catalog.applyToAll(store); app.audit(req, 'catalog.apply', 'org', null, { hospitals: results.length });
    return { results };
  });

  // ---------- Health cards moderation
  app.get('/api/admin/cards', { auth: A, summary: 'All health cards, any status' }, () => ({ cards: store.col('cards').map(c => D.cardView(store, c)) }));
  app.post('/api/admin/cards/:id/suspend', { auth: A, summary: 'Suspend a card (hidden from marketplace)' }, req => {
    const c = store.get('cards', req.params.id); if (!c) throw new HttpError(404, 'not_found');
    if (c.status !== 'suspended') { c.suspendedPrev = c.status; c.status = 'suspended'; }
    store.save(); app.audit(req, 'card.suspend', 'card', c.id); return { card: D.cardView(store, c) };
  });
  app.post('/api/admin/cards/:id/restore', { auth: A, summary: 'Restore a suspended card' }, req => {
    const c = store.get('cards', req.params.id); if (!c || c.status !== 'suspended') throw new HttpError(404, 'not_found');
    c.status = c.suspendedPrev === 'published' && c.hospitalApprovedAt ? 'published' : 'draft'; store.save(); app.audit(req, 'card.restore', 'card', c.id); return { card: D.cardView(store, c) };
  });

  // ---------- Settings (commissions, fees) - everything configurable, nothing hard-wired
  app.get('/api/admin/settings', { auth: A, summary: 'Platform settings (commission rates in basis points)' }, () => ({ settings: D.settings(store), paymentProviders: listProviders() }));
  // ---- Real mode: while OFF every emergency request is a simulation. Only an admin can turn it on.
  app.put('/api/admin/real-mode', { auth: A, summary: 'Turn real (non-simulated) emergency requests on or off. Audited.' }, req => {
    const b = validate({ enabled: v.bool({ required: true }), confirm: v.str({ max: 20, default: '' }) }, req.body);
    if (b.enabled && b.confirm !== 'SHIDO') throw new HttpError(400, 'validation_failed', { confirm: 'type_SHIDO' });
    D.settings(store).realMode = !!b.enabled; D.settings(store).realModeAt = new Date().toISOString(); store.save();
    app.audit(req, b.enabled ? 'realmode.on' : 'realmode.off', 'settings', null); app.secEvent(req, b.enabled ? 'real_mode_on' : 'real_mode_off', {});
    return { realMode: !!D.settings(store).realMode };
  });

  app.get('/api/admin/security', { auth: A, summary: 'Security overview: checks, recent security events, 2FA coverage' }, req => {
    const cfg = app.ctx.config; const users = store.col('users').filter(u => u.active && !u.deletedAt);
    const staff = users.filter(u => u.role !== 'patient'); const staff2fa = staff.filter(u => u.totp && u.totp.enabled).length;
    const since = Date.now() - 24 * 3600 * 1000; const ev = store.col('audit').filter(a => a.action.startsWith('security.'));
    const last24 = ev.filter(a => Date.parse(a.ts) >= since); const count = t => last24.filter(a => a.action === 'security.' + t).length;
    const demoUsers = users.filter(u => /@demo\.gurmad24\.test$/.test(u.email)).length;
    const checks = [
      { id: 'https', ok: !!cfg.cookieSecure, text: 'Secure cookies + HSTS (HTTPS)' },
      { id: 'proxy', ok: !!cfg.trustProxy, text: 'Real client IP behind proxy (rate limits work per user)' },
      { id: 'headers', ok: true, text: 'CSP, frame blocking, nosniff, COOP/CORP, no-referrer' },
      { id: 'csrf', ok: true, text: 'Same-origin check + JSON-only bodies + SameSite cookies' },
      { id: 'passwords', ok: true, text: 'Passwords: scrypt + salt, common-password blocklist' },
      { id: 'lockout', ok: true, text: 'Lockout: 5 failures per account, 25 per IP, per 15 min' },
      { id: 'ratelimit', ok: true, text: 'Rate limits on login, requests, assistant and API' },
      { id: 'audit', ok: true, text: 'Audit log of sensitive actions (including voice listening)' },
      { id: '2fa', ok: staff.length > 0 && staff2fa === staff.length, text: `Two-step login for staff: ${staff2fa}/${staff.length}`, action: 'Enable in Account' },
      { id: 'demo', ok: demoUsers === 0, text: `Demo accounts active: ${demoUsers}`, action: 'Set SEED_DEMO_DATA=false and remove demo users before real use' },
      { id: 'backup', ok: !!cfg.autoBackup, text: 'Automatic data backups' },
      { id: 'retention', ok: cfg.retentionDays <= 365, text: `Personal data retention: ${cfg.retentionDays} days` },
    ];
    return { checks, score: Math.round(checks.filter(c => c.ok).length / checks.length * 100), realMode: !!D.settings(store).realMode,
      last24h: { loginFailed: count('login_failed'), locked: count('account_locked'), ipBlocked: count('ip_blocked'), rateLimited: count('rate_limited'), badOrigin: count('bad_origin'), forbidden: count('forbidden'), bad2fa: count('bad_2fa_code') },
      activeSessions: store.col('sessions').length,
      events: ev.slice(-40).reverse().map(a => ({ ts: a.ts, type: a.action.replace('security.', ''), ip: a.ip ? a.ip.replace(/(\d+)\.(\d+)\.\d+\.\d+/, '$1.$2.x.x') : '', meta: a.meta })) };
  });

  app.put('/api/admin/settings', { auth: A, summary: 'Update commission rates / fees (100 bps = 1%)' }, req => {
    const b = validate({ cardCommissionBps: v.int({ min: 0, max: 5000 }), labCommissionBps: v.int({ min: 0, max: 5000 }), appointmentFeeCents: v.int({ min: 0, max: 1000000 }), currency: v.enum(['USD']), retentionDays: v.int({ min: 30, max: 3650 }) }, req.body, { partial: true });
    Object.assign(D.settings(store), b, { placeholderValues: false, updatedAt: new Date().toISOString() }); store.save();
    app.audit(req, 'settings.update', 'settings', null, b); return { settings: D.settings(store) };
  });

  // ---------- Subscription plans
  const planSchema = { audience: v.enum(['hospital', 'ambulance', 'lab', 'police', 'fire', 'any'], { required: true }), name: v.str({ min: 2, max: 60, required: true }), monthlyCents: v.int({ min: 0, max: 100000000, required: true }), annualCents: v.int({ min: 0, max: 1000000000, required: true }), features: v.list(v.enum(['analytics', 'premium_dashboard', 'priority_listing']), { max: 5 }), active: v.bool({ default: true }) };
  app.get('/api/admin/plans', { auth: A, summary: 'All subscription plans' }, () => ({ plans: store.col('plans') }));
  app.post('/api/admin/plans', { auth: A, summary: 'Create a plan' }, req => {
    const b = validate(planSchema, req.body); const p = store.insert('plans', { id: store.id('pl_'), ...b, features: b.features || [], isPlaceholder: false });
    app.audit(req, 'plan.create', 'plan', p.id); return created({ plan: p });
  });
  app.patch('/api/admin/plans/:id', { auth: A, summary: 'Edit a plan (existing subscriptions keep their paid terms)' }, req => {
    const p = store.get('plans', req.params.id); if (!p) throw new HttpError(404, 'not_found');
    Object.assign(p, validate(planSchema, req.body, { partial: true }), { isPlaceholder: false }); store.save(); app.audit(req, 'plan.update', 'plan', p.id); return { plan: p };
  });
  app.get('/api/admin/subscriptions', { auth: A, summary: 'All subscriptions' }, () => ({
    subscriptions: store.col('subscriptions').map(s => ({ ...s, orgName: (store.get('orgs', s.orgId) || {}).name, planName: (store.get('plans', s.planId) || {}).name })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));

  // ---------- Transactions, refunds, invoices
  app.get('/api/admin/transactions', { auth: A, summary: 'Transaction history (?type,orgId,from,to)' }, req => {
    const q = req.query;
    const list = store.filter('transactions', t => (!q.type || t.type === q.type) && (!q.orgId || t.orgId === q.orgId) && (!q.from || t.ts.slice(0, 10) >= q.from) && (!q.to || t.ts.slice(0, 10) <= q.to));
    return { transactions: list.map(t => ({ ...t, orgName: (store.get('orgs', t.orgId) || {}).name })).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 500) };
  });
  app.get('/api/admin/orders', { auth: A, summary: 'All card orders (?status=)' }, req => ({
    orders: store.filter('orders', o => !req.query.status || o.status === req.query.status).map(o => ({ ...o, patientName: (store.get('users', o.userId) || {}).name })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500),
  }));
  app.post('/api/admin/orders/:id/refund', { auth: A, summary: 'Approve or deny a refund (sandbox)' }, async req => {
    const o = store.get('orders', req.params.id); if (!o) throw new HttpError(404, 'not_found');
    const b = validate({ decision: v.enum(['approve', 'deny'], { required: true }), note: v.str({ max: 300, default: '' }) }, req.body);
    if (!['refund_requested', 'paid_sandbox'].includes(o.status)) throw new HttpError(409, 'not_refundable');
    if (b.decision === 'deny' && o.status !== 'refund_requested') throw new HttpError(409, 'nothing_to_deny');
    const now = new Date().toISOString(); o.refund = { ...(o.refund || {}), decision: b.decision, note: b.note, decidedAt: now, decidedBy: req.user.id };
    if (b.decision === 'deny') { if (o.status !== 'refund_requested') throw new HttpError(409, 'nothing_to_deny'); o.status = 'paid_sandbox'; store.save(); app.audit(req, 'order.refund_denied', 'order', o.id); return { order: o }; }
    const r = await getProvider('sandbox').refund({ amountCents: o.priceCents, providerRef: o.providerRef });
    o.status = 'refunded';
    D.recordTx(store, { type: 'card_refund', orgId: o.hospitalId, userId: o.userId, refType: 'order', refId: o.id, grossCents: -o.priceCents, platformCents: -o.commissionCents, providerRef: r.providerRef, note: o.code + ' refund' });
    const credit = D.issueDoc(store, 'credit', { userId: o.userId, orgId: o.hospitalId, refType: 'order', refId: o.id, lines: [{ desc: 'Refund ' + o.code, amountCents: -o.priceCents }] });
    o.creditNoteId = credit.id; store.save(); app.audit(req, 'order.refund_approved', 'order', o.id); return { order: o, creditNote: credit };
  });
  app.get('/api/admin/invoices', { auth: A, summary: 'All receipts, invoices, statements' }, () => ({ invoices: [...store.col('invoices')].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 500) }));
  app.post('/api/admin/statements', { auth: A, summary: 'Generate a monthly settlement statement for an organisation (?month=YYYY-MM in body)' }, req => {
    const b = validate({ orgId: v.str({ required: true, max: 60 }), month: v.str({ required: true, min: 7, max: 7 }) }, req.body);
    if (!/^\d{4}-\d{2}$/.test(b.month)) throw new HttpError(400, 'validation_failed', { month: 'invalid' });
    const o = store.get('orgs', b.orgId); if (!o) throw new HttpError(404, 'not_found');
    const tx = store.filter('transactions', t => t.orgId === o.id && t.ts.startsWith(b.month) && ['card_sale', 'card_refund', 'appointment_fee', 'lab_commission'].includes(t.type));
    const sum = (types, f) => tx.filter(t => types.includes(t.type)).reduce((a, t) => a + t[f], 0);
    const lines = [
      { desc: `Gross card sales ${b.month}`, amountCents: sum(['card_sale'], 'grossCents') },
      { desc: 'Refunds', amountCents: sum(['card_refund'], 'grossCents') },
      { desc: 'Platform commission on cards', amountCents: -sum(['card_sale', 'card_refund'], 'platformCents') },
      { desc: 'Appointment / lab fees', amountCents: -sum(['appointment_fee', 'lab_commission'], 'platformCents') },
    ];
    const d = D.issueDoc(store, 'statement', { orgId: o.id, refType: 'month', refId: b.month, lines });
    app.audit(req, 'statement.create', 'invoice', d.id); return created({ statement: d, note: 'Net payable to organisation = total (sandbox: no real transfer is made)' });
  });
  const exp = (name, head, rows) => csv(name, [head, ...rows]);
  app.get('/api/admin/export/transactions.csv', { auth: A, summary: 'CSV export of transactions' }, () => exp('transactions.csv', ['id', 'date', 'type', 'status', 'org', 'gross', 'platform_revenue', 'currency', 'provider', 'sandbox', 'note'], store.col('transactions').map(t => [t.id, t.ts, t.type, t.status, (store.get('orgs', t.orgId) || {}).name || '', (t.grossCents / 100).toFixed(2), (t.platformCents / 100).toFixed(2), t.currency, t.provider, t.sandbox, t.note])));
  app.get('/api/admin/export/orders.csv', { auth: A, summary: 'CSV export of card orders (no patient identity)' }, () => exp('orders.csv', ['code', 'date', 'hospital', 'card', 'price', 'commission', 'status'], store.col('orders').map(o => [o.code, o.createdAt, o.cardSnapshot.hospitalName, o.cardSnapshot.name, (o.priceCents / 100).toFixed(2), (o.commissionCents / 100).toFixed(2), o.status])));
  app.get('/api/admin/export/invoices.csv', { auth: A, summary: 'CSV export of invoices and receipts' }, () => exp('invoices.csv', ['number', 'kind', 'date', 'org', 'total', 'currency'], store.col('invoices').map(d => [d.number, d.kind, d.ts, (store.get('orgs', d.orgId) || {}).name || '', (d.totalCents / 100).toFixed(2), d.currency])));
  app.get('/api/admin/export/revenue.csv', { auth: A, summary: 'CSV export of the revenue report (?period=month|year)' }, req => {
    const r = revenue(req.query.period === 'year' ? 'year' : 'month', req.query.year);
    return exp('revenue.csv', ['period', 'card_gross', 'card_commission', 'subscriptions', 'appointment_fees', 'lab_commission', 'sponsored', 'total_platform'], r.rows.map(x => [x.period, ...['cardGrossCents', 'cardCommission', 'subscriptions', 'appointmentFees', 'labCommission', 'sponsored', 'totalPlatformCents'].map(k => (x[k] / 100).toFixed(2))]));
  });

  // ---------- Complaints & disputes
  app.get('/api/admin/complaints', { auth: A, summary: 'All complaints / disputes' }, () => ({
    complaints: [...store.col('complaints')].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(c => ({ ...c, orgName: c.orgId ? (store.get('orgs', c.orgId) || {}).name : null, patientName: (store.get('users', c.userId) || {}).name })),
  }));
  app.patch('/api/admin/complaints/:id', { auth: A, summary: 'Respond / change complaint status' }, req => {
    const c = store.get('complaints', req.params.id); if (!c) throw new HttpError(404, 'not_found');
    const b = validate({ status: v.enum(['open', 'in_review', 'resolved', 'rejected']), text: v.str({ max: 1000 }) }, req.body, { partial: true });
    if (b.text) c.responses.push({ ts: new Date().toISOString(), by: 'admin', text: b.text }); if (b.status) c.status = b.status; c.updatedAt = new Date().toISOString(); store.save();
    app.audit(req, 'complaint.admin_update', 'complaint', c.id, { status: c.status }); return { complaint: c };
  });

  // ---------- Sponsored listings (always labelled; never medical advice)
  app.get('/api/admin/sponsored', { auth: A, summary: 'All sponsored listings' }, () => ({ listings: store.col('sponsored').map(s => ({ ...s, orgName: (store.get('orgs', s.orgId) || {}).name })) }));
  app.post('/api/admin/sponsored', { auth: A, summary: 'Create a sponsored listing and bill it (sandbox)' }, req => {
    const b = validate({ orgId: v.str({ required: true, max: 60 }), headline: v.str({ min: 3, max: 80, required: true }), text: v.str({ max: 200, default: '' }), feeCents: v.int({ min: 0, max: 100000000, required: true }), months: v.int({ min: 1, max: 12, required: true }) }, req.body);
    const o = store.get('orgs', b.orgId); if (!o || o.status !== 'verified') throw new HttpError(400, 'validation_failed', { orgId: 'must_be_verified' });
    const now = new Date().toISOString();
    const s = store.insert('sponsored', { id: store.id('sp_'), orgId: o.id, headline: b.headline, text: b.text, feeCents: b.feeCents, startsAt: now, endsAt: addMonths(now, b.months), active: true, createdAt: now });
    D.recordTx(store, { type: 'sponsored', orgId: o.id, refType: 'sponsored', refId: s.id, grossCents: b.feeCents, platformCents: b.feeCents, note: 'Sponsored: ' + b.headline });
    D.issueDoc(store, 'invoice', { orgId: o.id, refType: 'sponsored', refId: s.id, lines: [{ desc: `Sponsored listing (${b.months} mo): ${b.headline}`, amountCents: b.feeCents }] });
    app.audit(req, 'sponsored.create', 'sponsored', s.id); return created({ listing: s });
  });
  app.patch('/api/admin/sponsored/:id', { auth: A, summary: 'Activate / deactivate a sponsored listing' }, req => {
    const s = store.get('sponsored', req.params.id); if (!s) throw new HttpError(404, 'not_found');
    Object.assign(s, validate({ active: v.bool({ required: true }) }, req.body)); store.save(); app.audit(req, 'sponsored.update', 'sponsored', s.id); return { listing: s };
  });

  // ---------- Audit log & backups
  app.get('/api/admin/audit', { auth: A, summary: 'Audit log (?action=&limit=)' }, req => {
    const lim = Math.min(Number(req.query.limit) || 200, 1000); const act = req.query.action;
    const list = store.filter('audit', a => !act || a.action.startsWith(act)).slice(-lim).reverse().map(a => ({ ...a, actorName: a.actorId ? (store.get('users', a.actorId) || {}).name : null }));
    return { audit: list };
  });
  app.get('/api/admin/backups', { auth: A, summary: 'List database backups' }, () => ({ backups: store.listBackups(), independentBackupConfigured: false, storage: store.backend || 'json' }));
  app.post('/api/admin/backups', { auth: A, summary: 'Create a database backup now' }, req => {
    if (store.backend === 'supabase-postgres') throw new HttpError(503, 'offsite_backup_not_configured');
    const name = store.backup(); app.audit(req, 'backup.create', 'backup', name); return created({ backup: name });
  });
};
