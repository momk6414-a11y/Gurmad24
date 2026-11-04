'use strict';
// Emergency coordination dashboard (SIMULATION MODE ONLY). No dispatch, no calls, no GPS, no diagnosis.
const { v, validate, HttpError } = require('../validate');
const D = require('../domain');
const { created } = require('../app');
const { createCase, CASE_CATEGORIES } = require('./public');

const OPS = ['operator', 'admin'];

module.exports = function (app) {
  const { store } = app.ctx;
  const view = c => ({ ...c, assignedOrgName: c.assignedOrgId ? (store.get('orgs', c.assignedOrgId) || {}).name : null, next: D.CASE_FLOW[c.status] });

  app.get('/api/ops/cases', { auth: OPS, summary: 'Case list (?status=)' }, req => ({
    cases: store.filter('cases', c => !req.query.status || c.status === req.query.status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500).map(view),
  }));
  app.post('/api/ops/cases', { auth: OPS, summary: 'Record a simulated emergency request' }, req => {
    const b = validate({ category: v.enum(CASE_CATEGORIES, { required: true }), area: v.str({ max: 60, default: '' }), note: v.str({ max: 200, default: '' }) }, req.body);
    const c = createCase(store, { ...b, source: 'operator', createdBy: req.user.id });
    app.audit(req, 'case.create', 'case', c.id); return created({ case: view(c) });
  });
  app.get('/api/ops/cases/:id', { auth: OPS, summary: 'Case detail with history' }, req => {
    const c = store.get('cases', req.params.id); if (!c) throw new HttpError(404, 'not_found'); return { case: view(c) };
  });
  app.patch('/api/ops/cases/:id', { auth: OPS, summary: 'Change status / assign provider (validated state machine)' }, req => {
    const c = store.get('cases', req.params.id); if (!c) throw new HttpError(404, 'not_found');
    const b = validate({ status: v.enum(Object.keys(D.CASE_FLOW)), assignedOrgId: v.str({ max: 60 }), note: v.str({ max: 200, default: '' }) }, req.body, { partial: true });
    const now = new Date().toISOString();
    if (b.assignedOrgId !== undefined) {
      const o = store.get('orgs', b.assignedOrgId);
      if (!o || o.type !== 'ambulance' || o.status !== 'verified') throw new HttpError(400, 'validation_failed', { assignedOrgId: 'invalid_provider' });
      if (!['received', 'assigned'].includes(c.status)) throw new HttpError(409, 'invalid_transition');
      c.assignedOrgId = o.id; if (c.status === 'received') { c.status = 'assigned'; } c.history.push({ ts: now, status: 'assigned', by: req.user.id, note: 'Assigned to ' + o.name });
    }
    if (b.status && b.status !== c.status) {
      if (!D.CASE_FLOW[c.status].includes(b.status)) throw new HttpError(409, 'invalid_transition');
      if (b.status === 'assigned' && !c.assignedOrgId) throw new HttpError(409, 'provider_required');
      if (b.status === 'received') c.assignedOrgId = null;
      c.status = b.status; c.history.push({ ts: now, status: b.status, by: req.user.id, note: b.note || '' });
    }
    c.updatedAt = now; store.save(); app.audit(req, 'case.update', 'case', c.id, { status: c.status, assignedOrgId: c.assignedOrgId });
    return { case: view(c) };
  });
  app.get('/api/ops/providers', { auth: OPS, summary: 'Verified ambulance providers for assignment' }, () => ({
    providers: store.filter('orgs', o => o.type === 'ambulance' && o.status === 'verified').map(o => ({ id: o.id, name: o.name, area: o.area, phone: o.phone, available: !!o.available })),
  }));
  app.get('/api/ops/stats', { auth: OPS, summary: 'Operational statistics' }, () => {
    const cases = store.col('cases'); const by = (key) => cases.reduce((m, c) => { m[c[key]] = (m[c[key]] || 0) + 1; return m; }, {});
    const done = cases.filter(c => c.history.some(h => h.status === 'handed_over'));
    const mins = done.map(c => (new Date(c.history.find(h => h.status === 'handed_over').ts) - new Date(c.createdAt)) / 60000);
    const today = new Date().toISOString().slice(0, 10);
    return {
      mode: 'SIMULATION', total: cases.length, today: cases.filter(c => c.createdAt.slice(0, 10) === today).length, byStatus: by('status'), byCategory: by('category'),
      avgMinutesToHandover: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length * 10) / 10 : null,
      providersAvailable: store.filter('orgs', o => o.type === 'ambulance' && o.status === 'verified' && o.available).length,
      providersTotal: store.filter('orgs', o => o.type === 'ambulance' && o.status === 'verified').length,
    };
  });
  app.get('/api/ops/directory', { auth: OPS, summary: 'Hospital directory for coordination' }, () => ({
    hospitals: store.filter('orgs', o => o.type === 'hospital' && o.status === 'verified').map(D.orgPublic),
  }));
};
