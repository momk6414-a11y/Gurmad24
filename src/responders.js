'use strict';
// Emergency responders (ambulance, police, fire) and the DEMO autopilot.
// Everything here is a SIMULATION: nobody real is contacted or dispatched.
// Responder movement is computed lazily from timestamps, so it survives restarts and needs no timers.
const crypto = require('crypto');

const RESPONDER_TYPES = ['ambulance', 'police', 'fire'];
const CASE_CATEGORIES = ['general', 'transport', 'accident', 'maternal', 'other', 'fire', 'rescue', 'crime', 'disturbance'];
const CATEGORY_RESPONDER = { fire: 'fire', rescue: 'fire', crime: 'police', disturbance: 'police' };
const responderFor = category => CATEGORY_RESPONDER[category] || 'ambulance';

// Approximate city centre (demo). Area presets let people without GPS still place a test request.
const CENTER = { lat: 6.7697, lng: 47.4308 };
const r4 = x => Math.round(x * 1e4) / 1e4;
const AREAS = [
  { id: 'center', name: 'City centre', lat: CENTER.lat, lng: CENTER.lng },
  { id: 'north', name: 'North', lat: r4(CENTER.lat + 0.022), lng: CENTER.lng },
  { id: 'south', name: 'South', lat: r4(CENTER.lat - 0.022), lng: CENTER.lng },
  { id: 'east', name: 'East', lat: CENTER.lat, lng: r4(CENTER.lng + 0.024) },
  { id: 'west', name: 'West', lat: CENTER.lat, lng: r4(CENTER.lng - 0.024) },
];
// Demo station positions relative to the centre.
const STATION_OFFSETS = { ambulance: [[0.012, -0.010], [-0.015, 0.014]], police: [[0.008, 0.016]], fire: [[-0.010, -0.016]] };

// Demo timeline in seconds since the request was created (real travel time is compressed).
const T = { ASSIGN: 4, ENROUTE: 10, MIN_TRAVEL: 20, MAX_TRAVEL: 60, KMH: 40, COMPRESS: 30, SCENE: 15, CLOSE: 8 };

const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const toRad = d => d * Math.PI / 180;
function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const hashStr = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// Where a demo unit starts. Far from the incident (e.g. the tester is in another city) the unit is
// placed a few km away, so the demo works anywhere. This is flagged to the UI as "demoPlaced".
function unitStart(org, loc) {
  if (org.lat != null && org.lng != null && haversineKm(org, loc) <= 30) return { lat: org.lat, lng: org.lng, demoPlaced: false };
  const dirs = [[0.014, 0.010], [-0.012, 0.013], [0.010, -0.015], [-0.013, -0.011]];
  const d = dirs[hashStr(org.id) % dirs.length];
  return { lat: round(loc.lat + d[0], 5), lng: round(loc.lng + d[1], 5), demoPlaced: true };
}

function pickUnit(store, c) {
  const type = c.responder || responderFor(c.category);
  const list = store.filter('orgs', o => o.type === type && o.status === 'verified');
  const pool = list.filter(o => o.available).length ? list.filter(o => o.available) : list;
  if (!pool.length) return null;
  if (!c.location) return pool[0];
  return pool.map(o => ({ o, d: haversineKm(unitStart(o, c.location), c.location) })).sort((a, b) => a.d - b.d)[0].o;
}

function createCase(store, f) {
  const now = new Date().toISOString();
  const responder = responderFor(f.category);
  const c = {
    id: store.id('c_'), code: 'SIM-' + String(store.next('case')).padStart(6, '0'), mode: 'SIMULATION', category: f.category, responder,
    area: f.area || '', note: f.note || '', location: f.location || null,
    status: 'received', assignedOrgId: null, source: f.source, createdBy: f.createdBy || null, createdAt: now, updatedAt: now,
    autopilot: !!f.autopilot, trackToken: f.autopilot ? crypto.randomBytes(9).toString('base64url') : null, sim: null,
    history: [{ ts: now, status: 'received', by: f.createdBy || 'public', note: '' }],
  };
  store.insert('cases', c); return c;
}

const ORDER = ['received', 'assigned', 'en_route', 'arrived', 'handed_over', 'closed'];

