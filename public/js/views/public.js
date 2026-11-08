// Public + authentication screens: home, health card marketplace, hospitals, services, emergency info, login/register.
import { S, t, h, icon, GET, POST, api, form, modal, toast, money, badge, table, panel, tile, list, demoNote, emptyState, errText, go, link, fdate, setLang } from '../core.js';
import { receiptNode } from './shared.js';
import { liveMap, osmLink, PLACES } from '../map.js';

export const APPT_CATS = [['general', 'General visit'], ['checkup', 'Check-up'], ['lab_test', 'Lab test'], ['follow_up', 'Follow-up'], ['other', 'Other']];
export const CASE_CATS = [['general', 'General help request'], ['transport', 'Patient transport'], ['accident', 'Accident'], ['maternal', 'Maternal'], ['other', 'Other'], ['fire', 'Fire'], ['rescue', 'Rescue'], ['crime', 'Crime or threat'], ['disturbance', 'Disturbance']];

const verified = ok => ok ? h('span', { class: 'badge ok' }, icon('check', 12), ' ', t('Verified')) : null;
const head = (title, sub, right) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null), right || null);
export const notInsurance = () => demoNote('Health cards are hospital service products. They are NOT insurance and do not guarantee treatment or coverage.');

// ---------- Home
// Big one-tap call buttons (demo numbers) - also work offline from the cached directory.
async function hotlines() {
  let ps = []; try { ps = (await GET('/providers')).providers; } catch (_) { /* offline: no list */ }
  const pick = type => { const l = ps.filter(p => p.type === type && p.phone); return l.find(p => p.available) || l[0]; };
  const btn = (type, label) => { const p = pick(type); return p ? h('a', { class: 'call u-' + type, href: 'tel:' + p.phone.replace(/[^+\d]/g, '') }, icon(type, 26), h('span', h('b', t(label)), h('small', p.phone))) : null; };
  const items = [btn('ambulance', 'Ambulance'), btn('police', 'Police'), btn('fire', 'Fire brigade')].filter(Boolean);
  if (!items.length) return null;
  return h('section', { class: 'panel hotlines' }, h('h3', t('Emergency numbers')), h('div', { class: 'calls' }, items), h('small', { class: 'hint' }, t('Demo numbers. One tap to call from your phone.')));
}

