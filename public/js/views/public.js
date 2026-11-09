// Public + authentication screens: home, health card marketplace, hospitals, services, emergency info, login/register.
import { SS, S, t, h, icon, GET, POST, api, form, modal, toast, money, badge, table, panel, tile, list, demoNote, emptyState, errText, go, link, fdate, setLang } from '../core.js';
import { receiptNode, cardPass } from './shared.js';
import { liveMap, osmLink, PLACES } from '../map.js';
import { placeTrust } from '../place-trust.mjs';

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
  const hot = await hotlines();
  const quickLink = (path, symbol, title, detail) => h('a', {
    class: 'g24-home-link',
    href: '#' + path,
    'aria-label': t(title) + ' — ' + t(detail),
    onclick: e => { e.preventDefault(); go(path); }
  },
    h('span', { class: 'g24-home-link-icon' }, icon(symbol, 22)),
    h('span', { class: 'g24-home-link-copy' }, h('b', t(title)), h('small', t(detail)))
  );

  return h('div', { class: 'g24-home' },
    h('section', { class: 'g24-home-hero', 'aria-labelledby': 'home-title' },
      h('div', { class: 'g24-home-main' },
        h('div', { class: 'g24-home-brand' },
          h('span', { class: 'g24-home-brand-icon' }, icon('activity', 18)),
          h('span', { class: 'eyebrow' }, 'GURMAD 24  ·  ' + t('Fast help, one tap away'))
        ),
        h('h1', { id: 'home-title' }, t('One network. Every emergency.')),
        h('p', t('A connected response system for people, location and essential services.')),
        h('div', { class: 'g24-home-cta' },
          h('a', { class: 'btn sos-cta', href: '#/emergency', onclick: e => { e.preventDefault(); go('/emergency'); } }, icon('alert', 19), t('Request help now')),
          h('a', { class: 'btn ghost g24-home-map', href: '#/map', onclick: e => { e.preventDefault(); go('/map'); } }, icon('pin', 19), t('Open live map'))
        ),
        h('div', { class: 'g24-home-proof' },
          h('span', icon('shield', 15), t('People first')),
          h('span', icon('activity', 15), t('One connected system')),
          h('span', icon('globe', 15), t('Somali + English'))
        )
      ),
      h('div', { class: 'g24-home-visual' },
        h('img', { src: '/img/hero.svg', alt: t('GURMAD 24 system map: people, GPS location, ambulance, hospitals, police, fire and support connected in one response network.'), width: 900, height: 620, fetchpriority: 'low' })
      )
    ),
    hot ? h('div', { class: 'g24-home-hotlines' }, hot) : null,
    h('section', { class: 'g24-home-quick', 'aria-label': t('Emergency services') },
      h('div', { class: 'g24-home-section-head' },
        h('h2', t('Emergency services')),
        h('span', t('One connected system'))
      ),
      h('div', { class: 'g24-home-grid' },
        quickLink('/hospitals', 'hospital', 'Hospitals', 'Find care'),
        quickLink('/services', 'ambulance', 'Emergency services', 'Ambulance and providers'),
        quickLink('/map', 'pin', 'Live map', 'GPS and locations'),
        quickLink('/cards', 'card', 'Health cards', 'Explore healthcare')
      )
    ),
    h('div', { class: 'g24-home-safety' },
      icon('alert', 18),
      h('span', t('Pilot demo only — emergency dispatch is simulated. For a real emergency, contact local emergency services directly.'))
    )
  );
}

