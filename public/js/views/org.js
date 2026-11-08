// Hospital portal and ambulance / lab provider portal.
import { S, t, h, icon, GET, POST, PATCH, DEL, form, modal, toast, money, badge, table, panel, tile, list, demoNote, emptyState, errText, go, fdate, fdt, confirmBox, downloadApi, link, ApiError } from '../core.js';
import { receiptNode } from './shared.js';
import { APPT_CATS, CASE_CATS, stopPoll } from './public.js';
import { liveMap, osmLink } from '../map.js';

const head = (title, sub, right) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null), right || null);
const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const isHosp = () => S.org && S.org.type === 'hospital';
const catName = c => t(([...APPT_CATS, ...CASE_CATS].find(x => x[0] === c) || [0, c])[1]);
const verifyBanner = o => o.status === 'verified' ? null : h('div', { class: 'note' }, icon('alert', 18), h('span', o.status === 'pending' ? t('Your organisation is waiting for administrator verification. You can prepare your profile and drafts, but nothing is public yet.') : t('Your organisation is {s}. {n}', { s: t(o.status), n: o.statusNote })));

export async function dashboard() {
  const { org } = await GET('/org'); S.org = org;
  const wrap = h('div', head(org.name, ({ hospital: 'Hospital portal', lab: 'Laboratory portal', police: 'Police station portal', fire: 'Fire station portal' }[org.type] || 'Ambulance provider portal'), badge(org.status)), verifyBanner(org));
  if (org.type === 'hospital') {
    const [sales, cards, ap, cm] = await Promise.all([GET('/org/reports/sales'), GET('/org/cards'), GET('/org/appointments'), GET('/org/complaints')]);
    wrap.append(h('div', { class: 'grid g4 keep2' }, tile('Published cards', cards.cards.filter(c => c.status === 'published').length, null, () => go('/org/cards')), tile('Orders', sales.report.orders, null, () => go('/org/sales')),
      tile('Gross sales (demo)', money(sales.report.grossCents)), tile('Net to hospital (demo)', money(sales.report.netCents)),
      tile('Appointment requests', ap.appointments.filter(a => a.status === 'requested').length, null, () => go('/org/appointments')), tile('Open complaints', cm.complaints.filter(c => c.status !== 'resolved').length, null, () => go('/org/complaints'))));
  } else {
    const resp = ['ambulance', 'police', 'fire'].includes(org.type);
    const [rq, ap] = await Promise.all([resp ? GET('/org/requests') : { requests: [] }, resp && org.type !== 'ambulance' ? { appointments: [] } : GET('/org/appointments')]);
    const tg = resp ? h('button', { class: 'btn ' + (org.available ? '' : 'ghost'), onclick: async () => { const r = await PATCH('/org/availability', { available: !org.available }); S.org = r.org; toast(t('Availability updated.')); refresh(); } }, org.available ? t('Available - tap to pause') : t('Unavailable - tap to go available')) : null;
    wrap.append(h('div', { class: 'grid g3 keep2' }, tile('Active requests (simulated)', rq.requests.filter(r => r.next.length).length, null, resp ? () => go('/org/requests') : null),
      org.type === 'police' || org.type === 'fire' ? null : tile('Appointment requests', ap.appointments.filter(a => a.status === 'requested').length, null, () => go('/org/appointments')), tile('Status', org.available ? t('Available') : t('Unavailable'))),
      tg ? h('div', { class: 'actions' }, tg) : null);
  }
  wrap.append(demoNote('Demo mode: all sales, fees and subscriptions here are sandbox values. No real money moves.'));
  return wrap;
}