export async function home() {
  const [cards, spons, hs, hot] = await Promise.all([GET('/cards?sort=price_asc').catch(() => ({ cards: [] })), GET('/sponsored').catch(() => ({ listings: [] })), GET('/hospitals'), hotlines()]);
  const step = (n, ic, title, text) => h('div', { class: 'step' }, h('div', { class: 'step-n' }, n), h('div', { class: 'step-ic' }, icon(ic, 22)), h('h4', t(title)), h('p', t(text)));
  const who = (ic, title, text, cta, href) => h('div', { class: 'who' }, h('div', { class: 'who-ic' }, icon(ic, 26)), h('h4', t(title)), h('p', t(text)), h('a', { class: 'btn sm ghost', href }, t(cta)));
  const trust = (ic, title, text) => h('div', { class: 'trust' }, icon(ic, 22), h('div', h('b', t(title)), h('p', t(text))));
  return h('div',
    h('section', { class: 'hero2' },
      h('div', { class: 'hero2-text' }, h('div', { class: 'eyebrow' }, t('GURMAD 24 - Gaalkacyo pilot')), h('h1', t('Clear coordination. Accessible healthcare.')),
        h('p', t('Browse hospital health cards, find verified hospitals and providers, and request appointments - in Somali or English.')),
        h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/cards' }, icon('card'), t('Browse health cards')), h('a', { class: 'btn ghost', href: '#/hospitals' }, icon('hospital'), t('Find a hospital')), h('a', { class: 'btn ghost', href: '#/system' }, icon('dash'), t('System overview')), S.user ? null : h('a', { class: 'btn ghost', href: '#/register' }, icon('user'), t('Create account'))),
        h('div', { class: 'stats-row' }, h('div', h('b', hs.hospitals.length), h('span', t('Verified hospitals'))), h('div', h('b', cards.cards.length), h('span', t('Health cards'))), h('div', h('b', '2'), h('span', t('Languages'))))),
      h('img', { class: 'hero2-img', src: '/img/hero.svg', alt: '', width: 560, height: 420 })),
    hot,
    h('div', { class: 'panel sos' }, h('div', { style: 'display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap' }, icon('alert', 28), h('div', { style: 'flex:1;min-width:220px' }, h('h3', t('Emergency requests are a demo')),
      h('p', { style: 'margin:6px 0 0;color:var(--muted)' }, t('Ambulance, police and fire requests are simulated while the service is being tested. In a real emergency go to the nearest hospital or call your local emergency services directly.'))), h('a', { class: 'btn', href: '#/emergency' }, icon('alert'), t('Try the emergency demo')))),
    h('div', { class: 'panel' }, h('div', { style: 'display:flex;gap:14px;align-items:center;flex-wrap:wrap' }, icon('chat', 28), h('div', { style: 'flex:1;min-width:220px' }, h('h3', t('Questions or a complaint?')),
      h('p', { style: 'margin:6px 0 0;color:var(--muted)' }, t('Send us a message about an order, a hospital or a provider. Our team replies inside the app.'), S.user ? null : ' ' + t('You will be asked to log in first.'))),
      h('a', { class: 'btn', href: '#/me/support' }, icon('chat'), t('Send a complaint')))),
    h('section', h('h2', { class: 'sec-title' }, t('How it works')), h('div', { class: 'grid g3' },
      step('1', 'search', 'Find', 'Browse verified hospitals and compare their health cards side by side.'), step('2', 'bag', 'Order', 'Order a card in a minute. In this demo no real money is charged.'), step('3', 'receipt', 'Use', 'Keep your receipt and show it at the hospital. Terms are those the hospital approved.'))),
    h('section', h('h2', { class: 'sec-title' }, t('Built for everyone in healthcare')), h('div', { class: 'grid g3' },
      who('user', 'Patients and families', 'Compare cards, request appointments, get support in Somali or English.', 'Create account', '#/register'),
      who('hospital', 'Hospitals', 'Publish your own health cards, set your prices, manage appointments and see your sales.', 'Register a hospital / provider', '#/register-org'),
      who('ambulance', 'Ambulance and labs', 'List your services, manage availability and reach more patients.', 'Register a hospital / provider', '#/register-org'))),
    spons.listings.length ? panel('Sponsored', h('div', { class: 'grid g3' }, spons.listings.map(s => h('div', { class: 'hc' }, h('span', { class: 'badge spons' }, t('SPONSORED')), h('h4', s.headline), h('div', { class: 'meta' }, s.text), h('small', { class: 'hint' }, s.org && s.org.name)))), h('small', { class: 'hint' }, t('Advertising. Paid placement never changes medical advice.'))) : null,
    panel('Popular health cards', h('div', { class: 'grid g3' }, cards.cards.slice(0, 3).map(cardTile)), link('/cards', t('See all'))),
    h('section', h('h2', { class: 'sec-title' }, t('Trust and safety')), h('div', { class: 'grid g2' },
      trust('shield', 'Verified organisations', 'Every hospital and provider is reviewed by an administrator before it appears.'), trust('check', 'Hospitals approve their own terms', 'Prices, services and refund rules are written and approved by each hospital.'),
      trust('eye', 'Your data stays yours', 'We never sell personal data. Download or delete your data any time.'), trust('alert', 'No medical advice', 'The platform never diagnoses and never decides treatment.'))),
    notInsurance());
}

// ---------- Marketplace
export function cardTile(c, { compare = true } = {}) {
  const sel = S.cmp.includes(c.id);
  return h('article', { class: 'hc' },
    h('img', { class: 'art', src: '/img/card-' + ['mint', 'blue', 'violet'][String(c.id).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3] + '.svg', alt: '', width: 320, height: 112, loading: 'lazy' }),
    h('div', { class: 'hosp' }, c.hospital ? c.hospital.name : '', verified(c.hospital && c.hospital.verified)),
    h('h4', c.name), h('div', { class: 'price' }, money(c.priceCents), h('small', { style: 'font-size:12px;color:var(--muted);font-weight:500' }, ' ' + t('{n} days', { n: c.validityDays }))),
    h('div', { class: 'meta' }, (c.included || []).slice(0, 2).join(' - ')), h('span', { class: 'badge demo' }, t('Demo price')),
    h('div', { class: 'row' }, h('a', { class: 'btn sm', href: '#/cards/' + c.id }, t('View details')),
      compare ? h('button', { class: 'btn sm ghost', 'aria-pressed': sel, onclick: e => toggleCompare(c.id, e.currentTarget) }, sel ? t('Selected') : t('Compare')) : null));
}
function toggleCompare(id, btn) {
  const i = S.cmp.indexOf(id);
  if (i >= 0) S.cmp.splice(i, 1); else if (S.cmp.length >= 3) { toast(t('You can compare up to 3 cards.'), 'err'); return; } else S.cmp.push(id);
  btn.textContent = S.cmp.includes(id) ? t('Selected') : t('Compare'); btn.setAttribute('aria-pressed', S.cmp.includes(id)); renderCompareBar();
}
export function renderCompareBar() {
  document.getElementById('cmpBar')?.remove();
  if (!S.cmp.length) return;
  document.body.append(h('div', { class: 'compare-bar', id: 'cmpBar' }, h('span', t('{n} selected', { n: S.cmp.length })),
    h('span', { class: 'actions tight' }, h('button', { class: 'btn sm', disabled: S.cmp.length < 2, onclick: () => go('/compare') }, t('Compare')), h('button', { class: 'btn sm', onclick: () => { S.cmp = []; renderCompareBar(); if (location.hash.startsWith('#/cards')) location.reload(); } }, t('Clear')))));
}