// ---------- Marketplace
export function cardTile(c, { compare = true } = {}) {
  const sel = S.cmp.includes(c.id);
  return h('article', { class: 'hc' },
    h('img', { class: 'art', src: '/img/card-' + ['mint', 'blue', 'violet'][String(c.id).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3] + '.svg', alt: '', width: 320, height: 112, loading: 'lazy' }),
    h('div', { class: 'hosp' }, c.hospital ? c.hospital.name : '', verified(c.hospital && c.hospital.verified)),
    h('h4', c.name), h('div', { class: 'price' }, money(c.priceCents), h('small', { style: 'font-size:12px;color:var(--muted);font-weight:500' }, ' ' + t('{n} days', { n: c.validityDays }))),
    h('div', { class: 'meta' }, (c.included || []).slice(0, 2).join(' - ')), h('div', { class: 'card-facts' }, h('span', t('{n} included services', { n: (c.included || []).length })), h('span', t('{n} exclusions', { n: (c.excluded || []).length }))), h('span', { class: 'badge demo' }, t('Demo price')),
    h('div', { class: 'row' }, h('button', { class: 'btn sm', type: 'button', onclick: () => orderFlow(c) }, icon('bag', 16), t('Buy now')),
      h('button', { class: 'btn sm ghost', type: 'button', onclick: () => go('/cards/' + c.id) }, t('View details'))),
    compare ? h('label', { class: 'cmp-pick' }, h('input', { type: 'checkbox', checked: sel, onchange: e => toggleCompare(c.id, e.currentTarget) }), t('Compare this card')) : null);
}
function toggleCompare(id, box) {
  const i = S.cmp.indexOf(id);
  if (i >= 0) S.cmp.splice(i, 1);
  else if (S.cmp.length >= 3) { box.checked = false; toast(t('You can compare up to 3 cards.'), 'err'); return; }
  else S.cmp.push(id);
  renderCompareBar();
}
export function renderCompareBar() {
  document.getElementById('cmpBar')?.remove();
  if (!S.cmp.length) return;
  const ready = S.cmp.length >= 2;
  document.body.append(h('div', { class: 'compare-bar', id: 'cmpBar' },
    h('span', { class: 'cb-text' }, h('b', t('{n} selected', { n: S.cmp.length })), h('small', ready ? t('Ready to compare') : t('Pick one more card'))),
    h('span', { class: 'actions tight' }, ready ? h('button', { class: 'btn sm', onclick: () => go('/compare') }, t('Compare now')) : null,
      h('button', { class: 'btn sm ghost', onclick: () => { S.cmp = []; renderCompareBar(); document.querySelectorAll('.cmp-pick input').forEach(x => { x.checked = false; }); } }, t('Remove all')))));
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
  if (!S.user) { toast(t('Please log in to order.')); SS.set('g24-after', location.hash); return go('/login'); }
  if (S.user.role !== 'patient') return toast(t('Only patient accounts can order cards.'), 'err');
  const METHODS = [['evc', 'EVC Plus'], ['zaad', 'Zaad'], ['edahab', 'eDahab'], ['card', t('Bank card')]];
  let method = 'evc', busy = false, m;
  const phone = h('input', { type: 'tel', inputmode: 'numeric', autocomplete: 'tel', maxlength: 18, placeholder: '61 xxx xxxx', value: S.user.phone || '', 'aria-label': t('Mobile money number'), style: 'font-size:16px' });
  const phoneRow = h('div', { class: 'field' }, h('label', t('Mobile money number')), phone);
  const terms = h('input', { type: 'checkbox', id: 'ord_terms' });
  const err = h('div', { class: 'form-error', role: 'alert' });
  const pay = h('button', { class: 'btn pay-btn', type: 'button' }, t('Pay {p} and get my card', { p: money(c.priceCents) }));
  const tiles = h('div', { class: 'pay-tiles', role: 'radiogroup', 'aria-label': t('Payment method') }, METHODS.map(([k, l]) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': k === method, class: 'pay-tile' + (k === method ? ' on' : ''), onclick: e => {
      method = k; tiles.querySelectorAll('.pay-tile').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); }); e.currentTarget.classList.add('on'); e.currentTarget.setAttribute('aria-checked', 'true'); phoneRow.style.display = k === 'card' ? 'none' : '';
    } }, l)));
  pay.onclick = async () => {
    if (busy) return; err.textContent = '';
    const digits = phone.value.replace(/[^\d]/g, '');
    if (method !== 'card' && (digits.length < 7 || digits.length > 15)) { err.textContent = t('Enter a valid mobile number.'); phone.focus(); return; }
    if (!terms.checked) { err.textContent = t('Please accept the terms to continue.'); return; }
    busy = true; pay.disabled = true; pay.textContent = t('Processing...');
    try {
      const r = await POST('/orders', { cardId: c.id, acceptTerms: true, method, phone: digits });
      m.close(); toast(t('Your digital card is ready.'));
      const m2 = modal(t('Your digital card'), h('div', cardPass(r.order), h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/me/orders', onclick: () => m2.close() }, t('My cards')), h('button', { class: 'btn ghost', onclick: () => receiptModal(r.receipt) }, t('Receipt')))), { wide: false });
    } catch (e) { err.textContent = errText(e); busy = false; pay.disabled = false; pay.textContent = t('Pay {p} and get my card', { p: money(c.priceCents) }); }
  };
  m = modal(t('Buy digital card'), h('div', demoNote('SANDBOX: no real payment is made. This only creates a demo order and receipt.'),
    h('div', { class: 'buy-sum' }, h('div', h('b', c.name), h('small', c.hospital ? c.hospital.name : '')), h('div', { class: 'buy-price' }, money(c.priceCents))),
    h('div', { class: 'buy-meta' }, t('{n} days from purchase', { n: c.validityDays })),
    h('h4', t('Payment method')), tiles, phoneRow,
    h('label', { class: 'chk-row', for: 'ord_terms' }, terms, h('span', t('I have read the terms and refund policy, and I understand this is a hospital service card, not insurance.'))),
    err, pay, h('button', { class: 'btn ghost', type: 'button', onclick: () => m.close() }, t('Cancel'))));
}
const receiptModal = r => { const m = modal(t('Receipt'), h('div', receiptNode(r), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => window.print() }, t('Print / save PDF')), h('button', { class: 'btn ghost', onclick: () => m.close() }, t('Close'))))); };

