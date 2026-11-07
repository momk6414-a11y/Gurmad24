// Public + authentication screens: home, health card marketplace, hospitals, services, emergency info, login/register.
import { S, t, h, icon, GET, POST, api, form, modal, toast, money, badge, table, panel, tile, list, demoNote, emptyState, errText, go, link, fdate, setLang } from '../core.js';
import { receiptNode } from './shared.js';

export const APPT_CATS = [['general', 'General visit'], ['checkup', 'Check-up'], ['lab_test', 'Lab test'], ['follow_up', 'Follow-up'], ['other', 'Other']];
export const CASE_CATS = [['general', 'General help request'], ['transport', 'Patient transport'], ['accident', 'Accident'], ['maternal', 'Maternal'], ['other', 'Other']];

const verified = ok => ok ? h('span', { class: 'badge ok' }, icon('check', 12), ' ', t('Verified')) : null;
const head = (title, sub, right) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null), right || null);
export const notInsurance = () => demoNote('Health cards are hospital service products. They are NOT insurance and do not guarantee treatment or coverage.');

// ---------- Home
export async function home() {
  const [cards, spons, hs] = await Promise.all([GET('/cards?sort=price_asc'), GET('/sponsored'), GET('/hospitals')]);
  const step = (n, ic, title, text) => h('div', { class: 'step' }, h('div', { class: 'step-n' }, n), h('div', { class: 'step-ic' }, icon(ic, 22)), h('h4', t(title)), h('p', t(text)));
  const who = (ic, title, text, cta, href) => h('div', { class: 'who' }, h('div', { class: 'who-ic' }, icon(ic, 26)), h('h4', t(title)), h('p', t(text)), h('a', { class: 'btn sm ghost', href }, t(cta)));
  const trust = (ic, title, text) => h('div', { class: 'trust' }, icon(ic, 22), h('div', h('b', t(title)), h('p', t(text))));
  return h('div',
    h('section', { class: 'hero2' },
      h('div', { class: 'hero2-text' }, h('div', { class: 'eyebrow' }, t('GURMAD 24 - Gaalkacyo pilot')), h('h1', t('Clear coordination. Accessible healthcare.')),
        h('p', t('Browse hospital health cards, find verified hospitals and providers, and request appointments - in Somali or English.')),
        h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/cards' }, icon('card'), t('Browse health cards')), h('a', { class: 'btn ghost', href: '#/hospitals' }, icon('hospital'), t('Find a hospital')), S.user ? null : h('a', { class: 'btn ghost', href: '#/register' }, icon('user'), t('Create account'))),
        h('div', { class: 'stats-row' }, h('div', h('b', hs.hospitals.length), h('span', t('Verified hospitals'))), h('div', h('b', cards.cards.length), h('span', t('Health cards'))), h('div', h('b', '2'), h('span', t('Languages'))))),
      h('img', { class: 'hero2-img', src: '/img/hero.svg', alt: '', width: 560, height: 420 })),
    h('div', { class: 'panel sos' }, h('div', { style: 'display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap' }, icon('alert', 28), h('div', { style: 'flex:1;min-width:220px' }, h('h3', t('This app does not send ambulances')),
      h('p', { style: 'margin:6px 0 0;color:var(--muted)' }, t('Live dispatch is switched off while the service is being tested. In a real emergency go to the nearest hospital or call your local emergency services directly.'))), h('a', { class: 'btn', href: '#/emergency' }, t('Emergency information')))),
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
  const sec = (title, type) => { const l = prov.filter(p => p.type === type); return panel(title, l.length ? h('div', { class: 'grid g2' }, l.map(p => h('article', { class: 'hc' }, h('div', { class: 'hosp' }, h('b', p.name), verified(p.verified), type === 'ambulance' ? h('span', { class: p.available ? 'badge ok' : 'badge mute' }, p.available ? t('Available') : t('Unavailable')) : null),
    h('div', { class: 'meta' }, p.description, p.serviceAreas.length ? h('div', t('Areas: {a}', { a: p.serviceAreas.join(', ') })) : null), p.services.length ? list(p.services.map(s => s.name + ' - ' + money(s.priceCents))) : null,
    p.phone ? h('a', { class: 'tel', href: 'tel:' + p.phone.replace(/[^+\d]/g, '') }, icon('phone', 16), p.phone) : null,
    type === 'lab' ? h('button', { class: 'btn sm', onclick: () => appointmentModal(p, p.services) }, t('Request appointment')) : null))) : emptyState('Nobody listed yet.')); };
  return h('div', head('Healthcare services', 'Verified ambulance and laboratory providers.'), demoNote('Listings are demo data. Availability is set by each provider and is not a live guarantee.'),
    sec('Ambulance and medical transport', 'ambulance'), sec('Laboratories and diagnostics', 'lab'),
    sp.listings.length ? panel('Sponsored', h('div', { class: 'grid g3' }, sp.listings.map(s => h('div', { class: 'hc' }, h('span', { class: 'badge spons' }, t('SPONSORED')), h('h4', s.headline), h('div', { class: 'meta' }, s.text))))) : null);
}

// ---------- Emergency info + SIMULATED request
export async function emergency() {
  const hs = (await GET('/hospitals')).hospitals; let box;
  const f = form([{ name: 'category', label: 'Request type', type: 'select', options: CASE_CATS, required: true }, { name: 'area', label: 'Area (general, not an exact address)', max: 60 }, { name: 'note', label: 'Short note (no names, no medical details)', max: 200 }],
    { submit: 'Create simulated request', onSubmit: async v => { const r = await POST('/emergency/simulate', v); box.replaceChildren(h('div', { class: 'note' }, icon('check', 18), h('span', t('Simulation recorded as {code}. Nothing was sent to anyone and no one is coming.', { code: r.case.code })))); } });
  box = h('div');
  return h('div', head('Emergency information'),
    h('div', { class: 'panel sos' }, h('h3', t('In a real emergency')), h('ul', { class: 'bul', style: 'margin-top:8px' }, h('li', t('Go to the nearest hospital or call your local emergency services directly.')), h('li', t('GURMAD 24 does NOT dispatch ambulances, track locations or call anyone at this stage.')), h('li', t('The platform never diagnoses and never gives treatment advice.')))),
    panel('Hospital contacts (verified)', hs.length ? table([{ label: 'Hospital', key: 'name' }, { label: 'Area', key: 'area' }, { label: 'Phone', render: o => o.phone ? h('a', { class: 'tel', href: 'tel:' + o.phone.replace(/[^+\d]/g, '') }, icon('phone', 16), o.phone) : '-' }], hs) : emptyState('No hospitals listed.')),
    panel('Try the coordination dashboard (simulation)', h('div', demoNote('SIMULATION ONLY: this creates a test record that operators can see in the demo dashboard. It does not request real help.'), f, box)));
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
    { name: 'orgType', label: 'Organisation type', type: 'select', options: [['hospital', 'Hospital'], ['ambulance', 'Ambulance / medical transport'], ['lab', 'Laboratory / diagnostics']], required: true },
    { name: 'orgName', label: 'Organisation name', required: true, max: 100 }, { name: 'area', label: 'City / area', max: 60, default: 'Gaalkacyo' }, { name: 'phone', label: 'Public phone', type: 'tel', max: 30 }, { name: 'description', label: 'Short description', type: 'textarea', max: 500 },
    { name: 'name', label: 'Your full name', required: true, max: 80 }, { name: 'email', label: 'Your email', type: 'email', required: true }, { name: 'password', label: 'Password', type: 'password', required: true, hint: 'At least 8 characters with letters and numbers.', autocomplete: 'new-password' }, consent],
  { submit: 'Submit registration', onSubmit: async v => { const r = await POST('/auth/register-org', { ...v, lang: S.lang }); toast(t('Registered. Waiting for administrator verification.')); await afterAuth(r.user); } })));
}
export function privacy() {
  return h('div', head('Privacy notice'), panel(null, h('div', h('p', t('GURMAD 24 collects the minimum data needed: your name, email, and the orders, appointment requests and support messages you create.')),
    list([t('We never sell personal data, medical records or private information.'), t('Hospitals only see your name and the phone number you give when you request an appointment with them.'), t('You can download all your data and delete your account at any time (Account page).'),
      t('Closed emergency simulation records are anonymised after the retention period.'), t('This is a demo/test system: do not enter real medical information. Privacy and legal review is required before real use.')]))));
}
