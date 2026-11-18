// Travel pilot: flight-ticket and visa REQUESTS. Nothing is booked, issued or charged; an administrator reviews each request.
import { S, t, h, icon, GET, POST, form, toast, badge, panel, demoNote, emptyState, go, fdate, confirmBox } from '../core.js';

const head = (title, sub) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null));
const CABINS = [['economy', 'Economy'], ['premium', 'Premium economy'], ['business', 'Business']];
const VISA_TYPES = [['tourist', 'Tourist'], ['medical', 'Medical treatment'], ['business', 'Business'], ['study', 'Study'], ['transit', 'Transit']];
const lbl = (list, k) => t((list.find(x => x[0] === k) || [0, k])[1]);
const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const todayStr = () => new Date().toISOString().slice(0, 10);

export const travelTitle = r => r.kind === 'ticket' ? `${r.fromCity} → ${r.toCity}` : `${t('Visa')}: ${r.country}`;

export const travelDetails = r => r.kind === 'ticket'
  ? [[t('Departure'), fdate(r.departDate)], [t('Return'), r.returnDate ? fdate(r.returnDate) : '-'], [t('Passengers'), String(r.passengers)], [t('Cabin'), lbl(CABINS, r.cabin)]]
  : [[t('Visa type'), lbl(VISA_TYPES, r.visaType)], [t('Travel date'), fdate(r.travelDate)], [t('Travelers'), String(r.travelers)]];

function requestCard(r) {
  return h('article', { class: 'panel appointment-card' },
    h('div', { class: 'appointment-card-head' }, h('div', h('small', t(r.kind === 'ticket' ? 'FLIGHT REQUEST' : 'VISA REQUEST') + ' · ' + r.code), h('h3', travelTitle(r))), badge(r.status)),
    h('dl', { class: 'kv' }, travelDetails(r).flatMap(([k, v]) => [h('dt', k), h('dd', v)])),
    r.adminNote ? h('p', h('b', t('Note from GURMAD 24: ')), r.adminNote) : null,
    ['requested', 'reviewing'].includes(r.status) ? h('div', { class: 'actions' },
      h('button', { class: 'btn sm danger', onclick: async () => { if (await confirmBox(t('Cancel this request?'))) { await POST('/travel/' + r.id + '/cancel'); toast(t('Request cancelled')); refresh(); } } }, t('Cancel'))) : null);
}

const waLink = n => 'https://wa.me/' + String(n).replace(/\D/g, '');

function agencyCard(a) {
  const tel = n => h('a', { class: 'btn sm', href: 'tel:' + n }, icon('phone', 16), n);
  return h('article', { class: 'panel' },
    h('div', { class: 'appointment-card-head' }, h('div', h('small', t('PUBLIC LISTING') + ' · ' + a.city), h('h3', a.name)), badge('pending')),
    h('p', { style: 'margin:4px 0;color:var(--muted);font-size:13px' }, a.address),
    h('p', { style: 'margin:4px 0;font-size:13px' }, a.services.map(s => t(s)).join(' · ')),
    h('div', { class: 'note' }, icon('alert', 18), h('span', t(a.caution))),
    h('div', { class: 'actions', style: 'flex-wrap:wrap' },
      a.phones.slice(0, 2).map(tel),
      a.whatsapp ? h('a', { class: 'btn sm ghost', href: waLink(a.whatsapp), target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp') : null,
      a.email ? h('a', { class: 'btn sm ghost', href: 'mailto:' + a.email }, t('Email')) : null),
    h('small', { style: 'color:var(--muted)' }, t('Source: ') + new URL(a.sourceUrl).hostname));
}

async function agencyPanel() {
  try {
    const { agencies, retrievedAt } = await GET('/travel/agencies');
    return h('section', { class: 'panel' },
      h('h3', t('Travel agencies serving Galkacyo')),
      h('p', { style: 'color:var(--muted);font-size:13px' }, t('Call or WhatsApp an agency to book a real ticket now. These are public listings from each agency website (checked {d}); GURMAD 24 has not verified them yet. Never pay before you get a written quote.', { d: retrievedAt })),
      h('div', { class: 'grid g2' }, agencies.map(agencyCard)));
  } catch (_) { return null; }
}

export async function travel({ query } = {}) {
  const kind = (query && query.kind) === 'visa' ? 'visa' : 'ticket';
  const switcher = h('div', { class: 'chips' }, [['ticket', 'Flight ticket'], ['visa', 'Visa']].map(([k, l]) =>
    h('button', { class: 'chip', type: 'button', 'aria-pressed': kind === k, onclick: () => go('/travel?kind=' + k) }, t(l))));
  const intro = [head('Travel & visa', 'Send a flight-ticket or visa request. We review it and reply here.'),
    demoNote('Pilot demo: this sends a request only. No ticket is booked, no visa is issued and no money is taken.')];

  const agencies = await agencyPanel();
  if (!S.user || S.user.role !== 'patient') {
    return h('div', ...intro, agencies, panel(null, h('div',
      h('p', t(S.user ? 'Only patient accounts can send travel requests.' : 'Log in or create an account to send a travel request.')),
      S.user ? null : h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/login' }, t('Log in')), h('a', { class: 'btn ghost', href: '#/register' }, t('Create account'))))));
  }

  const { requests } = await GET('/travel');
  const consent = { name: 'consent', label: 'I agree that GURMAD 24 may use these details to review my request.', type: 'checkbox', required: true };
  const common = [{ name: 'contactPhone', label: 'Phone (optional)', type: 'tel', inputmode: 'tel', max: 30 }, { name: 'note', label: 'Note (optional)', type: 'textarea', max: 200, rows: 2 }, consent];
  const fields = kind === 'ticket'
    ? [{ name: 'fromCity', label: 'From (city)', required: true, max: 60 }, { name: 'toCity', label: 'To (city)', required: true, max: 60 },
      { name: 'departDate', label: 'Departure date', type: 'date', min: todayStr(), required: true }, { name: 'returnDate', label: 'Return date (optional)', type: 'date', min: todayStr() },
      { name: 'passengers', label: 'Passengers', type: 'number', min: 1, default: 1 }, { name: 'cabin', label: 'Cabin', type: 'select', options: CABINS, default: 'economy' }, ...common]
    : [{ name: 'country', label: 'Destination country', required: true, max: 60 }, { name: 'visaType', label: 'Visa type', type: 'select', options: VISA_TYPES, default: 'tourist' },
      { name: 'travelDate', label: 'Planned travel date', type: 'date', min: todayStr(), required: true }, { name: 'travelers', label: 'Travelers', type: 'number', min: 1, default: 1 }, ...common];

  const fm = form(fields, {
    submit: 'Send request',
    onSubmit: async v => {
      const body = { ...v, kind };
      for (const k of ['returnDate', 'contactPhone', 'note']) if (!body[k]) delete body[k];
      for (const k of ['passengers', 'travelers']) if (body[k] !== undefined) body[k] = Number(body[k]);
      await POST('/travel', body);
      toast(t('Request sent. We will reply here.'));
      refresh();
    },
  });

  return h('div', ...intro, agencies, switcher,
    h('div', { class: 'grid g2' }, panel('New request', fm),
      h('div', h('h3', t('My travel requests')), requests.length ? h('div', requests.map(requestCard)) : emptyState('No travel requests yet.'))));
}