// Public check page opened by scanning a card QR code: shows only validity, never personal data.
export async function verifyCard({ code }) {
  const r = await GET('/verify/' + encodeURIComponent(code));
  const ok = r.found && r.state === 'active';
  return h('div', head('Check a digital card'), h('div', { class: 'panel vc ' + (ok ? 'ok' : 'bad') },
    r.found ? h('div', h('h3', ok ? t('Card is valid') : t(r.state === 'expired' ? 'Card has expired' : 'Card was refunded')),
      h('dl', { class: 'kv' }, h('dt', t('Card')), h('dd', r.cardName), h('dt', t('Hospital')), h('dd', r.hospitalName), h('dt', t('Holder')), h('dd', r.holder), h('dt', t('Valid until')), h('dd', fdate(r.validUntil)), h('dt', t('Code')), h('dd', h('span', { class: 'mono' }, code.toUpperCase()))),
      r.included && r.included.length ? h('div', h('strong', t('Included services')), list(r.included)) : null, demoNote('Demo card: sandbox payment, not insurance.'))
      : h('div', h('h3', t('Card not found')), h('p', t('Check the code and try again.')))));
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
  if (!S.user) { toast(t('Please log in first.')); SS.set('g24-after', location.hash); return go('/login'); }
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
const saveTrack = v => { try { v ? SS.set(TRACK_KEY, JSON.stringify(v)) : SS.del(TRACK_KEY); } catch (_) { /* storage may be blocked */ } };
const loadTrack = () => { try { return JSON.parse(SS.get(TRACK_KEY) || 'null'); } catch (_) { return null; } };
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
    box.replaceChildren(...[
      tr.mode === 'REAL'
        ? h('div', { class: 'note warn' }, icon('alert', 18), h('span', t('REAL REQUEST: your request is waiting for an operator. If it is urgent, also call the emergency number above.')))
        : h('div', { class: 'note' }, icon('alert', 18), h('span', t('TEST ONLY: no real police, fire or ambulance service was contacted. This is a simulation for demonstration.'))),
      h('div', { class: 'trk-head' }, h('div', h('small', t('Request code')), h('b', { class: 'trk-code' }, tr.code)), h('div', { class: 'trk-type u-' + tr.responder }, icon(tr.responder, 20), h('span', t(SERVICE_NAME[tr.responder])), h('small', catLabel(tr.category)))),
      steps,
      tr.status === 'en_route' && tr.etaMinutes ? h('p', { class: 'eta' }, icon('pin', 18), t('Arriving in about {m} min (simulated).', { m: tr.etaMinutes })) : null,
      tr.status === 'received' ? h('p', { class: 'hint' }, t('Finding the nearest unit...')) : null,
      ro ? h('p', { class: 'unit-info' }, icon(ro.type, 18), h('b', ro.name), ro.phone ? h('span', ' ' + ro.phone) : null) : null,
      mapEl,
      tr.unit && tr.unit.demoPlaced ? h('p', { class: 'hint' }, t('Your location is far from the demo stations, so the demo unit starts a few kilometres from you.')) : null,
      tr.location ? h('p', { class: 'hint' }, h('a', { href: osmLink(tr.location), target: '_blank', rel: 'noopener noreferrer' }, t('Open the location in OpenStreetMap'))) : null,
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => { stopPoll(); saveTrack(null); onNew(); } }, icon('plus'), t('New test request')))].filter(Boolean));
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

