'use strict';
// Travel pilot: flight-ticket and visa REQUESTS. Nothing is issued, booked or charged here.
// A person submits a request; an administrator reviews it and records the outcome (quote / decline).
// Real ticketing needs a licensed travel agent or airline API, and visas are decided by the destination
// government, so both stay outside this system. Passport numbers are deliberately NOT collected.
const { v, validate, HttpError } = require('../validate');
const { created } = require('../app');
const directory = require('../travel-directory');

const KINDS = ['ticket', 'visa'];
const CABINS = ['economy', 'premium', 'business'];
const VISA_TYPES = ['tourist', 'medical', 'business', 'study', 'transit'];
const ACTIVE = ['requested', 'reviewing'];
// admin transitions
const NEXT = { requested: ['reviewing', 'declined'], reviewing: ['quoted', 'declined'], quoted: ['completed', 'declined'] };

module.exports = function (app) {
  const { store } = app.ctx;
  const today = () => new Date().toISOString().slice(0, 10);
  const mine = (id, userId) => { const r = store.get('travel', id); if (!r || r.userId !== userId) throw new HttpError(404, 'not_found'); return r; };

  app.get('/api/travel/config', { summary: 'Travel pilot options (public). Requests only; nothing is issued or charged.' }, () => ({
    kinds: KINDS, cabins: CABINS, visaTypes: VISA_TYPES, pilot: true, message: 'DEMO_TRAVEL_REQUEST_ONLY',
  }));

  app.get('/api/travel/agencies', { summary: 'Public listings of travel agencies serving Galkacyo (not verified by GURMAD 24; call to confirm)' }, () => ({
    agencies: directory.list(), retrievedAt: directory.RETRIEVED, notice: 'PUBLIC_LISTINGS_NOT_VERIFIED',
  }));

  app.post('/api/travel', { auth: ['patient'], summary: 'Submit a flight-ticket or visa request (pilot: request only, no booking, no payment)' }, req => {
    const kind = validate({ kind: v.enum(KINDS, { required: true }) }, req.body).kind;
    const common = { contactPhone: v.str({ max: 30, default: '' }), note: v.str({ max: 200, default: '' }), consent: v.bool({ required: true }) };
    let b, detail;
    if (kind === 'ticket') {
      b = validate({
        ...common, fromCity: v.str({ min: 2, max: 60, required: true }), toCity: v.str({ min: 2, max: 60, required: true }),
        departDate: v.date({ required: true }), returnDate: v.date(), passengers: v.int({ min: 1, max: 9, default: 1 }), cabin: v.enum(CABINS, { default: 'economy' }),
      }, req.body);
      if (b.departDate < today()) throw new HttpError(400, 'validation_failed', { departDate: 'in_past' });
      if (b.returnDate && b.returnDate < b.departDate) throw new HttpError(400, 'validation_failed', { returnDate: 'before_departure' });
      if (b.fromCity.toLowerCase() === b.toCity.toLowerCase()) throw new HttpError(400, 'validation_failed', { toCity: 'same_as_origin' });
      detail = { fromCity: b.fromCity, toCity: b.toCity, departDate: b.departDate, returnDate: b.returnDate || null, passengers: b.passengers, cabin: b.cabin };
    } else {
      b = validate({
        ...common, country: v.str({ min: 2, max: 60, required: true }), visaType: v.enum(VISA_TYPES, { required: true }),
        travelDate: v.date({ required: true }), travelers: v.int({ min: 1, max: 9, default: 1 }),
      }, req.body);
      if (b.travelDate < today()) throw new HttpError(400, 'validation_failed', { travelDate: 'in_past' });
      detail = { country: b.country, visaType: b.visaType, travelDate: b.travelDate, travelers: b.travelers };
    }
    if (!b.consent) throw new HttpError(400, 'validation_failed', { consent: 'required' });
    const now = new Date().toISOString();
    const r = store.insert('travel', {
      id: store.id('tr_'), code: 'DEMO-TRV-' + String(store.next('travel')).padStart(6, '0'), userId: req.user.id, kind, ...detail,
      contactPhone: b.contactPhone, note: b.note, status: 'requested', adminNote: '', consentAt: now, createdAt: now, updatedAt: now,
    });
    app.audit(req, 'travel.request', 'travel', r.id, { kind });
    return created({ request: r, pilot: true, message: 'DEMO_TRAVEL_REQUEST_ONLY' });
  });

  app.get('/api/travel', { auth: ['patient'], summary: 'My travel requests' }, req => ({
    requests: store.filter('travel', r => r.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));

  app.post('/api/travel/:id/cancel', { auth: ['patient'], summary: 'Cancel my travel request (only while it is waiting or under review)' }, req => {
    const r = mine(req.params.id, req.user.id);
    if (!ACTIVE.includes(r.status)) throw new HttpError(409, 'not_cancellable');
    r.status = 'cancelled'; r.updatedAt = new Date().toISOString(); store.save();
    app.audit(req, 'travel.cancel', 'travel', r.id);
    return { request: r };
  });

  // ---------- Administrator review
  app.get('/api/admin/travel', { auth: ['admin'], summary: 'All travel requests (optional ?status= and ?kind=)' }, req => {
    const q = req.query || {};
    return {
      requests: store.filter('travel', r => (!q.status || r.status === q.status) && (!q.kind || r.kind === q.kind))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(r => { const u = store.get('users', r.userId); return { ...r, patientName: u ? u.name : '' }; }),
    };
  });

  app.patch('/api/admin/travel/:id', { auth: ['admin'], summary: 'Review a travel request: reviewing, quoted, completed or declined' }, req => {
    const r = store.get('travel', req.params.id); if (!r) throw new HttpError(404, 'not_found');
    const b = validate({ status: v.enum(['reviewing', 'quoted', 'completed', 'declined'], { required: true }), adminNote: v.str({ max: 300, default: '' }) }, req.body);
    if (!(NEXT[r.status] || []).includes(b.status)) throw new HttpError(409, 'invalid_transition');
    r.status = b.status; r.adminNote = b.adminNote; r.updatedAt = new Date().toISOString(); store.save();
    app.audit(req, 'travel.' + b.status, 'travel', r.id);
    return { request: r };
  });
};