// ---------- Health cards (hospital)
const cardFields = [
  { name: 'name', label: 'Card name', required: true, max: 80 }, { name: 'priceCents', label: 'Price (USD)', type: 'money', required: true, hint: 'You set and approve the price.' }, { name: 'validityDays', label: 'Validity (days)', type: 'number', required: true, min: 1, default: 90 },
  { name: 'included', label: 'Included services (one per line)', type: 'lines', rows: 4 }, { name: 'excluded', label: 'Excluded services (one per line)', type: 'lines', rows: 3 }, { name: 'eligibility', label: 'Eligibility requirements', max: 300 },
  { name: 'terms', label: 'Terms and conditions', type: 'textarea', required: true, rows: 4, max: 1500, hint: 'Do not describe the card as insurance or guaranteed coverage.' }, { name: 'refundPolicy', label: 'Refund and cancellation policy', type: 'textarea', required: true, rows: 3, max: 600 },
];
export async function cards() {
  const { org } = await GET('/org'); const { cards: cs } = await GET('/org/cards');
  const edit = c => { let m; m = modal(c ? t('Edit card') : t('New health card'), h('div', c && c.status === 'published' ? demoNote('Editing a published card unpublishes it until you approve it again.') : null,
    form(cardFields, { initial: c || {}, cancel: () => m.close(), onSubmit: async v => { if (c) await PATCH('/org/cards/' + c.id, v); else await POST('/org/cards', v); m.close(); toast(t('Saved as draft. Review and publish when ready.')); refresh(); } })), { wide: true }); };
  const publish = c => { let m; m = modal(t('Approve and publish'), h('div', h('p', t('{n} - {p}', { n: c.name, p: money(c.priceCents) })), form([{ name: 'attest', type: 'checkbox', label: 'I confirm this hospital has approved this card\'s description, price, validity period and terms, and that it is not presented as insurance.', required: true }],
    { submit: 'Publish', cancel: () => m.close(), onSubmit: async v => { await POST(`/org/cards/${c.id}/publish`, v); m.close(); toast(t('Published.')); refresh(); } }))); };
  return h('div', head('Health cards', 'Create, approve and manage the cards your hospital sells.', h('button', { class: 'btn', onclick: () => edit(null) }, icon('plus'), t('New card'))), verifyBanner(org),
    panel(null, table([{ label: 'Card', key: 'name' }, { label: 'Price', render: c => money(c.priceCents) }, { label: 'Validity', render: c => t('{n} days', { n: c.validityDays }) }, { label: 'Status', render: c => badge(c.status) },
      { label: '', render: c => h('div', { class: 'actions' }, c.status !== 'suspended' ? h('button', { class: 'btn sm ghost', onclick: () => edit(c) }, t('Edit')) : null, ['draft', 'archived'].includes(c.status) ? h('button', { class: 'btn sm', onclick: () => publish(c) }, t('Publish')) : null,
        c.status === 'published' ? h('button', { class: 'btn sm ghost', onclick: async () => { await POST(`/org/cards/${c.id}/archive`); toast(t('Archived.')); refresh(); } }, t('Archive')) : null) }], cs, { empty: 'No cards yet. Create your first health card.' })));
}

// ---------- Services & prices
export async function servicesPage() {
  const { services } = await GET('/org/services');
  const edit = s => { let m; m = modal(s ? t('Edit service') : t('Add service'), form([{ name: 'name', label: 'Service name', required: true, max: 100 }, { name: 'priceCents', label: 'Price (USD)', type: 'money' }, { name: 'note', label: 'Note', max: 200 }, { name: 'active', label: 'Visible to the public', type: 'checkbox', default: true }],
    { initial: s || {}, cancel: () => m.close(), onSubmit: async v => { if (s) await PATCH('/org/services/' + s.id, v); else await POST('/org/services', v); m.close(); toast(t('Saved.')); refresh(); } })); };
  return h('div', head(isHosp() ? 'Services and prices' : 'Service listings', null, h('button', { class: 'btn', onclick: () => edit(null) }, icon('plus'), t('Add service'))),
    panel(null, table([{ label: 'Service', key: 'name' }, { label: 'Price', render: s => money(s.priceCents) }, { label: 'Note', key: 'note' }, { label: 'Visible', render: s => s.active ? t('Yes') : t('No') },
      { label: '', render: s => h('div', { class: 'actions' }, h('button', { class: 'btn sm ghost', onclick: () => edit(s) }, t('Edit')), h('button', { class: 'btn sm ghost', onclick: async () => { if (await confirmBox(t('Delete this service?'))) { await DEL('/org/services/' + s.id); refresh(); } } }, t('Delete'))) }], services, { empty: 'No services yet.' })));
}

