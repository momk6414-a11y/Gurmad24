// Real interactive map (slippy tiles, no library): satellite imagery (Esri) or street map (OpenStreetMap).
// Needs an internet connection for the map pictures. Markers, routes and the Puntland view are drawn by us.
// Tiles are plain <img> requests; the CSP allows only the two hosts below. Device location is opt-in and stays client-side.
import { h, t, icon } from './core.js';

const TILE = 256;
const LAYERS = {
  satellite: {
    label: 'Satellite', max: 16,
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
const MIN_Z = 5;

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
  let layer = LAYERS[opts.layer] ? opts.layer : 'satellite';
  const view = { lat: opts.center?.lat ?? 8.4, lng: opts.center?.lng ?? 49.3, z: opts.center?.z ?? 6 };
  const mode = opts.view === 'puntland' ? 'puntland' : 'points';
  let items = []; let current = entries || []; let userMoved = false; let raf = 0; let loaded = 0; let userLocation = null; let locStatusTimer = 0;
  const tiles = new Map();

  const tilePane = h('div', { class: 'tm-tiles' });
  const lines = document.createElementNS(NS, 'svg'); lines.setAttribute('class', 'tm-lines');
  const markPane = h('div', { class: 'tm-marks' });
  const msg = h('div', { class: 'tm-msg', hidden: true, role: 'status' }, t('The map pictures could not load. Check your internet connection. Markers still work.'));
  const attr = h('div', { class: 'tm-attr' });
  const locStatus = h('div', { class: 'tm-loc-status', hidden: true, role: 'status', 'aria-live': 'polite' });
  const locateBtn = h('button', { type: 'button', class: 'tm-locate', 'aria-label': t('Show my location'), onclick: () => locateMe() }, t('My location'));
  const seg = h('div', { class: 'seg tm-ctl tm-layers', role: 'group', 'aria-label': t('Map type') });
  const box = h('div', { class: 'tmap', tabindex: 0, role: 'application', 'aria-label': t('Live map (demo)') }, tilePane, lines, markPane, msg, locStatus, seg,
    h('div', { class: 'tm-ctl tm-zoom' },
      h('button', { type: 'button', 'aria-label': t('Zoom in'), onclick: () => zoomBy(1) }, '+'),
      h('button', { type: 'button', 'aria-label': t('Zoom out'), onclick: () => zoomBy(-1) }, '−'),
      locateBtn,
      h('button', { type: 'button', class: 'tm-pl', onclick: () => { userMoved = true; fit(PUNTLAND, 0); } }, t('Puntland'))), attr);

  const size = () => ({ w: box.clientWidth, h: box.clientHeight });
  const maxZ = () => LAYERS[layer].max;
  const setCenterPx = (cx, cy, z) => { view.z = z; view.lng = x2lng(cx, z); view.lat = y2lat(cy, z); };

  function render() {
    raf = 0; const { w, h: hh } = size(); if (!w || !hh) return;
    const z = view.z; const zi = Math.min(maxZ(), Math.max(0, Math.floor(z))); const ts = TILE * 2 ** (z - zi); const n = 2 ** zi;
    const left = lng2x(view.lng, z) - w / 2, top = lat2y(view.lat, z) - hh / 2;
    const keep = new Set();
    for (let ty = Math.floor(top / ts); ty <= Math.floor((top + hh) / ts); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(left / ts); tx <= Math.floor((left + w) / ts); tx++) {
        const wx = ((tx % n) + n) % n; const key = layer + '/' + zi + '/' + wx + '/' + ty; keep.add(key);
        let img = tiles.get(key);
        if (!img) {
          img = document.createElement('img'); img.className = 'tm-tile'; img.alt = ''; img.draggable = false; img.decoding = 'async'; img.referrerPolicy = 'origin';
          img.addEventListener('load', () => { loaded++; msg.hidden = true; }); img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
          img.src = LAYERS[layer].url(zi, wx, ty); tiles.set(key, img); tilePane.append(img);
        }
        img.style.width = img.style.height = (ts + 0.6) + 'px';
        img.style.transform = `translate3d(${tx * ts - left}px,${ty * ts - top}px,0)`;
      }
    }
    for (const [k, img] of tiles) if (!keep.has(k)) { img.remove(); tiles.delete(k); }
    const px = o => [lng2x(o.lng, z) - left, lat2y(o.lat, z) - top];
    for (const it of items) {
      const [x, y] = px(it); it.el.style.transform = `translate(${x}px,${y}px)`;
      it.el.hidden = x < -40 || y < -40 || x > w + 40 || y > hh + 40;
    }
    for (const ln of lines.childNodes) {
      const d = ln.__d; const [x1, y1] = px(d.a), [x2, y2] = px(d.b);
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
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
    layer = name; tiles.forEach(i => i.remove()); tiles.clear(); loaded = 0;
    if (view.z > maxZ()) view.z = maxZ();
    seg.replaceChildren(...Object.entries(LAYERS).map(([k, L]) => h('button', { type: 'button', 'aria-pressed': k === layer, onclick: () => setLayer(k) }, t(L.label))));
    attr.replaceChildren(h('a', { href: LAYERS[layer].href, target: '_blank', rel: 'noopener noreferrer' }, LAYERS[layer].attr));
    schedule(); clearTimeout(box.__t); box.__t = setTimeout(() => { if (!loaded) msg.hidden = false; }, 8000);
  }

  const mk = (cls, ...kids) => h('div', { class: 'mk ' + cls }, ...kids);
  function build(list) {
    markPane.replaceChildren(); lines.replaceChildren(); items = [];
    const add = (o, el) => { markPane.append(el); items.push({ lat: o.lat, lng: o.lng, el }); };
    const line = (a, b, cls) => { const l = document.createElementNS(NS, 'line'); l.setAttribute('class', cls); l.__d = { a, b }; lines.append(l); };
    if (opts.places) PLACES.forEach(p => add(p, mk('mk-city', h('span', { class: 'cdot' }), h('span', { class: 'clbl' }, p.name))));
    (opts.markers || []).forEach(m => {
      const el = mk('mk-fac u-' + (m.type || 'hospital'), icon(m.kind === 'hospital' ? 'hospital' : m.kind === 'government' ? 'shield' : m.kind === 'landmark' ? 'pin' : (m.type || 'pin'), 14), m.label ? h('span', { class: 'clbl' }, m.label) : null);
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', t('Show details: {name}', { name: m.label || t('Map location') }));
      el.addEventListener('click', () => opts.onMarkerClick?.(m));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onMarkerClick?.(m); } });
      add(m, el);
    });
    if (userLocation) add(userLocation, h('div', { class: 'mk mk-user-location', role: 'img', 'aria-label': t('Your location') }));
    for (const e of list) if (e.station) { line(e.station, e.incident, 'tm-route u-' + e.type); if (e.unit) line(e.station, e.unit, 'tm-trail u-' + e.type); }
    for (const e of list) if (e.station) add(e.station, mk('mk-station u-' + e.type, icon(e.type, 13)));
    for (const e of list) add(e.incident, mk('mk-incident' + (e.done ? ' done' : ''), h('span', { class: 'pulse' }), h('span', { class: 'dot' })));
    for (const e of list) if (e.unit) add(e.unit, mk('mk-unit u-' + e.type, icon(e.type, 18)));
  }

  const points = list => list.flatMap(e => [e.incident, e.unit, e.station].filter(Boolean));
  box.update = (list, { refit = true } = {}) => {
    const l = (list || []).filter(e => e && e.incident); current = l; build(l);
    if (refit && !userMoved) { const pts = mode === 'puntland' ? [] : points(l); if (pts.length) fit(pts); else if (!opts.center) fit(PUNTLAND, 0); }
    schedule();
  };
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
