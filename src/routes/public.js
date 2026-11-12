'use strict';
const { v, validate, HttpError } = require('../validate');
const D = require('../domain');
const { created } = require('../app');

const R = require('../responders');
const AI = require('../assistant');
const { CASE_CATEGORIES, createCase } = R;

module.exports = function (app) {
  const { store, config } = app.ctx;

  app.get('/api/health', { summary: 'Service health and safety mode' }, () => ({
    ok: true, mode: 'PILOT', storage: store.backend === 'supabase-postgres' ? 'supabase-postgres' : (config.persistentStorage ? 'persistent-json' : 'ephemeral-json'), storagePersistent: store.backend === 'supabase-postgres' || config.persistentStorage, payments: 'sandbox-only', liveDispatch: false, gps: 'optional-demo-consent', schema: store.data.meta.version,
  }));

  app.get('/api/config', { summary: 'Public client configuration and safety notices' }, () => ({
    mode: 'PILOT', currency: D.settings(store).currency, languages: ['so', 'en'],
    caseCategories: CASE_CATEGORIES, areas: R.AREAS, responderTypes: R.RESPONDER_TYPES, liveDispatch: false, realMode: false, payments: 'sandbox',
    notices: { dispatch: 'simulation_only', location: 'demo_map_only', cards: 'not_insurance', data: 'no_real_patient_data' },
  }));

  app.get('/api/overview', { summary: 'Public live system overview: aggregate counts only, no personal data' }, () => {
    R.advanceAll(store);
    const cases = store.col('cases'); const today = new Date().toISOString().slice(0, 10);
    const ok = o => o.status === 'verified'; const orgs = store.col('orgs').filter(ok);
    const n = type => orgs.filter(o => o.type === type).length;
    const by = k => cases.reduce((m, c) => { const r = c.responder || R.responderFor(c.category); m[r] = (m[r] || 0) + (k(c) ? 1 : 0); return m; }, {});
    const done = cases.filter(c => c.history.some(x => x.status === 'handed_over'));
    const mins = done.map(c => (new Date(c.history.find(x => x.status === 'handed_over').ts) - new Date(c.createdAt)) / 60000);
    return {
      mode: 'PILOT', time: new Date().toISOString(),
      facilities: { hospital: n('hospital'), ambulance: n('ambulance'), police: n('police'), fire: n('fire'), lab: n('lab') },
      available: R.RESPONDER_TYPES.reduce((m, t) => { m[t] = orgs.filter(o => o.type === t && o.available).length; return m; }, {}),
      cases: { total: cases.length, today: cases.filter(c => c.createdAt.slice(0, 10) === today).length, active: cases.filter(c => !['closed', 'cancelled', 'handed_over'].includes(c.status)).length, activeByResponder: by(c => !['closed', 'cancelled', 'handed_over'].includes(c.status)), avgMinutesToHandover: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length * 10) / 10 : null },
      cards: store.col('cards').filter(c => c.status === 'published').length,
      orders: store.col('orders').length, appointments: store.col('appointments').length,
      areas: R.AREAS.map(a => ({ id: a.id, name: a.name, lat: a.lat, lng: a.lng, active: cases.filter(c => c.location && c.location.source === 'area' && Math.abs(c.location.lat - a.lat) < 1e-6 && Math.abs(c.location.lng - a.lng) < 1e-6 && !['closed', 'cancelled', 'handed_over'].includes(c.status)).length })),
    };
  });

  app.post('/api/assistant', { summary: 'Assistant: answers questions from live system data (Somali/English). Optional LLM when ANTHROPIC_API_KEY is set.' }, async req => {
    if (!app.limiter.check('ai:' + req.ip, 30)) throw new HttpError(429, 'rate_limited');
    const b = validate({ message: v.str({ max: 500, required: true }), lang: v.str({ max: 2, default: 'so' }) }, req.body);
    const out = AI.answer(store, config, b.message, b.lang);
    if (config.anthropicKey) {
      try {
        const facts = out.items.map(i => `${i.name} (${i.area}) ${i.phone}`).join('\n') + '\nLocal answer: ' + out.reply;
        out.reply = await AI.llmAnswer(config, facts, b.message); out.smart = true;
      } catch (_) { /* keep local answer */ }
    }
    return out;
  });

  // ---- Digital card check: anyone who scans the QR code sees only whether the card is valid (no personal data beyond initials).
  app.get('/api/verify/:code', { summary: 'Check a digital health card code (valid / expired / refunded)' }, req => {
    if (!app.limiter.check('verify:' + req.ip, 40)) throw new HttpError(429, 'rate_limited');
    const code = String(req.params.code || '').toUpperCase();
    const o = /^G24-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) ? store.find('orders', x => x.cardCode === code) : null;
    if (!o) return { found: false };
    const u = store.get('users', o.userId);
    return { found: true, state: D.cardState(o), cardName: o.cardSnapshot.name, hospitalName: o.cardSnapshot.hospitalName, validUntil: o.validUntil, holder: D.initials(u && u.name), included: o.cardSnapshot.included, usedTimes: (o.redemptions || []).length, sandbox: true };
  });

  app.get('/api/hospitals', { summary: 'Verified hospital directory (?q=)' }, req => {
    const q = (req.query.q || '').toLowerCase();
    return { hospitals: store.filter('orgs', o => o.type === 'hospital' && o.status === 'verified' && (!q || (o.name + ' ' + o.area).toLowerCase().includes(q))).map(D.orgPublic) };
  });
  app.get('/api/hospitals/:id', { summary: 'Hospital detail with published cards and services' }, req => {
    const o = store.get('orgs', req.params.id);
    if (!o || o.type !== 'hospital' || o.status !== 'verified') throw new HttpError(404, 'not_found');
    return {
      hospital: D.orgPublic(o),
      cards: store.filter('cards', c => c.hospitalId === o.id && c.status === 'published').map(c => D.cardView(store, c, o)),
      services: store.filter('services', s => s.orgId === o.id && s.active).map(s => ({ id: s.id, name: s.name, priceCents: s.priceCents, note: s.note })),
    };
  });

  app.get('/api/providers', { summary: 'Verified ambulance / lab directory (?type=ambulance|lab)' }, req => {
    const t = req.query.type;
    return {
      providers: store.filter('orgs', o => o.type !== 'hospital' && o.status === 'verified' && (!t || o.type === t)).map(o => ({
        ...D.orgPublic(o), services: store.filter('services', s => s.orgId === o.id && s.active).map(s => ({ id: s.id, name: s.name, priceCents: s.priceCents, note: s.note })),
      })),
    };
  });

  app.get('/api/cards', { summary: 'Browse published health cards (?q,hospitalId,min,max,sort)' }, req => {
    const q = (req.query.q || '').toLowerCase();
    const min = req.query.min ? Math.round(Number(req.query.min) * 100) : 0;
    const max = req.query.max ? Math.round(Number(req.query.max) * 100) : Infinity;
    let list = store.filter('cards', c => c.status === 'published').map(c => ({ c, o: store.get('orgs', c.hospitalId) }))
      .filter(({ c, o }) => o && o.status === 'verified' && (!req.query.hospitalId || c.hospitalId === req.query.hospitalId)
        && c.priceCents >= min && c.priceCents <= max && (!q || (c.name + ' ' + o.name).toLowerCase().includes(q)));
    const sort = req.query.sort || 'newest';
    list.sort((a, b) => sort === 'price_asc' ? a.c.priceCents - b.c.priceCents : sort === 'price_desc' ? b.c.priceCents - a.c.priceCents : String(b.c.updatedAt).localeCompare(a.c.updatedAt));
    return { cards: list.map(({ c, o }) => D.cardView(store, c, o)) };
  });
  app.get('/api/cards/compare', { summary: 'Compare 2-3 cards (?ids=a,b,c)' }, req => {
    const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 3);
    if (ids.length < 2) throw new HttpError(400, 'need_two_cards');
    const cards = ids.map(id => store.get('cards', id)).filter(c => c && c.status === 'published').map(c => D.cardView(store, c));
    return { cards };
  });
  app.get('/api/cards/:id', { summary: 'Health card detail' }, req => {
    const c = store.get('cards', req.params.id);
    const o = c && store.get('orgs', c.hospitalId);
    if (!c || c.status !== 'published' || !o || o.status !== 'verified') throw new HttpError(404, 'not_found');
    return { card: D.cardView(store, c, o) };
  });

  app.get('/api/sponsored', { summary: 'Active sponsored listings (always labelled as advertising)' }, () => {
    const now = Date.now();
    return {
      label: 'SPONSORED',
      listings: store.filter('sponsored', s => s.active && new Date(s.endsAt).getTime() > now).map(s => {
        const o = store.get('orgs', s.orgId);
        return { id: s.id, headline: s.headline, text: s.text, org: o ? { id: o.id, name: o.name, type: o.type } : null };
      }),
    };
  });

  // Simulation only: records a request; nothing is dispatched and no real service is contacted.
  // Location (optional, with consent) is only used to draw the demo map.
  const caseSchema = { category: v.enum(CASE_CATEGORIES, { required: true }), area: v.str({ max: 60, default: '' }), note: v.str({ max: 200, default: '' }), areaId: v.str({ max: 20 }), consent: v.bool() };
  const num = (x, name, lo, hi) => {
    const n = Number(x);
    if (!Number.isFinite(n) || n < lo || n > hi) throw new HttpError(400, 'validation_failed', { [name]: 'invalid_number' });
    return n;
  };
  app.post('/api/emergency/simulate', { summary: 'Create a SIMULATED emergency request (no real dispatch). Optional location with consent.' }, req => {
    if (!app.limiter.check('sim:' + req.ip, 10)) throw new HttpError(429, 'rate_limited');
    const b = validate(caseSchema, req.body);
    let location = null;
    const raw = req.body || {};
    if (raw.lat !== undefined && raw.lat !== null && raw.lat !== '') {
      if (!b.consent) throw new HttpError(400, 'validation_failed', { consent: 'required' });
      location = { lat: round4(num(raw.lat, 'lat', -90, 90)), lng: round4(num(raw.lng, 'lng', -180, 180)), source: 'gps' };
      if (raw.accuracy !== undefined && raw.accuracy !== null && raw.accuracy !== '') location.accuracyM = Math.round(num(raw.accuracy, 'accuracy', 0, 100000));
    } else if (b.areaId) {
      const a = R.AREAS.find(x => x.id === b.areaId);
      if (!a) throw new HttpError(400, 'validation_failed', { areaId: 'invalid_choice' });
      location = { lat: a.lat, lng: a.lng, source: 'area' }; if (!b.area) b.area = a.name;
    }
    let voice = null;
    if (raw.voice) {
      const vo = raw.voice;
      if (typeof vo.data !== 'string' || vo.data.length > 210000 || !/^[A-Za-z0-9+/=]+$/.test(vo.data) || !/^audio\/(webm|ogg|mp4|mpeg|aac|x-m4a)(;.*)?$/.test(String(vo.mime || ''))) throw new HttpError(400, 'validation_failed', { voice: 'invalid_audio' });
      voice = { mime: String(vo.mime).split(';')[0], data: vo.data, at: new Date().toISOString() };
    }
    const user = app.loadUser(req);
    const real = false; // Institutional pilot: never create a live-dispatch request.
    const c = createCase(store, { category: b.category, area: b.area, note: b.note, location, source: 'public', createdBy: user ? user.id : null, autopilot: !real && config.demoMode !== false, mode: 'SIMULATION' });
    if (voice) { c.voice = voice; for (const old of store.col('cases').filter(x => x.voice).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1).slice(60)) delete old.voice; store.save(); }
    return created({ case: { code: c.code, status: c.status, mode: c.mode, responder: c.responder, trackToken: c.trackToken }, notice: real ? 'REAL_REQUEST_QUEUED_FOR_OPERATORS' : 'SIMULATION_ONLY_NO_REAL_HELP_SENT' });
  });
  app.get('/api/emergency/track/:code', { summary: 'Live (simulated) status of a test request. Needs the token returned at creation.' }, req => {
    const c = store.find('cases', x => x.code === req.params.code);
    const token = String(req.query.token || '');
    if (!c || !c.trackToken || token.length !== c.trackToken.length || !require('crypto').timingSafeEqual(Buffer.from(token), Buffer.from(c.trackToken))) throw new HttpError(404, 'not_found');
    R.advance(store, c);
    return { track: R.trackView(store, c) };
  });
};

const round4 = x => Math.round(x * 1e4) / 1e4;
module.exports.createCase = createCase;
module.exports.CASE_CATEGORIES = CASE_CATEGORIES;