// Voice message (max 15 s, low bitrate) recorded in the browser; sent with the test request.
const VOICE_MAX_S = 15;
function voiceRecorder() {
  let rec = null, chunks = [], stream = null, timer = null, left = 0, voice = null, url = null;
  const status = h('span', { class: 'hint', 'aria-live': 'polite' });
  const player = h('audio', { controls: true, hidden: true });
  const btn = h('button', { type: 'button', class: 'btn ghost' }); const del = h('button', { type: 'button', class: 'btn sm ghost', hidden: true }, t('Delete recording'));
  const supported = !!(navigator.mediaDevices && window.MediaRecorder);
  const draw = () => { btn.replaceChildren(icon('mic'), t(rec ? 'Stop (' + left + 's)' : voice ? 'Record again' : 'Record your voice')); btn.classList.toggle('rec', !!rec); };
  const finish = () => { clearInterval(timer); if (stream) stream.getTracks().forEach(x => x.stop()); stream = null; };
  const start = async () => {
    status.textContent = '';
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (_) { status.textContent = t('Microphone permission was denied.'); return; }
    chunks = []; const opts = { audioBitsPerSecond: 16000 };
    try { rec = new MediaRecorder(stream, opts); } catch (_) { rec = new MediaRecorder(stream); }
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      finish(); const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); rec = null; draw();
      if (blob.size > 150000) { status.textContent = t('Recording too long. Try a shorter message.'); return; }
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1] || ''); fr.readAsDataURL(blob); });
      voice = { mime: blob.type, data: b64 }; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      player.src = url; player.hidden = false; del.hidden = false; status.textContent = t('Voice message ready.'); draw();
    };
    const iosLike = /mp4|aac/i.test(rec.mimeType || '');
    left = iosLike ? 10 : VOICE_MAX_S; rec.start(); draw();
    timer = setInterval(() => { left--; draw(); if (left <= 0 && rec && rec.state === 'recording') rec.stop(); }, 1000);
  };
  btn.onclick = () => { if (rec && rec.state === 'recording') rec.stop(); else start(); };
  del.onclick = () => { voice = null; player.hidden = true; player.removeAttribute('src'); del.hidden = true; status.textContent = ''; draw(); };
  draw();
  const node = h('div', { class: 'field voice-box' }, h('label', t('Voice message (optional)')), supported ? h('div', { class: 'actions tight' }, btn, del) : h('span', { class: 'hint' }, t('This device cannot record audio.')), player, status,
    h('span', { class: 'hint' }, t('Speak up to 15 seconds. Only the operator can listen. Do not say names or medical details.')));
  node.get = () => voice; node.reset = () => { finish(); if (rec && rec.state === 'recording') { rec.onstop = null; rec.stop(); } };
  return node;
}

