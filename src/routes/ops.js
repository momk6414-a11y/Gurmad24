'use strict';
// Emergency coordination dashboard (SIMULATION MODE ONLY). No real dispatch, no calls, no diagnosis.
// Location is optional demo data (given with consent) used only to draw the demo map.
const { v, validate, HttpError } = require('../validate');
const D = require('../domain');
const { created } = require('../app');
const R = require('../responders');
const { createCase, CASE_CATEGORIES } = require('./public');

const OPS = ['operator', 'admin'];

module.exports = function (app) {
  const { store } = app.ctx;
  const view = c => {
    const { trackToken, sim, voice, ...rest } = c;
    const org = c.assignedOrgId ? store.get('orgs', c.assignedOrgId) : null;
    return { ...rest, hasVoice: !!voice, responder: c.responder || R.responderFor(c.category), assignedOrgName: org ? org.name : null, assignedOrgType: org ? org.type : null, next: D.CASE_FLOW[c.status], track: R.trackView(store, c) };
  };

  app.get('/api/ops/cases', { auth: OPS, summary: 'Case list (?status=&responder=)' }, req => (R.advanceAll(store), {
    cases: store.filter('cases', c => (!req.query.status || c.status === req.query.status) && (!req.query.responder || (c.responder || R.responderFor(c.category)) === req.query.responder)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500).map(view),
  }));
  app.post('/api/ops/cases', { auth: OPS, summary: 'Record a simulated emergency request' }, req => {
    const b = validate({ category: v.enum(CASE_CATEGORIES, { required: true }), area: v.str({ max: 60, default: '' }), note: v.str({ max: 200, default: '' }), areaId: v.str({ max: 20 }) }, req.body);
    const a = b.areaId ? R.AREAS.find(x => x.id === b.areaId) : null;
    if (b.areaId && !a) throw new HttpError(400, 'validation_failed', { areaId: 'invalid_choice' });
    const c = createCase(store, { category: b.category, area: b.area || (a ? a.name : ''), note: b.note, location: a ? { lat: a.lat, lng: a.lng, source: 'area' } : null, source: 'operator', createdBy: req.user.id });
    app.audit(req, 'case.create', 'case', c.id); return created({ case: view(c) });
  });
  app.get('/api/ops/cases/:id', { auth: OPS, summary: 'Case detail with history' }, req => {
    const c = store.get('cases', req.params.id); if (!c) throw new HttpError(404, 'not_found'); R.advance(store, c); return { case: view(c) };
  });
  app.get('/api/ops/cases/:id/voice', { auth: OPS, summary: 'Voice note attached to a test request (operators only)' }, req => {
    const c = store.get('cases', req.params.id); if (!c || !c.voice) throw new HttpError(404, 'not_found');
    app.audit(req, 'case.voice.listen', 'case', c.id); return { mime: c.voice.mime, data: c.voice.data };
  });
  app.patch('/api/ops/cases/:id', { auth: OPS, summary: 'Change status / assign provider (validated state machine)' }, req => {
    const c = store.get('cases', req.params.id); if (!c) throw new HttpError(404, 'not_found');
    const b = validate({ status: v.enum(Object.keys(D.CASE_FLOW)), assignedOrgId: v.str({ max: 60 }), note: v.str({ max: 200, default: '' }) }, req.body, { partial: true });
    const now = new Date().toISOString();
    if (b.assignedOrgId !== undefined) {
      const o = store.get('orgs', b.assignedOrgId);
      if (!o || !R.RESPONDER_TYPES.includes(o.type) || o.status !== 'verified') throw new HttpError(400, 'validation_failed', { assignedOrgId: 'invalid_provider' });
      if (!['received', 'assigned'].includes(c.status)) throw new HttpError(409, 'invalid_transition');
      c.assignedOrgId = o.id; c.sim = null; if (c.status === 'received') { c.status = 'assigned'; } c.history.push({ ts: now, status: 'assigned', by: req.user.id, note: 'Assigned to ' + o.name });
    }
    if (b.status && b.status !== c.status) {
      if (!D.CASE_FLOW[c.status].includes(b.status)) throw new HttpError(409, 'invalid_transition');
      if (b.status === 'assigned' && !c.assignedOrgId) throw new HttpError(409, 'provider_required');
      if (b.status === 'received') c.assignedOrgId = null;
      c.status = b.status; c.history.push({ ts: now, status: b.status, by: req.user.id, note: b.note || '' });
    }
    c.autopilot = false; // a human took over: stop the demo autopilot
    c.updatedAt = now; store.save(); app.audit(req, 'case.update', 'case', c.id, { status: c.status, assignedOrgId: c.assignedOrgId });
    return { case: view(c) };
  });
  app.get('/api/ops/providers', { auth: OPS, summary: 'Verified responders (ambulance, police, fire) for assignment (?type=)' }, req => ({
    providers: store.filter('orgs', o => R.RESPONDER_TYPES.includes(o.type) && o.status === 'verified' && (!req.query.type || o.type === req.query.type)).map(o => ({ id: o.id, type: o.type, name: o.name, area: o.area, phone: o.phone, available: !!o.available, lat: o.lat ?? null, lng: o.lng ?? null })),
  }));
  app.get('/api/ops/stats', { auth: OPS, summary: 'Operational statistics' }, () => {
    R.advanceAll(store);
    const cases = store.col('cases'); const by = (key) => cases.reduce((m, c) => { m[c[key]] = (m[c[key]] || 0) + 1; return m; }, {});
    const done = cases.filter(c => c.history.some(h => h.status === 'handed_over'));
    const mins = done.map(c => (new Date(c.history.find(h => h.status === 'handed_over').ts) - new Date(c.createdAt)) / 60000);
    const today = new Date().toISOString().slice(0, 10);
    return {
      mode: 'SIMULATION', total: cases.length, today: cases.filter(c => c.createdAt.slice(0, 10) === today).length, byStatus: by('status'), byCategory: by('category'),
      byResponder: cases.reduce((m, c) => { const k = c.responder || R.responderFor(c.category); m[k] = (m[k] || 0) + 1; return m; }, {}),
      active: cases.filter(c => !['closed', 'cancelled', 'handed_over'].includes(c.status)).length,
      avgMinutesToHandover: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length * 10) / 10 : null,
      providersAvailable: store.filter('orgs', o => R.RESPONDER_TYPES.includes(o.type) && o.status === 'verified' && o.available).length,
      providersTotal: store.filter('orgs', o => R.RESPONDER_TYPES.includes(o.type) && o.status === 'verified').length,
    };
  });
  app.get('/api/ops/directory', { auth: OPS, summary: 'Hospital directory for coordination' }, () => ({
    hospitals: store.filter('orgs', o => o.type === 'hospital' && o.status === 'verified').map(D.orgPublic),
  }));
};