// ---------- Appointments
export async function appointments() {
  const { appointments: as } = await GET('/org/appointments');
  const act = (a, status) => { if (status === 'completed' && S.org && S.org.type === 'lab') { let m; m = modal(t('Complete appointment'), form([{ name: 'amountCents', label: 'Amount charged to the patient (USD)', type: 'money', hint: 'Used to calculate the partnership commission.' }], { submit: 'Mark completed', cancel: () => m.close(), onSubmit: async v => { await PATCH('/org/appointments/' + a.id, { status, ...v }); m.close(); refresh(); } })); return; }
    PATCH('/org/appointments/' + a.id, { status }).then(() => { toast(t('Updated.')); refresh(); }).catch(e => toast(errText(e), 'err')); };
  return h('div', head('Appointment requests', 'Patients see only the status and your note. You see their name and the phone they provided.'),
    panel(null, table([{ label: 'Patient', key: 'patientName' }, { label: 'Phone', render: a => a.contactPhone || '-' }, { label: 'Reason type', render: a => catName(a.category) }, { label: 'Service', render: a => a.serviceName || '-' }, { label: 'Preferred date', render: a => fdate(a.preferredDate) }, { label: 'Note', render: a => a.note || '-' }, { label: 'Status', render: a => badge(a.status) },
      { label: '', render: a => h('div', { class: 'actions' }, a.status === 'requested' ? h('button', { class: 'btn sm', onclick: () => act(a, 'confirmed') }, t('Confirm')) : null, a.status === 'confirmed' ? h('button', { class: 'btn sm', onclick: () => act(a, 'completed') }, t('Complete')) : null, ['requested', 'confirmed'].includes(a.status) ? h('button', { class: 'btn sm ghost', onclick: () => act(a, 'declined') }, t('Decline')) : null) }], as, { empty: 'No appointment requests yet.' })));
}

// ---------- Sales / revenue
export async function sales() {
  if (!isHosp()) return providerRevenue();
  const [r, o] = await Promise.all([GET('/org/reports/sales'), GET('/org/orders')]); const rep = r.report;
  const an = h('div');
  GET('/org/reports/analytics').then(a => an.append(panel('Premium analytics', h('div', h('div', { class: 'bars' }, a.monthly.map(m => h('div', { class: 'bar' }, h('i', { style: `height:${Math.max(2, Math.round(m.grossCents / Math.max(...a.monthly.map(x => x.grossCents), 1) * 120))}px;background:var(--mint)` }), h('small', m.month.slice(2)), h('small', money(m.grossCents))))),
    table([{ label: 'Card', key: 'card' }, { label: 'Orders', key: 'orders' }, { label: 'Gross', render: x => money(x.grossCents) }], a.byCard), h('p', t('Refund rate: {p}%', { p: (a.refundRate * 100).toFixed(1) })))))).catch(e => { if (e.status === 402) an.append(panel('Premium analytics', h('div', emptyState('Monthly trends and per-card performance need a premium plan.', h('a', { class: 'btn', href: '#/org/subscription' }, t('See plans')))))); });
  return h('div', head('Sales and revenue', 'Demo values. Commission rates are set by GURMAD 24 administrators in your agreement.', h('button', { class: 'btn ghost', onclick: () => downloadApi('/org/reports/sales.csv', 'sales.csv') }, icon('download'), t('Export CSV'))),
    h('div', { class: 'grid g4 keep2' }, tile('Orders', rep.orders), tile('Gross sales', money(rep.grossCents)), tile('Platform fee', money(rep.platformFeeCents)), tile('Net to hospital', money(rep.netCents), rep.refunds ? t('{n} refunds included', { n: rep.refunds }) : null)),
    panel('Card orders (patients are not identified)', table([{ label: 'Order', key: 'code' }, { label: 'Card', key: 'card' }, { label: 'Price', render: x => money(x.priceCents) }, { label: 'Fee', render: x => money(x.commissionCents) }, { label: 'Net', render: x => money(x.netCents) }, { label: 'Status', render: x => badge(x.status) }, { label: 'Date', render: x => fdate(x.createdAt) }], o.orders, { empty: 'No orders yet.' })), an);
}
async function providerRevenue() {
  const r = await GET('/org/reports/revenue');
  return h('div', head('Revenue and fees'), h('div', { class: 'grid g3 keep2' }, tile('Fees paid to GURMAD 24', money(r.feesPaidCents)), tile('Gross handled', money(r.grossHandledCents))),
    panel('Monthly', table([{ label: 'Month', key: 'month' }, { label: 'Fees', render: m => money(m.feesCents || 0) }], r.monthly, { empty: 'No fees yet.' })), demoNote('Sandbox values only.'));
}

