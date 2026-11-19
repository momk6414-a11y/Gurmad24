// Real interactive map (slippy tiles, no library): satellite imagery (Esri) or street map (OpenStreetMap).
// Needs an internet connection for the map pictures. Markers, routes and the Puntland view are drawn by us.
// Tiles are plain <img> requests; the CSP allows only the two hosts below. Device location is opt-in and stays client-side.
import { h, t, icon } from './core.js';

const TILE = 256;
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const LAYERS = {
  hybrid: {
    label: 'Hybrid', max: 18,
    url: (z, x, y) => `${ESRI}/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    overlay: (z, x, y) => `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`,
    attr: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community', href: 'https://www.esri.com/',
  },
  satellite: {
    label: 'Satellite', max: 18,
    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    attr: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community', href: 'https://www.esri.com/',
  },
  street: {
    label: 'Street', max: 18,
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    attr: '© OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright',
  },
};
// Approximate positions (Garoowe is from Wikipedia, the others are rounded). Used for labels and quick zoom only.
export const PLACES = [
  { name: 'Garoowe', lat: 8.4059, lng: 48.4845 }, { name: 'Boosaaso', lat: 11.2842, lng: 49.1816 }, { name: 'Gaalkacyo', lat: 6.7697, lng: 47.4308 },
  { name: 'Qardho', lat: 9.5, lng: 49.0833 }, { name: 'Eyl', lat: 7.98, lng: 49.8164 },
];
// Frame that shows the whole of Puntland. No borders are drawn: the picture comes from the map provider.
export const PUNTLAND = [{ lat: 6.6, lng: 47.0 }, { lat: 12.1, lng: 51.6 }];
// Default frame for dispatch/operations maps: Gaalkacyo and its surroundings.
export const GAALKACYO = [{ lat: 6.735, lng: 47.385 }, { lat: 6.805, lng: 47.475 }];
const MIN_Z = 5;
// Public OSRM demo router: road geometry only. Cache requests so the 3–4s dashboard poll
// does not repeatedly ask the routing service for the same incident.
const ROAD_ROUTER = 'https://router.project-osrm.org/route/v1/driving/';
const roadRouteCache = new Map();
const roadRoutePending = new Map();
async function roadGeometry(from, to) {
  const key = [from.lat, from.lng, to.lat, to.lng].map(v => Number(v).toFixed(5)).join(',');
  if (roadRouteCache.has(key)) return roadRouteCache.get(key);
  if (roadRoutePending.has(key)) return roadRoutePending.get(key);
  const task = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const url = ROAD_ROUTER + from.lng + ',' + from.lat + ';' + to.lng + ',' + to.lat + '?overview=full&geometries=geojson&steps=false';
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Routing service unavailable');
      const data = await response.json();
      const coords = data && data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) throw new Error('No road route');
      const points = coords.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (points.length < 2) throw new Error('Invalid road geometry');
      const result = { points, road: true, distance: data.routes[0].distance, duration: data.routes[0].duration };
      roadRouteCache.set(key, result);
      return result;
    } catch (_) {
      const result = { points: [from, to], road: false };
      roadRouteCache.set(key, result);
      setTimeout(() => { if (roadRouteCache.get(key) === result) roadRouteCache.delete(key); }, 30000);
      return result;
    } finally { clearTimeout(timeout); roadRoutePending.delete(key); }
  })();
  roadRoutePending.set(key, task);
  return task;
}

const NS = 'http://www.w3.org/2000/svg';
const worldSize = z => TILE * 2 ** z;
const clampLat = lat => Math.max(-85.05, Math.min(85.05, lat));
const lng2x = (lng, z) => (lng + 180) / 360 * worldSize(z);
const lat2y = (lat, z) => { const s = Math.sin(clampLat(lat) * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize(z); };
const x2lng = (x, z) => x / worldSize(z) * 360 - 180;
const y2lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / worldSize(z); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };

export const osmLink = loc => loc ? `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}` : null;

// entries: [{ type, incident:{lat,lng}, unit?, station?, done? }]
// opts: { layer, places, markers:[{kind:'station'|'hospital', type, lat, lng, label}], view:'points'|'puntland', height }
export function liveMap(entries, opts = {}) {
  let layer = LAYERS[opts.layer] ? opts.layer : 'hybrid';
  const view = { lat: opts.center?.lat ?? 8.4, lng: opts.center?.lng ?? 49.3, z: opts.center?.z ?? 6 };
  const mode = opts.view === 'puntland' ? 'puntland' : 'points';
  let items = []; let current = entries || []; let userMoved = false; let raf = 0; let loaded = 0; let userLocation = null; let locStatusTimer = 0; let routeMotion = []; let routeTrails = [];
  const tiles = new Map();

  const tilePane = h('div', { class: 'tm-tiles' });
  const overlayPane = h('div', { class: 'tm-tiles tm-overlay' }); const overlayTiles = new Map();
  const scale = h('div', { class: 'tm-scale', 'aria-hidden': 'true' }, h('span', { class: 'tm-scale-bar' }), h('span', { class: 'tm-scale-txt' }));
  const north = h('div', { class: 'tm-north', 'aria-hidden': 'true' }, 'N');
  const clusterPool = [];
  const lines = document.createElementNS(NS, 'svg'); lines.setAttribute('class', 'tm-lines');
  const markPane = h('div', { class: 'tm-marks' });
  const msg = h('div', { class: 'tm-msg', hidden: true, role: 'status' }, t('The map pictures could not load. Check your internet connection. Markers still work.'));
  const attr = h('div', { class: 'tm-attr' });
  const simBadge = h('div', { class: 'tm-sim', role: 'note', hidden: true }, h('i', { 'aria-hidden': 'true' }), t('SIMULATION: vehicle movement is illustrative, not live GPS'));
  const roadBadge = h('div', { class: 'tm-road-status', role: 'status', 'aria-live': 'polite', hidden: true });
  const locStatus = h('div', { class: 'tm-loc-status', hidden: true, role: 'status', 'aria-live': 'polite' });
  const locateBtn = h('button', { type: 'button', class: 'tm-locate', 'aria-label': t('Show my location'), onclick: () => locateMe() }, t('My location'));
  const seg = h('div', { class: 'seg tm-ctl tm-layers', role: 'group', 'aria-label': t('Map type') });
  const box = h('div', { class: 'tmap', tabindex: 0, role: 'application', 'aria-label': t('Live map (demo)') }, tilePane, overlayPane, lines, markPane, msg, locStatus, simBadge, roadBadge, seg, scale, north,
    h('div', { class: 'tm-ctl tm-zoom' },
      h('button', { type: 'button', 'aria-label': t('Zoom in'), onclick: () => zoomBy(1) }, '+'),
      h('button', { type: 'button', 'aria-label': t('Zoom out'), onclick: () => zoomBy(-1) }, '−'),
      locateBtn,
      h('button', { type: 'button', class: 'tm-pl', onclick: () => { userMoved = true; fit(GAALKACYO, 0); } }, t('Gaalkacyo')),
      h('button', { type: 'button', class: 'tm-pl', onclick: () => { userMoved = true; fit(PUNTLAND, 0); } }, t('Puntland'))), attr);

  const size = () => ({ w: box.clientWidth, h: box.clientHeight });
  const maxZ = () => LAYERS[layer].max;
  const setCenterPx = (cx, cy, z) => { view.z = z; view.lng = x2lng(cx, z); view.lat = y2lat(cy, z); };

  function render() {
    raf = 0; const { w, h: hh } = size(); if (!w || !hh) return;
    const z = view.z; const zi = Math.min(maxZ(), Math.max(0, Math.floor(z))); const ts = TILE * 2 ** (z - zi); const n = 2 ** zi;
    const left = lng2x(view.lng, z) - w / 2, top = lat2y(view.lat, z) - hh / 2;
    const keep = new Set(); const keepO = new Set();
    for (let ty = Math.floor(top / ts); ty <= Math.floor((top + hh) / ts); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(left / ts); tx <= Math.floor((left + w) / ts); tx++) {
        const wx = ((tx % n) + n) % n;
        const place = (map, pane, set, key, url, onload) => {
          set.add(key); let img = map.get(key);
          if (!img) {
            img = document.createElement('img'); img.className = 'tm-tile'; img.alt = ''; img.draggable = false; img.decoding = 'async'; img.referrerPolicy = 'origin';
            if (onload) img.addEventListener('load', onload);
            img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
            img.src = url; map.set(key, img); pane.append(img);
          }
          img.style.width = img.style.height = (ts + 0.6) + 'px';
          img.style.transform = `translate3d(${tx * ts - left}px,${ty * ts - top}px,0)`;
        };
        place(tiles, tilePane, keep, layer + '/' + zi + '/' + wx + '/' + ty, LAYERS[layer].url(zi, wx, ty), () => { loaded++; msg.hidden = true; });
        if (LAYERS[layer].overlay) place(overlayTiles, overlayPane, keepO, layer + '/o/' + zi + '/' + wx + '/' + ty, LAYERS[layer].overlay(zi, wx, ty));
      }
    }
    for (const [k, img] of tiles) if (!keep.has(k)) { img.remove(); tiles.delete(k); }
    for (const [k, img] of overlayTiles) if (!keepO.has(k)) { img.remove(); overlayTiles.delete(k); }
    const px = o => [lng2x(o.lng, z) - left, lat2y(o.lat, z) - top];
    for (const it of items) {
      const [x, y] = px(it); it.x = x; it.y = y; it.el.style.transform = `translate(${x}px,${y}px)`;
      it.el.hidden = x < -40 || y < -40 || x > w + 40 || y > hh + 40;
    }
    // Facilities that overlap on screen are grouped into one numbered marker (zoom in to separate them).
    const facs = items.filter(i => i.fac && !i.el.hidden); const groups = [];
    if (opts.cluster !== false && z < 12.5) for (const f of facs) { const g = groups.find(q => Math.hypot(q.x - f.x, q.y - f.y) < 34); if (g) { g.m.push(f); g.x = g.m.reduce((a, b) => a + b.x, 0) / g.m.length; g.y = g.m.reduce((a, b) => a + b.y, 0) / g.m.length; } else groups.push({ x: f.x, y: f.y, m: [f] }); }
    let ci = 0;
    for (const g of groups) if (g.m.length > 1) {
      g.m.forEach(f => { f.el.hidden = true; });
      let c = clusterPool[ci++]; if (!c) { c = h('div', { class: 'mk mk-cluster', role: 'button', tabindex: 0 }); markPane.append(c); clusterPool.push(c); }
      c.hidden = false; c.replaceChildren(h('span', String(g.m.length))); c.setAttribute('aria-label', t('{n} places - zoom in', { n: g.m.length }));
      c.style.transform = `translate(${g.x}px,${g.y}px)`;
      const lat = g.m.reduce((a, b) => a + b.lat, 0) / g.m.length, lng = g.m.reduce((a, b) => a + b.lng, 0) / g.m.length;
      c.onclick = () => box.flyTo(lat, lng, Math.min(maxZ(), view.z + 2));
      c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onclick(); } };
    }
    for (; ci < clusterPool.length; ci++) clusterPool[ci].hidden = true;
    markPane.classList.toggle('z-labels', view.z >= 13);
    // scale bar
    const mpp = 156543.03392 * Math.cos(view.lat * Math.PI / 180) / 2 ** z;
    const steps = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
    const dist = [...steps].reverse().find(d => d / mpp <= 110) || steps[0];
    scale.firstChild.style.width = Math.max(18, dist / mpp) + 'px'; scale.lastChild.textContent = dist >= 1000 ? (dist / 1000) + ' km' : dist + ' m';
    for (const route of routeMotion) {
      const d = route.points.map((point, index) => {
        const [x, y] = px(point); return (index ? 'L ' : 'M ') + x + ' ' + y;
      }).join(' ');
      route.glow.setAttribute('d', d); route.path.setAttribute('d', d);
      route.anim.setAttribute('path', d);
    }
    for (const trail of routeTrails) {
      const [x1, y1] = px(trail.from), [x2, y2] = px(trail.to);
      trail.path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
    }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };

  function locationMessage(key) {
    locStatus.textContent = t(key); locStatus.hidden = false;
    clearTimeout(locStatusTimer); locStatusTimer = setTimeout(() => { locStatus.hidden = true; }, 7000);
  }
  function resetLocateButton() { locateBtn.disabled = false; locateBtn.textContent = t('My location'); }
  function locateMe() {
    if (!navigator.geolocation) { locationMessage('Location is not supported by this browser.'); return; }
    locateBtn.disabled = true; locateBtn.textContent = t('Finding your location…');
    try {
      navigator.geolocation.getCurrentPosition(position => {
        const lat = Number(position.coords && position.coords.latitude), lng = Number(position.coords && position.coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          resetLocateButton(); locationMessage('Your location is unavailable right now. Try again.'); return;
        }
        userLocation = { lat, lng };
        userMoved = true; view.lat = lat; view.lng = lng; view.z = Math.min(maxZ(), 14);
        build(current); schedule(); resetLocateButton();
        locationMessage('Your location is shown on this device only. It is not sent to GURMAD 24.');
      }, error => {
        resetLocateButton();
        if (error && error.code === 1) locationMessage('Location permission was denied. Allow location access in your browser settings.');
        else if (error && error.code === 3) locationMessage('Location request timed out. Try again.');
        else locationMessage('Your location is unavailable right now. Try again.');
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    } catch (_) { resetLocateButton(); locationMessage('Your location is unavailable right now. Try again.'); }
  }

  function zoomAt(z, px, py) {
    z = Math.max(MIN_Z, Math.min(maxZ(), z)); const { w, h: hh } = size();
    const wx = lng2x(view.lng, view.z) - w / 2 + px, wy = lat2y(view.lat, view.z) - hh / 2 + py;
    const lng = x2lng(wx, view.z), lat = y2lat(wy, view.z);
    setCenterPx(lng2x(lng, z) - px + w / 2, lat2y(lat, z) - py + hh / 2, z); schedule();
  }
  const zoomBy = d => { userMoved = true; const { w, h: hh } = size(); zoomAt(view.z + d, w / 2, hh / 2); };
  const panBy = (dx, dy) => { setCenterPx(lng2x(view.lng, view.z) - dx, lat2y(view.lat, view.z) - dy, view.z); schedule(); };

  function fit(points, pad = 56) {
    const { w, h: hh } = size(); const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const midLat = y2lat((lat2y(minLat, 0) + lat2y(maxLat, 0)) / 2, 0), midLng = (minLng + maxLng) / 2;
    let z = 14;
    const spanX = (maxLng - minLng) / 360 * TILE, spanY = Math.abs(lat2y(maxLat, 0) - lat2y(minLat, 0));
    if (w && hh && (spanX > 1e-9 || spanY > 1e-9)) z = Math.min(14, Math.log2(Math.max(40, w - 2 * pad) / Math.max(spanX, 1e-9)), Math.log2(Math.max(40, hh - 2 * pad) / Math.max(spanY, 1e-9)));
    view.lat = midLat; view.lng = midLng; view.z = Math.max(MIN_Z, Math.min(maxZ(), z)); schedule();
  }

  function setLayer(name) {
    layer = name; tiles.forEach(i => i.remove()); tiles.clear(); overlayTiles.forEach(i => i.remove()); overlayTiles.clear(); loaded = 0;
    if (view.z > maxZ()) view.z = maxZ();
    seg.replaceChildren(...Object.entries(LAYERS).map(([k, L]) => h('button', { type: 'button', 'aria-pressed': k === layer, onclick: () => setLayer(k) }, t(L.label))));
    attr.replaceChildren(h('a', { href: LAYERS[layer].href, target: '_blank', rel: 'noopener noreferrer' }, LAYERS[layer].attr));
    schedule(); clearTimeout(box.__t); box.__t = setTimeout(() => { if (!loaded) msg.hidden = false; }, 8000);
  }

  const mk = (cls, ...kids) => h('div', { class: 'mk ' + cls }, ...kids);
  function build(list) {
    markPane.replaceChildren(); lines.replaceChildren(); items = []; routeMotion = []; routeTrails = [];
    const add = (o, el) => { markPane.append(el); items.push({ lat: o.lat, lng: o.lng, el }); };
    const routePath = (cls) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); p.setAttribute('fill', 'none'); lines.append(p); return p; };
    if (opts.places) PLACES.forEach(p => add(p, mk('mk-city', h('span', { class: 'cdot' }), h('span', { class: 'clbl' }, p.name))));
    (opts.markers || []).forEach(m => {
      const el = mk('mk-fac u-' + (m.type || 'hospital'), icon(m.kind === 'hospital' ? 'hospital' : m.kind === 'government' ? 'shield' : m.kind === 'landmark' ? 'pin' : (m.type || 'pin'), 14), m.label ? h('span', { class: 'clbl' }, m.label) : null);
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', t('Show details: {name}', { name: m.label || t('Map location') }));
      el.addEventListener('click', () => opts.onMarkerClick?.(m));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onMarkerClick?.(m); } });
      el.__m = m; add(m, el); items[items.length - 1].fac = true; items[items.length - 1].m = m;
    });
    if (userLocation) add(userLocation, h('div', { class: 'mk mk-user-location', role: 'img', 'aria-label': t('Your location') }));
    for (const e of list) if (e.station) {
      const glow = routePath('tm-route-glow u-' + e.type);
      const path = routePath('tm-route u-' + e.type);
      if (e.unit) routeTrails.push({ path: routePath('tm-trail u-' + e.type), from: e.station, to: e.unit });
      // Animated responder icon follows the road geometry when available; movement is still simulation.
      const token = document.createElementNS(NS, 'g'); token.setAttribute('class', 'tm-dispatch-motion u-' + e.type);
      const sprite = document.createElementNS(NS, 'g'); sprite.setAttribute('class', 'tm-veh u-' + e.type);
      const sh = (tag, attrs, cls) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (cls) n.setAttribute('class', cls); return n; };
      sprite.append(
        sh('rect', { x: -13, y: -6.5, width: 26, height: 13, rx: 4 }, 'veh-body'),
        sh('rect', { x: 3, y: -5, width: 6, height: 10, rx: 1.5 }, 'veh-glass'),
        e.type === 'fire' ? sh('rect', { x: -11, y: -2, width: 11, height: 4, rx: 1 }, 'veh-ladder') : sh('rect', { x: -4, y: -1.5, width: 6, height: 3, rx: 1 }, 'veh-mark'),
        sh('circle', { cx: -2, cy: -6.5, r: 2.6 }, 'veh-light veh-l1'), sh('circle', { cx: -2, cy: 6.5, r: 2.6 }, 'veh-light veh-l2'));
      const anim = document.createElementNS(NS, 'animateMotion'); anim.setAttribute('path', 'M 0 0 L 1 1'); anim.setAttribute('rotate', 'auto');
      anim.setAttribute('dur', e.type === 'police' ? '8s' : e.type === 'fire' ? '10s' : '9s'); anim.setAttribute('begin', '0s'); anim.setAttribute('repeatCount', 'indefinite');
      token.append(sprite, anim); lines.append(token);
      const motion = { from: e.station, to: e.incident, points: [e.station, e.incident], glow, path, anim };
      routeMotion.push(motion);
      roadGeometry(e.station, e.incident).then(result => {
        if (!routeMotion.includes(motion)) return;
        motion.points = result.points;
        path.classList.toggle('tm-route-fallback', !result.road);
        glow.classList.toggle('tm-route-fallback', !result.road);
        path.dataset.routeReady = '1';
        const fallbacks = routeMotion.filter(item => item.path.classList.contains('tm-route-fallback')).length;
        roadBadge.hidden = false;
        roadBadge.textContent = fallbacks ? t('Road routing unavailable for {n} route(s) — straight-line fallback', { n: fallbacks }) : t('Road routes loaded · OpenStreetMap routing demo');
        roadBadge.classList.toggle('is-fallback', fallbacks > 0);
        schedule();
      });

    }
    for (const e of list) if (e.station) add(e.station, mk('mk-station u-' + e.type, icon(e.type, 13)));
    simBadge.hidden = !list.some(e => e.station);
    for (const e of list) add(e.incident, mk('mk-incident' + (e.done ? ' done' : ''), h('span', { class: 'pulse' }), h('span', { class: 'dot' })));
    for (const e of list) if (e.unit) add(e.unit, mk('mk-unit u-' + e.type, icon(e.type, 18)));
  }

  const points = list => list.flatMap(e => [e.incident, e.unit, e.station].filter(Boolean));
  box.update = (list, { refit = true } = {}) => {
    const l = (list || []).filter(e => e && e.incident); current = l; build(l);
    if (refit && !userMoved) { const pts = mode === 'puntland' ? [] : points(l); if (pts.length) fit(pts); else if (!opts.center) fit(mode === 'puntland' ? PUNTLAND : GAALKACYO, 0); }
    schedule();
  };
  box.select = id => items.forEach(it => { if (it.fac) it.el.classList.toggle('sel', !!id && it.m && it.m.id === id); });
  box.flyTo = (lat, lng, z = 12) => { userMoved = true; view.lat = lat; view.lng = lng; view.z = Math.min(maxZ(), z); schedule(); };

  // pointer input: drag, pinch, wheel, double click, keyboard
  const ptrs = new Map(); let pinch = null;
  box.addEventListener('pointerdown', e => { if (e.target.closest('.tm-ctl')) return; box.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); userMoved = true; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  box.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) panBy(dx, dy);
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = box.getBoundingClientRect(); if (pinch && d > 0) zoomAt(view.z + Math.log2(d / pinch), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); pinch = d; }
  });
  const end = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('wheel', e => { e.preventDefault(); userMoved = true; const r = box.getBoundingClientRect(); zoomAt(view.z - Math.sign(e.deltaY) * 0.5, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  box.addEventListener('dblclick', e => { if (e.target.closest('.tm-ctl')) return; userMoved = true; const r = box.getBoundingClientRect(); zoomAt(view.z + 1, e.clientX - r.left, e.clientY - r.top); });
  box.addEventListener('keydown', e => { const k = e.key; if (k === '+' || k === '=') zoomBy(1); else if (k === '-') zoomBy(-1); else if (k.startsWith('Arrow')) { e.preventDefault(); userMoved = true; panBy(k === 'ArrowLeft' ? 60 : k === 'ArrowRight' ? -60 : 0, k === 'ArrowUp' ? 60 : k === 'ArrowDown' ? -60 : 0); } });
  if (window.ResizeObserver) new ResizeObserver(() => { if (!userMoved) box.update(current, { refit: true }); else schedule(); }).observe(box);

  if (opts.height) box.style.height = opts.height;
  setLayer(layer); box.update(current, { refit: true });
  return box;
}

export const TYPE_ICON = { ambulance: 'ambulance', police: 'police', fire: 'fire' };