export async function cards() {
  const hosp = (await GET('/hospitals')).hospitals;
  const out = h('div', { class: 'grid g3' }); const wrap = h('div');
  const q = h('input', { type: 'search', placeholder: t('Search cards or hospitals'), 'aria-label': t('Search') });
  const hs = h('select', { 'aria-label': t('Hospital') }, h('option', { value: '' }, t('All hospitals')), hosp.map(x => h('option', { value: x.id }, x.name)));
  const max = h('input', { type: 'number', min: '0', step: '1', placeholder: t('Max price ($)'), inputmode: 'decimal', 'aria-label': t('Max price') });
  const sort = h('select', { 'aria-label': t('Sort') }, [['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']].map(([v, l]) => h('option', { value: v }, t(l))));
  async function load() {
    out.replaceChildren(h('div', { class: 'loading' }, h('div', { class: 'skel' })));
    const p = new URLSearchParams({ q: q.value, hospitalId: hs.value, max: max.value, sort: sort.value });
    try { const r = await GET('/cards?' + p); out.replaceChildren(...(r.cards.length ? r.cards.map(c => cardTile(c)) : [emptyState('No cards match your search.')])); }
    catch (e) { out.replaceChildren(emptyState(errText(e))); }
  }
  let tm; q.oninput = () => { clearTimeout(tm); tm = setTimeout(load, 250); }; [hs, max, sort].forEach(x => { x.onchange = load; });
  wrap.append(head('Health Cards Marketplace', 'Cards published and approved by verified hospitals.'), notInsurance(), h('div', { class: 'filters' }, q, hs, max, sort), out);
  load(); return wrap;
}

export async function cardDetail({ id }) {
  const { card: c } = await GET('/cards/' + id);
  const hsp = c.hospital;
  return h('div', head(c.name, hsp.name),
    h('div', { class: 'grid g2' },
      panel(null, h('div',
        h('div', { class: 'hosp', style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('b', hsp.name), verified(hsp.verified), h('span', { class: 'badge demo' }, t('DEMO'))),
        h('div', { class: 'price', style: 'font-size:34px;font-weight:850;color:var(--mint);margin:8px 0' }, money(c.priceCents)),
        h('dl', { class: 'kv' }, h('dt', t('Validity')), h('dd', t('{n} days from purchase', { n: c.validityDays })), h('dt', t('Eligibility')), h('dd', c.eligibility || '-'),
          h('dt', t('Hospital contact')), h('dd', hsp.phone ? h('a', { class: 'tel', href: 'tel:' + hsp.phone.replace(/[^+\d]/g, '') }, icon('phone', 16), hsp.phone) : '-')),
        h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => orderFlow(c) }, icon('bag'), t('Order this card (demo)')), h('button', { class: 'btn ghost', onclick: () => { if (!S.cmp.includes(c.id) && S.cmp.length < 3) S.cmp.push(c.id); renderCompareBar(); toast(t('Added to compare')); } }, t('Compare'))))),
      panel('Included services', c.included.length ? list(c.included) : h('p', '-'))),
    h('div', { class: 'grid g2' }, panel('Not included', c.excluded.length ? list(c.excluded) : h('p', '-')), panel('Refund and cancellation policy', h('p', c.refundPolicy))),
    panel('Terms and conditions', h('p', c.terms)), notInsurance());
}

export function orderFlow(c) {
  if (!S.user) { toast(t('Please log in to order.')); sessionStorage.setItem('g24-after', location.hash); return go('/login'); }
  if (S.user.role !== 'patient') return toast(t('Only patient accounts can order cards.'), 'err');
  let m;
  const f = form([{ name: 'acceptTerms', type: 'checkbox', label: 'I have read the terms and refund policy, and I understand this is a hospital service card, not insurance.', required: true }],
    { submit: 'Place demo order', cancel: () => m.close(), onSubmit: async v => {
      const r = await POST('/orders', { cardId: c.id, acceptTerms: v.acceptTerms });
      m.close(); toast(t('Demo order placed. No real money was charged.'));
      const m2 = modal(t('Order confirmation'), h('div', receiptNode(r.receipt), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => window.print() }, t('Print / save PDF')), h('a', { class: 'btn ghost', href: '#/me/orders', onclick: () => m2.close() }, t('My orders')))), { wide: false });
    } });
  m = modal(t('Order summary'), h('div', demoNote('SANDBOX: no real payment is made. This only creates a demo order and receipt.'),
    h('dl', { class: 'kv' }, h('dt', t('Card')), h('dd', c.name), h('dt', t('Hospital')), h('dd', c.hospital.name), h('dt', t('Price')), h('dd', money(c.priceCents)), h('dt', t('Validity')), h('dd', t('{n} days from purchase', { n: c.validityDays }))), f));
}