// ---------- Subscription & invoices
export async function subscription() {
  const [pl, sb] = await Promise.all([GET('/org/plans'), GET('/org/subscriptions')]); const invs = await GET('/org/invoices');
  const buy = (p, period) => { let m; const price = period === 'monthly' ? p.monthlyCents : p.annualCents; m = modal(t('Confirm subscription'), h('div', demoNote('SANDBOX: no real payment is made.'), h('p', `${p.name} - ${t(period === 'monthly' ? 'Monthly' : 'Annual')} - ${money(price)}`),
    h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => m.close() }, t('Cancel')), h('button', { class: 'btn', onclick: async e => { e.currentTarget.disabled = true; try { await POST('/org/subscriptions', { planId: p.id, period }); m.close(); toast(t('Subscribed (sandbox).')); refresh(); } catch (er) { toast(errText(er), 'err'); e.currentTarget.disabled = false; } } }, t('Confirm (demo)'))))); };
  return h('div', head('Subscription', 'Choose a plan for your organisation. Prices are configured by administrators.'), demoNote('Plan prices shown here are placeholders for the demo, not commercial offers.'),
    panel('Available plans', h('div', { class: 'grid g3' }, pl.plans.map(p => h('div', { class: 'hc' }, h('h4', p.name), h('div', { class: 'price' }, money(p.monthlyCents), h('small', { style: 'font-size:12px;color:var(--muted)' }, ' / ' + t('month'))), h('div', { class: 'meta' }, t('Annual: {p}', { p: money(p.annualCents) }), p.features.length ? list(p.features.map(f => t(({ analytics: 'Premium analytics', premium_dashboard: 'Premium dashboard', priority_listing: 'Priority listing' })[f] || f))) : null),
      h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => buy(p, 'monthly') }, t('Monthly')), h('button', { class: 'btn sm ghost', onclick: () => buy(p, 'annual') }, t('Annual'))))))),
    panel('My subscriptions', table([{ label: 'Plan', key: 'planName' }, { label: 'Period', render: s => t(s.period === 'monthly' ? 'Monthly' : 'Annual') }, { label: 'Price', render: s => money(s.priceCents) }, { label: 'Starts', render: s => fdate(s.startsAt) }, { label: 'Ends', render: s => fdate(s.endsAt) }, { label: 'Status', render: s => badge(new Date(s.endsAt) < new Date() ? 'expired' : s.status) },
      { label: '', render: s => s.status === 'active' ? h('button', { class: 'btn sm ghost', onclick: async () => { if (await confirmBox(t('Cancel this subscription? Access continues until the end of the paid term.'))) { await POST(`/org/subscriptions/${s.id}/cancel`); refresh(); } } }, t('Cancel')) : null }], sb.subscriptions, { empty: 'No subscriptions yet.' })),
    panel('Invoices and statements', table([{ label: 'Number', key: 'number' }, { label: 'Type', render: d => t(d.kind) }, { label: 'Date', render: d => fdate(d.ts) }, { label: 'Total', render: d => money(d.totalCents) }, { label: '', render: d => h('button', { class: 'btn sm ghost', onclick: () => { modal(d.number, h('div', receiptNode(d), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => window.print() }, t('Print / save PDF'))))); } }, t('View')) }], invs.invoices, { empty: 'No invoices yet.' })));
}

