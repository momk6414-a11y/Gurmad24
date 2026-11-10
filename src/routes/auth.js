'use strict';
const { v, validate, HttpError } = require('../validate');
const S = require('../security');
const D = require('../domain');
const { created, SESSION_TTL_MS } = require('../app');

const ORG_ROLE = { hospital: 'hospital_admin', ambulance: 'provider_admin', lab: 'provider_admin', police: 'provider_admin', fire: 'provider_admin' };

module.exports = function (app) {
  const { store } = app.ctx;

  function startSession(req, res, user) {
    const sid = S.newSessionId();
    store.insert('sessions', { id: store.id('s_'), hash: S.sha(sid), userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(), ip: req.ip });
    app.setSessionCookie(res, sid);
  }
  function createUser(f) {
    const now = new Date().toISOString();
    const pw = S.passwordProblem(f.password, f.strictEmail ? f.email : null);
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
    const u = createUser({ ...b, role: 'patient', strictEmail: true });
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
    const u = createUser({ name: b.name, email: b.email, password: b.password, lang: b.lang, role: ORG_ROLE[b.orgType], orgId: org.id, strictEmail: true });
    app.audit({ ...req, user: u }, 'org.register', 'org', org.id, { type: org.type });
    startSession(req, res, u);
    return created({ user: D.userView(u), org: D.orgPrivate(org) });
  });

  app.post('/api/auth/login', { summary: 'Log in (sets httpOnly session cookie). Locks after 5 failures / 15 min' }, (req, res) => {
    if (!app.limiter.check('auth:' + req.ip, app.ctx.config.rateLimit.authPerMin)) throw new HttpError(429, 'rate_limited');
    const b = validate({ email: v.email({ required: true }), password: v.str({ min: 1, max: 128, required: true }), code: v.str({ max: 12, default: '' }) }, req.body);
    const ipKey = 'ipfail:' + req.ip; const ipRec = (app.ipFailures = app.ipFailures || new Map()).get(ipKey) || { n: 0, t: Date.now() };
    if (Date.now() - ipRec.t > 15 * 60000) { ipRec.n = 0; ipRec.t = Date.now(); }
    if (ipRec.n >= 25) { app.secEvent(req, 'ip_blocked', {}); throw new HttpError(429, 'too_many_attempts'); }
    const key = 'fail:' + b.email;
    const fails = (app.failures = app.failures || new Map());
    const rec = fails.get(key) || { n: 0, t: Date.now() };
    if (Date.now() - rec.t > 15 * 60000) { rec.n = 0; rec.t = Date.now(); }
    if (rec.n >= 5) { if (rec.n === 5) { rec.n++; fails.set(key, rec); app.secEvent(req, 'account_locked', { email: b.email }); } throw new HttpError(429, 'too_many_attempts'); }
    const u = store.find('users', x => x.email === b.email);
    // Always perform a real scrypt verification, even when the email is unknown.
    const passwordOk = S.verifyPassword(b.password, u ? u.passwordHash : S.DUMMY_PASSWORD_HASH);
    const ok = Boolean(u && passwordOk);
    if (!ok || !u.active || u.deletedAt) {
      rec.n++; fails.set(key, rec); ipRec.n++; app.ipFailures.set(ipKey, ipRec);
      app.secEvent(req, 'login_failed', { userId: u ? u.id : null });
      app.audit(req, 'auth.login_failed', 'user', u ? u.id : null);
      throw new HttpError(401, 'invalid_credentials');
    }
    if (u.totp && u.totp.enabled) {
      if (!b.code) throw new HttpError(401, 'two_factor_required');
      const st = S.totpCheck(u.totp.secret, b.code, u.totp.lastStep || 0);
      if (!st) { rec.n++; fails.set(key, rec); ipRec.n++; app.ipFailures.set(ipKey, ipRec); app.secEvent(req, 'bad_2fa_code', { userId: u.id }); throw new HttpError(401, 'invalid_code'); }
      u.totp.lastStep = st; store.save();
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
    const pw = S.passwordProblem(b.next, req.user.email); if (pw) throw new HttpError(400, 'validation_failed', { next: pw });
    req.user.passwordHash = S.hashPassword(b.next);
    for (const s of store.filter('sessions', x => x.userId === req.user.id && x.id !== req.session.id)) store.remove('sessions', s.id);
    store.save(); app.audit(req, 'auth.password_changed', 'user', req.user.id);
    return { ok: true };
  });

  // ---- Two-step login (authenticator app). Optional for everyone, recommended for staff and admins.
  app.post('/api/auth/2fa/setup', { auth: true, summary: 'Start authenticator setup: returns a secret to add to an authenticator app. Repeating it returns the same pending secret unless reset=true' }, req => {
    if (req.user.totp && req.user.totp.enabled) throw new HttpError(409, 'already_enabled');
    const reset = !!(req.body && req.body.reset);
    if (!req.user.totp || reset) { req.user.totp = { secret: S.newTotpSecret(), enabled: false, lastStep: 0 }; store.save(); }
    const secret = req.user.totp.secret;
    return { secret, serverTime: new Date().toISOString(), uri: `otpauth://totp/GURMAD%2024:${encodeURIComponent(req.user.email)}?secret=${secret}&issuer=GURMAD%2024&algorithm=SHA1&digits=6&period=30` };
  });
  app.post('/api/auth/2fa/enable', { auth: true, summary: 'Confirm authenticator setup with a 6-digit code' }, req => {
    const b = validate({ code: v.str({ max: 12, required: true }) }, req.body);
    if (!req.user.totp || req.user.totp.enabled) throw new HttpError(409, 'not_in_setup');
    const st = S.totpCheck(req.user.totp.secret, b.code); if (!st) throw new HttpError(400, 'invalid_code');
    req.user.totp.enabled = true; req.user.totp.lastStep = st; store.save(); app.secEvent(req, '2fa_enabled', {}); return { ok: true };
  });
  app.post('/api/auth/2fa/disable', { auth: true, summary: 'Turn off two-step login (needs password and a current code)' }, req => {
    const b = validate({ password: v.str({ min: 1, max: 128, required: true }), code: v.str({ max: 12, required: true }) }, req.body);
    if (!req.user.totp || !req.user.totp.enabled) throw new HttpError(409, 'not_enabled');
    if (!S.verifyPassword(b.password, req.user.passwordHash)) throw new HttpError(401, 'invalid_credentials');
    if (!S.totpCheck(req.user.totp.secret, b.code, req.user.totp.lastStep || 0)) throw new HttpError(400, 'invalid_code');
    req.user.totp = null; store.save(); app.secEvent(req, '2fa_disabled', {}); return { ok: true };
  });

  // ---- My sessions (devices)
  app.get('/api/auth/sessions', { auth: true, summary: 'My active sessions' }, req => ({
    sessions: store.filter('sessions', x => x.userId === req.user.id).map(x => ({ id: x.id, createdAt: x.createdAt, expiresAt: x.expiresAt, ip: x.ip ? x.ip.replace(/(\d+)\.(\d+)\.\d+\.\d+/, '$1.$2.x.x') : '', current: x.id === req.session.id })),
  }));
  app.post('/api/auth/sessions/revoke-others', { auth: true, summary: 'Sign out all my other devices' }, req => {
    let n = 0; for (const s of store.filter('sessions', x => x.userId === req.user.id && x.id !== req.session.id)) { store.remove('sessions', s.id); n++; }
    app.secEvent(req, 'sessions_revoked', { n }); return { revoked: n };
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