// Move a demo case forward according to elapsed time. Returns true when something changed.
function advance(store, c, nowMs = Date.now()) {
  if (!c.autopilot || c.status === 'closed' || c.status === 'cancelled') return false;
  const t0 = Date.parse(c.createdAt); const el = (nowMs - t0) / 1000;
  let changed = false;
  const step = (status, atSec, note) => {
    c.status = status; c.updatedAt = new Date(t0 + atSec * 1000).toISOString();
    c.history.push({ ts: c.updatedAt, status, by: 'demo-autopilot', note: note || '' }); changed = true;
  };
  if (c.status === 'received' && el >= T.ASSIGN) {
    const org = pickUnit(store, c);
    if (!org) {
      if (!c.history.some(h => h.note === 'No unit listed')) { c.history.push({ ts: new Date().toISOString(), status: 'received', by: 'demo-autopilot', note: 'No unit listed' }); changed = true; }
    } else {
      c.assignedOrgId = org.id;
      const start = c.location ? unitStart(org, c.location) : null;
      const distKm = start ? haversineKm(start, c.location) : 3;
      const travelSec = Math.min(T.MAX_TRAVEL, Math.max(T.MIN_TRAVEL, Math.round(distKm / T.KMH * 3600 / T.COMPRESS)));
      c.sim = { start: start ? { lat: start.lat, lng: start.lng } : null, demoPlaced: start ? start.demoPlaced : false, distKm: round(distKm, 2), travelSec };
      step('assigned', T.ASSIGN, 'Assigned to ' + org.name);
    }
  }
  if (c.sim) {
    const arriveAt = T.ENROUTE + c.sim.travelSec;
    const plan = [['en_route', T.ENROUTE], ['arrived', arriveAt], ['handed_over', arriveAt + T.SCENE], ['closed', arriveAt + T.SCENE + T.CLOSE]];
    for (const [status, at] of plan) if (ORDER.indexOf(c.status) < ORDER.indexOf(status) && el >= at) step(status, at);
  }
  if (changed) store.save();
  return changed;
}
function advanceAll(store) { for (const c of store.filter('cases', x => x.autopilot && !['closed', 'cancelled'].includes(x.status))) advance(store, c); }

// Public tracking view: what the person who made the request may see.
function trackView(store, c, nowMs = Date.now()) {
  const org = c.assignedOrgId ? store.get('orgs', c.assignedOrgId) : null;
  let unit = null; let etaMinutes = null;
  if (c.sim && c.sim.start && c.location) {
    const enrouteTs = (c.history.find(h => h.status === 'en_route') || {}).ts;
    let f = 0;
    if (['arrived', 'handed_over', 'closed'].includes(c.status)) f = 1;
    else if (c.status === 'en_route' && enrouteTs) f = Math.min(1, Math.max(0, (nowMs - Date.parse(enrouteTs)) / 1000 / c.sim.travelSec));
    unit = { lat: round(c.sim.start.lat + (c.location.lat - c.sim.start.lat) * f, 5), lng: round(c.sim.start.lng + (c.location.lng - c.sim.start.lng) * f, 5), progress: round(f, 3), demoPlaced: c.sim.demoPlaced };
    if (c.status === 'en_route') etaMinutes = Math.max(1, Math.round(c.sim.distKm * (1 - f) / T.KMH * 60));
  }
  return {
    code: c.code, mode: 'SIMULATION', category: c.category, responder: c.responder || responderFor(c.category), status: c.status,
    area: c.area, location: c.location, createdAt: c.createdAt, updatedAt: c.updatedAt,
    unit, station: c.sim && c.sim.start ? { lat: c.sim.start.lat, lng: c.sim.start.lng } : null, etaMinutes,
    responderOrg: org ? { name: org.name, type: org.type, phone: org.phone || '' } : null,
    history: c.history.map(h => ({ ts: h.ts, status: h.status, note: h.note })),
  };
}

module.exports = { RESPONDER_TYPES, CASE_CATEGORIES, AREAS, STATION_OFFSETS, CENTER, responderFor, createCase, advance, advanceAll, trackView, haversineKm, unitStart };