export async function compare() {
  if (S.cmp.length < 2) return h('div', head('Compare cards'), emptyState('Select 2 or 3 cards in the marketplace first.', h('a', { class: 'btn', href: '#/cards' }, t('Browse cards'))));
  const { cards: cs } = await GET('/cards/compare?ids=' + S.cmp.join(','));
  const rows = [['Hospital', c => c.hospital.name], ['Price', c => money(c.priceCents)], ['Validity', c => t('{n} days', { n: c.validityDays })], ['Included services', c => list(c.included)], ['Not included', c => list(c.excluded)],
    ['Eligibility', c => c.eligibility || '-'], ['Refund and cancellation policy', c => c.refundPolicy], ['Terms and conditions', c => c.terms]];
  return h('div', head('Compare cards'), notInsurance(), panel(null, h('div', { class: 'table-wrap' }, h('table', { class: 'rt' },
    h('thead', h('tr', h('th', ''), cs.map(c => h('th', c.name)))),
    h('tbody', rows.map(([l, f]) => h('tr', h('td', { 'data-l': '', style: 'font-weight:700;color:var(--muted)' }, t(l)), cs.map(c => h('td', { 'data-l': c.name }, f(c))))),
      h('tr', h('td', ''), cs.map(c => h('td', h('a', { class: 'btn sm', href: '#/cards/' + c.id }, t('View details'))))))))));
}

// ---------- Hospitals
export async function hospitals() {
  const out = h('div', { class: 'grid g3' }); const q = h('input', { type: 'search', placeholder: t('Search hospitals'), 'aria-label': t('Search') });
  async function load() { const r = await GET('/hospitals?q=' + encodeURIComponent(q.value)); out.replaceChildren(...(r.hospitals.length ? r.hospitals.map(orgTile) : [emptyState('No hospitals found.')])); }
  let tm; q.oninput = () => { clearTimeout(tm); tm = setTimeout(load, 250); }; load();
  return h('div', head('Hospital directory', 'Only administrator-verified hospitals are listed.'), h('div', { class: 'field' }, q), out);
}
const orgTile = o => h('article', { class: 'hc' }, h('img', { class: 'art', src: '/img/org-' + (o.type === 'hospital' ? 'hospital' : o.type === 'lab' ? 'lab' : 'ambulance') + '.svg', alt: '', width: 320, height: 112, loading: 'lazy' }), h('h4', o.name), h('div', { class: 'hosp' }, o.area, verified(o.verified)),
  h('div', { class: 'meta' }, o.description), o.type === 'hospital' ? h('a', { class: 'btn sm', href: '#/hospitals/' + o.id }, t('View details')) : (o.phone ? h('a', { class: 'tel', href: 'tel:' + o.phone.replace(/[^+\d]/g, '') }, icon('phone', 16), o.phone) : null));

export async function hospitalDetail({ id }) {
  const r = await GET('/hospitals/' + id); const o = r.hospital;
  return h('div', head(o.name, o.area, h('button', { class: 'btn', onclick: () => appointmentModal(o, r.services) }, icon('calendar'), t('Request appointment'))),
    h('div', { class: 'grid g2' },
      panel('About', h('div', h('p', o.description || '-'), h('dl', { class: 'kv' }, h('dt', t('Address')), h('dd', o.address || '-'), h('dt', t('Hours')), h('dd', o.hours || '-'), h('dt', t('Phone')), h('dd', o.phone ? h('a', { class: 'tel', href: 'tel:' + o.phone.replace(/[^+\d]/g, '') }, icon('phone', 16), o.phone) : '-')))),
      panel('Services and prices', r.services.length ? table([{ label: 'Service', key: 'name' }, { label: 'Price', render: s => money(s.priceCents) }], r.services) : emptyState('No services listed.'))),
    panel('Health cards', r.cards.length ? h('div', { class: 'grid g3' }, r.cards.map(c => cardTile(c))) : emptyState('No cards published yet.')));
}

export function appointmentModal(org, services = []) {
  if (!S.user) { toast(t('Please log in first.')); sessionStorage.setItem('g24-after', location.hash); return go('/login'); }
  if (S.user.role !== 'patient') return toast(t('Only patient accounts can request appointments.'), 'err');
  let m; const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  m = modal(t('Request appointment') + ' - ' + org.name, h('div', demoNote('Do not write medical details here. Only the hospital you choose will see your name and phone.'),
    form([{ name: 'category', label: 'Reason type', type: 'select', options: APPT_CATS, required: true }, services.length ? { name: 'serviceId', label: 'Service (optional)', type: 'select', options: [['', '-'], ...services.map(s => [s.id, s.name + ' - ' + money(s.priceCents)])] } : null,
      { name: 'preferredDate', label: 'Preferred date', type: 'date', required: true, default: tomorrow, min: tomorrow }, { name: 'contactPhone', label: 'Phone for the hospital to reach you', type: 'tel', max: 30, autocomplete: 'tel' }, { name: 'note', label: 'Short note (optional, no medical details)', max: 140 }].filter(Boolean),
    { submit: 'Send request', cancel: () => m.close(), onSubmit: async v => { if (!v.serviceId) delete v.serviceId; await POST('/appointments', { ...v, orgId: org.id }); m.close(); toast(t('Appointment request sent.')); go('/me/appointments'); } })));
}

