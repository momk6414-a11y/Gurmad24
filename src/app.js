'use strict';
// HTTP application: router, security middleware, sessions, static files.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { HttpError } = require('./validate');
const { sha, RateLimiter } = require('./security');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};
const SESSION_COOKIE = 'g24s';
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

class App {
  constructor(ctx) {
    this.ctx = ctx; // {store, config}
    this.routes = [];
    this.limiter = new RateLimiter();
  }

  // opts.auth: false = public, true = any logged-in user, [roles] = restricted
  route(method, pattern, opts, handler) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    this.routes.push({ method, pattern, re, keys, auth: opts.auth === undefined ? false : opts.auth, summary: opts.summary || '', handler });
  }
  get(p, o, h) { this.route('GET', p, o, h); }
  post(p, o, h) { this.route('POST', p, o, h); }
  patch(p, o, h) { this.route('PATCH', p, o, h); }
  put(p, o, h) { this.route('PUT', p, o, h); }
  del(p, o, h) { this.route('DELETE', p, o, h); }

  // ---- audit log
  audit(req, action, entity, entityId, meta) {
    const { store } = this.ctx;
    store.insert('audit', { id: store.id('a_'), ts: new Date().toISOString(), actorId: req.user ? req.user.id : null, actorRole: req.user ? req.user.role : null, action, entity, entityId: entityId || null, ip: req.ip, meta: meta || null });
  }

  // Security event (failed logins, lockouts, blocked requests...) -> audit log, shown on the admin Security page.
  secEvent(req, type, meta) { this.audit(req, 'security.' + type, 'security', null, meta); }

  clientIp(req) {
    if (this.ctx.config.trustProxy) { const f = req.headers['x-forwarded-for']; if (f) return String(f).split(',')[0].trim(); }
    return req.socket.remoteAddress || 'unknown';
  }

  loadUser(req) {
    const { store } = this.ctx;
    const m = /(?:^|;\s*)g24s=([^;]+)/.exec(req.headers.cookie || '');
    if (!m) return null;
    const h = sha(decodeURIComponent(m[1]));
    const s = store.find('sessions', x => x.hash === h);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) { store.remove('sessions', s.id); return null; }
    const u = store.get('users', s.userId);
    if (!u || !u.active || u.deletedAt) return null;
    req.session = s;
    return u;
  }

  setSessionCookie(res, sid, clear) {
    const c = this.ctx.config;
    const parts = [`${SESSION_COOKIE}=${clear ? '' : encodeURIComponent(sid)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', clear ? 'Max-Age=0' : `Max-Age=${SESSION_TTL_MS / 1000}`];
    if (c.cookieSecure) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  json(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
  }
  text(res, status, body, type, extra = {}) {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
    res.end(body);
  }

  readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0, over = false; const chunks = [];
      req.on('data', c => {
        size += c.length;
        if (size > 1048576) return req.destroy(); // abusive stream: cut the connection
        if (over) return;
        if (size > 262144) { over = true; chunks.length = 0; } else chunks.push(c);
      });
      req.on('end', () => {
        if (over) return reject(new HttpError(413, 'payload_too_large'));
        if (!chunks.length) return resolve({});
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (_) { reject(new HttpError(400, 'invalid_json')); }
      });
      req.on('error', reject);
    });
  }

  securityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(self), payment=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://server.arcgisonline.com https://tile.openstreetmap.org; media-src 'self' blob:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (this.ctx.config.cookieSecure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  async handleApi(req, res, url) {
    const route = this.routes.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!route) {
      if (this.routes.some(r => r.re.test(url.pathname))) throw new HttpError(405, 'method_not_allowed');
      throw new HttpError(404, 'not_found');
    }
    req.user = this.loadUser(req);
    if (route.auth) {
      if (!req.user) throw new HttpError(401, 'auth_required');
      if (Array.isArray(route.auth) && !route.auth.includes(req.user.role)) { this.secEvent(req, 'forbidden', { path: url.pathname }); throw new HttpError(403, 'forbidden'); }
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      // CSRF defence: same-origin only (+ SameSite=Lax cookie, JSON-only bodies)
      const origin = req.headers.origin;
      if (origin) { try { if (new URL(origin).host !== req.headers.host) throw 0; } catch (_) { this.secEvent(req, 'bad_origin', { origin: String(origin).slice(0, 80) }); throw new HttpError(403, 'bad_origin'); } }
      const ct = req.headers['content-type'] || '';
      if (req.headers['content-length'] && Number(req.headers['content-length']) > 0 && !ct.includes('application/json')) throw new HttpError(415, 'json_required');
    }
    const m = route.re.exec(url.pathname);
    req.params = {}; route.keys.forEach((k, i) => { req.params[k] = decodeURIComponent(m[i + 1]); });
    req.query = Object.fromEntries(url.searchParams);
    req.body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? await this.readBody(req) : {};
    const out = await route.handler(req, res, this);
    if (res.writableEnded) return;
    if (out && out.__raw) return this.text(res, out.status || 200, out.body, out.type, out.headers);
    if (out && out.__status) return this.json(res, out.__status, out.body);
    this.json(res, 200, out === undefined ? { ok: true } : out);
  }

  serveStatic(req, res, url) {
    const root = this.ctx.config.publicDir;
    let p; try { p = decodeURIComponent(url.pathname); } catch (_) { return this.text(res, 400, 'Bad request', 'text/plain'); }
    if (p === '/' || !path.extname(p)) p = '/index.html';
    const file = path.resolve(root, '.' + p);
    if (file !== root && !file.startsWith(root + path.sep)) return this.text(res, 403, 'Forbidden', 'text/plain');
    fs.readFile(file, (err, data) => {
      if (err) return this.text(res, 404, 'Not found', 'text/plain');
      const ext = path.extname(file);
      // App code and artwork always revalidate (ETag), so a deploy shows up on the next load.
      // Binary images keep a short cache.
      const revalidate = ['.html', '.js', '.css', '.svg', '.webmanifest'].includes(ext);
      const etag = '"' + require('crypto').createHash('sha1').update(data).digest('hex').slice(0, 20) + '"';
      if (revalidate && req.headers['if-none-match'] === etag) {
        res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' });
        return res.end();
      }
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': revalidate ? 'no-cache' : 'public, max-age=3600' };
      if (revalidate) headers.ETag = etag;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  }

  handler() {
    return async (req, res) => {
      this.securityHeaders(res);
      req.ip = this.clientIp(req);
      try {
        const url = new URL(req.url, 'http://localhost');
        const lim = this.ctx.config.rateLimit;
        if (!this.limiter.check('g:' + req.ip, lim.globalPerMin)) { if (this.limiter.check('gev:' + req.ip, 1, 60000)) this.secEvent(req, 'rate_limited', { path: url.pathname }); throw new HttpError(429, 'rate_limited'); }
        if (url.pathname.startsWith('/api/')) return await this.handleApi(req, res, url);
        if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'method_not_allowed');
        this.serveStatic(req, res, url);
      } catch (e) {
        if (res.headersSent) return res.end();
        if (e instanceof HttpError) return this.json(res, e.status, { error: e.code, fields: e.fields });
        if (e && e.status) return this.json(res, e.status, { error: e.message });
        console.error('[error]', req.method, req.url, e);
        this.json(res, 500, { error: 'server_error' });
      }
    };
  }

  listen(port, host = '0.0.0.0') {
    this.server = http.createServer(this.handler());
    return new Promise(r => this.server.listen(port, host, () => r(this.server)));
  }
  close() { return new Promise(r => this.server ? this.server.close(r) : r()); }
}

const created = body => ({ __status: 201, body });
const csv = (name, rows) => {
  const esc = x => { let s = x === null || x === undefined ? '' : String(x); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const body = rows.map(r => r.map(esc).join(',')).join('\r\n');
  return { __raw: true, type: 'text/csv; charset=utf-8', body, headers: { 'Content-Disposition': `attachment; filename="${name}"` } };
};

module.exports = { App, created, csv, SESSION_TTL_MS };