// ---------- Complaints
export async function complaints() {
  const { complaints: cs } = await GET('/org/complaints');
  const respond = c => { let m; m = modal(c.code, form([{ name: 'text', label: 'Your response', type: 'textarea', required: true, max: 1000 }], { submit: 'Send response', cancel: () => m.close(), onSubmit: async v => { await POST(`/org/complaints/${c.id}/respond`, v); m.close(); refresh(); } })); };
  return h('div', head('Customer support and complaints'), panel(null, cs.length ? h('div', cs.map(c => h('div', { style: 'border-top:1px solid var(--line);padding:10px 0' }, h('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, h('b', c.code + ' - ' + c.subject), badge(c.status)),
    c.responses.map(r => h('p', { style: 'margin:6px 0;font-size:14px' }, h('small', { style: 'color:var(--muted)' }, fdt(r.ts) + ' - ' + t(r.by === 'patient' ? 'Patient' : r.by === 'admin' ? 'GURMAD 24' : 'Hospital') + ': '), r.text)), c.status !== 'resolved' ? h('button', { class: 'btn sm', onclick: () => respond(c) }, t('Respond')) : null))) : emptyState('No complaints. Great!')));
}

// ---------- Profile
export async function profile() {
  const { org } = await GET('/org');
  return h('div', head('Organisation profile', 'This information is shown publicly after verification.', badge(org.status)), verifyBanner(org), panel(null, form([
    { name: 'name', label: 'Name', required: true, max: 100 }, { name: 'area', label: 'City / area', max: 60 }, { name: 'address', label: 'Address', max: 150 }, { name: 'phone', label: 'Public phone', type: 'tel', max: 30 }, { name: 'publicEmail', label: 'Public email', type: 'email', max: 100 },
    { name: 'hours', label: 'Opening hours', max: 100 }, { name: 'description', label: 'Description', type: 'textarea', max: 500 }, org.type !== 'hospital' ? { name: 'serviceAreas', label: 'Service areas (one per line)', type: 'lines' } : null].filter(Boolean),
  { initial: org, submit: 'Save profile', onSubmit: async v => { if (v.publicEmail === '') v.publicEmail = ''; const r = await PATCH('/org', v); S.org = r.org; toast(t('Saved.')); } })));
}

// ---------- Provider: simulated requests
export async function requests() {
  const load = async () => (await GET('/org/requests')).requests;
  const step = (r, status) => PATCH('/org/requests/' + r.id, { status }).then(() => { toast(t('Updated.')); refresh(); }).catch(e => toast(errText(e), 'err'));
  const L = { en_route: 'Start (en route)', arrived: 'Arrived', handed_over: 'Handed over', received: 'Decline' };
  const live = h('div'); const map = liveMap([]);
  const draw = rs => {
    const entries = rs.filter(r => r.track && r.track.location && r.status !== 'closed' && r.status !== 'cancelled').map(r => ({ type: r.responder, incident: r.track.location, unit: r.track.unit, station: r.track.station, done: r.status === 'handed_over' }));
    map.update(entries);
    live.replaceChildren(panel(null, table([{ label: 'Code', key: 'code' }, { label: 'Type', render: r => catName(r.category) }, { label: 'Area', render: r => r.area || '-' },
      { label: 'Location', render: r => r.location ? h('a', { href: osmLink(r.location), target: '_blank', rel: 'noopener noreferrer' }, icon('pin', 16), t('Map')) : '-' },
      { label: 'Status', render: r => badge(r.status) }, { label: 'Updated', render: r => fdt(r.updatedAt) },
      { label: '', render: r => h('div', { class: 'actions' }, r.next.map(n => h('button', { class: 'btn sm' + (n === 'received' ? ' ghost' : ''), onclick: () => step(r, n) }, t(L[n])))) }], rs, { empty: 'No requests assigned to you.' })));
  };
  draw(await load());
  S.poll = setInterval(async () => { try { draw(await load()); } catch (_) { stopPoll(); } }, 4000);
  return h('div', head('Assigned requests', 'SIMULATION: these are test records. Nobody is waiting for real help.'), demoNote('Simulation mode: status changes here are practice only; nothing is sent to real services or people.'), panel('Live map (demo)', map), live);
}

// Card desk: verify a patient's digital card and record the service that was provided.
export function cardDesk() {
  const out = h('div'); const inp = h('input', { type: 'text', placeholder: 'G24-XXXX-XXXX-XXXX', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', 'aria-label': t('Card code'), maxlength: 20 });
  const show = c => {
    const ok = c.state === 'active'; let svc;
    out.replaceChildren(h('div', { class: 'panel vc ' + (ok ? 'ok' : 'bad') }, h('h3', ok ? t('Card is valid') : t(c.state === 'expired' ? 'Card has expired' : 'Card was refunded')),
      h('dl', { class: 'kv' }, h('dt', t('Card')), h('dd', c.cardName), h('dt', t('Holder')), h('dd', c.holderName), h('dt', t('Valid until')), h('dd', fdate(c.validUntil)), h('dt', t('Code')), h('dd', h('span', { class: 'mono' }, c.code)),
        h('dt', t('Included services')), h('dd', list(c.included)), h('dt', t('Not included')), h('dd', list(c.excluded))),
      ok ? h('form', { class: 'row', onsubmit: async e => { e.preventDefault(); try { const r = await POST('/org/cards/redeem', { code: c.code, service: svc.value }); toast(t('Service recorded.')); show(r.card); } catch (er) { toast(errText(er), 'err'); } } },
        (svc = h('input', { type: 'text', required: true, minlength: 2, maxlength: 120, placeholder: t('Service provided (e.g. General check-up)') })), h('button', { class: 'btn', type: 'submit' }, t('Record service'))) : null,
      c.redemptions.length ? h('div', h('strong', t('Recent use')), list(c.redemptions.map(r => fdt(r.at) + ' - ' + r.service))) : null));
  };
  const find = async e => { e.preventDefault(); try { const r = await GET('/org/cards/lookup?code=' + encodeURIComponent(inp.value.trim())); show(r.card); } catch (er) { out.replaceChildren(h('div', { class: 'note warn' }, icon('alert', 18), h('span', errText(er)))); } };
  return h('div', head('Verify card', 'Enter the code shown on the patient\'s digital card to check it and record the service.'),
    h('form', { class: 'row', onsubmit: find }, inp, h('button', { class: 'btn', type: 'submit' }, t('Check'))), out);
}
