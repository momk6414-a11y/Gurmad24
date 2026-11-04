'use strict';
const { v, validate, HttpError } = require('../validate');
const D = require('../domain');
const { created } = require('../app');

const CASE_CATEGORIES = ['general', 'transport', 'accident', 'maternal', 'other'];

module.exports = function (app) {
  const { store, config } = app.ctx;

  app.get('/api/health', { summary: 'Service health and safety mode' }, () => ({
    ok: true, mode: config.demoMode ? 'DEMO_SANDBOX' : 'PILOT', storage: 'persistent-json', payments: 'sandbox-only', liveDispatch: false, gps: false, schema: store.data.meta.version,
  }));

  app.get('/api/config', { summary: 'Public client configuration and safety notices' }, () => ({
    mode: config.demoMode ? 'DEMO_SANDBOX' : 'PILOT', currency: D.settings(store).currency, languages: ['so', 'en'],
    caseCategories: CASE_CATEGORIES, liveDispatch: false, payments: 'sandbox',
    notices: { dispatch: 'simulation_only', cards: 'not_insurance', data: 'no_real_patient_data' },
  }));

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

  // Simulation only: records a request; nothing is dispatched, no one is called, no GPS.
  const caseSchema = { category: v.enum(CASE_CATEGORIES, { required: true }), area: v.str({ max: 60, default: '' }), note: v.str({ max: 200, default: '' }) };
  app.post('/api/emergency/simulate', { summary: 'Create a SIMULATED emergency request (no real dispatch)' }, req => {
    if (!app.limiter.check('sim:' + req.ip, 10)) throw new HttpError(429, 'rate_limited');
    const b = validate(caseSchema, req.body);
    const user = app.loadUser(req);
    const c = createCase(store, { ...b, source: 'public', createdBy: user ? user.id : null });
    return created({ case: { code: c.code, status: c.status, mode: 'SIMULATION' }, notice: 'SIMULATION_ONLY_NO_REAL_HELP_SENT' });
  });
};

function createCase(store, f) {
  const now = new Date().toISOString();
  const c = {
    id: store.id('c_'), code: 'SIM-' + String(store.next('case')).padStart(6, '0'), mode: 'SIMULATION', category: f.category, area: f.area || '', note: f.note || '',
    status: 'received', assignedOrgId: null, source: f.source, createdBy: f.createdBy || null, createdAt: now, updatedAt: now,
    history: [{ ts: now, status: 'received', by: f.createdBy || 'public', note: '' }],
  };
  store.insert('cases', c); return c;
}
module.exports.createCase = createCase;
module.exports.CASE_CATEGORIES = CASE_CATEGORIES;
