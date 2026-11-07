// Schematic live map for the DEMO (no external tiles, no third-party requests).
// Draws incident pins, response units and their routes from real lat/lng, on a generated street grid.
// It is not a street map: the background is decorative.
import { h, t } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 600, H = 380;
const svg = (tag, attrs = {}, ...kids) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  for (const k of kids) if (k) e.append(k);
  return e;
};
const fx = n => Math.round(n * 10) / 10;

// Deterministic pseudo random so the street grid does not jump between refreshes.
function rng(seed) { let s = Math.floor(seed * 1e5) % 2147483647 || 1; return () => (s = (s * 48271) % 2147483647) / 2147483647; }

function makeProjection(points) {
  const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2, cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const kx = Math.cos(cLat * Math.PI / 180);
  let spanX = Math.max((Math.max(...lngs) - Math.min(...lngs)) * kx, 0.012), spanY = Math.max(Math.max(...lats) - Math.min(...lats), 0.012);
  if (spanX / spanY > W / H) spanY = spanX * H / W; else spanX = spanY * W / H;
  spanX *= 1.45; spanY *= 1.45;
  return { x: lng => W / 2 + (lng - cLng) * kx / spanX * W, y: lat => H / 2 - (lat - cLat) / spanY * H, kmPerPx: spanX * 111.32 / W, cLat, cLng };
}

function streets(seed) {
  const r = rng(seed); const g = svg('g', { class: 'map-streets' });
  const angle = (r() * 30 - 15) * Math.PI / 180;
  const add = (a, spacing, cls) => {
    const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    for (let o = -700; o < 700; o += spacing * (0.7 + r() * 0.7)) {
      const x = W / 2 + nx * o, y = H / 2 + ny * o;
      g.append(svg('line', { x1: fx(x - dx * 900), y1: fx(y - dy * 900), x2: fx(x + dx * 900), y2: fx(y + dy * 900), class: cls }));
    }
  };
  add(angle, 46, 'map-street'); add(angle + Math.PI / 2 + (r() * 0.2 - 0.1), 58, 'map-street'); add(angle + 0.5, 190, 'map-avenue');
  return g;
}

const star = (cx, cy, R) => {
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.42 : R; pts.push(fx(cx + rr * Math.cos(a)) + ',' + fx(cy + rr * Math.sin(a))); }
  return svg('polygon', { points: pts.join(' '), class: 'u-glyph' });
};
function glyph(type, cx, cy) {
  if (type === 'police') return star(cx, cy, 6.5);
  if (type === 'fire') return svg('path', { d: `M${cx} ${cy - 7}c1 3 4.5 4.6 4.5 8.2a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2.2-4 0 1.8.8 2 1.3 2 0-2.6-1-3.6 1-6.2z`, class: 'u-glyph' });
  return svg('path', { d: `M${cx - 2} ${cy - 6.5}h4v4.5h4.5v4h-4.5v4.5h-4v-4.5h-4.5v-4h4.5z`, class: 'u-glyph' });
}

// entries: [{ type, incident:{lat,lng}, unit?:{lat,lng}, station?:{lat,lng}, done? }]
export function liveMap(entries, { label } = {}) {
  const list = (entries || []).filter(e => e && e.incident);
  const wrap = h('div', { class: 'livemap' });
  if (!list.length) { wrap.append(h('div', { class: 'map-empty' }, t('No location was shared for this request.'))); return wrap; }
  const pts = []; list.forEach(e => { pts.push(e.incident); if (e.unit) pts.push(e.unit); if (e.station) pts.push(e.station); });
  const p = makeProjection(pts);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'map', role: 'img', 'aria-label': label || t('Live map (demo)'), preserveAspectRatio: 'xMidYMid slice' });
  root.append(svg('rect', { width: W, height: H, class: 'map-bg' }), streets(p.cLat + p.cLng));
  const px = o => [fx(p.x(o.lng)), fx(p.y(o.lat))];
  for (const e of list) {
    const [ix, iy] = px(e.incident);
    if (e.station) { const [sx, sy] = px(e.station); root.append(svg('line', { x1: sx, y1: sy, x2: ix, y2: iy, class: 'map-route u-' + e.type })); if (e.unit) { const [ux, uy] = px(e.unit); root.append(svg('line', { x1: sx, y1: sy, x2: ux, y2: uy, class: 'map-trail u-' + e.type })); } }
  }
  for (const e of list) if (e.station) { const [sx, sy] = px(e.station); root.append(svg('rect', { x: sx - 6, y: sy - 6, width: 12, height: 12, rx: 3, class: 'map-station u-' + e.type })); }
  for (const e of list) {
    const [ix, iy] = px(e.incident);
    root.append(svg('g', { class: 'map-incident' + (e.done ? ' done' : '') }, svg('circle', { cx: ix, cy: iy, r: 9, class: 'pulse' }), svg('circle', { cx: ix, cy: iy, r: 7, class: 'dot' }), svg('circle', { cx: ix, cy: iy, r: 2.6, class: 'core' })));
  }
  for (const e of list) if (e.unit) {
    const [ux, uy] = px(e.unit);
    root.append(svg('g', { class: 'map-unit u-' + e.type }, svg('circle', { cx: ux, cy: uy, r: 13, class: 'u-body' }), glyph(e.type, ux, uy)));
  }
  // compass and scale
  const nice = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]; const km = nice.find(n => n / p.kmPerPx >= 70) || 1000; const len = km / p.kmPerPx;
  const n = svg('text', { x: W - 24, y: 30, class: 'map-text', 'text-anchor': 'middle' }); n.textContent = 'N';
  root.append(svg('g', {}, svg('path', { d: `M${W - 24} 36l6 14h-12z`, class: 'map-n' }), n));
  const sc = svg('text', { x: 20 + len / 2, y: H - 22, class: 'map-text', 'text-anchor': 'middle' }); sc.textContent = km < 1 ? km * 1000 + ' m' : km + ' km';
  root.append(svg('g', {}, svg('line', { x1: 20, y1: H - 14, x2: 20 + len, y2: H - 14, class: 'map-scale' }), sc));
  wrap.append(root);
  wrap.append(h('div', { class: 'map-cap' }, t('Schematic demo map. Positions are simulated.')));
  return wrap;
}

export const osmLink = loc => loc ? `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}` : null;
export const TYPE_ICON = { ambulance: 'ambulance', police: 'police', fire: 'fire' };