// ---------- Services directory (ambulance + labs)
export async function services() {
  const [r, sp] = await Promise.all([GET('/providers'), GET('/sponsored')]);
  const prov = r.providers;
  const sec = (title, type) => { const l = prov.filter(p => p.type === type); return panel(title, l.length ? h('div', { class: 'grid g2' }, l.map(p => h('article', { class: 'hc' }, h('div', { class: 'hosp' }, h('b', p.name), verified(p.verified), (type === 'ambulance' || type === 'police' || type === 'fire') ? h('span', { class: p.available ? 'badge ok' : 'badge mute' }, p.available ? t('Available') : t('Unavailable')) : null),
    h('div', { class: 'meta' }, p.description, p.serviceAreas.length ? h('div', t('Areas: {a}', { a: p.serviceAreas.join(', ') })) : null), p.services.length ? list(p.services.map(s => s.name + ' - ' + money(s.priceCents))) : null,
    p.phone ? h('a', { class: 'tel', href: 'tel:' + p.phone.replace(/[^+\d]/g, '') }, icon('phone', 16), p.phone) : null,
    type === 'lab' ? h('button', { class: 'btn sm', onclick: () => appointmentModal(p, p.services) }, t('Request appointment')) : null))) : emptyState('Nobody listed yet.')); };
  return h('div', head('Healthcare services', 'Verified ambulance, police, fire and laboratory providers.'), demoNote('Listings are demo data. Availability is set by each provider and is not a live guarantee.'),
    sec('Ambulance and medical transport', 'ambulance'), sec('Police stations', 'police'), sec('Fire stations', 'fire'), sec('Laboratories and diagnostics', 'lab'),
    sp.listings.length ? panel('Sponsored', h('div', { class: 'grid g3' }, sp.listings.map(s => h('div', { class: 'hc' }, h('span', { class: 'badge spons' }, t('SPONSORED')), h('h4', s.headline), h('div', { class: 'meta' }, s.text))))) : null);
}

// ---------- Emergency: ambulance / police / fire request (DEMO, nothing real is contacted)
const SERVICES = [
  ['ambulance', 'Ambulance', ['general', 'transport', 'accident', 'maternal', 'other']],
  ['police', 'Police', ['crime', 'disturbance']],
  ['fire', 'Fire brigade', ['fire', 'rescue']],
];
export const SERVICE_NAME = { ambulance: 'Ambulance', police: 'Police', fire: 'Fire brigade' };
const STEPS = [['received', 'Received'], ['assigned', 'Unit assigned'], ['en_route', 'On the way'], ['arrived', 'Arrived'], ['handed_over', 'Help given'], ['closed', 'Closed']];
const TRACK_KEY = 'g24-track';
const saveTrack = v => { try { v ? sessionStorage.setItem(TRACK_KEY, JSON.stringify(v)) : sessionStorage.removeItem(TRACK_KEY); } catch (_) { /* storage may be blocked */ } };
const loadTrack = () => { try { return JSON.parse(sessionStorage.getItem(TRACK_KEY) || 'null'); } catch (_) { return null; } };
export const stopPoll = () => { if (S.poll) { clearInterval(S.poll); S.poll = null; } };
const catLabel = c => t((CASE_CATS.find(x => x[0] === c) || [0, c])[1]);

function trackPanel(box, tk, onNew) {
  let busy = false; const mapEl = liveMap([]);
  const draw = tr => {
    const idx = STEPS.findIndex(x => x[0] === tr.status);
    const done = tr.status === 'closed' || tr.status === 'cancelled';
    const steps = h('ol', { class: 'steps' }, STEPS.map(([k, l], i) => h('li', { class: i < idx ? 'done' : i === idx ? 'now' : '' }, h('span', { class: 'dotn' }, i < idx ? icon('check', 14) : String(i + 1)), h('span', t(l)))));
    const ro = tr.responderOrg;
    mapEl.update(tr.location ? [{ type: tr.responder, incident: tr.location, unit: tr.unit, station: tr.station, done }] : []);
    box.replaceChildren(
      h('div', { class: 'note' }, icon('alert', 18), h('span', t('TEST ONLY: no real police, fire or ambulance service was contacted. This is a simulation for demonstration.'))),
      h('div', { class: 'trk-head' }, h('div', h('small', t('Request code')), h('b', { class: 'trk-code' }, tr.code)), h('div', { class: 'trk-type u-' + tr.responder }, icon(tr.responder, 20), h('span', t(SERVICE_NAME[tr.responder])), h('small', catLabel(tr.category)))),
      steps,
      tr.status === 'en_route' && tr.etaMinutes ? h('p', { class: 'eta' }, icon('pin', 18), t('Arriving in about {m} min (simulated).', { m: tr.etaMinutes })) : null,
      tr.status === 'received' ? h('p', { class: 'hint' }, t('Finding the nearest unit...')) : null,
      ro ? h('p', { class: 'unit-info' }, icon(ro.type, 18), h('b', ro.name), ro.phone ? h('span', ' ' + ro.phone) : null) : null,
      mapEl,
      tr.unit && tr.unit.demoPlaced ? h('p', { class: 'hint' }, t('Your location is far from the demo stations, so the demo unit starts a few kilometres from you.')) : null,
      tr.location ? h('p', { class: 'hint' }, h('a', { href: osmLink(tr.location), target: '_blank', rel: 'noopener noreferrer' }, t('Open the location in OpenStreetMap'))) : null,
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => { stopPoll(); saveTrack(null); onNew(); } }, icon('plus'), t('New test request'))));
    return done;
  };
  const tick = async () => {
    if (busy) return; busy = true;
    try { const r = await GET('/emergency/track/' + encodeURIComponent(tk.code) + '?token=' + encodeURIComponent(tk.token)); if (draw(r.track)) stopPoll(); }
    catch (_) { stopPoll(); saveTrack(null); box.replaceChildren(emptyState('This test request is no longer available.'), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: onNew }, t('New test request')))); }
    finally { busy = false; }
  };
  stopPoll(); tick(); S.poll = setInterval(tick, 2500);
}