function requestForm(box, areas) {
  const vrec = voiceRecorder();
  let service = 'ambulance'; let loc = null;
  const svcBox = h('div', { class: 'svc-pick', role: 'radiogroup', 'aria-label': t('What do you need?') });
  const catSel = h('select', { id: 'em-cat', 'aria-label': t('Request type') });
  const fillCats = () => catSel.replaceChildren(...SERVICES.find(x => x[0] === service)[2].map(c => h('option', { value: c }, catLabel(c))));
  const drawSvc = () => svcBox.replaceChildren(...SERVICES.map(([id, label]) => h('button', { type: 'button', class: 'svc u-' + id, role: 'radio', 'aria-checked': service === id, onclick: () => { service = id; drawSvc(); fillCats(); } }, icon(id, 30), h('b', t(label)))));
  drawSvc(); fillCats();
  const msg = h('p', { class: 'hint', 'aria-live': 'polite' });
  const consent = h('input', { type: 'checkbox', id: 'em-consent' });
  const areaSel = h('select', { id: 'em-area', 'aria-label': t('Area') }, h('option', { value: '' }, t('Choose an area')), areas.map(a => h('option', { value: a.id }, t(a.name))));
  let gpsRequest = 0;
  const cancelGps = () => { gpsRequest++; gps.disabled = false; loc = null; };
  consent.addEventListener('change', () => {
    if (!consent.checked) { cancelGps(); msg.textContent = t('Location sharing is off. Choose an area or agree again to use GPS.'); }
  });
  areaSel.addEventListener('change', () => {
    if (areaSel.value) { cancelGps(); msg.textContent = ''; }
  });
  const gps = h('button', { type: 'button', class: 'btn ghost', onclick: () => {
    if (!consent.checked) { msg.textContent = t('Tick the box to agree before sharing your location.'); return; }
    if (!navigator.geolocation) { msg.textContent = t('This device cannot share its location. Choose an area instead.'); return; }
    const request = ++gpsRequest;
    gps.disabled = true;
    msg.textContent = t('Finding your location...');
    try {
      navigator.geolocation.getCurrentPosition(pos => {
        if (request !== gpsRequest || !consent.checked) return;
        const lat = Number(pos.coords && pos.coords.latitude), lng = Number(pos.coords && pos.coords.longitude), accuracy = Number(pos.coords && pos.coords.accuracy);
        gps.disabled = false;
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(accuracy) || accuracy < 0) {
          loc = null; msg.textContent = t('Could not get your location. Choose an area instead.'); return;
        }
        loc = { lat, lng, accuracy }; areaSel.value = '';
        msg.textContent = t('Location found (about {m} m).', { m: Math.round(accuracy) });
      }, e => {
        if (request !== gpsRequest || !consent.checked) return;
        gps.disabled = false; loc = null;
        msg.textContent = e && e.code === 1 ? t('Location permission was denied. Choose an area instead.') : t('Could not get your location. Choose an area instead.');
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    } catch (_) {
      if (request === gpsRequest) { gps.disabled = false; loc = null; msg.textContent = t('Could not get your location. Choose an area instead.'); }
    }
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
    if (vrec.get()) body.voice = vrec.get();
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
  field('Short note (no names, no medical details)', 'em-note', note), vrec, err, h('div', { class: 'actions' }, send));
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

// ---------- Puntland map: registered facilities on real imagery. Search, filters, details. Public.
export async function puntlandMap() {
  const [hs, ps] = await Promise.all([GET('/hospitals').catch(() => ({ hospitals: [] })), GET('/providers').catch(() => ({ providers: [] }))]);
  const TYPES = [['hospital', 'Hospital'], ['ambulance', 'Ambulance'], ['police', 'Police'], ['fire', 'Fire brigade']];
  const facilities = [
    ...hs.hospitals.map(o => ({ id: o.id, type: 'hospital', kind: 'hospital', name: o.name, area: o.area, phone: o.phone, address: o.address, hours: o.hours, available: true, lat: o.lat, lng: o.lng })),
    ...ps.providers.filter(p => ['ambulance', 'police', 'fire'].includes(p.type)).map(p => ({ id: p.id, type: p.type, kind: 'station', name: p.name, area: p.area, phone: p.phone, address: p.address, hours: p.hours, available: p.available, lat: p.lat, lng: p.lng })),
  ];
  // Reference points (Gaalkacyo) from public map references: hidden by default, never a dispatch registry.
  const refs = [
    { id:'uthg', name:'University Teaching Hospital Galkayo', kind:'hospital', type:'hospital', lat:6.7706459, lng:47.4275309, detail:'Isbitaal waxbarasho iyo adeeg caafimaad. Xogta saacadaha/telefoonka waa in goobta laga xaqiijiyaa.', source:'Public place directory', phone:'+252 90 779 5719' },
    { id:'modern', name:'Modern Hospital Galkayo', kind:'hospital', type:'hospital', lat:6.772199, lng:47.4286464, detail:'Isbitaal ku yaal Gaalkacyo; xogta directory-ga ayaa sheegaysa adeeg 24-saac ah, balse waa in la xaqiijiyaa.', source:'Public place directory', phone:'+252 5 858002' },
    { id:'galkayo-hospital', name:'Galkayo Hospital', kind:'hospital', type:'hospital', lat:6.78333, lng:47.4333, detail:'Goob isbitaal oo ku qoran diiwaanka khariidadaha dadweynaha; booska waa qiyaas.', source:'Public place directory', phone:'+252 61 782 0040' },
    { id:'local-gov', name:'Gaalkacyo Local Government Office', kind:'government', type:'government', lat:6.763983405, lng:47.43147466, detail:'Xafiiska Dowladda Hoose ee Gaalkacyo.', source:'African Development Bank mapping document' },
    { id:'immigration', name:'Immigration Offices', kind:'government', type:'government', lat:6.761669548, lng:47.43203028, detail:'Xafiisyada socdaalka ee ku taxan khariidaynta Gaalkacyo.', source:'African Development Bank mapping document' },
    { id:'university', name:'Galkayo University', kind:'landmark', type:'landmark', lat:6.752287218, lng:47.42322456, detail:'Jaamacadda Gaalkacyo — meel tixraac ah oo magaalada ku taal.', source:'African Development Bank mapping document' },
    { id:'city', name:'Bartamaha Gaalkacyo', kind:'landmark', type:'landmark', lat:6.7697, lng:47.4308, detail:'Xarunta magaalada Gaalkacyo; goob tixraac guud.', source:'OpenStreetMap / GeoNames city coordinates' }
  ];
  refs.forEach(r => { r.reference = true; });
  const active = new Set(TYPES.map(x => x[0])); let showRefs = false; let query = ''; let selected = null;
  const hasPos = x => typeof x.lat === 'number' && typeof x.lng === 'number';
  const mopts = { view: 'puntland', markers: [], cluster: true, height: 'min(70vh, 620px)', onMarkerClick: m => choose(m) };
  const map = liveMap([], mopts);
  const card = h('div'); const listBox = h('div', { class: 'pm-list', role: 'list' }); const count = h('small', { class: 'hint', 'aria-live': 'polite' }); const chips = h('div', { class: 'chips' });
  const visible = () => {
    const q = query.trim().toLowerCase();
    const all = [...facilities.filter(f => active.has(f.type)), ...(showRefs ? refs : [])];
    return all.filter(f => !q || (f.name + ' ' + (f.area || '')).toLowerCase().includes(q));
  };
  const typeLabel = x => x.reference ? (x.kind === 'hospital' ? 'Hospital' : x.kind === 'government' ? 'Government' : 'Landmark') : (TYPES.find(y => y[0] === x.type) || [0, x.type])[1];
  const typeIcon = x => x.type === 'hospital' ? 'hospital' : x.type === 'government' ? 'shield' : x.type === 'landmark' ? 'pin' : x.type;
  function detail() {
    const x = selected;
    if (!x) { card.replaceChildren(h('p', { class: 'hint' }, t('Select a place on the map or in the list to see its details.'))); return; }
    const tel = x.phone ? x.phone.replace(/[^+\\d]/g, '') : '';
    const trust = placeTrust(x);
    card.replaceChildren(h('div', { class: 'pm-card u-' + x.type },
      h('div', { class: 'pm-card-h' },
        h('span', { class: 'pm-dot' }, icon(typeIcon(x), 16)),
        h('div', h('b', x.name), h('small', t(typeLabel(x)) + (x.area ? ' - ' + x.area : ''))),
        h('span', { class: 'badge ' + trust.badge }, t(trust.label))),
      h('p', { class: 'hint' }, t(trust.notice)),
      x.reference ? h('p', x.detail) : null,
      x.reference ? h('small', { class: 'hint' }, t('Source: {s}', { s: x.source })) : null,
      x.address ? h('p', icon('pin', 14), ' ', x.address) : null,
      x.hours ? h('p', icon('clock', 14), ' ', x.hours) : null,
      !x.reference && x.type !== 'hospital' ? h('p', x.available ? t('Available now') : t('Not available now')) : null,
      h('div', { class: 'actions' },
        tel ? h('a', { class: 'btn sm', href: 'tel:' + tel }, icon('phone', 15), t('Call') + ' ' + x.phone) : null,
        hasPos(x) ? h('a', { class: 'btn sm ghost', href: osmLink(x), target: '_blank', rel: 'noopener noreferrer' }, icon('pin', 15), t('Get directions')) : null),
      !hasPos(x) ? h('small', { class: 'hint' }, t('This place has no map position yet.')) : null));
  }
  function choose(x) { selected = x; map.select(x.id); detail(); if (hasPos(x)) map.flyTo(x.lat, x.lng, 14); drawList(); }
  function drawList() {
    const v = visible(); count.textContent = t('{n} places', { n: v.length });
    listBox.replaceChildren(...(v.length ? v.map(x => h('button', { type: 'button', role: 'listitem', class: 'pm-row u-' + x.type, 'aria-current': selected && selected.id === x.id ? 'true' : null, onclick: () => choose(x) },
      h('span', { class: 'pm-dot' }, icon(typeIcon(x), 14)), h('span', { class: 'pm-txt' }, h('b', x.name), h('small', t(typeLabel(x)) + (x.area ? ' - ' + x.area : '') + ' · ' + t(placeTrust(x).label) + (hasPos(x) ? '' : ' - ' + t('no map position')))))) : [h('p', { class: 'hint', style: 'padding:12px' }, t('No places match.'))]));
  }
  function drawMap() { mopts.markers = visible().filter(hasPos).map(x => ({ ...x, label: x.name, ariaLabel: t(placeTrust(x).ariaLabel, { name: x.name }) })); map.update([], { refit: false }); map.select(selected && selected.id); }
  function drawChips() {
    chips.replaceChildren(...TYPES.map(([k, l]) => h('button', { type: 'button', class: 'chip u-' + k, 'aria-pressed': active.has(k), onclick: () => { if (active.has(k)) active.delete(k); else active.add(k); refresh(); } }, h('span', { class: 'cdot-t' }), t(l) + ' (' + facilities.filter(f => f.type === k).length + ')')),
      h('button', { type: 'button', class: 'chip', 'aria-pressed': showRefs, onclick: () => { showRefs = !showRefs; refresh(); } }, t('Directory references (unverified)') + ' (' + refs.length + ')'));
  }
  function refresh() { drawChips(); drawMap(); drawList(); }
  const search = h('input', { type: 'search', placeholder: t('Search places'), 'aria-label': t('Search places'), oninput: e => { query = e.target.value; drawMap(); drawList(); } });
  const region = h('select', { 'aria-label': t('Go to'), onchange: e => { const v = e.target.value; if (v === '') map.querySelector('.tm-pl').click(); else { const pl = PLACES[Number(v)]; map.flyTo(pl.lat, pl.lng, 12); } } },
    h('option', { value: '' }, t('All Puntland')), PLACES.map((pl, i) => h('option', { value: String(i) }, pl.name)));
  refresh(); detail();
  return h('div', head('Puntland map', 'Verified facilities and optional Gaalkacyo directory references on satellite imagery.'),
    h('div', { class: 'pm-tools' }, search, region), chips,
    h('div', { class: 'pm' },
      h('div', { class: 'pm-map' }, map, h('div', { class: 'legend' }, TYPES.map(([k, l]) => h('span', { class: 'rtag u-' + k }, icon(k, 15), t(l))))),
      h('aside', { class: 'pm-side' }, panel('Selected place', card), h('div', count, listBox))),
    h('small', { class: 'hint' }, t('Verified facilities shown here come from the GURMAD 24 register. Optional Gaalkacyo reference points come from public directories or mapping documents and are not verified operational facilities. Confirm their details directly before relying on them. This map is not a live dispatch tool.')));
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
  const box = h('div'); let needCode = false;
  const draw = () => box.replaceChildren(form([{ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'username' }, { name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' },
    ...(needCode ? [{ name: 'code', label: 'Authenticator code (6 digits)', required: true, max: 12, inputmode: 'numeric', autocomplete: 'one-time-code' }] : [])],
    { submit: 'Log in', onSubmit: async v => {
      try { const r = await POST('/auth/login', v); await afterAuth(r.user); }
      catch (e) { if (e && e.code === 'two_factor_required' && !needCode) { needCode = true; draw(); toast(t('Enter the 6-digit code from your authenticator app.')); return; } throw e; }
    } }));
  draw();
  return h('div', head('Log in'), h('div', { class: 'grid g2' }, panel(null, box),
  panel('New here?', h('div', h('p', t('Create a free account to order health cards and request appointments.')), h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/register' }, t('Create patient account')), h('a', { class: 'btn ghost', href: '#/register-org' }, t('Register a hospital / provider')))))));
}
export async function afterAuth(user) {
  S.user = user; S.authKnown = true; // known immediately: do not bounce back to login while the session reloads
  window.dispatchEvent(new CustomEvent('g24-auth'));
  const after = SS.get('g24-after'); SS.del('g24-after');
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
