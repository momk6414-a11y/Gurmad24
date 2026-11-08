'use strict';
const { v, validate, HttpError } = require('../validate');
const S = require('../security');
const D = require('../domain');
const { created, SESSION_TTL_MS } = require('../app');

const ORG_ROLE = { hospital: 'hospital_admin', ambulance: 'provider_admin', lab: 'provider_admin' };

module.exports = function (app) {
  const { store } = app.ctx;

  function startSession(req, res, user) {
    const sid = S.newSessionId();
    store.insert('sessions', { id: store.id('s_'), hash: S.sha(sid), userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(), ip: req.ip });
    app.setSessionCookie(res, sid);
  }
  function createUser(f) {
    const now = new Date().toISOString();
    const pw = S.passwordProblem(f.password);
    if (pw) throw new (require('../validate').HttpError)(400, 'validation_failed', { password: pw });
    if (store.find('users', u => u.email === f.email)) throw new HttpError(409, 'email_taken');
    return store.insert('users', { id: store.id('u_'), name: f.name, email: f.email, passwordHash: S.hashPassword(f.password), role: f.role, orgId: f.orgId || null, lang: f.lang || 'so', active: true, createdAt: now, consentAt: now, deletedAt: null });
  }
  app.createUser = createUser;

  const base = { name: v.str({ min: 2, max: 80, required: true }), email: v.email({ required: true }), password: v.str({ min: 1, max: 128, required: true }), lang: v.enum(['so', 'en'], { default: 'so' }), consent: v.bool({ required: true }) };

  app.post('/api/auth/register', { summary: 'Register a patient/public account (consent required)' }, (req, res) => {
    if (!app.limiter.check('auth:' + req.ip, app.ctx.config.rateLimit.authPerMin)) throw new HttpError(429, 'rate_limited');
    const b = validate(base, req.body);
    if (!b.consent) throw new HttpError(400, 'validation_failed', { consent: 'required' });
    const u = createUser({ ...b, role: 'patient' });
    app.audit({ ...req, user: u }, 'user.register', 'user', u.id);
    startSession(req, res, u);
    return created({ user: D.userView(u) });
  });

  app.post('/api/auth/register-org', { summary: 'Register a hospital / ambulance / lab (starts in PENDING verification)' }, (req, res) => {
    if (!app.limiter.check('auth:' + req.ip, app.ctx.config.rateLimit.authPerMin)) throw new HttpError(429, 'rate_limited');
    const b = validate({
      ...base, orgType: v.enum(['hospital', 'ambulance', 'lab', 'police', 'fire'], { required: true }), orgName: v.str({ min: 2, max: 100, required: true }),
      area: v.str({ max: 60, default: '' }), phone: v.str({ max: 30, default: '' }), description: v.str({ max: 500, default: '' }),
    }, req.body);
    if (!b.consent) throw new HttpError(400, 'validation_failed', { consent: 'required' });
    if (store.find('users', u => u.email === b.email)) throw new HttpError(409, 'email_taken');
    const pw = S.passwordProblem(b.password); if (pw) throw new HttpError(400, 'validation_failed', { password: pw });
    const now = new Date().toISOString();
    const org = store.insert('orgs', { id: store.id('o_'), type: b.orgType, name: b.orgName, area: b.area, phone: b.phone, description: b.description, address: '', publicEmail: '', hours: '', serviceAreas: [], available: false, status: 'pending', statusNote: '', contract: { cardCommissionBps: null, labCommissionBps: null, appointmentFeeCents: null }, createdAt: now });
    const u = createUser({ name: b.name, email: b.email, password: b.password, lang: b.lang, role: ORG_ROLE[b.orgType], orgId: org.id });
    app.audit({ ...req, user: u }, 'org.register', 'org', org.id, { type: org.type });
    startSession(req, res, u);
    return created({ user: D.userView(u), org: D.orgPrivate(org) });
  });

  app.post('/api/auth/login', { summary: 'Log in (sets httpOnly session cookie). Locks after 5 failures / 15 min' }, (req, res) => {
    if (!app.limiter.check('auth:' + req.ip, app.ctx.config.rateLimit.authPerMin)) throw new HttpError(429, 'rate_limited');
    const b = validate({ email: v.email({ required: true }), password: v.str({ min: 1, max: 128, required: true }) }, req.body);
    const key = 'fail:' + b.email;
    const fails = (app.failures = app.failures || new Map());
    const rec = fails.get(key) || { n: 0, t: Date.now() };
    if (Date.now() - rec.t > 15 * 60000) { rec.n = 0; rec.t = Date.now(); }
    if (rec.n >= 5) throw new HttpError(429, 'too_many_attempts');
    const u = store.find('users', x => x.email === b.email);
    // Always perform a real scrypt verification, even when the email is unknown.
    const passwordOk = S.verifyPassword(b.password, u ? u.passwordHash : S.DUMMY_PASSWORD_HASH);
    const ok = Boolean(u && passwordOk);
    if (!ok || !u.active || u.deletedAt) {
      rec.n++; fails.set(key, rec);
      app.audit(req, 'auth.login_failed', 'user', u ? u.id : null);
      throw new HttpError(401, 'invalid_credentials');
    }
    fails.delete(key);
    startSession(req, res, u);
    app.audit({ ...req, user: u }, 'auth.login', 'user', u.id);
    return { user: D.userView(u) };
  });

  app.post('/api/auth/logout', { auth: true, summary: 'Log out (destroys session)' }, (req, res) => {
    store.remove('sessions', req.session.id); app.setSessionCookie(res, '', true);
    app.audit(req, 'auth.logout', 'user', req.user.id);
    return { ok: true };
  });

  app.get('/api/auth/me', { summary: 'Current user (null if not logged in)' }, req => {
    const u = app.loadUser(req);
    if (!u) return { user: null };
    return { user: D.userView(u), org: u.orgId ? D.orgPrivate(store.get('orgs', u.orgId)) : null };
  });

  app.post('/api/auth/change-password', { auth: true, summary: 'Change own password (logs out other sessions)' }, req => {
    const b = validate({ current: v.str({ min: 1, max: 128, required: true }), next: v.str({ min: 1, max: 128, required: true }) }, req.body);
    if (!S.verifyPassword(b.current, req.user.passwordHash)) throw new HttpError(401, 'invalid_credentials');
    const pw = S.passwordProblem(b.next); if (pw) throw new HttpError(400, 'validation_failed', { next: pw });
    req.user.passwordHash = S.hashPassword(b.next);
    for (const s of store.filter('sessions', x => x.userId === req.user.id && x.id !== req.session.id)) store.remove('sessions', s.id);
    store.save(); app.audit(req, 'auth.password_changed', 'user', req.user.id);
    return { ok: true };
  });

  app.patch('/api/auth/profile', { auth: true, summary: 'Update own name / language' }, req => {
    const b = validate({ name: v.str({ min: 2, max: 80 }), lang: v.enum(['so', 'en']) }, req.body, { partial: true });
    Object.assign(req.user, b); store.save(); app.audit(req, 'user.profile_updated', 'user', req.user.id);
    return { user: D.userView(req.user) };
  });

  // Privacy: data export and account deletion (anonymisation; financial records are kept without personal data)
  app.get('/api/auth/export', { auth: true, summary: 'Download all personal data held about me (privacy right)' }, req => {
    const id = req.user.id;
    return {
      exportedAt: new Date().toISOString(), user: D.userView(req.user), consentAt: req.user.consentAt,
      orders: store.filter('orders', o => o.userId === id), appointments: store.filter('appointments', a => a.userId === id), complaints: store.filter('complaints', c => c.userId === id),
    };
  });
  app.post('/api/auth/delete-account', { auth: true, summary: 'Delete my account (anonymises personal data)' }, (req, res) => {
    const b = validate({ password: v.str({ min: 1, max: 128, required: true }) }, req.body);
    if (!S.verifyPassword(b.password, req.user.passwordHash)) throw new HttpError(401, 'invalid_credentials');
    if (req.user.role === 'admin' && store.filter('users', u => u.role === 'admin' && u.active).length <= 1) throw new HttpError(409, 'last_admin');
    const u = req.user;
    app.audit(req, 'user.deleted', 'user', u.id);
    u.name = 'Deleted user'; u.email = `deleted-${u.id}@invalid.local`; u.active = false; u.deletedAt = new Date().toISOString(); u.passwordHash = '';
    for (const a of store.filter('appointments', x => x.userId === u.id)) { a.contactPhone = ''; a.note = ''; }
    for (const s of store.filter('sessions', x => x.userId === u.id)) store.remove('sessions', s.id);
    store.save(); app.setSessionCookie(res, '', true);
    return { ok: true };
  });
};