function requestForm(box, areas) {
  let service = 'ambulance'; let loc = null;
  const svcBox = h('div', { class: 'svc-pick', role: 'radiogroup', 'aria-label': t('What do you need?') });
  const catSel = h('select', { id: 'em-cat', 'aria-label': t('Request type') });
  const fillCats = () => catSel.replaceChildren(...SERVICES.find(x => x[0] === service)[2].map(c => h('option', { value: c }, catLabel(c))));
  const drawSvc = () => svcBox.replaceChildren(...SERVICES.map(([id, label]) => h('button', { type: 'button', class: 'svc u-' + id, role: 'radio', 'aria-checked': service === id, onclick: () => { service = id; drawSvc(); fillCats(); } }, icon(id, 30), h('b', t(label)))));
  drawSvc(); fillCats();
  const msg = h('p', { class: 'hint', 'aria-live': 'polite' });
  const consent = h('input', { type: 'checkbox', id: 'em-consent' });
  const areaSel = h('select', { id: 'em-area', 'aria-label': t('Area') }, h('option', { value: '' }, t('Choose an area')), areas.map(a => h('option', { value: a.id }, t(a.name))));
  areaSel.addEventListener('change', () => { if (areaSel.value) { loc = null; msg.textContent = ''; } });
  const gps = h('button', { type: 'button', class: 'btn ghost', onclick: () => {
    if (!consent.checked) { msg.textContent = t('Tick the box to agree before sharing your location.'); return; }
    if (!navigator.geolocation) { msg.textContent = t('This device cannot share its location. Choose an area instead.'); return; }
    msg.textContent = t('Finding your location...');
    navigator.geolocation.getCurrentPosition(pos => { loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }; areaSel.value = ''; msg.textContent = t('Location found (about {m} m).', { m: Math.round(pos.coords.accuracy) }); },
      e => { loc = null; msg.textContent = e && e.code === 1 ? t('Location permission was denied. Choose an area instead.') : t('Could not get your location. Choose an area instead.'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  } }, icon('pin'), t('Use my location'));
  const note = h('input', { id: 'em-note', type: 'text', maxlength: 200, autocomplete: 'off' });
  const err = h('div', { class: 'form-error', role: 'alert' });
  const send = h('button', { type: 'submit', class: 'btn sos-btn' }, icon('alert'), t('Send test request'));
  const field = (label, id, ctl, hint) => h('div', { class: 'field' }, h('label', { for: id }, t(label)), ctl, hint ? h('span', { class: 'hint' }, t(hint)) : null);
  return h('form', { novalidate: true, onsubmit: async ev => {
    ev.preventDefault(); err.textContent = '';
    const body = { category: catSel.value, note: note.value };
    if (loc && consent.checked) Object.assign(body, { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, consent: true }); else if (areaSel.value) body.areaId = areaSel.value;
    else { err.textContent = t('Share your location or choose an area first.'); return; }
    send.disabled = true;
    try {
      const r = await POST('/emergency/simulate', body);
      if (!r.case.trackToken) { box.replaceChildren(h('div', { class: 'note' }, icon('check', 18), h('span', t('Simulation recorded as {code}. Nothing was sent to anyone and no one is coming.', { code: r.case.code })))); return; }
      const tk = { code: r.case.code, token: r.case.trackToken }; saveTrack(tk); trackPanel(box, tk, () => showForm(box, areas));
    } catch (e) { err.textContent = errText(e); send.disabled = false; }
  } },
  h('div', { class: 'field' }, h('label', t('What do you need?')), svcBox),
  field('Request type', 'em-cat', catSel),
  h('fieldset', { class: 'loc-box' }, h('legend', t('Where are you?')),
    h('div', { class: 'field check' }, consent, h('label', { for: 'em-consent' }, t('I agree to share my location. It is used only to draw the test map and is removed after the retention period.'))),
    h('div', { class: 'actions tight' }, gps), msg,
    field('Or choose an area (no GPS needed)', 'em-area', areaSel)),
  field('Short note (no names, no medical details)', 'em-note', note), err, h('div', { class: 'actions' }, send));
}
function showForm(box, areas) { box.replaceChildren(requestForm(box, areas)); }

export async function emergency() {
  const [hsr, cfg, hot] = await Promise.all([GET('/hospitals'), GET('/config'), hotlines()]); const hs = hsr.hospitals; const box = h('div');
  const saved = loadTrack();
  if (saved) trackPanel(box, saved, () => showForm(box, cfg.areas)); else showForm(box, cfg.areas);
  return h('div', head('Emergency'), hot,
    h('div', { class: 'panel sos' }, h('h3', t('In a real emergency')), h('ul', { class: 'bul', style: 'margin-top:8px' }, h('li', t('Go to the nearest hospital or call your local emergency services directly.')), h('li', t('GURMAD 24 does NOT contact police, fire or ambulance services at this stage. Requests below are a demonstration.')), h('li', t('The platform never diagnoses and never gives treatment advice.')))),
    panel('Request help (demo)', h('div', demoNote('DEMO: this creates a registered test request. The operators, police, fire and ambulance dashboards show it live, but no real help is requested.'), box)),
    panel('Hospital contacts (verified)', hs.length ? table([{ label: 'Hospital', key: 'name' }, { label: 'Area', key: 'area' }, { label: 'Phone', render: o => o.phone ? h('a', { class: 'tel', href: 'tel:' + o.phone.replace(/[^+\d]/g, '') }, icon('phone', 16), o.phone) : '-' }], hs) : emptyState('No hospitals listed.')));
}

// ---------- Puntland map (satellite / street), public
export async function puntlandMap() {
  const [hr, pr] = await Promise.all([GET('/hospitals'), GET('/providers')]);
  const fac = [...hr.hospitals.map(o => ({ ...o, kind: 'hospital', type: 'hospital' })), ...pr.providers.filter(p => ['ambulance', 'police', 'fire'].includes(p.type)).map(p => ({ ...p, kind: 'station' }))].filter(o => o.lat != null && o.lng != null);
  const map = liveMap([], { view: 'puntland', places: true, markers: fac.map(o => ({ kind: o.kind, type: o.type, lat: o.lat, lng: o.lng, label: o.name })), height: 'min(64vh, 520px)' });
  const kindName = { hospital: 'Hospital', ambulance: 'Ambulance', police: 'Police', fire: 'Fire brigade' };
  return h('div', head('Puntland map', 'Satellite imagery and street map of the whole region.'),
    demoNote('Satellite pictures come from Esri and the street map from OpenStreetMap, so an internet connection is needed. Facility positions are demo data.'),
    h('div', { class: 'chips' }, h('button', { class: 'chip', onclick: () => map.update([], { refit: true }) }, icon('pin', 16), t('Puntland')), PLACES.map(p => h('button', { class: 'chip', onclick: () => map.flyTo(p.lat, p.lng, 12) }, p.name))),
    h('div', { class: 'panel' }, map, h('div', { class: 'legend' }, ['hospital', 'ambulance', 'police', 'fire'].map(k => h('span', { class: 'rtag u-' + k }, icon(k, 16), t(kindName[k]))))),
    panel('Facilities (demo)', fac.length ? table([{ label: 'Name', key: 'name' }, { label: 'Type', render: o => t(kindName[o.type]) }, { label: 'Area', key: 'area' },
      { label: '', render: o => h('button', { class: 'btn sm ghost', onclick: () => { map.flyTo(o.lat, o.lng, 14); map.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, icon('pin', 16), t('Show on map')) }], fac) : emptyState('Nobody listed yet.')));
}

export async function system() {
  const draw = o => {
    const f = o.facilities, c = o.cases;
    const row = (ic, label, total, avail) => h('div', { class: 'tile' }, h('span', icon(ic, 16), ' ', t(label)), h('b', total), h('small', avail === undefined ? ' ' : t('Available now') + ': ' + avail));
    return h('div',
      h('div', { class: 'live-dot' }, h('i'), t('System active'), ' - ', t('updates every few seconds')),
      h('div', { class: 'grid g4 keep2' }, tile(t('Requests today'), c.today), tile(t('Active requests'), c.active), tile(t('Total requests'), c.total), tile(t('Avg minutes to arrival'), c.avgMinutesToHandover === null ? '-' : c.avgMinutesToHandover)),
      h('h3', { class: 'sec-title' }, t('Services connected')),
      h('div', { class: 'grid g4 keep2' }, row('hospital', 'Hospital', f.hospital), row('ambulance', 'Ambulance', f.ambulance, o.available.ambulance), row('police', 'Police', f.police, o.available.police), row('fire', 'Fire brigade', f.fire, o.available.fire)),
      h('div', { class: 'grid g3 keep2', style: 'margin-top:14px' }, tile(t('Health cards'), o.cards), tile(t('Orders'), o.orders), tile(t('Appointments'), o.appointments)),
      panel('Areas', table([{ label: 'Area', key: 'name' }, { label: 'Active requests', render: a => a.active }], o.areas)));
  };
  const box = h('div'); let o = await GET('/overview'); box.replaceChildren(draw(o));
  stopPoll();
  S.poll = setInterval(async () => { try { o = await GET('/overview'); box.replaceChildren(draw(o)); } catch (_) { /* keep last view */ } }, 4000);
  return h('div', head('System overview', 'Live picture of hospitals, emergency services and requests across the region.'), box,
    h('div', { class: 'actions', style: 'margin-top:14px' }, h('a', { class: 'btn', href: '#/map' }, icon('pin'), t('Puntland map')), h('a', { class: 'btn ghost', href: '#/emergency' }, icon('alert'), t('Try the emergency demo'))),
    demoNote('Numbers come from the demo system. No personal data is shown.'));
}

// ---------- Auth
export function login() {
  return h('div', head('Log in'), h('div', { class: 'grid g2' }, panel(null, form([{ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'username' }, { name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' }],
    { submit: 'Log in', onSubmit: async v => { const r = await POST('/auth/login', v); await afterAuth(r.user); } })),
  panel('New here?', h('div', h('p', t('Create a free account to order health cards and request appointments.')), h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/register' }, t('Create patient account')), h('a', { class: 'btn ghost', href: '#/register-org' }, t('Register a hospital / provider')))))));
}
export async function afterAuth(user) {
  window.dispatchEvent(new CustomEvent('g24-auth'));
  const after = sessionStorage.getItem('g24-after'); sessionStorage.removeItem('g24-after');
  const home = { patient: '/', hospital_admin: '/org', provider_admin: '/org', operator: '/ops', admin: '/admin' }[user.role];
  go(after && user.role === 'patient' ? after.replace(/^#/, '') : home);
}
const consent = { name: 'consent', type: 'checkbox', label: 'I agree to the privacy notice: GURMAD 24 stores only what is needed, never sells personal data, and I can export or delete my data at any time.', required: true };
export function register() {
  return h('div', head('Create patient account'), panel(null, h('div', demoNote('Demo system: do not enter real medical information.'), form([
    { name: 'name', label: 'Full name', required: true, max: 80, autocomplete: 'name' }, { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email' },
    { name: 'password', label: 'Password', type: 'password', required: true, hint: 'At least 8 characters with letters and numbers.', autocomplete: 'new-password' }, consent],
  { submit: 'Create account', onSubmit: async v => { const r = await POST('/auth/register', { ...v, lang: S.lang }); await afterAuth(r.user); } }))));
}
export function registerOrg() {
  return h('div', head('Register a hospital / provider', 'Your organisation will be reviewed by an administrator before it appears publicly.'), panel(null, form([
    { name: 'orgType', label: 'Organisation type', type: 'select', options: [['hospital', 'Hospital'], ['ambulance', 'Ambulance / medical transport'], ['lab', 'Laboratory / diagnostics'], ['police', 'Police station'], ['fire', 'Fire station']], required: true },
    { name: 'orgName', label: 'Organisation name', required: true, max: 100 }, { name: 'area', label: 'City / area', max: 60, default: 'Gaalkacyo' }, { name: 'phone', label: 'Public phone', type: 'tel', max: 30 }, { name: 'description', label: 'Short description', type: 'textarea', max: 500 },
    { name: 'name', label: 'Your full name', required: true, max: 80 }, { name: 'email', label: 'Your email', type: 'email', required: true }, { name: 'password', label: 'Password', type: 'password', required: true, hint: 'At least 8 characters with letters and numbers.', autocomplete: 'new-password' }, consent],
  { submit: 'Submit registration', onSubmit: async v => { const r = await POST('/auth/register-org', { ...v, lang: S.lang }); toast(t('Registered. Waiting for administrator verification.')); await afterAuth(r.user); } })));
}
export function privacy() {
  return h('div', head('Privacy notice'), panel(null, h('div', h('p', t('GURMAD 24 collects the minimum data needed: your name, email, and the orders, appointment requests and support messages you create.')),
    list([t('We never sell personal data, medical records or private information.'), t('Hospitals only see your name and the phone number you give when you request an appointment with them.'), t('You can download all your data and delete your account at any time (Account page).'),
      t('Closed emergency simulation records are anonymised after the retention period.'), t('If you share your location in the emergency demo, it is only used to draw the test map, and it is deleted when the record is anonymised.'), t('This is a demo/test system: do not enter real medical information. Privacy and legal review is required before real use.')]))));
}
